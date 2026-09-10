import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import {
  authenticateUser,
  canAccessOrder,
  changeUserPassword,
  createOrder,
  createUser,
  deleteOrder,
  getUserByEmail,
  listOrdersForUser,
  resetStoreCacheForTests,
  resetUserPassword,
  setOrderArchived,
  setUserActive,
  updateOrder,
  type OrderRecord,
} from "./store";
import { agentsForDeliverable } from "@/lib/agents/plan";
import { adminEmail, adminPassword } from "@/lib/env";

const TEST_FILE = path.join(process.cwd(), "data", "fabrica-users.test.json");

const fullScope = {
  scopePreset: "full",
  includeMobile: true,
  includeFrontend: true,
  includeBackend: true,
  includeDatabase: true,
  includeAuth: true,
  includeAdmin: true,
};

const sampleOrder = {
  problem: "x",
  audience: "y",
  businessRules: "z",
  deliverableType: "B" as const,
  mobileStack: "PWA/Web Mobile",
  frontendStack: "React.js / Next.js",
  backendStack: "Node.js (Express/NestJS)",
  databaseStack: "PostgreSQL",
  generateTestBuild: false,
  ...fullScope,
};

describe("multi-user store", () => {
  beforeAll(async () => {
    process.env.FABRICA_DATA_FILE = TEST_FILE;
    resetStoreCacheForTests();
    await mkdir(path.dirname(TEST_FILE), { recursive: true });
    if (existsSync(TEST_FILE)) await rm(TEST_FILE, { force: true });
  });

  afterAll(async () => {
    resetStoreCacheForTests();
    delete process.env.FABRICA_DATA_FILE;
    if (existsSync(TEST_FILE)) await rm(TEST_FILE, { force: true });
  });

  it("cria admin bootstrap e autentica com credenciais do .env", async () => {
    const user = await authenticateUser(adminEmail(), adminPassword());
    expect(user?.role).toBe("admin");
  });

  it("membro vê apenas os próprios pedidos", async () => {
    const admin = await getUserByEmail(adminEmail());
    expect(admin).toBeTruthy();
    const member = await createUser({
      email: `operador-${Date.now()}@teste.local`,
      name: "Operador",
      password: "123456",
      role: "member",
    });

    await createOrder(
      {
        name: "Pedido Admin",
        ...sampleOrder,
      },
      agentsForDeliverable("B"),
      admin!.id,
    );

    await createOrder(
      {
        name: "Pedido Membro",
        ...sampleOrder,
      },
      agentsForDeliverable("B"),
      member.id,
    );

    const memberOrders = await listOrdersForUser({
      id: member.id,
      email: member.email,
      name: member.name,
      role: member.role,
    });
    expect(memberOrders).toHaveLength(1);
    expect(memberOrders[0]?.name).toBe("Pedido Membro");

    const adminOrders = await listOrdersForUser({
      id: admin!.id,
      email: admin!.email,
      name: admin!.name,
      role: admin!.role,
    });
    expect(adminOrders.length).toBeGreaterThanOrEqual(2);
  });

  it("canAccessOrder respeita papel e dono", () => {
    const order = { userId: "owner" } as OrderRecord;
    expect(
      canAccessOrder(order, {
        id: "owner",
        email: "a",
        name: "A",
        role: "member",
      }),
    ).toBe(true);
    expect(
      canAccessOrder(order, {
        id: "other",
        email: "b",
        name: "B",
        role: "member",
      }),
    ).toBe(false);
    expect(
      canAccessOrder(order, {
        id: "admin",
        email: "c",
        name: "C",
        role: "admin",
      }),
    ).toBe(true);
  });

  it("desativa e reativa membro; impede desativar último admin", async () => {
    const member = await createUser({
      email: `membro-${Date.now()}@teste.local`,
      name: "Membro",
      password: "123456",
      role: "member",
    });
    const deactivated = await setUserActive(member.id, false);
    expect(deactivated.active).toBe(false);
    const reactivated = await setUserActive(member.id, true);
    expect(reactivated.active).toBe(true);

    const admin = await getUserByEmail(adminEmail());
    expect(admin).toBeTruthy();
    await expect(setUserActive(admin!.id, false)).rejects.toThrow(/último administrador/i);
  });

  it("redefine senha de usuário", async () => {
    const member = await createUser({
      email: `reset-${Date.now()}@teste.local`,
      name: "Reset",
      password: "123456",
      role: "member",
    });
    await resetUserPassword(member.id, "nova-senha-segura");
    const auth = await authenticateUser(member.email, "nova-senha-segura");
    expect(auth?.id).toBe(member.id);
  });

  it("troca senha com validação da senha atual", async () => {
    const member = await createUser({
      email: `change-${Date.now()}@teste.local`,
      name: "Change",
      password: "123456",
      role: "member",
    });
    await expect(
      changeUserPassword(member.id, "errada", "nova-senha-segura"),
    ).rejects.toThrow(/senha atual/i);
    await changeUserPassword(member.id, "123456", "nova-senha-segura");
    const auth = await authenticateUser(member.email, "nova-senha-segura");
    expect(auth?.id).toBe(member.id);
  });

  it("arquiva, oculta da listagem e exclui pedido arquivado", async () => {
    const admin = await getUserByEmail(adminEmail());
    expect(admin).toBeTruthy();
    const created = await createOrder(
      { name: "Arquivar", ...sampleOrder },
      agentsForDeliverable("B"),
      admin!.id,
    );
    await updateOrder(created.order.id, { status: "completed" });
    await setOrderArchived(created.order.id, true);
    const visible = await listOrdersForUser({
      id: admin!.id,
      email: admin!.email,
      name: admin!.name,
      role: admin!.role,
    });
    expect(visible.some((order) => order.id === created.order.id)).toBe(false);
    const withArchived = await listOrdersForUser(
      {
        id: admin!.id,
        email: admin!.email,
        name: admin!.name,
        role: admin!.role,
      },
      { includeArchived: true },
    );
    expect(withArchived.some((order) => order.id === created.order.id)).toBe(true);
    await deleteOrder(created.order.id);
    const afterDelete = await listOrdersForUser(
      {
        id: admin!.id,
        email: admin!.email,
        name: admin!.name,
        role: admin!.role,
      },
      { includeArchived: true },
    );
    expect(afterDelete.some((order) => order.id === created.order.id)).toBe(false);
  });
});
