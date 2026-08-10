"use client";

import { useCallback, useRef, useState } from "react";
import { ConfirmModal } from "@/components/admin/ConfirmModal";

interface ConfirmOptions {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary";
}

interface ConfirmState extends ConfirmOptions {
  message: string;
}

/**
 * Promise-based replacement for window.confirm(). Render `confirmDialog`
 * once anywhere in the component tree, then `await confirm(message)`
 * wherever a native confirm() would previously have been used.
 */
export function useConfirm() {
  const [state, setState] = useState<ConfirmState | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((message: string, options?: ConfirmOptions) => {
    setState({ message, ...options });
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const resolve = useCallback((value: boolean) => {
    setState(null);
    resolverRef.current?.(value);
    resolverRef.current = null;
  }, []);

  const confirmDialog = state ? (
    <ConfirmModal
      message={state.message}
      title={state.title}
      confirmLabel={state.confirmLabel}
      cancelLabel={state.cancelLabel}
      variant={state.variant}
      onConfirm={() => resolve(true)}
      onCancel={() => resolve(false)}
    />
  ) : null;

  return { confirm, confirmDialog };
}
