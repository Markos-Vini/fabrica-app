import type { OrderInput } from "@/lib/types";

/** Pedido de lista de tarefas (template TaskList). Sem deps Node — seguro no client. */
export function isTasklistOrder(order: Pick<OrderInput, "name" | "problem">): boolean {
  const hay = `${order.name} ${order.problem}`.toLowerCase();
  return (
    hay.includes("tarefa") ||
    hay.includes("task") ||
    hay.includes("todo") ||
    hay.includes("to-do") ||
    hay.includes("afazer")
  );
}
