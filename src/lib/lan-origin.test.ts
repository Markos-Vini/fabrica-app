import { describe, expect, it } from "vitest";
import { pickLanAddress } from "./lan-origin";

describe("pickLanAddress", () => {
  it("escolhe o IPv4 privado não interno", () => {
    expect(
      pickLanAddress([
        { address: "127.0.0.1", family: "IPv4", internal: true },
        { address: "192.168.1.73", family: "IPv4", internal: false },
      ]),
    ).toBe("192.168.1.73");
  });

  it("prefere Wi‑Fi 192.168 sobre VPN 10.x", () => {
    expect(
      pickLanAddress([
        { address: "10.8.0.6", family: "IPv4", internal: false },
        { address: "192.168.1.73", family: "IPv4", internal: false },
      ]),
    ).toBe("192.168.1.73");
  });

  it("aceita family numérico do Node 18+", () => {
    expect(
      pickLanAddress([
        { address: "10.0.0.8", family: 4, internal: false },
      ]),
    ).toBe("10.0.0.8");
  });

  it("ignora só loopback", () => {
    expect(
      pickLanAddress([{ address: "127.0.0.1", family: "IPv4", internal: true }]),
    ).toBeNull();
  });
});
