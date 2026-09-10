import { mkdir, readFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import type { AgentId, DeliverableType, OrderInput } from "@/lib/types";
import { initialApkStatus } from "@/lib/artifacts/apk-eligibility";
import { DEFAULT_AGENT_MODELS } from "@/lib/llm/model-catalog";
import { hashPassword, verifyPassword } from "@/lib/password";
import { adminEmail, adminPassword } from "@/lib/env";
import { parsePrimaryColor, parseUiReference, parseUiStyle } from "@/lib/visual-design";
import { parseOptionalText, parseScreensFromForm, parseUserRolesFromForm } from "@/lib/product-context";
import { parseDomainTemplateId } from "@/lib/domain-templates";
import {
  parseLocaleScope,
  parseOfflineMode,
  parsePrivacyLevel,
  parseScaleTier,
  parseSyncMode,
} from "@/lib/nfr-context";
import type { FactoryMode, OrderKind } from "@/lib/factory-mode";
import { inferOrderKind } from "@/lib/factory-mode";
import { fabricaDataDir } from "@/lib/data-paths";
import { withStoreFileLock, writeJsonAtomic } from "@/lib/store-lock";

export type OrderStatus = "queued" | "running" | "completed" | "failed";
export type RunStatus = "pending" | "running" | "completed" | "failed" | "skipped";
export type ApkStatus = "idle" | "building" | "ready" | "failed" | "skipped";
export type UserRole = "admin" | "member";

export type UserRecord = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SessionUser = Pick<UserRecord, "id" | "email" | "name" | "role">;

export type SettingRecord = {
  mockMode: boolean;
  factoryMode: FactoryMode;
  /** Compila front/analisa mobile antes de publicar GitHub/Vercel */
  buildGateEnabled: boolean;
  openaiKey: string | null;
  anthropicKey: string | null;
  geminiKey: string | null;
  cursorKey: string | null;
  ollamaBaseUrl: string;
  agentModels: Record<string, string>;
  githubToken: string | null;
  vercelToken: string | null;
  publicBaseUrl: string;
  updatedAt: string;
};

export type OrderRecord = OrderInput & {
  id: string;
  userId: string;
  orderKind: OrderKind;
  sourcePlanningOrderId: string | null;
  derivedSoftwareOrderId: string | null;
  status: OrderStatus;
  currentAgent: AgentId | null;
  errorMessage: string | null;
  githubUrl: string | null;
  githubError: string | null;
  vercelUrl: string | null;
  vercelError: string | null;
  apkStatus: ApkStatus;
  apkRunUrl: string | null;
  apkError: string | null;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AgentRunRecord = {
  id: string;
  orderId: string;
  agent: AgentId;
  status: RunStatus;
  model: string | null;
  outputText: string;
  errorMessage: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  sortOrder: number;
};

type StoreData = {
  settings: SettingRecord;
  users: UserRecord[];
  orders: OrderRecord[];
  runs: AgentRunRecord[];
};

function getDataFile(): string {
  return process.env.FABRICA_DATA_FILE
    ? path.resolve(process.env.FABRICA_DATA_FILE)
    : path.join(fabricaDataDir(), "fabrica.json");
}

function nowIso(): string {
  return new Date().toISOString();
}

function cuid(): string {
  return randomBytes(12).toString("hex");
}

function emptyStore(): StoreData {
  return {
    settings: {
      mockMode: true,
      factoryMode: "app",
      buildGateEnabled: true,
      openaiKey: null,
      anthropicKey: null,
      geminiKey: null,
      cursorKey: null,
      ollamaBaseUrl: "http://localhost:11434",
      agentModels: { ...DEFAULT_AGENT_MODELS },
      githubToken: null,
      vercelToken: null,
      publicBaseUrl: "",
      updatedAt: nowIso(),
    },
    orders: [],
    runs: [],
    users: [],
  };
}

function bootstrapAdminUser(): UserRecord {
  const stamp = nowIso();
  return {
    id: cuid(),
    email: adminEmail().toLowerCase(),
    name: "Administrador",
    passwordHash: hashPassword(adminPassword()),
    role: "admin",
    active: true,
    createdAt: stamp,
    updatedAt: stamp,
  };
}

function normalizeStore(parsed: StoreData): StoreData {
  const defaults = emptyStore();
  parsed.settings = {
    ...defaults.settings,
    ...parsed.settings,
    factoryMode: parsed.settings.factoryMode ?? "app",
    buildGateEnabled: parsed.settings.buildGateEnabled ?? true,
  };
  parsed.users = parsed.users ?? [];
  parsed.orders = parsed.orders ?? [];
  parsed.runs = parsed.runs ?? [];

  if (parsed.users.length === 0) {
    parsed.users.push(bootstrapAdminUser());
  }

  const fallbackUserId =
    parsed.users.find((user) => user.role === "admin")?.id ?? parsed.users[0]?.id;
  parsed.orders = parsed.orders.map((order) => ({
    ...order,
    userId: order.userId ?? fallbackUserId ?? "",
    scopePreset: order.scopePreset ?? "full",
    includeMobile: order.includeMobile ?? true,
    includeFrontend: order.includeFrontend ?? true,
    includeBackend: order.includeBackend ?? true,
    includeDatabase: order.includeDatabase ?? true,
    includeAuth: order.includeAuth ?? true,
    includeAdmin: order.includeAdmin ?? true,
    githubUrl: order.githubUrl ?? null,
    githubError: order.githubError ?? null,
    vercelUrl: order.vercelUrl ?? null,
    vercelError: order.vercelError ?? null,
    apkStatus: order.apkStatus ?? "idle",
    apkRunUrl: order.apkRunUrl ?? null,
    apkError: order.apkError ?? null,
    archived: order.archived ?? false,
    orderKind: inferOrderKind(order, parsed.settings.factoryMode),
    sourcePlanningOrderId: order.sourcePlanningOrderId ?? null,
    derivedSoftwareOrderId: order.derivedSoftwareOrderId ?? null,
    uiStyle: parseUiStyle(order.uiStyle),
    primaryColor: parsePrimaryColor(order.primaryColor),
    uiReference: parseUiReference(order.uiReference),
    mvpEssentials: parseOptionalText(order.mvpEssentials),
    mvpLater: parseOptionalText(order.mvpLater),
    userRoles: parseOptionalText(order.userRoles, 500),
    mainFlows: parseOptionalText(order.mainFlows),
    expectedScreens: parseOptionalText(order.expectedScreens, 1000),
    domainTemplateId: parseDomainTemplateId(order.domainTemplateId),
    nfrOffline: parseOfflineMode(order.nfrOffline),
    nfrSync: parseSyncMode(order.nfrSync),
    nfrScale: parseScaleTier(order.nfrScale),
    nfrLocales: parseLocaleScope(order.nfrLocales),
    nfrPrivacy: parsePrivacyLevel(order.nfrPrivacy),
    nfrNotes: parseOptionalText(order.nfrNotes, 2000),
    externalIntegrations: parseOptionalText(order.externalIntegrations, 1000),
    mainEntities: parseOptionalText(order.mainEntities, 1000),
    entityRelations: parseOptionalText(order.entityRelations, 2000),
    successCriteria: parseOptionalText(order.successCriteria, 4000),
  }));

  const byId = new Map(parsed.orders.map((order) => [order.id, order]));
  parsed.orders = parsed.orders.map((order) => {
    if (
      order.orderKind !== "planning" ||
      order.status !== "failed" ||
      !order.derivedSoftwareOrderId ||
      !order.errorMessage?.includes("Entrega incompleta")
    ) {
      return order;
    }
    const derived = byId.get(order.derivedSoftwareOrderId);
    if (derived?.status === "completed") {
      return {
        ...order,
        status: "completed",
        errorMessage: null,
      };
    }
    return order;
  });

  return parsed;
}

let cache: StoreData | null = null;
let cacheFileMtimeMs = 0;
let queue: Promise<unknown> = Promise.resolve();

async function readStoreFromDisk(): Promise<StoreData> {
  if (!existsSync(getDataFile())) {
    cache = normalizeStore(emptyStore());
    await writeStore(cache);
    return cache;
  }
  const raw = await readFile(getDataFile(), "utf8");
  const parsed = normalizeStore(JSON.parse(raw) as StoreData);
  cache = parsed;
  try {
    cacheFileMtimeMs = (await stat(getDataFile())).mtimeMs;
  } catch {
    cacheFileMtimeMs = Date.now();
  }
  return parsed;
}

async function readStore(): Promise<StoreData> {
  if (!cache) return readStoreFromDisk();
  try {
    const mtimeMs = (await stat(getDataFile())).mtimeMs;
    if (mtimeMs > cacheFileMtimeMs) {
      return readStoreFromDisk();
    }
  } catch {
    return readStoreFromDisk();
  }
  return cache;
}

async function writeStore(
  data: StoreData,
  options?: { removedOrderIds?: string[] },
): Promise<void> {
  const removed = new Set(options?.removedOrderIds ?? []);
  try {
    if (existsSync(getDataFile())) {
      const raw = await readFile(getDataFile(), "utf8");
      const disk = JSON.parse(raw) as StoreData;
      const memIds = new Set(data.orders.map((order) => order.id));
      for (const order of disk.orders ?? []) {
        if (memIds.has(order.id) || removed.has(order.id)) continue;
        // Nunca deixar sumir pedido concluído / software por cache velho.
        if (order.status === "completed" || order.orderKind === "software") {
          data.orders.push(order);
          memIds.add(order.id);
          const orphanRuns = (disk.runs ?? []).filter(
            (run) =>
              run.orderId === order.id &&
              !data.runs.some((existing) => existing.id === run.id),
          );
          data.runs.push(...orphanRuns);
        }
      }
    }
  } catch {
    /* disco ilegível — grava o que temos */
  }

  data.orders = data.orders.map((order) => ({
    ...order,
    orderKind: inferOrderKind(order, data.settings?.factoryMode ?? "app"),
  }));

  cache = data;
  await writeJsonAtomic(getDataFile(), data);
  try {
    cacheFileMtimeMs = (await stat(getDataFile())).mtimeMs;
  } catch {
    cacheFileMtimeMs = Date.now();
  }
}

function locked<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(
    () =>
      withStoreFileLock(getDataFile(), async () => {
        // Sempre relê o disco sob trava — evita worker/HMR sobrescrever pedidos.
        cache = null;
        cacheFileMtimeMs = 0;
        return fn();
      }),
    () =>
      withStoreFileLock(getDataFile(), async () => {
        cache = null;
        cacheFileMtimeMs = 0;
        return fn();
      }),
  );
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export async function getSettings(): Promise<SettingRecord> {
  return locked(async () => (await readStore()).settings);
}

export async function saveSettings(
  patch: Partial<SettingRecord>,
): Promise<SettingRecord> {
  return locked(async () => {
    const data = await readStore();
    data.settings = {
      ...data.settings,
      ...patch,
      updatedAt: nowIso(),
    };
    await writeStore(data);
    return data.settings;
  });
}

export function canAccessOrder(order: OrderRecord, user: SessionUser): boolean {
  if (user.role === "admin") return true;
  return order.userId === user.id;
}

export async function listUsers(): Promise<UserRecord[]> {
  return locked(async () => {
    const data = await readStore();
    return [...data.users].sort((a, b) => a.email.localeCompare(b.email));
  });
}

export async function getUserById(id: string): Promise<UserRecord | null> {
  return locked(async () => {
    const data = await readStore();
    return data.users.find((user) => user.id === id) ?? null;
  });
}

export async function getUserByEmail(email: string): Promise<UserRecord | null> {
  return locked(async () => {
    const data = await readStore();
    const normalized = email.trim().toLowerCase();
    return data.users.find((user) => user.email === normalized) ?? null;
  });
}

export async function authenticateUser(
  email: string,
  password: string,
): Promise<SessionUser | null> {
  return locked(async () => {
    const data = await readStore();
    const normalized = email.trim().toLowerCase();
    const user = data.users.find((item) => item.email === normalized);
    if (!user || !user.active) return null;
    if (!verifyPassword(password, user.passwordHash)) return null;
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  });
}

export async function createUser(input: {
  email: string;
  name: string;
  password: string;
  role: UserRole;
}): Promise<UserRecord> {
  return locked(async () => {
    const data = await readStore();
    const email = input.email.trim().toLowerCase();
    if (!email || !input.name.trim() || !input.password) {
      throw new Error("Preencha e-mail, nome e senha.");
    }
    if (data.users.some((user) => user.email === email)) {
      throw new Error("E-mail já cadastrado.");
    }
    const stamp = nowIso();
    const user: UserRecord = {
      id: cuid(),
      email,
      name: input.name.trim(),
      passwordHash: hashPassword(input.password),
      role: input.role,
      active: true,
      createdAt: stamp,
      updatedAt: stamp,
    };
    data.users.push(user);
    await writeStore(data);
    return user;
  });
}

export async function setUserActive(userId: string, active: boolean): Promise<UserRecord> {
  return locked(async () => {
    const data = await readStore();
    const user = data.users.find((item) => item.id === userId);
    if (!user) {
      throw new Error("Usuário não encontrado.");
    }
    if (!active && user.role === "admin") {
      const otherActiveAdmins = data.users.filter(
        (item) => item.role === "admin" && item.active && item.id !== userId,
      );
      if (otherActiveAdmins.length === 0) {
        throw new Error("Não é possível desativar o último administrador.");
      }
    }
    user.active = active;
    user.updatedAt = nowIso();
    await writeStore(data);
    return user;
  });
}

export async function resetUserPassword(
  userId: string,
  password: string,
): Promise<UserRecord> {
  return locked(async () => {
    const data = await readStore();
    const user = data.users.find((item) => item.id === userId);
    if (!user) {
      throw new Error("Usuário não encontrado.");
    }
    const trimmed = password.trim();
    if (trimmed.length < 6) {
      throw new Error("A senha deve ter pelo menos 6 caracteres.");
    }
    user.passwordHash = hashPassword(trimmed);
    user.updatedAt = nowIso();
    await writeStore(data);
    return user;
  });
}

export async function changeUserPassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<UserRecord> {
  return locked(async () => {
    const data = await readStore();
    const user = data.users.find((item) => item.id === userId);
    if (!user) {
      throw new Error("Usuário não encontrado.");
    }
    if (!verifyPassword(currentPassword, user.passwordHash)) {
      throw new Error("Senha atual incorreta.");
    }
    const trimmed = newPassword.trim();
    if (trimmed.length < 6) {
      throw new Error("A nova senha deve ter pelo menos 6 caracteres.");
    }
    user.passwordHash = hashPassword(trimmed);
    user.updatedAt = nowIso();
    await writeStore(data);
    return user;
  });
}

export async function listOrdersForUser(
  user: SessionUser,
  options?: { includeArchived?: boolean },
): Promise<OrderRecord[]> {
  return locked(async () => {
    const data = await readStore();
    const includeArchived = options?.includeArchived ?? false;
    const orders =
      user.role === "admin"
        ? data.orders
        : data.orders.filter((order) => order.userId === user.id);
    return [...orders]
      .filter((order) => includeArchived || !order.archived)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  });
}

export async function listOrders(): Promise<OrderRecord[]> {
  return listOrdersForUser({
    id: "",
    email: "",
    name: "",
    role: "admin",
  });
}

export async function getOrderIfAllowed(
  id: string,
  user: SessionUser,
  options?: { fresh?: boolean },
): Promise<{
  order: OrderRecord;
  runs: AgentRunRecord[];
} | null> {
  const data = await getOrder(id, options);
  if (!data || !canAccessOrder(data.order, user)) return null;
  return data;
}

export async function getOrder(
  id: string,
  options?: { fresh?: boolean },
): Promise<{
  order: OrderRecord;
  runs: AgentRunRecord[];
} | null> {
  return locked(async () => {
    const data = options?.fresh ? await readStoreFromDisk() : await readStore();
    const order = data.orders.find((o) => o.id === id);
    if (!order) return null;
    const runs = data.runs
      .filter((r) => r.orderId === id)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    return { order, runs };
  });
}

export type CreateOrderMeta = {
  orderKind?: OrderKind;
  sourcePlanningOrderId?: string | null;
};

export async function createOrder(
  input: OrderInput,
  planned: { run: AgentId[]; skip: AgentId[] },
  userId: string,
  meta: CreateOrderMeta = {},
): Promise<{ order: OrderRecord; runs: AgentRunRecord[] }> {
  return locked(async () => {
    const data = await readStore();
    const owner = data.users.find((user) => user.id === userId && user.active);
    if (!owner) throw new Error("Usuário inválido.");
    const id = cuid();
    const stamp = nowIso();
    const order: OrderRecord = {
      ...input,
      id,
      userId,
      orderKind: meta.orderKind ?? "planning",
      sourcePlanningOrderId: meta.sourcePlanningOrderId ?? null,
      derivedSoftwareOrderId: null,
      status: "queued",
      currentAgent: null,
      errorMessage: null,
      githubUrl: null,
      githubError: null,
      vercelUrl: null,
      vercelError: null,
      apkStatus: initialApkStatus(input),
      apkRunUrl: null,
      apkError: null,
      archived: false,
      createdAt: stamp,
      updatedAt: stamp,
    };
    const catalogOrder: AgentId[] = [
      "pm",
      "architect",
      "backend",
      "frontend",
      "qa",
      "devops",
    ];
    const runs: AgentRunRecord[] = catalogOrder.map((agent, index) => ({
      id: cuid(),
      orderId: id,
      agent,
      status: planned.skip.includes(agent) ? "skipped" : "pending",
      model: null,
      outputText: "",
      errorMessage: null,
      startedAt: null,
      finishedAt: null,
      sortOrder: index,
    }));
    data.orders.unshift(order);
    data.runs.push(...runs);
    await writeStore(data);
    return { order, runs };
  });
}

export async function updateOrder(
  id: string,
  patch: Partial<
    Pick<
      OrderRecord,
      | "status"
      | "currentAgent"
      | "errorMessage"
      | "githubUrl"
      | "githubError"
      | "vercelUrl"
      | "vercelError"
      | "apkStatus"
      | "apkRunUrl"
      | "apkError"
      | "derivedSoftwareOrderId"
      | "archived"
    >
  >,
): Promise<void> {
  await locked(async () => {
    const data = await readStore();
    const order = data.orders.find((o) => o.id === id);
    if (!order) return;
    Object.assign(order, patch, { updatedAt: nowIso() });
    await writeStore(data);
  });
}

export async function replaceOrderInput(
  id: string,
  input: OrderInput,
  planned: { run: AgentId[]; skip: AgentId[] },
): Promise<void> {
  await locked(async () => {
    const data = await readStore();
    const order = data.orders.find((o) => o.id === id);
    if (!order) return;

    Object.assign(order, input, {
      updatedAt: nowIso(),
      status: "queued",
      currentAgent: null,
      errorMessage: null,
      derivedSoftwareOrderId: null,
      githubUrl: null,
      githubError: null,
      vercelUrl: null,
      vercelError: null,
      apkStatus: initialApkStatus(input),
      apkRunUrl: null,
      apkError: null,
    });

    for (const run of data.runs.filter((r) => r.orderId === id)) {
      if (planned.skip.includes(run.agent)) {
        run.status = "skipped";
      } else {
        run.status = "pending";
      }
      run.outputText = "";
      run.errorMessage = null;
      run.model = null;
      run.startedAt = null;
      run.finishedAt = null;
    }

    await writeStore(data);
  });
}

export async function updateRun(
  id: string,
  patch: Partial<
    Pick<
      AgentRunRecord,
      | "status"
      | "model"
      | "outputText"
      | "errorMessage"
      | "startedAt"
      | "finishedAt"
    >
  >,
): Promise<void> {
  await locked(async () => {
    const data = await readStore();
    const run = data.runs.find((r) => r.id === id);
    if (!run) return;
    Object.assign(run, patch);
    await writeStore(data);
  });
}

export async function resetActiveRuns(orderId: string): Promise<void> {
  await locked(async () => {
    const data = await readStore();
    for (const run of data.runs.filter((r) => r.orderId === orderId)) {
      if (run.status === "skipped") continue;
      run.status = "pending";
      run.outputText = "";
      run.errorMessage = null;
      run.model = null;
      run.startedAt = null;
      run.finishedAt = null;
    }
    await writeStore(data);
  });
}

export function resetStoreCacheForTests(): void {
  cache = null;
  cacheFileMtimeMs = 0;
  queue = Promise.resolve();
}

export async function setOrderArchived(id: string, archived: boolean): Promise<void> {
  await updateOrder(id, { archived });
}

export async function deleteOrder(id: string): Promise<void> {
  await locked(async () => {
    const data = await readStore();
    const order = data.orders.find((item) => item.id === id);
    if (!order) {
      throw new Error("Pedido não encontrado.");
    }
    if (!order.archived) {
      throw new Error("Arquive o pedido antes de excluir permanentemente.");
    }
    if (order.status === "running" || order.status === "queued") {
      throw new Error("Não é possível excluir um pedido em andamento.");
    }
    data.orders = data.orders.filter((item) => item.id !== id);
    data.runs = data.runs.filter((run) => run.orderId !== id);
    await writeStore(data, { removedOrderIds: [id] });
  });
}

export async function cancelOrderPipeline(id: string): Promise<void> {
  await locked(async () => {
    const data = await readStore();
    const order = data.orders.find((item) => item.id === id);
    if (!order) {
      throw new Error("Pedido não encontrado.");
    }
    if (order.status !== "running" && order.status !== "queued") {
      throw new Error("Só é possível cancelar pedidos na fila ou em produção.");
    }
    order.status = "failed";
    order.currentAgent = null;
    order.errorMessage = "Cancelado pelo usuário.";
    order.updatedAt = nowIso();
    for (const run of data.runs.filter((item) => item.orderId === id)) {
      if (run.status === "running" || run.status === "pending") {
        run.status = "failed";
        run.errorMessage = "Cancelado pelo usuário.";
        run.finishedAt = nowIso();
      }
    }
    await writeStore(data);
  });
}

export function newId(): string {
  return cuid();
}

/**
 * Corrige inconsistências após restart (software sumido, planejamento
 * marcado como falha indevida). Persiste no disco.
 */
export async function reconcileStoreOnBoot(): Promise<number> {
  return locked(async () => {
    const data = await readStore();
    let fixes = 0;
    const byId = new Map(data.orders.map((order) => [order.id, order]));
    const stamp = nowIso();

    // Religa planejamento ↔ software pelo sourcePlanningOrderId.
    for (const order of data.orders) {
      if (!order.sourcePlanningOrderId) continue;
      order.orderKind = "software";
      const planning = byId.get(order.sourcePlanningOrderId);
      if (planning && planning.derivedSoftwareOrderId !== order.id) {
        planning.derivedSoftwareOrderId = order.id;
        planning.orderKind = "planning";
        planning.updatedAt = stamp;
        fixes += 1;
      }
    }

    // Restaura software apagado do JSON mas ainda presente em storage/.
    for (const planning of data.orders) {
      if (!planning.derivedSoftwareOrderId) continue;
      planning.orderKind = "planning";
      if (byId.has(planning.derivedSoftwareOrderId)) continue;

      const softwareId = planning.derivedSoftwareOrderId;
      const treePath = path.join(
        process.cwd(),
        "storage",
        "orders",
        softwareId,
        "tree.json",
      );
      if (!existsSync(treePath)) {
        planning.derivedSoftwareOrderId = null;
        planning.updatedAt = stamp;
        fixes += 1;
        continue;
      }

      const restored: OrderRecord = {
        name: planning.name,
        problem: planning.problem,
        audience: planning.audience,
        businessRules: planning.businessRules,
        deliverableType:
          planning.deliverableType === "C" ? "B" : planning.deliverableType,
        mobileStack: planning.mobileStack,
        frontendStack: planning.frontendStack,
        backendStack: planning.backendStack,
        databaseStack: planning.databaseStack,
        generateTestBuild: true,
        scopePreset: planning.scopePreset,
        includeMobile: planning.includeMobile,
        includeFrontend: planning.includeFrontend,
        includeBackend: planning.includeBackend,
        includeDatabase: planning.includeDatabase,
        includeAuth: planning.includeAuth,
        includeAdmin: planning.includeAdmin,
        uiStyle: planning.uiStyle,
        primaryColor: planning.primaryColor,
        uiReference: planning.uiReference,
        mvpEssentials: planning.mvpEssentials,
        mvpLater: planning.mvpLater,
        userRoles: planning.userRoles,
        mainFlows: planning.mainFlows,
        expectedScreens: planning.expectedScreens,
        domainTemplateId: planning.domainTemplateId,
        nfrOffline: planning.nfrOffline,
        nfrSync: planning.nfrSync,
        nfrScale: planning.nfrScale,
        nfrLocales: planning.nfrLocales,
        nfrPrivacy: planning.nfrPrivacy,
        nfrNotes: planning.nfrNotes,
        externalIntegrations: planning.externalIntegrations,
        mainEntities: planning.mainEntities,
        entityRelations: planning.entityRelations,
        successCriteria: planning.successCriteria,
        id: softwareId,
        userId: planning.userId,
        orderKind: "software",
        sourcePlanningOrderId: planning.id,
        derivedSoftwareOrderId: null,
        status: "completed",
        currentAgent: null,
        errorMessage: null,
        githubUrl: null,
        githubError: null,
        vercelUrl: null,
        vercelError: null,
        apkStatus: "idle",
        apkRunUrl: null,
        apkError: null,
        archived: false,
        createdAt: planning.updatedAt,
        updatedAt: stamp,
      };
      data.orders.unshift(restored);
      byId.set(softwareId, restored);

      const hasRuns = data.runs.some((run) => run.orderId === softwareId);
      if (!hasRuns) {
        const catalogOrder: AgentId[] = [
          "pm",
          "architect",
          "backend",
          "frontend",
          "qa",
          "devops",
        ];
        for (const [index, agent] of catalogOrder.entries()) {
          data.runs.push({
            id: cuid(),
            orderId: softwareId,
            agent,
            status:
              agent === "pm" || agent === "architect" ? "skipped" : "completed",
            model: null,
            outputText: "",
            errorMessage: null,
            startedAt: null,
            finishedAt: stamp,
            sortOrder: index,
          });
        }
      }
      fixes += 1;
    }

    // Planejamento “falhou” com software OK → restaura.
    for (const order of data.orders) {
      if (order.orderKind !== "planning") continue;
      if (order.status !== "failed") continue;
      const derivedId = order.derivedSoftwareOrderId;
      if (!derivedId) continue;
      const derived = byId.get(derivedId);
      if (derived?.status === "completed") {
        order.status = "completed";
        order.errorMessage = null;
        order.currentAgent = null;
        order.updatedAt = stamp;
        fixes += 1;
      }
    }

    // Software com tree.json mas status failed por escopo → completed.
    for (const order of data.orders) {
      if (order.orderKind !== "software") continue;
      if (order.status !== "failed") continue;
      if (!order.errorMessage?.includes("Entrega incompleta")) continue;
      const treePath = path.join(
        process.cwd(),
        "storage",
        "orders",
        order.id,
        "tree.json",
      );
      if (!existsSync(treePath)) continue;
      order.status = "completed";
      order.errorMessage = null;
      order.currentAgent = null;
      order.updatedAt = stamp;
      fixes += 1;
    }

    // Erros só de entrega (GitHub/APK) não devem marcar produto como quebrado.
    for (const order of data.orders) {
      if (order.status !== "completed") continue;
      if (
        order.githubError &&
        /BadObjectState|GitRPC|fetch failed/i.test(order.githubError)
      ) {
        order.githubError = null;
        order.updatedAt = stamp;
        fixes += 1;
      }
      if (
        order.apkStatus === "failed" &&
        /Workflow falhou|interrompido|BadObjectState|fetch failed/i.test(
          order.apkError ?? "",
        )
      ) {
        order.apkStatus = "idle";
        order.apkError = null;
        order.updatedAt = stamp;
        fixes += 1;
      }
    }

    // Planejamento com “Entrega incompleta” e software no storage → completed.
    for (const order of data.orders) {
      if (order.orderKind !== "planning") continue;
      if (order.status !== "failed") continue;
      if (!order.errorMessage?.includes("Entrega incompleta")) continue;
      const derivedId = order.derivedSoftwareOrderId;
      const derivedOk =
        (derivedId && byId.get(derivedId)?.status === "completed") ||
        (derivedId &&
          existsSync(
            path.join(process.cwd(), "storage", "orders", derivedId, "tree.json"),
          ));
      if (!derivedOk) continue;
      order.status = "completed";
      order.errorMessage = null;
      order.currentAgent = null;
      order.updatedAt = stamp;
      fixes += 1;
    }

    if (fixes > 0) {
      await writeStore(data);
    }
    return fixes;
  });
}

export type { DeliverableType };
