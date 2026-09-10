import { describe, expect, it } from "vitest";
import { buildMockDatabase, collectionOf } from "./mock-api";
import type { OrderInput } from "@/lib/types";

const order: OrderInput = {
  name: "Café Delivery",
  problem: "Pedidos pelo WhatsApp se perdem",
  audience: "Cafeterias de bairro",
  businessRules: "Pedido mínimo R$ 20",
  deliverableType: "C",
  mobileStack: "PWA/Web Mobile",
  frontendStack: "Next.js",
  backendStack: "Node.js (Express)",
  databaseStack: "PostgreSQL",
  generateTestBuild: true,
  scopePreset: "full",
  includeMobile: true,
  includeFrontend: true,
  includeBackend: true,
  includeDatabase: true,
  includeAuth: true,
  includeAdmin: true,
};

describe("buildMockDatabase", () => {
  it("pré-popula meta e coleções com o nome do app", () => {
    const db = buildMockDatabase(order);
    expect(db.meta.name).toBe("Café Delivery");
    expect(db.meta.rules).toContain("R$ 20");
    expect(db.items.length).toBeGreaterThan(0);
    expect(db.items[0]?.title).toContain("Café Delivery");
    expect(db.customers[0]?.segment).toBe("Cafeterias de bairro");
  });
});

describe("collectionOf", () => {
  it("devolve a coleção pedida ou lista vazia", () => {
    const db = buildMockDatabase(order);
    expect(collectionOf(db, "items")).toHaveLength(db.items.length);
    expect(collectionOf(db, "nao-existe")).toEqual([]);
  });
});
