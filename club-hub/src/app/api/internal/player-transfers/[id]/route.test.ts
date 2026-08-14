import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockGetTransfer = vi.fn();

vi.mock("@/lib/serviceAuth", () => ({ ensureServiceAuth: vi.fn(() => null) }));
vi.mock("@/services/PlayerTransferService", () => ({
  getTransferById: (...args: unknown[]) => mockGetTransfer(...args),
}));

const { GET } = await import("./route");

beforeEach(() => {
  mockGetTransfer.mockReset();
});

it("returns one transfer by id without applying the list limit", async () => {
  mockGetTransfer.mockResolvedValue({ id: "transfer-201", status: "APPROVED" });

  const response = await GET(
    new NextRequest("http://localhost/api/internal/player-transfers/transfer-201"),
    { params: Promise.resolve({ id: "transfer-201" }) },
  );

  expect(response.status).toBe(200);
  expect(mockGetTransfer).toHaveBeenCalledWith("transfer-201");
});

it("returns 404 for an unknown transfer", async () => {
  mockGetTransfer.mockResolvedValue(null);

  const response = await GET(
    new NextRequest("http://localhost/api/internal/player-transfers/missing"),
    { params: Promise.resolve({ id: "missing" }) },
  );

  expect(response.status).toBe(404);
});
