import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/**
 * Vrai seulement après l'hydratation client — pour un rendu qui dépend de
 * state client-only (localStorage, minuteur...) sans provoquer de mismatch
 * SSR/CSR. Remplace le pattern useState(false) + setState(true) dans un
 * effet, qui déclenche react-hooks/set-state-in-effect (setState synchrone
 * et inconditionnel au premier rendu de l'effet).
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}
