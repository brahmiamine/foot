import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DataSource } from "typeorm";
import { createTestDataSource } from "@/test/testDataSource";
import { StockUnavailableRefund } from "@/entities/StockUnavailableRefund";

let dataSource: DataSource;

vi.mock("@/lib/database", () => ({
  getDataSource: async () => dataSource,
}));

const requestRefund = vi.fn();
const getRefundStatus = vi.fn();
vi.mock("@/lib/paymentApiClient", () => ({
  requestRefund: (...args: unknown[]) => requestRefund(...args),
  getRefundStatus: (...args: unknown[]) => getRefundStatus(...args),
}));

beforeEach(async () => {
  dataSource = await createTestDataSource();
  requestRefund.mockReset();
  getRefundStatus.mockReset();
});

afterEach(async () => {
  await dataSource.destroy();
  vi.restoreAllMocks();
});

describe("openStockUnavailableRefundCase", () => {
  it("crée le dossier et demande immédiatement un remboursement (cas Flouci automatisé)", async () => {
    const { openStockUnavailableRefundCase } = await import("./stockUnavailableRefunds");
    requestRefund.mockResolvedValue({ id: "refund-1", status: "SUCCEEDED" });

    await openStockUnavailableRefundCase("pay_1");

    expect(requestRefund).toHaveBeenCalledWith(
      expect.objectContaining({ paymentId: "pay_1", idempotencyKey: "stock-unavailable:pay_1" }),
    );

    const repo = dataSource.getRepository(StockUnavailableRefund);
    const dossier = await repo.findOne({ where: { paymentId: "pay_1" } });
    expect(dossier?.refundId).toBe("refund-1");
    expect(dossier?.refundStatus).toBe("SUCCEEDED");
    expect(dossier?.resolvedAt).not.toBeNull();
  });

  it("laisse le dossier MANUAL_REVIEW ouvert (pas de resolvedAt) quand le fournisseur n'expose pas de remboursement automatisé", async () => {
    const { openStockUnavailableRefundCase } = await import("./stockUnavailableRefunds");
    requestRefund.mockResolvedValue({ id: "refund-1", status: "MANUAL_REVIEW" });

    await openStockUnavailableRefundCase("pay_1");

    const repo = dataSource.getRepository(StockUnavailableRefund);
    const dossier = await repo.findOne({ where: { paymentId: "pay_1" } });
    expect(dossier?.refundStatus).toBe("MANUAL_REVIEW");
    expect(dossier?.resolvedAt).toBeNull();
  });

  it("est idempotent : rejouer pour le même paiement ne redemande pas un second remboursement", async () => {
    const { openStockUnavailableRefundCase } = await import("./stockUnavailableRefunds");
    requestRefund.mockResolvedValue({ id: "refund-1", status: "SUCCEEDED" });

    await openStockUnavailableRefundCase("pay_1");
    await openStockUnavailableRefundCase("pay_1");
    await openStockUnavailableRefundCase("pay_1");

    expect(requestRefund).toHaveBeenCalledTimes(1);
    const repo = dataSource.getRepository(StockUnavailableRefund);
    const count = await repo.count({ where: { paymentId: "pay_1" } });
    expect(count).toBe(1);
  });

  it("ne lève jamais et laisse le dossier PENDING_REFUND_REQUEST quand payments est indisponible (fournisseur indisponible)", async () => {
    const { openStockUnavailableRefundCase } = await import("./stockUnavailableRefunds");
    requestRefund.mockRejectedValue(new Error("payments unreachable"));

    await expect(openStockUnavailableRefundCase("pay_1")).resolves.toBeUndefined();

    const repo = dataSource.getRepository(StockUnavailableRefund);
    const dossier = await repo.findOne({ where: { paymentId: "pay_1" } });
    expect(dossier?.refundStatus).toBe("PENDING_REFUND_REQUEST");
    expect(dossier?.refundId).toBeNull();
  });
});

describe("processStockUnavailableRefunds", () => {
  it("retente les dossiers PENDING_REFUND_REQUEST (rejeu après indisponibilité du fournisseur)", async () => {
    const { openStockUnavailableRefundCase, processStockUnavailableRefunds } = await import("./stockUnavailableRefunds");
    requestRefund.mockRejectedValueOnce(new Error("payments unreachable"));
    await openStockUnavailableRefundCase("pay_1");

    requestRefund.mockResolvedValueOnce({ id: "refund-1", status: "SUCCEEDED" });
    const report = await processStockUnavailableRefunds();

    expect(report.retriedRequests).toBe(1);
    expect(report.resolved).toBe(1);
    const repo = dataSource.getRepository(StockUnavailableRefund);
    const dossier = await repo.findOne({ where: { paymentId: "pay_1" } });
    expect(dossier?.refundStatus).toBe("SUCCEEDED");
  });

  it("rafraîchit un dossier MANUAL_REVIEW une fois l'opérateur passé par payments (succès tardif)", async () => {
    const { openStockUnavailableRefundCase, processStockUnavailableRefunds } = await import("./stockUnavailableRefunds");
    requestRefund.mockResolvedValue({ id: "refund-1", status: "MANUAL_REVIEW" });
    await openStockUnavailableRefundCase("pay_1");

    getRefundStatus.mockResolvedValue("SUCCEEDED");
    const report = await processStockUnavailableRefunds();

    expect(report.refreshed).toBe(1);
    expect(report.resolved).toBe(1);
    const repo = dataSource.getRepository(StockUnavailableRefund);
    const dossier = await repo.findOne({ where: { paymentId: "pay_1" } });
    expect(dossier?.refundStatus).toBe("SUCCEEDED");
    expect(dossier?.resolvedAt).not.toBeNull();
  });

  it("alerte (une seule fois) un dossier ouvert depuis plus de 24h et toujours non résolu", async () => {
    const { openStockUnavailableRefundCase, processStockUnavailableRefunds } = await import("./stockUnavailableRefunds");
    requestRefund.mockResolvedValue({ id: "refund-1", status: "MANUAL_REVIEW" });
    await openStockUnavailableRefundCase("pay_1");

    const repo = dataSource.getRepository(StockUnavailableRefund);
    const dossier = await repo.findOne({ where: { paymentId: "pay_1" } });
    const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000);
    await repo.update({ id: dossier!.id }, { detectedAt: oldDate });

    getRefundStatus.mockResolvedValue("MANUAL_REVIEW"); // toujours pas résolu

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const firstReport = await processStockUnavailableRefunds();
    expect(firstReport.alerted).toBe(1);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("stock_unavailable_refund_sla_breach"));

    consoleSpy.mockClear();
    const secondReport = await processStockUnavailableRefunds();
    expect(secondReport.alerted).toBe(0); // déjà signalé, pas de spam
  });

  it("ne rappelle jamais payments pour un dossier déjà résolu", async () => {
    const { openStockUnavailableRefundCase, processStockUnavailableRefunds } = await import("./stockUnavailableRefunds");
    requestRefund.mockResolvedValue({ id: "refund-1", status: "SUCCEEDED" });
    await openStockUnavailableRefundCase("pay_1");

    getRefundStatus.mockClear();
    const report = await processStockUnavailableRefunds();

    expect(getRefundStatus).not.toHaveBeenCalled();
    expect(report.retriedRequests).toBe(0);
    expect(report.refreshed).toBe(0);
  });
});
