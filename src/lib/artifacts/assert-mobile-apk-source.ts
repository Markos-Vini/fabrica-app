import type { OrderInput } from "@/lib/types";
import { isTasklistOrder } from "./tasklist-order";

/**
 * Garante que o pacote mobile no GitHub reflete este pedido — não template TaskList/placeholder.
 */
export function assertMobileApkSource(
  order: OrderInput,
  files: Record<string, string>,
): void {
  const main = files["mobile/lib/main.dart"]?.trim() ?? "";
  if (!main) {
    throw new Error(
      "mobile/lib/main.dart ausente no pacote. Republicar no GitHub antes de gerar o APK.",
    );
  }
  if (main.includes("PreviewApp")) {
    throw new Error(
      "O app mobile ainda é placeholder. Conclua a esteira ou republicar antes do APK.",
    );
  }
  if (main.includes("TaskListApp") && !isTasklistOrder(order)) {
    throw new Error(
      "O pacote mobile contém o template TaskList da Fábrica, não o app deste pedido. Republicar e gerar o APK de novo.",
    );
  }
}
