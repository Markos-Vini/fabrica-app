import { beforeEach, describe, expect, it } from "vitest";
import {
  clearSessionFlag,
  deliveryDismissKey,
  publishTrackingKey,
  readSessionFlag,
  setSessionFlag,
} from "./publish-session";

describe("publish-session", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    Object.defineProperty(globalThis, "sessionStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, value);
        },
        removeItem: (key: string) => {
          store.delete(key);
        },
      },
    });
  });

  it("monta chaves por pedido", () => {
    expect(deliveryDismissKey("abc")).toBe("fabrica:delivery-dismissed:abc");
    expect(publishTrackingKey("abc")).toBe("fabrica:publish-tracking:abc");
  });

  it("persiste flags na sessionStorage", () => {
    const key = "fabrica:test-flag";
    clearSessionFlag(key);
    expect(readSessionFlag(key)).toBe(false);
    setSessionFlag(key);
    expect(readSessionFlag(key)).toBe(true);
    clearSessionFlag(key);
    expect(readSessionFlag(key)).toBe(false);
  });
});
