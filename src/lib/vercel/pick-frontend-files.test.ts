import { describe, expect, it } from "vitest";
import { pickFrontendDeployFiles } from "./pick-frontend-files";

describe("pickFrontendDeployFiles", () => {
  it("remove prefixo frontend/ dos caminhos", () => {
    expect(
      pickFrontendDeployFiles({
        "frontend/package.json": "{}",
        "backend/package.json": "{}",
      }),
    ).toEqual({ "package.json": "{}" });
  });

  it("retorna null sem arquivos de front-end", () => {
    expect(pickFrontendDeployFiles({ "backend/package.json": "{}" })).toBeNull();
  });
});
