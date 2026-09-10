import { notFound } from "next/navigation";
import { AppFrame } from "@/components/AppFrame";
import { ProjectDetailView } from "@/components/ProjectDetailView";
import { findProductProject } from "@/lib/order-projects";
import { listOrdersForUser } from "@/lib/store";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireSession();
  const orders = await listOrdersForUser(user, { includeArchived: true });
  const project = findProductProject(orders, id);

  if (!project) notFound();

  return (
    <AppFrame>
      <div className="mx-auto max-w-5xl">
        <ProjectDetailView project={project} />
      </div>
    </AppFrame>
  );
}
