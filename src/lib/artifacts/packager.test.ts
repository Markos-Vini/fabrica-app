import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { zipFiles } from "./packager";

describe("zipFiles", () => {
  it("empacota os arquivos sob o slug do projeto", async () => {
    const buffer = await zipFiles("cafe-delivery", {
      "README.md": "# Olá",
      "docs/PRD.md": "PRD",
    });

    const zip = await JSZip.loadAsync(buffer);
    expect(await zip.file("cafe-delivery/README.md")?.async("string")).toBe(
      "# Olá",
    );
    expect(await zip.file("cafe-delivery/docs/PRD.md")?.async("string")).toBe(
      "PRD",
    );
  });
});
