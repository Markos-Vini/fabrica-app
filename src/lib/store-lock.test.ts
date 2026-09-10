import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { withStoreFileLock, writeJsonAtomic } from "./store-lock";

const TMP = path.join(process.cwd(), "data", "store-lock-test");

describe("store-lock", () => {
  beforeEach(async () => {
    await mkdir(TMP, { recursive: true });
  });

  afterEach(async () => {
    if (existsSync(TMP)) await rm(TMP, { recursive: true, force: true });
  });

  it("serializa acesso entre chamadas concorrentes", async () => {
    const file = path.join(TMP, "data.json");
    const order: number[] = [];
    await Promise.all([
      withStoreFileLock(file, async () => {
        order.push(1);
        await new Promise((r) => setTimeout(r, 80));
        order.push(2);
      }),
      withStoreFileLock(file, async () => {
        order.push(3);
        order.push(4);
      }),
    ]);
    expect(order.filter((n) => n <= 2)).toEqual([1, 2]);
    expect(order.filter((n) => n >= 3)).toEqual([3, 4]);
    expect(order).toHaveLength(4);
  });

  it("grava JSON atomicamente", async () => {
    const file = path.join(TMP, "out.json");
    await writeJsonAtomic(file, { ok: true });
    expect(JSON.parse(await (await import("node:fs/promises")).readFile(file, "utf8"))).toEqual({
      ok: true,
    });
  });
});
