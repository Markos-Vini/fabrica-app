# Testes de infraestrutura e smoke — EducaFlex

Validações DevOps do repositório (estrutura, `.env.example`, Docker Compose) e smoke opcional da API.

## Executar

```bash
# Todos os testes (infra sempre; smoke skip se API offline)
npx vitest run -c tests/vitest.config.mts

# Apenas infra (sem rede)
npx vitest run -c tests/vitest.config.mts tests/infra

# Smoke com API rodando
EDUCAFLEX_SMOKE=1 npx vitest run -c tests/vitest.config.mts tests/smoke
```

## Variáveis

| Variável | Default | Descrição |
|----------|---------|-----------|
| `EDUCAFLEX_API_URL` | `http://localhost:3001/api/v1` | Base URL da API |
| `EDUCAFLEX_SMOKE` | `1` | `0` desabilita testes smoke |

## Pré-requisito smoke

```bash
docker compose up -d mysql
cd backend && cp .env.example .env && npm install && npm run db:setup && npm run start:dev
```

Referência: [docs/ESTRATEGIA-QA.md](../docs/ESTRATEGIA-QA.md)
