import { describe, expect, it } from "vitest";
import { assertMobileApkSource } from "./assert-mobile-apk-source";
import type { OrderInput } from "@/lib/types";

const educa: OrderInput = {
  name: "Educa",
  problem: "Treinamentos corporativos pelo celular",
} as OrderInput;

describe("assertMobileApkSource", () => {
  it("aceita EducaApp no main.dart", () => {
    expect(() =>
      assertMobileApkSource(educa, {
        "mobile/lib/main.dart": "runApp(EducaApp());",
      }),
    ).not.toThrow();
  });

  it("rejeita TaskListApp em pedido que não é tasklist", () => {
    expect(() =>
      assertMobileApkSource(educa, {
        "mobile/lib/main.dart": "runApp(TaskListApp());",
      }),
    ).toThrow(/template TaskList/i);
  });

  it("rejeita PreviewApp placeholder", () => {
    expect(() =>
      assertMobileApkSource(educa, {
        "mobile/lib/main.dart": "runApp(PreviewApp());",
      }),
    ).toThrow(/placeholder/i);
  });
});
