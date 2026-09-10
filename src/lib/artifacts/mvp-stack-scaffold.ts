import type { OrderInput } from "@/lib/types";
import { slugify } from "./slug";

function dbSlug(order: OrderInput): string {
  return slugify(order.name).replace(/-/g, "_");
}

function isMysql(order: OrderInput): boolean {
  return order.databaseStack.toLowerCase().includes("mysql");
}

function isPostgres(order: OrderInput): boolean {
  const db = order.databaseStack.toLowerCase();
  return db.includes("postgres") || (!isMysql(order) && !db.includes("mongo") && !db.includes("sqlite"));
}

/** Pedido com back + banco + ao menos um cliente (web ou mobile). */
export function isFullStackMvp(order: OrderInput): boolean {
  return (
    order.includeBackend &&
    order.includeDatabase &&
    (order.includeFrontend || order.includeMobile)
  );
}

export function mvpRunGuideMarkdown(order: OrderInput): string {
  const slug = slugify(order.name);
  const dbName = dbSlug(order);
  const lines: string[] = [
    `# Como rodar o MVP — ${order.name}`,
    "",
    "Guia gerado pela **Fábrica de Software** para projetos full-stack (API + banco + web/mobile).",
    "",
    "## Pré-requisitos",
    "",
    "- Node.js 20+",
    order.includeMobile ? "- Flutter 3+ (se for testar o app mobile)" : "",
    "- Docker Desktop (para o banco de dados local)",
    "",
    "## Setup automático (recomendado)",
    "",
    "**Windows (PowerShell):**",
    "```powershell",
    ".\\scripts\\setup-dev.ps1",
    "```",
    "",
    "**macOS / Linux:**",
    "```bash",
    "chmod +x scripts/setup-dev.sh",
    "./scripts/setup-dev.sh",
    "```",
    "",
    "O script copia `.env`, sobe o banco no Docker, roda migrations/seed e mostra os próximos passos.",
    "",
    "## Setup manual",
    "",
    "### 1. Banco (Docker)",
    "",
    "```bash",
    "docker compose up -d mysql   # ou postgres, conforme docker-compose.yml",
    "```",
    "",
    "Aguarde o healthcheck ficar **healthy** (`docker compose ps`).",
    "",
    "### 2. API (back-end)",
    "",
    "```bash",
    "cd backend",
    "cp .env.example .env   # se ainda não existir",
    "npm install",
    "npm run db:setup       # migrations + seed (primeira vez)",
    "npm run start:dev",
    "```",
    "",
    "API em `http://localhost:3001/api/v1` · Swagger em `/api/docs`.",
    "",
  ];

  if (order.includeFrontend) {
    lines.push(
      "### 3. Painel web",
      "",
      "```bash",
      "cd frontend",
      "cp .env.example .env.local",
      "npm install",
      "npm run dev",
      "```",
      "",
      "Painel em `http://localhost:3002` (ou porta do Next.js).",
      "",
      "Confirme `NEXT_PUBLIC_USE_MOCK_API=false` e `NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1`.",
      "",
    );
  }

  if (order.includeMobile) {
    lines.push(
      "### 4. App mobile (Flutter)",
      "",
      "**Emulador Android** (localhost da máquina = `10.0.2.2`):",
      "",
      "```bash",
      "cd mobile",
      "flutter pub get",
      "flutter run --dart-define=USE_MOCK_API=false --dart-define=API_BASE_URL=http://10.0.2.2:3001/api/v1",
      "```",
      "",
      "**Celular físico** (mesma Wi-Fi — use o IP da sua máquina):",
      "",
      "```powershell",
      "cd mobile",
      ".\\run-dev.ps1",
      "```",
      "",
      "Ou manualmente: `flutter run --dart-define=USE_MOCK_API=false --dart-define=API_BASE_URL=http://SEU_IP:3001/api/v1`",
      "",
      "**Importante:**",
      "- `10.0.2.2` **não funciona** no celular real — só no emulador.",
      "- Defina `PUBLIC_BASE_URL=http://SEU_IP:3001` no `backend/.env` para URLs de vídeo/upload.",
      "- Android debug precisa de `usesCleartextTraffic` para `http://` local.",
      "",
    );
  }

  lines.push(
    "## Portas padrão",
    "",
    "| Serviço | Porta |",
    "|---------|-------|",
    "| API | 3001 |",
    order.includeFrontend ? "| Painel web | 3002 |" : "",
    isMysql(order) ? "| MySQL | 3306 |" : isPostgres(order) ? "| PostgreSQL | 5432 |" : "",
    "",
    "## Troubleshooting",
    "",
    "- **Mobile \"sem conexão\" no celular:** use IP da LAN, não `10.0.2.2`; PC e celular na mesma Wi-Fi.",
    "- **Vídeo não reproduz:** URL deve ser MP4 direto; uploads locais exigem `/uploads/` servido pelo back e `PUBLIC_BASE_URL` correto.",
    "- **Módulo/aula bloqueado após conclusão:** atualize o app (pull-to-refresh); o back-end repara a cadeia de desbloqueio no detalhe do curso.",
    "- **MySQL não sobe:** verifique Docker Desktop e porta 3306 livre.",
    "",
    `Slug: \`${slug}\` · Banco: \`${dbName}\``,
    "",
  );

  return lines.filter(Boolean).join("\n");
}

export function setupDevPs1(order: OrderInput): string {
  const dbService = isMysql(order) ? "mysql" : isPostgres(order) ? "postgres" : "mysql";
  return `# ${order.name} — setup de desenvolvimento local (Windows PowerShell)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

Write-Host "==> ${order.name} — setup dev"

if (-not (Test-Path ".env")) {
  if (Test-Path ".env.example") { Copy-Item ".env.example" ".env"; Write-Host "    Criado .env" }
}

if (-not (Test-Path "backend\\.env")) {
  if (Test-Path "backend\\.env.example") {
    Copy-Item "backend\\.env.example" "backend\\.env"
    Write-Host "    Criado backend\\.env"
  }
}

if (-not (Test-Path "frontend\\.env.local")) {
  if (Test-Path "frontend\\.env.example") {
    Copy-Item "frontend\\.env.example" "frontend\\.env.local"
    Write-Host "    Criado frontend\\.env.local"
  }
}

Write-Host "==> Subindo ${dbService} (Docker)..."
docker compose up -d ${dbService}

Write-Host "==> Aguardando banco (30s max)..."
$ready = $false
for ($i = 0; $i -lt 15; $i++) {
  Start-Sleep -Seconds 2
  $status = docker compose ps ${dbService} --format json 2>$null | ConvertFrom-Json
  if ($status.Health -eq "healthy") { $ready = $true; break }
}
if (-not $ready) { Write-Warning "Banco pode ainda estar iniciando — verifique docker compose ps" }

Write-Host "==> API — install, migrations e seed..."
Set-Location "$Root\\backend"
npm install
if (Test-Path "package.json") {
  $pkg = Get-Content "package.json" -Raw | ConvertFrom-Json
  if ($pkg.scripts."db:setup") { npm run db:setup }
  elseif ($pkg.scripts."prisma:deploy") { npm run prisma:deploy }
}

Write-Host ""
Write-Host "Setup concluido."
Write-Host ""
Write-Host "Proximos passos:"
Write-Host "  1. API:    cd backend; npm run start:dev"
${order.includeFrontend ? 'Write-Host "  2. Web:    cd frontend; npm install; npm run dev"' : ""}
${order.includeMobile ? 'Write-Host "  3. Mobile: cd mobile; .\\run-dev.ps1  (celular) ou flutter run (emulador)"' : ""}
Write-Host ""
Write-Host "Guia completo: docs/COMO-RODAR-MVP.md"
Write-Host "Health: http://localhost:3001/api/v1/health"
`;
}

export function setupDevSh(order: OrderInput): string {
  const dbService = isMysql(order) ? "mysql" : isPostgres(order) ? "postgres" : "mysql";
  return `#!/usr/bin/env bash
# ${order.name} — setup de desenvolvimento local
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> ${order.name} — setup dev"

[ -f .env ] || { [ -f .env.example ] && cp .env.example .env && echo "    Criado .env"; }
[ -f backend/.env ] || { [ -f backend/.env.example ] && cp backend/.env.example backend/.env && echo "    Criado backend/.env"; }
[ -f frontend/.env.local ] || { [ -f frontend/.env.example ] && cp frontend/.env.example frontend/.env.local && echo "    Criado frontend/.env.local"; }

echo "==> Subindo ${dbService} (Docker)..."
docker compose up -d ${dbService}

echo "==> Aguardando banco..."
sleep 10

echo "==> API — install e db setup..."
cd backend
npm install
npm run db:setup 2>/dev/null || npm run prisma:deploy 2>/dev/null || true

echo ""
echo "Setup concluido. Veja docs/COMO-RODAR-MVP.md"
echo "  cd backend && npm run start:dev"
`;
}

export function mvpDockerCompose(order: OrderInput, slug: string): string {
  const dbName = dbSlug(order);
  const volumeName = `${slug.replace(/-/g, "_")}_db`;

  if (isMysql(order)) {
    return `# ${order.name} — Docker Compose (MVP)
# Banco: docker compose up -d mysql
# Stack completa: docker compose --profile full up -d --build

services:
  mysql:
    image: mysql:8.4
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: \${MYSQL_ROOT_PASSWORD:-root}
      MYSQL_DATABASE: \${MYSQL_DATABASE:-${dbName}}
      MYSQL_USER: \${MYSQL_USER:-${dbName}}
      MYSQL_PASSWORD: \${MYSQL_PASSWORD:-${dbName}}
    ports:
      - "\${MYSQL_PORT:-3306}:3306"
    volumes:
      - ${volumeName}:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-p\${MYSQL_ROOT_PASSWORD:-root}"]
      interval: 5s
      timeout: 5s
      retries: 10
      start_period: 20s

  api:
    build:
      context: ./backend
      dockerfile: Dockerfile
    restart: unless-stopped
    ports:
      - "\${API_PORT:-3001}:3001"
    environment:
      DATABASE_URL: mysql://\${MYSQL_USER:-${dbName}}:\${MYSQL_PASSWORD:-${dbName}}@mysql:3306/\${MYSQL_DATABASE:-${dbName}}
      PORT: "3001"
      HOST: "0.0.0.0"
      PUBLIC_BASE_URL: \${PUBLIC_BASE_URL:-http://localhost:3001}
    depends_on:
      mysql:
        condition: service_healthy
    profiles:
      - full

  web:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    restart: unless-stopped
    ports:
      - "\${WEB_PORT:-3002}:3000"
    environment:
      NEXT_PUBLIC_API_URL: \${NEXT_PUBLIC_API_URL:-http://localhost:3001/api/v1}
      NEXT_PUBLIC_USE_MOCK_API: "false"
    depends_on:
      - api
    profiles:
      - full

volumes:
  ${volumeName}:
`;
  }

  return `# ${order.name} — Docker Compose (MVP)
services:
  postgres:
    image: postgres:16
    restart: unless-stopped
    environment:
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD:-example}
      POSTGRES_DB: \${POSTGRES_DB:-${dbName}}
    ports:
      - "\${POSTGRES_PORT:-5432}:5432"
    volumes:
      - ${volumeName}:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 10

volumes:
  ${volumeName}:
`;
}

export function mvpRootEnvExample(order: OrderInput): string {
  const dbName = dbSlug(order);
  if (isMysql(order)) {
    return `# ${order.name} — variaveis Docker Compose
MYSQL_ROOT_PASSWORD=root
MYSQL_DATABASE=${dbName}
MYSQL_USER=${dbName}
MYSQL_PASSWORD=${dbName}
MYSQL_PORT=3306
API_PORT=3001
WEB_PORT=3002
PUBLIC_BASE_URL=http://192.168.1.1:3001
`;
  }
  return `# ${order.name} — variaveis Docker Compose
POSTGRES_PASSWORD=example
POSTGRES_DB=${dbName}
POSTGRES_PORT=5432
API_PORT=3001
PUBLIC_BASE_URL=http://192.168.1.1:3001
`;
}

export function mobileRunDevPs1(): string {
  return `# Sobe o app apontando para o back-end local (celular fisico ou emulador).
param(
    [string]$ApiBaseUrl = '',
    [switch]$UseMockApi
)

$ErrorActionPreference = "Stop"

function Get-LanIp {
    $candidates = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
        Where-Object {
            $_.IPAddress -match '^(192\\.168\\.|10\\.)' -and
            $_.InterfaceAlias -notmatch 'Loopback|vEthernet|WSL|Hyper-V|VirtualBox|VMware'
        } |
        Sort-Object -Property InterfaceMetric
    if ($candidates) { return $candidates[0].IPAddress }
    throw 'Nao foi possivel detectar o IP local.'
}

Set-Location $PSScriptRoot

if ([string]::IsNullOrWhiteSpace($ApiBaseUrl)) {
    $lanIp = Get-LanIp
    $ApiBaseUrl = "http://\${lanIp}:3001/api/v1"
}

Write-Host "Mobile -> $ApiBaseUrl" -ForegroundColor Cyan

$defines = @("--dart-define=API_BASE_URL=$ApiBaseUrl")
if ($UseMockApi) { $defines += "--dart-define=USE_MOCK_API=true" }
else { $defines += "--dart-define=USE_MOCK_API=false" }

flutter run @defines
`;
}

export function appendMvpSectionToReadme(existing: string, order: OrderInput): string {
  const marker = "## Como rodar o MVP";
  if (existing.includes(marker)) return existing;

  const body = mvpRunGuideMarkdown(order)
    .split("\n")
    .slice(2)
    .join("\n")
    .trim();

  return `${existing.trim()}

---

## Como rodar o MVP

${body}
`;
}
