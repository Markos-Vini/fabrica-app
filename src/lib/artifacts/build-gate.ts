import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { OrderInput } from "@/lib/types";
import { supportsNativeApk } from "@/lib/artifacts/apk-eligibility";

export type BuildGateCheck = {
  layer: "frontend" | "mobile";
  status: "passed" | "failed" | "skipped";
  command?: string;
  reason?: string;
  output?: string;
};

export type BuildGateResult = {
  ok: boolean;
  checks: BuildGateCheck[];
};

export type CommandRunner = (
  cwd: string,
  command: string,
  args: string[],
  env: Record<string, string>,
  timeoutMs: number,
) => Promise<{ code: number; stdout: string; stderr: string }>;

export type BuildGateOptions = {
  workDir: string;
  runCommand?: CommandRunner;
  /** Pula checagem Flutter mesmo com mobile no escopo */
  skipMobile?: boolean;
};

const FRONTEND_ENV: Record<string, string> = {
  NEXT_PUBLIC_USE_MOCK_API: "true",
  NEXT_PUBLIC_API_URL: "http://localhost:3001/api/v1",
  CI: "true",
  NODE_ENV: "production",
};

function tailOutput(text: string, maxLines = 40): string {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length <= maxLines) return lines.join("\n");
  return lines.slice(-maxLines).join("\n");
}

async function defaultRunCommand(
  cwd: string,
  command: string,
  args: string[],
  env: Record<string, string>,
  timeoutMs: number,
): Promise<{ code: number; stdout: string; stderr: string }> {
  const { spawn } = await import("node:child_process");
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, ...env },
      shell: process.platform === "win32",
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`Timeout após ${Math.round(timeoutMs / 1000)}s: ${command} ${args.join(" ")}`));
    }, timeoutMs);

    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}

async function commandExists(
  runCommand: CommandRunner,
  command: string,
): Promise<boolean> {
  try {
    const checkArgs =
      process.platform === "win32" ? ["/c", command, "--version"] : ["--version"];
    const checkCmd = process.platform === "win32" ? "cmd" : command;
    const result = await runCommand(process.cwd(), checkCmd, checkArgs, {}, 15_000);
    return result.code === 0;
  } catch {
    return false;
  }
}

export async function materializeLayer(
  files: Record<string, string>,
  prefix: string,
  targetRoot: string,
): Promise<boolean> {
  let wrote = false;
  for (const [filePath, content] of Object.entries(files)) {
    if (!filePath.startsWith(prefix)) continue;
    const rel = filePath.slice(prefix.length);
    const full = path.join(targetRoot, rel);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, content, "utf8");
    wrote = true;
  }
  return wrote;
}

async function runFrontendGate(
  files: Record<string, string>,
  workDir: string,
  runCommand: CommandRunner,
): Promise<BuildGateCheck> {
  const frontendDir = path.join(workDir, "frontend");
  const hasFrontend = await materializeLayer(files, "frontend/", frontendDir);
  if (!hasFrontend || !files["frontend/package.json"]) {
    return {
      layer: "frontend",
      status: "skipped",
      reason: "Sem pasta frontend/ no pacote",
    };
  }

  const install = await runCommand(
    frontendDir,
    "npm",
    ["install", "--no-audit", "--no-fund"],
    FRONTEND_ENV,
    240_000,
  );
  if (install.code !== 0) {
    return {
      layer: "frontend",
      status: "failed",
      command: "npm install",
      output: tailOutput(`${install.stdout}\n${install.stderr}`),
      reason: "Falha ao instalar dependências do front-end",
    };
  }

  const build = await runCommand(
    frontendDir,
    "npm",
    ["run", "build"],
    FRONTEND_ENV,
    360_000,
  );
  if (build.code !== 0) {
    return {
      layer: "frontend",
      status: "failed",
      command: "npm run build",
      output: tailOutput(`${build.stdout}\n${build.stderr}`),
      reason: "Build Next.js falhou — corrija antes de publicar na Vercel",
    };
  }

  return {
    layer: "frontend",
    status: "passed",
    command: "npm run build",
  };
}

async function runMobileGate(
  order: OrderInput,
  files: Record<string, string>,
  workDir: string,
  runCommand: CommandRunner,
): Promise<BuildGateCheck> {
  if (!order.includeMobile) {
    return {
      layer: "mobile",
      status: "skipped",
      reason: "Mobile fora do escopo",
    };
  }

  const stack = order.mobileStack.toLowerCase();
  if (!stack.includes("flutter")) {
    return {
      layer: "mobile",
      status: "skipped",
      reason: "Gate mobile só valida Flutter nesta versão",
    };
  }

  const mobileDir = path.join(workDir, "mobile");
  const hasMobile = await materializeLayer(files, "mobile/", mobileDir);
  if (!hasMobile || !files["mobile/pubspec.yaml"]) {
    return {
      layer: "mobile",
      status: "skipped",
      reason: "Sem pubspec.yaml em mobile/",
    };
  }

  const flutterOk = await commandExists(runCommand, "flutter");
  if (!flutterOk) {
    return {
      layer: "mobile",
      status: "skipped",
      reason:
        "Flutter SDK não encontrado neste servidor — APK será validado no GitHub Actions",
    };
  }

  const pubGet = await runCommand(
    mobileDir,
    "flutter",
    ["pub", "get"],
    {},
    180_000,
  );
  if (pubGet.code !== 0) {
    return {
      layer: "mobile",
      status: "failed",
      command: "flutter pub get",
      output: tailOutput(`${pubGet.stdout}\n${pubGet.stderr}`),
      reason: "Dependências Flutter inválidas",
    };
  }

  const analyzeArgs = ["analyze", "--no-fatal-infos"];
  if (order.generateTestBuild && supportsNativeApk(order.mobileStack)) {
    analyzeArgs.push("--no-fatal-warnings");
  }

  const analyze = await runCommand(
    mobileDir,
    "flutter",
    analyzeArgs,
    {},
    240_000,
  );
  if (analyze.code !== 0) {
    return {
      layer: "mobile",
      status: "failed",
      command: "flutter analyze",
      output: tailOutput(`${analyze.stdout}\n${analyze.stderr}`),
      reason: "Análise estática Flutter falhou",
    };
  }

  return {
    layer: "mobile",
    status: "passed",
    command: "flutter analyze",
  };
}

/**
 * Compila/analisa o pacote gerado antes de publicar no GitHub/Vercel.
 * Falha bloqueia a conclusão do pedido.
 */
export async function runSoftwareBuildGate(
  order: OrderInput,
  files: Record<string, string>,
  options: BuildGateOptions,
): Promise<BuildGateResult> {
  const runCommand = options.runCommand ?? defaultRunCommand;
  const workDir = options.workDir;

  await rm(workDir, { recursive: true, force: true });
  await mkdir(workDir, { recursive: true });

  const checks: BuildGateCheck[] = [];

  if (order.includeFrontend) {
    checks.push(await runFrontendGate(files, workDir, runCommand));
  } else {
    checks.push({
      layer: "frontend",
      status: "skipped",
      reason: "Front-end fora do escopo",
    });
  }

  if (!options.skipMobile) {
    checks.push(await runMobileGate(order, files, workDir, runCommand));
  }

  const ok = !checks.some((check) => check.status === "failed");
  return { ok, checks };
}

export function formatBuildGateMessage(result: BuildGateResult): string {
  const failed = result.checks.filter((check) => check.status === "failed");
  if (failed.length === 0) {
    return "Gate de build falhou sem detalhes.";
  }

  const parts = failed.map((check) => {
    const header = `[${check.layer.toUpperCase()}] ${check.reason ?? "Falha"}`;
    const cmd = check.command ? `\nComando: ${check.command}` : "";
    const output = check.output ? `\n\n${check.output}` : "";
    return `${header}${cmd}${output}`;
  });

  return [
    "Gate de build falhou — o pedido NÃO foi publicado no GitHub/Vercel.",
    "Corrija os erros abaixo e gere/repare novamente.",
    "",
    ...parts,
  ].join("\n");
}

export function buildGateLogText(result: BuildGateResult): string {
  return result.checks
    .map((check) => {
      const lines = [
        `## ${check.layer} — ${check.status}`,
        check.reason ? `Motivo: ${check.reason}` : "",
        check.command ? `Comando: ${check.command}` : "",
        check.output ? `\n${check.output}` : "",
      ].filter(Boolean);
      return lines.join("\n");
    })
    .join("\n\n---\n\n");
}
