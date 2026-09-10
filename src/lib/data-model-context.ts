import type { OrderInput } from "@/lib/types";
import { parseOptionalText } from "@/lib/product-context";

export const ENTITY_GROUPS = ["Core", "Comércio", "Agenda", "Outros"] as const;

export const ENTITY_OPTIONS = [
  { id: "user", label: "Usuário", group: "Core" },
  { id: "task", label: "Tarefa / Item", group: "Core" },
  { id: "category", label: "Categoria", group: "Core" },
  { id: "tag", label: "Tag / Etiqueta", group: "Core" },
  { id: "product", label: "Produto", group: "Comércio" },
  { id: "order", label: "Pedido", group: "Comércio" },
  { id: "cart", label: "Carrinho", group: "Comércio" },
  { id: "payment", label: "Pagamento", group: "Comércio" },
  { id: "address", label: "Endereço", group: "Comércio" },
  { id: "appointment", label: "Agendamento / Reserva", group: "Agenda" },
  { id: "service", label: "Serviço (catálogo)", group: "Agenda" },
  { id: "slot", label: "Slot / Horário", group: "Agenda" },
  { id: "notification", label: "Notificação", group: "Outros" },
  { id: "file", label: "Arquivo / Anexo", group: "Outros" },
  { id: "review", label: "Avaliação / Comentário", group: "Outros" },
] as const;

export type EntityId = (typeof ENTITY_OPTIONS)[number]["id"];

export type DataModelDefaults = {
  entities: EntityId[];
  entitiesCustom: string;
  entityRelations: string;
};

export function parseMainEntitiesFromForm(formData: FormData): string | null {
  const selected = ENTITY_OPTIONS.filter(
    (opt) => formData.get(`entity_${opt.id}`) === "on",
  ).map((opt) => opt.label);
  const custom = String(formData.get("entitiesCustom") ?? "").trim();
  if (custom) selected.push(custom);
  if (selected.length === 0) return null;
  return selected.join(", ");
}

export function parseEntityRelationsFromForm(formData: FormData): string | null {
  return parseOptionalText(formData.get("entityRelations"), 2000);
}

export function dataModelBriefForPrompt(order: OrderInput): string {
  const entities = order.mainEntities?.trim();
  const relations = order.entityRelations?.trim();
  if (!entities && !relations) return "";

  const lines: string[] = [];
  if (entities) {
    lines.push(`Entidades principais:\n${entities}`);
  }
  if (relations) {
    lines.push(`Relações entre entidades:\n${relations}`);
  }
  return `${lines.join("\n\n")}\n\nUse como base para docs/MODELO-DADOS.md, schema Prisma/SQL e DTOs — mantenha nomes consistentes entre backend, mobile e web.`;
}

export function dataModelReviewFromForm(formData: FormData): string {
  const entities = parseMainEntitiesFromForm(formData);
  const relations = parseEntityRelationsFromForm(formData);
  return [entities, relations ? `Relações: ${relations}` : null]
    .filter(Boolean)
    .join(" · ");
}

export function entityLabels(ids: EntityId[]): string {
  return ids
    .map((id) => ENTITY_OPTIONS.find((opt) => opt.id === id)?.label ?? id)
    .join(", ");
}
