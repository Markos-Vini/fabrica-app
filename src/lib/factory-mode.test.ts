import { describe, expect, it } from "vitest";
import { inferOrderKind, isPlanningOrder } from "./factory-mode";

describe("inferOrderKind", () => {
  it("preserva orderKind explícito", () => {
    expect(inferOrderKind({ orderKind: "planning" })).toBe("planning");
    expect(inferOrderKind({ orderKind: "software" })).toBe("software");
  });

  it("infere software a partir do planejamento de origem", () => {
    expect(
      inferOrderKind({
        sourcePlanningOrderId: "plan-1",
      }),
    ).toBe("software");
  });

  it("infere planejamento a partir do software derivado", () => {
    expect(
      inferOrderKind({
        derivedSoftwareOrderId: "soft-1",
      }),
    ).toBe("planning");
  });

  it("prioriza vínculos sobre orderKind inconsistente", () => {
    expect(
      inferOrderKind({
        orderKind: "planning",
        sourcePlanningOrderId: "plan-1",
      }),
    ).toBe("software");
  });

  it("usa factoryMode só quando não há vínculos", () => {
    expect(inferOrderKind({}, "planning")).toBe("planning");
    expect(inferOrderKind({}, "app")).toBe("software");
  });
});

describe("isPlanningOrder", () => {
  it("identifica planejamento explícito", () => {
    expect(isPlanningOrder({ orderKind: "planning" })).toBe(true);
  });

  it("software derivado não é planejamento", () => {
    expect(
      isPlanningOrder({
        orderKind: "software",
        sourcePlanningOrderId: "plan-1",
      }),
    ).toBe(false);
  });

  it("legado sem orderKind e sem source é planejamento", () => {
    expect(inferOrderKind({}, "planning")).toBe("planning");
    expect(isPlanningOrder({}, "planning")).toBe(true);
  });

  it("legado sem orderKind mas com source é software", () => {
    expect(isPlanningOrder({ sourcePlanningOrderId: "plan-1" })).toBe(false);
  });
});
