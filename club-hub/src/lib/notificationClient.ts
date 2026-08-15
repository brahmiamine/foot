/**
 * Backward-compatible facade kept at the historical import path.
 * Transport ownership now lives in packages/notifications-client so every
 * application uses the same service authentication, timeout and error policy.
 */
export * from '../../../packages/notifications-client/src/index'
