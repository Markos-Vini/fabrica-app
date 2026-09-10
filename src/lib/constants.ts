import type { DeliverableType } from "@/lib/types";

export const DELIVERABLE_OPTIONS: {
  id: DeliverableType;
  title: string;
  description: string;
}[] = [
  {
    id: "A",
    title: "Apenas documentação",
    description: "PRD, protótipo em Markdown/Mermaid e arquitetura.",
  },
  {
    id: "B",
    title: "Apenas MVP / protótipo funcional",
    description: "Código das camadas escolhidas, sem dossiê completo.",
  },
  {
    id: "C",
    title: "MVP + documentação técnica",
    description: "Código e documentos no mesmo pacote.",
  },
  {
    id: "D",
    title: "Aplicação completa",
    description: "Código, banco, testes e documentação.",
  },
];

/** Opções da Etapa 2 — software a partir do planejamento aprovado. */
export const SOFTWARE_FROM_PLANNING_OPTIONS: {
  id: Extract<DeliverableType, "B" | "D">;
  title: string;
  description: string;
  bullets: string[];
  apkFriendly?: boolean;
}[] = [
  {
    id: "B",
    title: "MVP básico",
    description:
      "Código funcional + documentação do planejamento no ZIP. Foco em testar rápido (Vercel/APK).",
    bullets: [
      "App/API/web conforme o escopo",
      "Docs do planejamento incluídas no pacote",
      "Melhor opção para demo e APK de teste",
    ],
    apkFriendly: true,
  },
  {
    id: "D",
    title: "Pacote completo",
    description:
      "Tudo do MVP básico, com testes smoke e empacotamento mais próximo de produção.",
    bullets: [
      "Código + documentação do planejamento",
      "Testes smoke e docker-compose quando aplicável",
      "Para entrega mais robusta ao time de TI",
    ],
  },
];

/** Rótulo amigável do tier de software (Etapa 2). */
export function softwareTierLabel(
  deliverableType: DeliverableType,
): string {
  if (deliverableType === "D") return "Pacote completo";
  if (deliverableType === "B") return "MVP básico";
  if (deliverableType === "C") return "MVP + docs (legado)";
  if (deliverableType === "A") return "Apenas documentação";
  return deliverableType;
}

export const MOBILE_STACKS = [
  "Flutter (Dart)",
  "React Native (TS/JS)",
  "Native (Kotlin/Swift)",
  "PWA/Web Mobile",
];

export const FRONTEND_STACKS = [
  "React.js / Next.js",
  "Vue.js / Nuxt.js",
  "Angular",
  "HTML/CSS/JS puro",
];

export const BACKEND_STACKS = [
  "Node.js (Express/NestJS)",
  "Python (FastAPI/Django)",
  "Java (Spring Boot)",
  "C# (.NET Core)",
  "PHP (Laravel)",
];

export const DATABASE_STACKS = [
  "PostgreSQL",
  "MySQL",
  "SQLite",
  "MongoDB",
  "Firebase",
  "Supabase",
];
