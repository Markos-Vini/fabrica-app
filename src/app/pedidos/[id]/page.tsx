import { notFound } from "next/navigation";
import { AppFrame } from "@/components/AppFrame";
import { PipelineView } from "@/components/PipelineView";
import { createResourceDownloadToken } from "@/lib/download-token";
import { detectLanOrigin } from "@/lib/lan-origin";
import { sessionSecret } from "@/lib/env";
import { loadCollectedFiles } from "@/lib/agents/deliver";
import { extractDemoAccounts } from "@/lib/delivery/demo-accounts";
import type { DemoAccount } from "@/lib/delivery/demo-accounts";
import { listJobsForOrder } from "@/lib/jobs/store";
import { findProjectContainingOrder } from "@/lib/order-projects";
import { getPublicSettings } from "@/lib/settings";
import { getOrder, getOrderIfAllowed, listOrdersForUser, type OrderRecord } from "@/lib/store";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireSession();
  const [data, settings, allOrders, initialJobs, collectedFiles] = await Promise.all([
    getOrderIfAllowed(id, user, { fresh: true }),
    getPublicSettings(),
    listOrdersForUser(user),
    listJobsForOrder(id),
    loadCollectedFiles(id),
  ]);
  if (!data) notFound();

  const demoAccounts: DemoAccount[] = collectedFiles
    ? extractDemoAccounts(collectedFiles)
    : [];

  const project = findProjectContainingOrder(allOrders, id);
  const apkAccessToken = createResourceDownloadToken(id, "apk", sessionSecret());

  let derivedSoftware: OrderRecord | null = null;
  if (data.order.derivedSoftwareOrderId) {
    derivedSoftware =
      (await getOrder(data.order.derivedSoftwareOrderId))?.order ?? null;
  }

  return (
    <AppFrame>
      <PipelineView
        orderId={id}
        initialOrder={data.order}
        initialRuns={data.runs}
        derivedSoftware={derivedSoftware}
        publicBaseUrl={settings.publicBaseUrl}
        suggestedLanOrigin={detectLanOrigin() ?? ""}
        projectId={project?.id ?? null}
        apkAccessToken={apkAccessToken}
        vercelConfigured={settings.vercelConfigured}
        initialJobs={initialJobs}
        demoAccounts={demoAccounts}
      />
    </AppFrame>
  );
}
