import type { AgentId } from "@/lib/types";
import type { OrderInput } from "@/lib/types";
import { flutterStackRules } from "./flutter";
import { nestJsStackRules } from "./nestjs";
import { nextJsStackRules } from "./nextjs";
import { reactNativeStackRules } from "./react-native";

function includes(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

/** Regras de engenharia específicas por stack — injetadas nos prompts dos agentes. */
export function stackRulesForAgent(agent: AgentId, order: OrderInput): string {
  const parts: string[] = [];

  if (order.includeMobile) {
    if (includes(order.mobileStack, "flutter")) {
      parts.push(flutterStackRules(agent, order));
    } else if (includes(order.mobileStack, "react native")) {
      parts.push(reactNativeStackRules(agent));
    }
  }

  if (order.includeFrontend && includes(order.frontendStack, "next")) {
    parts.push(nextJsStackRules(agent));
  }

  if (
    order.includeBackend &&
    includes(order.backendStack, "node") &&
    (includes(order.backendStack, "nest") || includes(order.backendStack, "express"))
  ) {
    parts.push(nestJsStackRules(agent, order));
  }

  return parts.filter(Boolean).join("\n\n");
}
