import { describe, expect, it } from "vitest";
import { githubRepoName } from "./repo-name";

describe("githubRepoName", () => {
  it("usa o slug do app com prefixo da fábrica", () => {
    expect(githubRepoName("Café Delivery")).toBe("fabrica-cafe-delivery");
  });
});
