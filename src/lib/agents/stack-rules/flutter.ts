import type { AgentId } from "@/lib/types";
import type { OrderInput } from "@/lib/types";

export function flutterStackRules(agent: AgentId, order: OrderInput): string {
  const standalone =
    order.includeMobile && !order.includeBackend && !order.includeFrontend;

  if (agent === "frontend" || agent === "architect") {
    const lines = [
      "Flutter (Dart):",
      "- Estrutura: mobile/lib/main.dart, core/, features/, theme/",
      "- pubspec.yaml com name, description e dependências usadas (go_router, riverpod, shared_preferences, etc.)",
      "- Para renderizar HTML use flutter_widget_from_html_core (^0.16.0) com HtmlWidget — NÃO use flutter_html nem flutter_widget_from_html (puxam audio_session e quebram o CI)",
      "- chewie ^1.11+ exige Flutter 3.27+ no CI (GitHub Actions da Fábrica usa 3.35.1)",
      "- Imports relativos corretos entre lib/features/… e lib/core/… (verifique cada import antes de responder)",
      "- ThemeData.fromSeed com a cor primária do pedido; evite telas placeholder",
    ];
    if (standalone) {
      lines.push(
        "- App standalone: estado local (shared_preferences/hive), sem HTTP obrigatório",
        "- mobile/README.md com flutter pub get && flutter run",
        "- NÃO crie backend/, frontend/, mock/ nem docker-compose",
      );
    } else {
      lines.push(
        "- Repositórios API quando USE_MOCK_API=false; base URL documentada",
        "- mobile/run-dev.ps1 para celular físico (IP LAN)",
      );
    }
    return lines.join("\n");
  }

  if (agent === "qa") {
    return [
      "Flutter QA:",
      "- Verifique mobile/lib/main.dart e imports relativos quebrados",
      "- pubspec.yaml declara pacotes usados nos imports package:",
      "- flutter analyze não deve falhar por arquivo inexistente",
    ].join("\n");
  }

  if (agent === "devops" && standalone) {
    return "Flutter entrega: documente flutter pub get && flutter run em mobile/README.md ou README raiz.";
  }

  return "";
}
