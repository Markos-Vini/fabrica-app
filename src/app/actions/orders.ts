"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { agentsForPipeline } from "@/lib/agents/plan";
import { regeneratePlanningDocs } from "@/lib/agents/regenerate-planning";
import { repairSoftwareDelivery } from "@/lib/agents/software-finalize";
import type { RegeneratePlanningMode } from "@/lib/agents/regenerate-planning";
import { orderKindFromForm, isPlanningOrder } from "@/lib/factory-mode";
import { enqueueJob } from "@/lib/jobs/worker";
import {
  parseOrderInputFromForm,
  planningEditEligibility,
} from "@/lib/order-form";
import {
  cancelOrderPipeline,
  createOrder,
  deleteOrder,
  getOrder,
  getOrderIfAllowed,
  replaceOrderInput,
  setOrderArchived,
  updateOrder,
  resetActiveRuns,
} from "@/lib/store";
import { requireSession } from "@/lib/session";
import type { DeliverableType, OrderInput } from "@/lib/types";

function orderInputFromRecord(
  order: OrderInput,
  overrides: Partial<OrderInput> = {},
): OrderInput {
  return {
    name: order.name,
    problem: order.problem,
    audience: order.audience,
    businessRules: order.businessRules,
    deliverableType: order.deliverableType,
    mobileStack: order.mobileStack,
    frontendStack: order.frontendStack,
    backendStack: order.backendStack,
    databaseStack: order.databaseStack,
    generateTestBuild: order.generateTestBuild,
    scopePreset: order.scopePreset,
    includeMobile: order.includeMobile,
    includeFrontend: order.includeFrontend,
    includeBackend: order.includeBackend,
    includeDatabase: order.includeDatabase,
    includeAuth: order.includeAuth,
    includeAdmin: order.includeAdmin,
    uiStyle: order.uiStyle,
    primaryColor: order.primaryColor,
    uiReference: order.uiReference,
    mvpEssentials: order.mvpEssentials,
    mvpLater: order.mvpLater,
    userRoles: order.userRoles,
    mainFlows: order.mainFlows,
    expectedScreens: order.expectedScreens,
    domainTemplateId: order.domainTemplateId,
    nfrOffline: order.nfrOffline,
    nfrSync: order.nfrSync,
    nfrScale: order.nfrScale,
    nfrLocales: order.nfrLocales,
    nfrPrivacy: order.nfrPrivacy,
    nfrNotes: order.nfrNotes,
    externalIntegrations: order.externalIntegrations,
    mainEntities: order.mainEntities,
    entityRelations: order.entityRelations,
    successCriteria: order.successCriteria,
    ...overrides,
  };
}

export async function createOrderAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const user = await requireSession();
  const orderKind = orderKindFromForm(formData.get("orderKind"));
  if (orderKind !== "planning") {
    return {
      error:
        "Novos pedidos devem começar com planejamento. Gere o software na Etapa 2, a partir de um planejamento concluído.",
    };
  }
  const parsed = parseOrderInputFromForm(formData, { orderKind });
  if (parsed.error) return { error: parsed.error };

  const created = await createOrder(
    parsed.input,
    agentsForPipeline(orderKind, parsed.input.deliverableType, parsed.scope),
    user.id,
    { orderKind },
  );
  await enqueueJob({ type: "pipeline", orderId: created.order.id });
  redirect(`/pedidos/${created.order.id}`);
}

export async function updatePlanningOrderAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const user = await requireSession();
  const orderId = String(formData.get("orderId") ?? "").trim();
  if (!orderId) return { error: "Pedido inválido." };

  const loaded = await getOrderIfAllowed(orderId, user);
  if (!loaded) return { error: "Pedido não encontrado." };

  let derived = null;
  if (loaded.order.derivedSoftwareOrderId) {
    derived = (await getOrder(loaded.order.derivedSoftwareOrderId))?.order ?? null;
  }

  const eligibility = planningEditEligibility(loaded.order, derived);
  if (!eligibility.allowed) {
    return { error: eligibility.reason ?? "Não é possível editar este pedido." };
  }

  const parsed = parseOrderInputFromForm(formData, { orderKind: "planning" });
  if (parsed.error) return { error: parsed.error };

  await replaceOrderInput(
    orderId,
    parsed.input,
    agentsForPipeline("planning", parsed.input.deliverableType, parsed.scope),
  );
  await enqueueJob({ type: "pipeline", orderId });
  redirect(`/pedidos/${orderId}`);
}

export async function createSoftwareFromPlanningAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const user = await requireSession();
  const planningOrderId = String(formData.get("planningOrderId") ?? "").trim();
  const deliverableType = String(
    formData.get("deliverableType") ?? "C",
  ) as DeliverableType;

  if (!planningOrderId) {
    return { error: "Pedido de planejamento inválido." };
  }
  if (!["B", "D"].includes(deliverableType)) {
    return { error: "Escolha MVP básico ou pacote completo para gerar software." };
  }

  const loaded = await getOrderIfAllowed(planningOrderId, user);
  if (!loaded || loaded.order.status !== "completed") {
    return { error: "Planejamento não encontrado ou ainda não concluído." };
  }
  if (!isPlanningOrder(loaded.order)) {
    return { error: "Este pedido não é um planejamento." };
  }

  const planning = loaded.order;
  const scope = {
    includeMobile: planning.includeMobile,
    includeFrontend: planning.includeFrontend,
    includeBackend: planning.includeBackend,
    includeDatabase: planning.includeDatabase,
    includeAuth: planning.includeAuth,
    includeAdmin: planning.includeAdmin,
  };

  const input = orderInputFromRecord(planning, {
    deliverableType,
    generateTestBuild: formData.get("generateTestBuild") === "on",
  });

  const created = await createOrder(
    input,
    agentsForPipeline("software", deliverableType, scope, {
      fromApprovedPlanning: true,
    }),
    user.id,
    { orderKind: "software", sourcePlanningOrderId: planningOrderId },
  );

  await updateOrder(planningOrderId, {
    derivedSoftwareOrderId: created.order.id,
  });

  await enqueueJob({ type: "pipeline", orderId: created.order.id });
  redirect(`/pedidos/${created.order.id}`);
}

export async function rerunPipelineAction(
  orderId: string,
): Promise<{ ok?: boolean; error?: string }> {
  const user = await requireSession();
  const loaded = await getOrderIfAllowed(orderId, user);
  if (!loaded) return { error: "Pedido não encontrado." };
  await resetActiveRuns(orderId);
  await updateOrder(orderId, {
    status: "queued",
    currentAgent: null,
    errorMessage: null,
  });
  const job = await enqueueJob({ type: "pipeline", orderId });
  if (!job) return { error: "Já existe uma esteira em processamento para este pedido." };
  revalidatePath(`/pedidos/${orderId}`);
  revalidatePath("/");
  return { ok: true };
}

export async function cancelPipelineAction(
  orderId: string,
): Promise<{ ok?: boolean; error?: string }> {
  const user = await requireSession();
  const loaded = await getOrderIfAllowed(orderId, user);
  if (!loaded) return { error: "Pedido não encontrado." };
  try {
    const { cancelPendingJobsForOrder } = await import("@/lib/jobs/store");
    await cancelPendingJobsForOrder(orderId);
    await cancelOrderPipeline(orderId);
    revalidatePath(`/pedidos/${orderId}`);
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Falha ao cancelar pedido.",
    };
  }
}

export async function archiveOrderAction(
  orderId: string,
): Promise<{ ok?: boolean; error?: string }> {
  const user = await requireSession();
  const loaded = await getOrderIfAllowed(orderId, user);
  if (!loaded) return { error: "Pedido não encontrado." };
  if (loaded.order.status === "running" || loaded.order.status === "queued") {
    return { error: "Cancele ou aguarde a conclusão antes de arquivar." };
  }
  await setOrderArchived(orderId, true);
  revalidatePath(`/pedidos/${orderId}`);
  revalidatePath("/");
  return { ok: true };
}

export async function unarchiveOrderAction(
  orderId: string,
): Promise<{ ok?: boolean; error?: string }> {
  const user = await requireSession();
  const loaded = await getOrderIfAllowed(orderId, user);
  if (!loaded) return { error: "Pedido não encontrado." };
  await setOrderArchived(orderId, false);
  revalidatePath(`/pedidos/${orderId}`);
  revalidatePath("/");
  return { ok: true };
}

export async function deleteOrderAction(
  orderId: string,
): Promise<{ ok?: boolean; error?: string }> {
  const user = await requireSession();
  const loaded = await getOrderIfAllowed(orderId, user);
  if (!loaded) return { error: "Pedido não encontrado." };
  try {
    await deleteOrder(orderId);
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Falha ao excluir pedido.",
    };
  }
}

export async function republishAction(orderId: string): Promise<void> {
  const user = await requireSession();
  const loaded = await getOrderIfAllowed(orderId, user);
  if (!loaded || loaded.order.status !== "completed") return;
  await enqueueJob({ type: "publish", orderId });
  revalidatePath(`/pedidos/${orderId}`);
}

export async function triggerApkAction(orderId: string): Promise<void> {
  const user = await requireSession();
  const loaded = await getOrderIfAllowed(orderId, user);
  if (!loaded || loaded.order.status !== "completed") return;
  await updateOrder(orderId, {
    apkStatus: "building",
    apkError: null,
  });
  const enqueued = await enqueueJob({ type: "apk", orderId });
  if (!enqueued) return;
  revalidatePath(`/pedidos/${orderId}`);
}

export async function cancelDeliveryAction(
  orderId: string,
): Promise<{ ok?: boolean; error?: string }> {
  const user = await requireSession();
  const loaded = await getOrderIfAllowed(orderId, user);
  if (!loaded) return { error: "Pedido não encontrado." };

  const { cancelDeliveryJobsForOrder, hasActiveJob } = await import("@/lib/jobs/store");
  const publishWasActive = await hasActiveJob(orderId, "publish");
  const cancelled = await cancelDeliveryJobsForOrder(orderId);

  const order = loaded.order;
  const patch: {
    apkStatus?: "failed";
    apkError?: string;
    vercelError?: string;
  } = {};

  if (order.apkStatus === "building") {
    patch.apkStatus = "failed";
    patch.apkError = "Cancelado pelo usuário.";
  }
  if (publishWasActive && order.includeFrontend && !order.vercelUrl) {
    patch.vercelError = "Cancelado pelo usuário.";
  }

  if (cancelled === 0 && Object.keys(patch).length === 0) {
    return { error: "Nenhuma publicação ou build em andamento." };
  }

  if (Object.keys(patch).length > 0) {
    await updateOrder(orderId, patch);
  }

  revalidatePath(`/pedidos/${orderId}`);
  return { ok: true };
}

export async function regeneratePlanningDocsAction(
  orderId: string,
  mode: RegeneratePlanningMode = "merge",
): Promise<{ ok?: boolean; error?: string; fileCount?: number }> {
  const user = await requireSession();
  const loaded = await getOrderIfAllowed(orderId, user);
  if (!loaded || loaded.order.status !== "completed") {
    return { error: "Pedido não encontrado ou ainda não concluído." };
  }
  if (!isPlanningOrder(loaded.order)) {
    return { error: "Disponível apenas em pedidos de planejamento." };
  }
  try {
    const result = await regeneratePlanningDocs(orderId, mode);
    revalidatePath(`/pedidos/${orderId}`);
    return { ok: true, fileCount: result.fileCount };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Falha ao regenerar documentação.",
    };
  }
}

export async function repairSoftwareDeliveryAction(
  orderId: string,
): Promise<{ ok?: boolean; error?: string; fileCount?: number }> {
  const user = await requireSession();
  const loaded = await getOrderIfAllowed(orderId, user);
  if (!loaded) return { error: "Pedido não encontrado." };
  if (isPlanningOrder(loaded.order)) {
    return { error: "Disponível apenas em pedidos de software." };
  }
  if (loaded.order.status !== "failed") {
    return { error: "Reparo disponível só para pedidos com falha na entrega." };
  }
  const result = await repairSoftwareDelivery(orderId);
  revalidatePath(`/pedidos/${orderId}`);
  if (!result.ok) return { error: result.error };
  return { ok: true, fileCount: result.fileCount };
}
