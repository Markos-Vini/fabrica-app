#!/usr/bin/env bash
# EducaFlex — setup de desenvolvimento local (Linux/macOS/Git Bash)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==> EducaFlex — setup dev"

if [ ! -f .env ]; then
  cp .env.example .env
  echo "    Criado .env"
fi

if [ ! -f backend/.env ]; then
  cp backend/.env.example backend/.env
  echo "    Criado backend/.env"
fi

if [ ! -f frontend/.env.local ]; then
  cp frontend/.env.example frontend/.env.local
  echo "    Criado frontend/.env.local"
fi

echo "==> Subindo MySQL (Docker)..."
docker compose up -d mysql

echo "==> Aguardando MySQL healthy..."
for i in $(seq 1 30); do
  if docker compose exec -T mysql mysqladmin ping -h localhost -u root -proot --silent 2>/dev/null; then
    break
  fi
  sleep 2
done

echo "==> API — install, migrations e seed..."
cd "$ROOT/backend"
npm install
npm run db:setup

echo ""
echo "Setup concluído."
echo ""
echo "Próximos passos (3 terminais):"
echo "  1. API:      cd backend && npm run start:dev"
echo "  2. Web:      cd frontend && npm install && npm run dev"
echo "  3. Mobile:   cd mobile && flutter pub get && flutter run --dart-define=USE_MOCK_API=false --dart-define=API_BASE_URL=http://10.0.2.2:3001/api/v1"
echo ""
echo "Contas demo (senha: Senha@123):"
echo "  Gestor: bruno.gestor@educaflex.test  → http://localhost:3002"
echo "  Aluno:  ana.aluno@educaflex.test     → app mobile"
echo ""
echo "Health: http://localhost:3001/api/v1/health"
echo "Swagger: http://localhost:3001/api/docs"
