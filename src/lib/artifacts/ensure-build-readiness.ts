import { repairFlutterPubspec } from "./ensure-flutter-deps";

export const FLUTTER_DEBUG_MANIFEST_PATH =
  "mobile/android/app/src/debug/AndroidManifest.xml";

function hasFlutterMainActivity(files: Record<string, string>): boolean {
  return Object.keys(files).some(
    (path) =>
      path.startsWith("mobile/android/") &&
      /MainActivity\.(kt|java)$/.test(path),
  );
}

/** Remove scaffold Android parcial — impede flutter create no CI e causa v1 embedding. */
export function prepareFlutterCi(files: Record<string, string>): void {
  if (!Object.keys(files).some((p) => p.startsWith("mobile/android/"))) {
    return;
  }
  if (hasFlutterMainActivity(files)) return;

  for (const path of Object.keys(files)) {
    if (path.startsWith("mobile/android/")) {
      delete files[path];
    }
  }
}

/** Corrige aliases e retornos comuns que quebram next build (strict). */
export function repairFrontendTypes(files: Record<string, string>): void {
  const typesPath = "frontend/lib/types.ts";
  const clientPath = "frontend/lib/api/client.ts";
  let types = files[typesPath];
  const client = files[clientPath];
  if (!types?.trim()) return;

  if (!/\bexport type LoginResponse\b/.test(types)) {
    types = types.replace(
      /export interface AuthResponse \{/,
      "export type LoginResponse = AuthResponse;\n\nexport interface AuthResponse {",
    );
  }

  files[typesPath] = types;

  if (!client?.trim()) {
    if (!/\bexport type Curso\b/.test(types) && types.includes("CursoDetalhe")) {
      files[typesPath] = types.replace(
        /export interface CursoDetalhe \{/,
        "export type Curso = CursoDetalhe;\n\nexport interface CursoDetalhe {",
      );
    }
    return;
  }

  let clientPatched = client.replace(/\bLoginResponse\b/g, "AuthResponse");

  if (/\bCurso\b/.test(clientPatched) && !clientPatched.includes("CursoListItem")) {
    clientPatched = clientPatched.replace(
      /import type \{([^}]+)\} from '\.\.\/types';/,
      (_match, inner: string) => {
        const names = inner
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean)
          .filter((s: string) => s !== "Curso");
        if (!names.includes("CursoListItem")) names.push("CursoListItem");
        if (!names.includes("CursoDetalhe")) names.push("CursoDetalhe");
        return `import type {\n  ${names.join(",\n  ")},\n} from '../types';`;
      },
    );
  }

  clientPatched = clientPatched
    .replace(/\{ items: Curso\[\]/g, "{ items: CursoListItem[]")
    .replace(
      /getCurso: \(id: string\) => request<Curso>\(/g,
      "getCurso: (id: string) => request<CursoDetalhe>(",
    )
    .replace(
      /request<Curso>\('\/cursos'/g,
      "request<CursoDetalhe>('/cursos'",
    )
    .replace(
      /request<Curso>\(`\/cursos\/\$\{id\}`/g,
      "request<CursoDetalhe>(`/cursos/${id}`",
    )
    .replace(/request<Curso>\(/g, "request<CursoDetalhe>(");

  files[clientPath] = clientPatched;

  if (!/\bexport type Curso\b/.test(types) && types.includes("CursoDetalhe")) {
    types = types.replace(
      /export interface CursoDetalhe \{/,
      "export type Curso = CursoDetalhe;\n\nexport interface CursoDetalhe {",
    );
    files[typesPath] = types;
  }

  if (
    types.includes("CreateUsuarioInput") &&
    !/papel\??:/.test(types.match(/CreateUsuarioInput[\s\S]*?\}/)?.[0] ?? "")
  ) {
    let needsPapel = false;
    for (const content of Object.values(files)) {
      if (content.includes("createUsuario") && /papel:/.test(content)) {
        needsPapel = true;
        break;
      }
    }
    if (needsPapel) {
      files[typesPath] = files[typesPath].replace(
        /export interface CreateUsuarioInput \{([\s\S]*?\n)\}/,
        "export interface CreateUsuarioInput {$1  papel?: Papel;\n}",
      );
    }
  }

  for (const [filePath, content] of Object.entries(files)) {
    if (!filePath.startsWith("frontend/")) continue;
    if (content.includes("saveSession") && files["frontend/lib/auth/session.ts"]?.includes("setSession")) {
      files[filePath] = content.replace(/\bsaveSession\b/g, "setSession");
    }
  }

  for (const [filePath, content] of Object.entries(files)) {
    if (!filePath.startsWith("frontend/") || !/\.tsx?$/.test(filePath)) continue;
    if (!content.includes("createUsuario") || !content.includes("password:")) continue;
    files[filePath] = content.replace(
      /(\bcreateUsuario\s*\(\s*\{[^}]*?)password:/g,
      "$1senha:",
    );
  }
}

/**
 * Ajustes pós-geração para builds Vercel (TS strict) e GitHub Actions (Flutter APK).
 */
export function ensureBuildReadiness(
  order: OrderInput,
  files: Record<string, string>,
): void {
  if (order.includeFrontend) {
    repairFrontendTypes(files);
  }

  if (
    order.includeMobile &&
    order.mobileStack.toLowerCase().includes("flutter")
  ) {
    prepareFlutterCi(files);
    repairFlutterPubspec(files);
  }
}
