# EducaFlex — setup de desenvolvimento local (Windows PowerShell)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

Write-Host "==> EducaFlex — setup dev"

if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  Write-Host "    Criado .env"
}

if (-not (Test-Path "backend\.env")) {
  Copy-Item "backend\.env.example" "backend\.env"
  Write-Host "    Criado backend\.env"
}

if (-not (Test-Path "frontend\.env.local")) {
  Copy-Item "frontend\.env.example" "frontend\.env.local"
  Write-Host "    Criado frontend\.env.local"
}

Write-Host "==> Subindo MySQL (Docker)..."
docker compose up -d mysql

Write-Host "==> Aguardando MySQL (30s max)..."
$ready = $false
for ($i = 0; $i -lt 15; $i++) {
  Start-Sleep -Seconds 2
  $status = docker compose ps mysql --format json 2>$null | ConvertFrom-Json
  if ($status.Health -eq "healthy") { $ready = $true; break }
}
if (-not $ready) { Write-Warning "MySQL pode ainda estar iniciando — continue se healthy em docker compose ps" }

Write-Host "==> API — install, migrations e seed..."
Set-Location "$Root\backend"
npm install
npm run db:setup

Write-Host ""
Write-Host "Setup concluído."
Write-Host ""
Write-Host "Próximos passos (3 terminais):"
Write-Host "  1. API:      cd backend; npm run start:dev"
Write-Host "  2. Web:      cd frontend; npm install; npm run dev"
Write-Host "  3. Mobile:   cd mobile; flutter pub get; flutter run --dart-define=USE_MOCK_API=false --dart-define=API_BASE_URL=http://10.0.2.2:3001/api/v1"
Write-Host ""
Write-Host "Contas demo (senha: Senha@123):"
Write-Host "  Gestor: bruno.gestor@educaflex.test  -> http://localhost:3002"
Write-Host "  Aluno:  ana.aluno@educaflex.test     -> app mobile"
Write-Host ""
Write-Host "Health: http://localhost:3001/api/v1/health"
Write-Host "Swagger: http://localhost:3001/api/docs"
