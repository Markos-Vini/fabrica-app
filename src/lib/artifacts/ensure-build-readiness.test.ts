import { describe, expect, it } from "vitest";
import {
  ensureBuildReadiness,
  prepareFlutterCi,
  repairFrontendTypes,
} from "./ensure-build-readiness";
import type { OrderInput } from "@/lib/types";

const fullOrder: OrderInput = {
  name: "Educa",
  problem: "Treinamento",
  audience: "RH",
  businessRules: "RN-01",
  deliverableType: "C",
  mobileStack: "Flutter (Dart)",
  frontendStack: "React.js / Next.js",
  backendStack: "Node.js (Express/NestJS)",
  databaseStack: "PostgreSQL",
  generateTestBuild: true,
  scopePreset: "full",
  includeMobile: true,
  includeFrontend: true,
  includeBackend: true,
  includeDatabase: true,
  includeAuth: true,
  includeAdmin: true,
};

describe("prepareFlutterCi", () => {
  it("remove android parcial sem MainActivity", () => {
    const files = {
      "mobile/lib/main.dart": "void main() {}",
      "mobile/android/app/src/debug/AndroidManifest.xml": "<manifest/>",
    };
    prepareFlutterCi(files);
    expect(files["mobile/android/app/src/debug/AndroidManifest.xml"]).toBeUndefined();
    expect(files["mobile/lib/main.dart"]).toBeDefined();
  });

  it("mantém android completo com MainActivity", () => {
    const files = {
      "mobile/android/app/src/main/kotlin/com/app/MainActivity.kt": "class MainActivity",
    };
    prepareFlutterCi(files);
    expect(files["mobile/android/app/src/main/kotlin/com/app/MainActivity.kt"]).toBeDefined();
  });
});

describe("repairFrontendTypes", () => {
  it("corrige Curso vs CursoListItem/CursoDetalhe no client", () => {
    const files = {
      "frontend/lib/types.ts": `export interface AuthResponse { token: string }
export interface CursoListItem { id: string; modulosCount: number }
export interface CursoDetalhe { id: string; modulos: { id: string }[] }`,
      "frontend/lib/api/client.ts": `import type { Curso, LoginResponse, PaginatedMeta } from '../types';
export const api = {
  login: () => request<LoginResponse>('/auth/login'),
  getCursos: () => request<{ items: Curso[]; meta: PaginatedMeta }>('/cursos'),
  getCurso: (id: string) => request<Curso>(\`/cursos/\${id}\`),
};`,
    };
    repairFrontendTypes(files);
    expect(files["frontend/lib/types.ts"]).toContain("export type LoginResponse");
    expect(files["frontend/lib/api/client.ts"]).toContain("CursoListItem[]");
    expect(files["frontend/lib/api/client.ts"]).toContain("request<CursoDetalhe>");
    expect(files["frontend/lib/api/client.ts"]).not.toContain("LoginResponse");
  });
});

describe("ensureBuildReadiness", () => {
  it("aplica reparos de front e flutter", () => {
    const files = {
      "frontend/lib/types.ts": "export interface AuthResponse { x: string }\nexport interface CursoListItem { id: string }\nexport interface CursoDetalhe { id: string; modulos: [] }",
      "frontend/lib/api/client.ts": "import type { Curso } from '../types';\nexport const x = request<Curso>('/cursos/1');",
      "mobile/android/app/src/debug/AndroidManifest.xml": "<manifest/>",
    };
    ensureBuildReadiness(fullOrder, files);
    expect(files["mobile/android/app/src/debug/AndroidManifest.xml"]).toBeUndefined();
    expect(files["frontend/lib/api/client.ts"]).toContain("CursoDetalhe");
  });
});
