# Roadmap — Fábrica de Software

Documento de evolução da **plataforma** (não dos apps gerados).  
Design v1: [`specs/2026-09-03-fabrica-apps-v1-design.md`](./specs/2026-09-03-fabrica-apps-v1-design.md)  
Demo/setup MVP: [`specs/2026-09-06-demo-e-setup-mvp-design.md`](./specs/2026-09-06-demo-e-setup-mvp-design.md)

---

## Concluído (pós-v1)

- Multi-usuário (admin/member), projetos agrupados, perfil
- Planejamento → software em duas etapas
- Fila de jobs (pipeline, publish, APK) com recovery
- Deploy GitHub + Vercel (mock API para demo)
- Wizard expandido (NFR, entidades, templates)
- PDF de planejamento, regenerar docs
- **Kit demo/setup** — Vercel/APK para stakeholders, guias por escopo
- Reconciliação de jobs presos, UI de entregas estabilizada

---

## Fase 1 — Estabilidade (em andamento)

| Item | Prioridade | Status |
|------|------------|--------|
| CI GitHub Actions (lint, test, build) | P0 | ✅ |
| Histórico de jobs na UI (publish/APK) | P1 | ✅ |
| Testes integração store + API routes | P0 | Pendente |
| E2E fluxo MOCK (login → pedido → ZIP) | P0 | Pendente |
| Logs estruturados da fila | P2 | Pendente |

---

## Fase 2 — Qualidade do output

| Item | Prioridade | Status |
|------|------------|--------|
| Setup por escopo (`ensureRunArtifacts`) | P0 | ✅ |
| Validação soft demo (mock + credenciais) | P1 | ✅ |
| Bloco Demonstração na UI | P1 | ✅ |
| Gate build opcional (admin liga/desliga) | P1 | ✅ |
| Smoke test automático do ZIP | P2 | Pendente |

---

## Fase 3 — Experiência

| Item | Prioridade |
|------|------------|
| Dashboard de projeto (status consolidado) | P1 |
| Estimativa tempo/custo por pedido | P2 |
| Templates de domínio mais ricos (LMS, CRM…) | P2 |
| Upload referência visual no wizard | P2 |
| Histórico de versões (tags GitHub) | P3 |

---

## Fase 4 — Produção / handoff TI

Quando for para servidor corporativo:

1. **PostgreSQL** — migrar de `data/fabrica.json` + `jobs.json`
2. **Fila distribuída** — Redis/BullMQ ou Inngest (multi-instância)
3. **SSO** — Azure AD / Google Workspace
4. **Storage** — S3 ou volume persistente para `storage/orders/`
5. **Secrets** — vault gerenciado
6. **Deploy** — Docker + HTTPS + backup

Ver também README § Handoff para TI.

---

## Fora de escopo (v1+)

- Build Android local (só GitHub Actions)
- Deploy Netlify
- Preview PWA público (`/p/:id`) — removido por segurança
- Compilação pesada na esteira (padrão: desligado)

---

*Última atualização: 2026-09-06*
