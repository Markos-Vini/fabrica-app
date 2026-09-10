import type { AgentId } from "@/lib/types";
import type { OrderInput } from "@/lib/types";

export function nestJsStackRules(agent: AgentId, order: OrderInput): string {
  if (agent === "backend" || agent === "architect") {
    const lines = [
      "Node.js (NestJS/Express):",
      "- backend/package.json + src/main.ts (ou index.ts) como entry",
      "- Escute HOST=0.0.0.0 para testes na rede local",
      "- backend/.env.example com PORT, DATABASE_URL e PUBLIC_BASE_URL quando aplicável",
      "- Módulos Nest: src/app.module.ts, controllers, services — imports consistentes",
    ];
    if (order.includeDatabase) {
      lines.push(
        "- backend/prisma/schema.prisma + seed ou migration inicial",
        "- Scripts npm: prisma migrate dev, prisma db seed",
      );
    }
    return lines.join("\n");
  }
  if (agent === "qa") {
    return "Back-end QA: package.json, main.ts, prisma/schema quando houver banco, imports entre módulos.";
  }
  if (agent === "devops") {
    return "Back-end: docker-compose com banco + npm run start:dev documentado no README.";
  }
  return "";
}
