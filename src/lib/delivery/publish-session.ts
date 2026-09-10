const DISMISS_PREFIX = "fabrica:delivery-dismissed:";
const TRACKING_PREFIX = "fabrica:publish-tracking:";

export function deliveryDismissKey(orderId: string): string {
  return `${DISMISS_PREFIX}${orderId}`;
}

export function publishTrackingKey(orderId: string): string {
  return `${TRACKING_PREFIX}${orderId}`;
}

export function readSessionFlag(key: string): boolean {
  if (typeof globalThis.sessionStorage === "undefined") return false;
  return globalThis.sessionStorage.getItem(key) === "1";
}

export function setSessionFlag(key: string): void {
  if (typeof globalThis.sessionStorage === "undefined") return;
  globalThis.sessionStorage.setItem(key, "1");
}

export function clearSessionFlag(key: string): void {
  if (typeof globalThis.sessionStorage === "undefined") return;
  globalThis.sessionStorage.removeItem(key);
}
