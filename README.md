# Fábrica de Software

Plataforma web onde você descreve um app e uma **equipe virtual de agentes de IA** produz documentação de planejamento e/ou código empacotado em ZIP — com foco em MVPs testáveis.

| Versão | Escopo |
|--------|--------|
| **v1 (atual)** | Wizard de pedido, esteira de 6 agentes, entregas (ZIP/GitHub/APK), modo MOCK, multi-usuário |
| **Produção (TI)** | Banco relacional, fila distribuída, SSO — após aprovação interna |

**Idioma:** PT-BR · **Stack:** Next.js 16 · **Dados locais:** `data/fabrica.json` + `storage/orders/`

---

## Início rápido

### Pré-requisitos

| Ferramenta | Versão |
|------------|--------|
| Node.js | 20+ |
| npm | 10+ |

### Subir a fábrica

```powershell
npm install
npm run dev
```

Acesse **http://localhost:3000**

### Login padrão (dev)

Configure em `.env` ou use os defaults:

| Variável | Default |
|----------|---------|
| `ADMIN_EMAIL` | `admin@fabrica.local` |
| `ADMIN_PASSWORD` | `admin` |

---

## Fluxo recomendado

1. **Novo pedido → Planejamento** — gera PRD, arquitetura, roadmap e backlog
2. Revise o pacote na aba **Entregas**
3. **Gerar software** a partir do planejamento (tipos B/C/D)
4. Baixe o ZIP ou use GitHub/APK de teste

**Atalho:** pedido **Software direto (MVP)** em 3 etapas, sem planejamento prévio.

---

## Configurações

Em **Configurações** (admin):

- Chaves OpenAI, Anthropic, Gemini, Cursor, Ollama
- Modelo por agente (PM, Arquiteto, Backend, …)
- Modo **MOCK** — demonstração sem consumir tokens
- GitHub, Vercel e URL pública (QR do APK na rede local)

---

## Comandos úteis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run start` | Servidor após build |
| `npm test` | Testes (Vitest) |
| `npm run lint` | ESLint |

---

## Estrutura

```
fabrica-app/
├── src/
│   ├── app/              # Rotas Next.js (projetos, pedidos, configurações)
│   ├── components/       # UI (wizard, esteira, entregas)
│   └── lib/              # Agentes, pipeline, store, artefatos
├── data/
│   ├── fabrica.json      # Pedidos, usuários, configurações
│   └── jobs.json         # Fila de jobs (pipeline, publish, apk)
├── storage/orders/       # ZIPs e árvore de arquivos por pedido
└── docs/superpowers/     # Spec v1, roadmap e planos da fábrica
```

Roadmap da plataforma: [`docs/superpowers/ROADMAP-FABRICA.md`](./docs/superpowers/ROADMAP-FABRICA.md)

---

## Apps gerados (exemplos)

Pedidos concluídos podem gerar pastas como `backend/`, `frontend/`, `mobile/` dentro do ZIP — por exemplo **EducaFlex** (treinamento corporativo). Esses projetos têm README e scripts próprios dentro do pacote entregue; pastas `backend/`, `frontend/`, `mobile/` na raiz do repositório são outputs de pedidos anteriores.

Documentação detalhada de um app gerado: [`docs/PRD.md`](./docs/PRD.md) e demais arquivos em `docs/`.

---

## Handoff para TI (futuro)

Quando for para servidor corporativo, a equipe de TI deve provisionar:

- Banco relacional (substituir `fabrica.json`)
- Volume persistente para `storage/orders/`
- Variáveis `SESSION_SECRET`, `FABRICA_ENCRYPTION_KEY`
- Reverse proxy HTTPS
- Política de chaves LLM e custos

---

## Licença

Projeto interno — consulte o responsável legal da organização.
