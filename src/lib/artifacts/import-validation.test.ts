import { describe, expect, it } from "vitest";
import {
  formatImportGapMessage,
  validateGeneratedImports,
} from "./import-validation";
import type { OrderInput } from "@/lib/types";

const appOnlyOrder: OrderInput = {
  name: "Calc",
  problem: "x",
  audience: "y",
  businessRules: "z",
  deliverableType: "B",
  mobileStack: "Flutter (Dart)",
  frontendStack: "React.js / Next.js",
  backendStack: "Node.js (Express/NestJS)",
  databaseStack: "PostgreSQL",
  generateTestBuild: false,
  scopePreset: "app-only",
  includeMobile: true,
  includeFrontend: false,
  includeBackend: false,
  includeDatabase: false,
  includeAuth: false,
  includeAdmin: false,
};

describe("validateGeneratedImports", () => {
  it("passa quando imports relativos resolvem", () => {
    const gaps = validateGeneratedImports(appOnlyOrder, {
      "mobile/lib/main.dart": "import 'features/home/home_screen.dart';",
      "mobile/lib/features/home/home_screen.dart": "import 'package:flutter/material.dart';",
    });
    expect(gaps).toHaveLength(0);
  });

  it("detecta import Dart quebrado", () => {
    const gaps = validateGeneratedImports(appOnlyOrder, {
      "mobile/lib/main.dart": "import '../theme/theme_controller.dart';",
    });
    expect(gaps).toHaveLength(1);
    expect(gaps[0]?.importPath).toBe("../theme/theme_controller.dart");
  });

  it("detecta import TypeScript relativo quebrado", () => {
    const order = { ...appOnlyOrder, includeFrontend: true, includeMobile: false };
    const gaps = validateGeneratedImports(order, {
      "frontend/app/page.tsx": "import { Button } from '../components/Button';",
    });
    expect(gaps).toHaveLength(1);
    expect(gaps[0]?.file).toBe("frontend/app/page.tsx");
  });

  it("resolve alias @/ para frontend/src", () => {
    const order = { ...appOnlyOrder, includeFrontend: true, includeMobile: false };
    const gaps = validateGeneratedImports(order, {
      "frontend/app/page.tsx": "import { Card } from '@/components/Card';",
      "frontend/src/components/Card.tsx": "export function Card() {}",
    });
    expect(gaps).toHaveLength(0);
  });

  it("ignora pedidos só de documentação", () => {
    const gaps = validateGeneratedImports(
      { ...appOnlyOrder, includeMobile: false },
      { "docs/PRD.md": "# PRD" },
    );
    expect(gaps).toHaveLength(0);
  });
});

describe("formatImportGapMessage", () => {
  it("formata mensagem legível", () => {
    const msg = formatImportGapMessage([
      {
        file: "mobile/lib/main.dart",
        importPath: "../missing.dart",
        expected: "mobile/missing.dart",
      },
    ]);
    expect(msg).toContain("Imports quebrados");
    expect(msg).toContain("main.dart");
  });
});
