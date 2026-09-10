import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { stripPlanningPollution } from "@/lib/artifacts/agent-disk-recovery";
import { mergePlanningBaseline } from "@/lib/artifacts/planning-content";
import { generatePlanningPackage } from "@/lib/artifacts/planning-factory";
import { collectPlanningDocSources } from "@/lib/artifacts/planning-sources";
import { zipFiles } from "@/lib/artifacts/packager";
import { slugify } from "@/lib/artifacts/slug";
import {
  orderWorkspaceDir,
  syncCollectedToWorkspace,
} from "@/lib/artifacts/order-workspace";
import { getOrder, updateOrder } from "@/lib/store";
import type { OrderInput } from "@/lib/types";

export type RegeneratePlanningMode = "merge" | "template";

export async function regeneratePlanningDocs(
  orderId: string,
  mode: RegeneratePlanningMode = "merge",
): Promise<{ fileCount: number; source: RegeneratePlanningMode }> {
  const loaded = await getOrder(orderId);
  if (!loaded) throw new Error("Pedido não encontrado");
  if (loaded.order.status !== "completed") {
    throw new Error("Só é possível regenerar documentação de pedidos concluídos.");
  }

  const order = loaded.order as OrderInput;

  let files: Record<string, string>;
  if (mode === "template") {
    files = generatePlanningPackage(order);
  } else {
    const sources = await collectPlanningDocSources(orderId);
    files = mergePlanningBaseline(order, sources);
  }

  files = stripPlanningPollution(files);

  const dir = path.join(process.cwd(), "storage", "orders", orderId);
  await mkdir(dir, { recursive: true });
  await mkdir(orderWorkspaceDir(orderId), { recursive: true });
  await writeFile(path.join(dir, "tree.json"), JSON.stringify(files, null, 2), "utf8");
  await syncCollectedToWorkspace(orderId, files);

  const slug = slugify(order.name);
  const zip = await zipFiles(slug, files);
  await writeFile(path.join(dir, `${slug}.zip`), zip);

  await updateOrder(orderId, {});

  return { fileCount: Object.keys(files).length, source: mode };
}
