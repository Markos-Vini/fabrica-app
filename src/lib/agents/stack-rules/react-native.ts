import type { AgentId } from "@/lib/types";

export function reactNativeStackRules(agent: AgentId): string {
  if (agent === "frontend" || agent === "architect") {
    return [
      "React Native (Expo):",
      "- mobile/package.json, mobile/app.json, mobile/App.tsx (ou app/ com Expo Router)",
      "- mobile/index.js registrando o componente raiz",
      "- Dependências usadas nos imports devem estar no package.json",
      "- Para APK: projeto deve suportar expo prebuild --platform android",
    ].join("\n");
  }
  if (agent === "qa") {
    return "React Native QA: App.tsx existe, imports relativos resolvem, app.json com name/slug.";
  }
  if (agent === "devops") {
    return "React Native: README com cd mobile && npm install && npx expo start.";
  }
  return "";
}
