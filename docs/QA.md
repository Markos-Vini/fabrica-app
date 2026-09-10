# QA — EducaFlex

**Versão:** 1.0  
**Data:** 05/09/2026  
**Tipo:** Revisão QA + Code Review pós-implementação  
**Escopo analisado:** API (NestJS) · MySQL · Mobile (Flutter) · Web (Next.js)  
**Autor:** QA / Code Review  
**Referências:** [PRD.md](./PRD.md) · [ESTRATEGIA-QA.md](./ESTRATEGIA-QA.md) · [ARQUITETURA.md](./ARQUITETURA.md) · [PLANO-BACKEND.md](./PLANO-BACKEND.md) · [PLANO-FRONTEND-MOBILE.md](./PLANO-FRONTEND-MOBILE.md) · [MODELO-DADOS.md](./MODELO-DADOS.md) · [HISTORIAS-USUARIO.md](./HISTORIAS-USUARIO.md)

---

## 1. Veredito executivo

| Dimensão | Status | Nota |
|----------|--------|------|
| **API REST v1** (auth, cursos, matrículas, progresso, dashboard) | 🟢 Implementado | Módulos conforme PLANO-BACKEND B0–B6 |
| **Schema MySQL + seed + migrations** | 🟢 Implementado | Prisma; 5 categorias; dept TI com N=10 para CS-06 |
| **Integrações mock** (e-mail, push, storage, streaming) | 🟢 Implementado | `INTEGRATIONS_MODE`; adapters registrados |
| **Mobile MVP** (telas P0, player, sync, offline leitura) | 🟡 Implementado com ressalvas | Default `USE_MOCK_API=true`; mock ≠ staging |
| **Painel Web** (CRUD, matrículas, dashboard, relatórios) | 🟡 Implementado com ressalvas | Guards GESTOR no client; middleware só verifica cookie |
| **Regras RN-01, RN-03, RN-04, RN-07** (API) | 🟢 Code review OK | Sequenciamento centralizado em `ProgressoService` |
| **RN-07 artigos** (scroll ≥ 90%) | 🟡 Parcial | Validação só no mobile; API aceita POST concluir sem critério |
| **RN-06** (papéis ALUNO/GESTOR) | 🟡 Parcial | API OK; mobile não bloqueia gestor; web middleware fraco |
| **Testes automatizados P0** | 🔴 Crítico | **0** specs API; mobile = 1 placeholder |
| **CI / regressão** | 🔴 Ausente | Sem workflow `.github/workflows/` |
| **Critérios CS-01 a CS-06** | 🔴 Não evidenciados | Nenhum TC-FLOW / TC-VIDEO-001 / TC-DASH-001 registrado |
| **Pronto para Go/No-Go MVP v1** | 🔴 **No-Go** | Funcionalidade presente; **evidências QA insuficientes** |

**Resumo direto:** As três camadas (API, mobile, web) cobrem o escopo MVP declarado no PRD. A lógica crítica de sequenciamento, tempo assistido monotônico e dashboard agregado está na API e alinha-se ao MODELO-DADOS. **O bloqueador de release não é ausência de código, e sim qualidade verificável:** zero testes de integração, zero E2E, zero pipeline CI e nenhuma evidência dos critérios mensuráveis CS-01 a CS-06. Pelos gates G1–G16 de [ESTRATEGIA-QA.md](./ESTRATEGIA-QA.md) §6.4, a release **não passa Go/No-Go**.

**Evidência de execução (05/09/2026):**

```text
backend:  npm test          → FAIL — "No tests found" (0 arquivos *.spec.ts)
mobile:   flutter test      → 1/1 placeholder (expect(true))
frontend: testes E2E        → ausentes
tests/:   smoke infra       → vitest estrutural; não cobre domínio EducaFlex
```

---

## 2. Escopo desta revisão

### 2.1 Dentro do escopo

| Camada | Caminho | Foco |
|--------|---------|------|
| API | `backend/src/**` | Auth, Cursos, Matrículas, Progresso, Dashboard, Notificações, Integrações |
| DB | `backend/prisma/**` | Schema v1, migration `20260905140000_init_educaflex`, seed |
| Mobile | `mobile/lib/**` | Auth, home, player, artigo, sync, cache Hive, offline banner |
| Web | `frontend/app/**` | Login gestor, CRUD cursos, matrículas, dashboard, usuários, relatórios |
| Docs | `docs/*.md` | Alinhamento PRD vs implementação |

### 2.2 Fora do escopo desta revisão

- Quiz/múltipla escolha, certificado PDF, gamificação (v2+ — TC-NEG-*)
- Push nativo FCM/APNs (stub v1)
- Publicação App Store / Play Store
- Sessão vídeo 10 min em device físico 4G (CS-01 completo)
- Pen-test / auditoria LGPD formal
- Infra produção (HTTPS, backup, WAF)

### 2.3 Fora do MVP — confirmar ausência (regressão negativa)

| Item | Esperado v1 | Verificação code review |
|------|-------------|-------------------------|
| Certificado PDF | Não emite | Sem endpoint `/certificados` |
| Quiz | Não implementado | Sem `QuizModule` |
| Push nativo | No-op | `NoOpPushAdapter` |
| Offline escrita | Bloqueada | Mobile bloqueia player/conclusão sem rede |
| WebSocket sync | Não usado | Mobile EducaFlex sem WS (correto) |

---

## 3. Blockers (P0 — impedem Go/No-Go)

### QA-001 — Suíte de integração API ausente

**Esperado:** Testes auth, CRUD cursos, matrícula dept N=10, sequenciamento 403, dashboard vs SQL — conforme US-API-* e ESTRATEGIA-QA §8.  
**Atual:** Jest configurado (`backend/jest.config.js`) mas **zero** arquivos `*.spec.ts`; `npm test` falha com exit code 1.  
**Impacto:** Regressões em RN-01, RN-03, CS-03, CS-04 passam despercebidas. **Gates G4, G8, G12 falham.**

**Casos P0 não automatizados (API):**

- TC-AUTH-001–008, TC-AUTH-005/006
- TC-CURSO-001–006
- TC-MAT-001–004
- TC-PROG-001–006
- TC-DASH-001–003
- TC-SEC-001–006
- TC-DB-001–007

---

### QA-002 — Fluxos E2E não executados (TC-FLOW-001, TC-FLOW-002)

**Esperado:** Roteiros §7.1–7.2 ESTRATEGIA-QA com evidência (build, ambiente, timestamp, resultado).  
**Atual:** Nenhum registro de execução ponta a ponta gestor → aluno → dashboard.  
**Impacto:** **G16 falha**; integração real mobile ↔ API ↔ web não comprovada.

---

### QA-003 — Critérios de sucesso CS-01 a CS-06 sem evidência

| CS | Meta | Status | Risco |
|----|------|--------|-------|
| CS-01 | Startup ≤ 2 s; rebuffer < 1% (10 min) | 🔴 Não medido | Mock CDN não representa produção |
| CS-02 | Publicação → mobile ≤ 3 s após sync | 🔴 Não cronometrado | TC-SYNC-001 pendente |
| CS-03 | Dashboard 0% divergência (N=20) | 🔴 Não validado | Bug de cálculo passaria |
| CS-04 | 100% bloqueios sequenciais 403 | 🔴 Não testado | Gate **No-Go automático** |
| CS-05 | Erro tempo ≤ 5 s (vídeo 5 min) | 🔴 Não testado | Heartbeat não verificado |
| CS-06 | Matrícula dept N=10 → 10 registros | 🔴 Não testado | Seed tem 10 alunos TI; teste não rodou |

---

### QA-004 — Pipeline CI ausente

**Esperado:** lint → unit → integração API (MySQL Testcontainers) em PR — ESTRATEGIA-QA §5.10.  
**Atual:** Sem `.github/workflows/` no repositório. Smoke em `tests/` cobre estrutura/health, não domínio.  
**Impacto:** Regressões mergeáveis sem gate.

---

### QA-005 — Mobile opera em mock por default

**Arquivo:** `mobile/lib/core/config/app_config.dart`  
**Estado:** `USE_MOCK_API=true` por default; demo funciona sem API.  
**Risco:** Demos e QA manual validam **MockCoursesRepository**, não contratos reais. Integração só com `--dart-define=USE_MOCK_API=false`.  
**Impacto:** Falsa sensação de MVP pronto; CS-02/CS-04/CS-05 inválidos em demo default.

---

## 4. Gaps funcionais e de contrato (P1)

### QA-101 — Mobile não bloqueia login de GESTOR (RN-06)

**Arquivos:** `mobile/lib/providers/auth_provider.dart`, `login_screen.dart`  
**Esperado:** Aluno-only no app; gestor redirecionado ou bloqueado (PRD §3.3, US-MOB-001).  
**Atual:** Login aceita qualquer papel retornado pela API; redireciona para `/home` sem checar `papel`.  
**Risco:** Gestor consome app mobile — violação RN-06 no cliente. API ainda retorna 403 em endpoints aluno se gestor tentar progresso.

**Correção mínima:** Após login, se `usuario.papel == GESTOR`, exibir mensagem e fazer logout.

---

### QA-102 — Middleware web não valida papel GESTOR

**Arquivo:** `frontend/middleware.ts`  
**Esperado:** Rotas `/admin/*` exigem token **e** papel GESTOR (FE-W02).  
**Atual:** Middleware verifica apenas cookie `educaflex_token`. Papel checado em `AuthProvider.login`, não em navegação direta.  
**Risco:** Token ALUNO colado manualmente no cookie pode abrir layout admin até client-side falhar nas chamadas API (403).

**Correção:** Decodificar JWT no middleware ou redirecionar após `GET /auth/me` com papel inválido.

---

### QA-103 — RN-07 artigo só no cliente

**Arquivos:** `backend/src/progresso/progresso.service.ts` (`concluirAula`), `article_reader_screen.dart`  
**Esperado:** Conclusão artigo após scroll ≥ 90% (RN-07, TC-PROG-006).  
**Atual:** Mobile exige scroll; API permite `POST /progresso-aula/:id/concluir` para ARTIGO **sem** validação de consumo.  
**Risco:** Bypass via cliente alternativo (Postman) conclui artigo instantaneamente.

---

### QA-104 — Rate limit declarado mas inativo

**Arquivos:** `backend/src/auth/auth.controller.ts`, `app.module.ts`  
**Estado:** `@Throttle` em login/forgot; `ThrottlerModule` registrado; **`ThrottlerGuard` não aplicado globalmente** (`APP_GUARD` ausente).  
**Risco:** Brute-force em `/auth/login` sem limite efetivo (PLANO-BACKEND §14 P1).

---

### QA-105 — Inconsistência de porta / URL default

| Cliente | Default | Backend default |
|---------|---------|-----------------|
| Mobile `API_BASE_URL` | `http://10.0.2.2:3000/api/v1` | `PORT=3000` |
| Frontend docs | `localhost:3002` (web) | CORS `localhost:3001` em `.env.example` |

**Risco:** Setup quebrado silencioso; QA atribui falha a “bug” quando é configuração.

---

### QA-106 — Rota `/register` web fora do PRD v1

**Arquivo:** `frontend/app/register/page.tsx`  
**PRD v1:** Usuários pré-provisionados pelo gestor; `POST /usuarios` P1.  
**Risco:** Escopo creep; fluxo de registro público não especificado nem testado.

---

### QA-107 — Mensagens de erro mobile expõem exceção bruta

**Arquivo:** `auth_provider.dart` — `error: e.toString().replaceFirst('ApiException: ', '')`  
**Esperado:** Mensagens PT-BR genéricas (TC-AUTH-003, TC-PRIV-002).  
**Risco:** Stack/ detalhes técnicos visíveis ao usuário em falhas de rede.

---

### QA-108 — CS-01 depende de mock de streaming

**Arquivo:** `backend/src/integrations/adapters/mock-stream-url.adapter.ts`  
**Estado:** Dev usa URL estática; sem Vimeo/CloudFront real em staging.  
**Risco:** CS-01 (rebuffer < 1%) **não representativo** até CDN real ou teste manual documentado.

---

### QA-109 — Seed CS-06 incompleto para cenário isolado

**Arquivo:** `backend/prisma/seed.ts`  
**Estado:** 10 alunos `ti01@`–`ti10@` no dept TI ✅; porém Ana/Carla/outro também no TI (total > 10).  
**Risco:** TC-MAT-001 com filtro dept TI matricula **> 10** se não excluir contas demo extras. Documentar massa ou usar dept dedicado.

---

### QA-110 — Monorepo com app legado na raiz

**Estado:** `src/` (Next.js legado) coexiste com `frontend/` EducaFlex.  
**Risco:** Confusão de setup; README deve apontar `backend/`, `frontend/`, `mobile/` como oficial.

---

## 5. Mapeamento regras stakeholder → evidência

| Regra | Escopo v1 | Implementação (code review) | Evidência teste | Status |
|-------|-----------|------------------------------|-----------------|--------|
| **RN-01** | Sequenciamento (nota mínima = v2 quiz) | ✅ `ensureAulaAnteriorConcluida`, códigos `AULA_BLOQUEADA` | TC-PROG-001 **pendente** | 🟡 |
| **RN-02** | Certificado 100% | ✅ Ausente (v2) | TC-NEG-001 **pendente** | 🟢 |
| **RN-03** | Matrícula individual/dept + soft delete | ✅ `MatriculasService` batch dept | TC-MAT-001 **pendente** | 🟡 |
| **RN-04** | Tempo assistido vídeo | ✅ PATCH monotônico; heartbeat 15 s mobile | TC-PROG-002 **pendente** | 🟡 |
| **RN-05** | Publicação → app após sync | ✅ status PUBLICADO + pull-to-refresh | TC-SYNC-001 **pendente** | 🟡 |
| **RN-06** | Gestor cria; aluno consome | 🟡 API guards OK; clientes com gaps QA-101/102 | TC-AUTH-005/006 **pendente** | 🟡 |
| **RN-07** | Conclusão ≥ 90% duração | 🟡 Vídeo API+mobile; artigo só mobile | TC-PROG-004/006 **pendente** | 🟡 |

---

## 6. Cobertura vs PRD — endpoints e RF-*

### 6.1 API — endpoints v1

| Endpoint | PRD | Implementado | Swagger | Teste auto |
|----------|-----|--------------|---------|------------|
| GET `/health` | ✅ | ✅ | ✅ | ❌ |
| POST `/auth/login` | ✅ | ✅ | ✅ | ❌ |
| POST `/auth/forgot-password` | ✅ | ✅ | ✅ | ❌ |
| POST `/auth/reset-password` | ✅ | ✅ | ✅ | ❌ |
| GET/PATCH `/auth/me` | ✅ | ✅ | ✅ | ❌ |
| GET `/categorias` | ✅ | ✅ | ✅ | ❌ |
| GET `/departamentos` | ✅ | ✅ | ✅ | ❌ |
| GET/POST `/usuarios` | ✅ P1 | ✅ | ✅ | ❌ |
| CRUD `/cursos`, módulos, aulas | ✅ | ✅ | ✅ | ❌ |
| POST `/aulas/:id/arquivos/presign` | ✅ | ✅ | ✅ | ❌ |
| POST/DELETE matrículas | ✅ | ✅ | ✅ | ❌ |
| GET `/me/courses`, `/me/courses/:id` | ✅ | ✅ | ✅ | ❌ |
| GET `/aulas/:id/stream-url` | ✅ | ✅ | ✅ | ❌ |
| PATCH/POST progresso-aula | ✅ | ✅ | ✅ | ❌ |
| GET `/dashboard/conclusao` | ✅ | ✅ | ✅ | ❌ |
| GET/PATCH `/notificacoes` | ✅ P2 | ✅ | ✅ | ❌ |

### 6.2 Mobile — telas P0

| Tela | PRD | Implementada | Teste |
|------|-----|--------------|-------|
| Login / Recuperar senha | ✅ | ✅ | ❌ |
| Onboarding 1x | P2 | ✅ | ❌ |
| Home + FAB + pull-to-refresh | ✅ | ✅ | ❌ |
| Detalhe curso + bloqueio | ✅ | ✅ | ❌ |
| Player vídeo + heartbeat | ✅ | ✅ | ❌ |
| Leitor artigo | ✅ | ✅ | ❌ |
| Perfil + logout | ✅ | ✅ | ❌ |
| Notificações | P2 | ✅ | ❌ |
| OfflineBanner | ✅ | ✅ | ❌ |

### 6.3 Web — páginas P0

| Página | PRD | Implementada | Teste |
|--------|-----|--------------|-------|
| Login gestor | ✅ | ✅ | ❌ |
| Dashboard + gráfico | ✅ | ✅ | ❌ |
| CRUD cursos/módulos/aulas | ✅ | ✅ | ❌ |
| Matrículas | ✅ | ✅ | ❌ |
| Gestão usuários | P1 | ✅ | ❌ |
| Relatórios | P1 | ✅ | ❌ |
| Recuperar senha | P1 | ✅ | ❌ |

---

## 7. Pontos positivos (code review)

| Área | Observação |
|------|------------|
| **Sequenciamento** | Ordem global `modulo.ordem + aula.ordem`; desbloqueio automático da próxima aula |
| **Tempo assistido** | `Math.max` monotônico; heartbeat 15 s + flush no dispose do player |
| **Dashboard** | Cálculo 100% = todas aulas CONCLUIDA; agrupamento por departamento |
| **Matrícula** | Batch por dept; duplicatas ignoradas; bootstrap `progresso_aula` |
| **Segurança API** | `videoUrl` não exposto ao aluno; stream URL exige matrícula + desbloqueio |
| **DTOs** | Nomenclatura camelCase alinhada a MODELO-DADOS §1.4 |
| **Adapters** | Mock desde sprint 1; desbloqueia dev sem credenciais externas |
| **Seed** | Idempotente; personas ESTRATEGIA-QA §9.2 + 10 alunos TI |

---

## 8. Casos P0 prioritários — ordem de execução manual

Executar em **staging** com `USE_MOCK_API=false` e MySQL seed aplicado.

| Ordem | Caso | Objetivo | Bloqueia release |
|-------|------|----------|-------------------|
| 1 | TC-AUTH-001/002/005/006 | Papéis e guards | Sim (G9) |
| 2 | TC-PROG-001 | Sequenciamento 403 | Sim (G4, CS-04) |
| 3 | TC-MAT-001 | Dept N=10 (CS-06) | Sim (G3) |
| 4 | TC-DASH-001 | Dashboard N=20 (CS-03) | Sim (G8) |
| 5 | TC-SYNC-001 | Publicação → mobile (CS-02) | Sim (G7) |
| 6 | TC-PROG-002 + TC-VIDEO-002 | Heartbeat (CS-05) | Sim (G5) |
| 7 | TC-VIDEO-001 | Sessão 10 min (CS-01) | Sim (G6) |
| 8 | TC-FLOW-001 | Fluxo aluno E2E | Sim (G16) |
| 9 | TC-FLOW-002 | Fluxo gestor E2E | Sim (G16) |
| 10 | TC-ONL-001–004, TC-ONL-007 | Somente online | Sim (G10) |

---

## 9. Go/No-Go MVP v1 — checklist resumido

Referência completa: [ESTRATEGIA-QA.md](./ESTRATEGIA-QA.md) §6.4.

| Gate | Critério | Status |
|------|----------|--------|
| G1 | Login aluno mobile + gestor web | 🟡 Manual não registrado |
| G2 | CRUD curso + publicação | 🟡 Manual não registrado |
| G3 | Matrícula dept (CS-06) | 🔴 |
| G4 | Sequenciamento 403 (CS-04) | 🔴 |
| G5 | Tempo assistido (CS-05) | 🔴 |
| G6 | Vídeo fluido (CS-01) | 🔴 |
| G7 | Sync publicação (CS-02) | 🔴 |
| G8 | Dashboard (CS-03) | 🔴 |
| G9 | Isolamento por papel/dados | 🔴 |
| G10 | Online-only | 🔴 |
| G11 | Adapters mock | 🟢 Code review |
| G12 | 100% casos P0 executados | 🔴 |
| G13 | Zero defects P0 abertos | 🔴 (QA-001 a QA-005) |
| G14 | OpenAPI `/api/docs` | 🟢 |
| G15 | Migrations + seed clean | 🟡 Não revalidado nesta sessão |
| G16 | TC-FLOW-001/002 | 🔴 |
| G17 | Strings PT-BR | 🟡 Checklist TC-UX-002 pendente |

**No-Go automático:** G4, G6, G8, G9 ou G10 sem evidência — **todos pendentes**.

---

## 10. Plano de ação recomendado (priorizado)

### Sprint QA imediato (bloqueia release)

1. **API:** Criar `backend/test/` ou `*.spec.ts` + Supertest + Testcontainers MySQL — mínimo TC-PROG-001, TC-MAT-001, TC-DASH-001, TC-AUTH-005/006.
2. **CI:** Workflow GitHub Actions — lint + `npm test` + `flutter test` + smoke health.
3. **Manual staging:** Executar TC-FLOW-001 e TC-FLOW-002; registrar planilha §14 ESTRATEGIA-QA.
4. **Mobile:** Default documentado para integração; bloquear GESTOR no login (QA-101).
5. **Web:** Reforçar middleware GESTOR (QA-102).

### P1 pós-release interna

6. RN-07 artigo na API (tempo leitura ou flag client attest — mínimo rejeitar conclusão instantânea).
7. Ativar `ThrottlerGuard` global.
8. Playwright E2E web — TC-WEB-AUTH-001, TC-CURSO-003, TC-MAT-001.
9. `integration_test` Flutter — login + home + bloqueio aula.
10. Remover ou isolar `/register` web se PO confirmar fora de escopo.

---

## 11. Matriz de rastreabilidade — critérios CS → responsável

| CS | Camada principal | Caso | Automatizável | Status |
|----|------------------|------|---------------|--------|
| CS-01 | Mobile + CDN | TC-VIDEO-001 | Parcial (manual métricas) | 🔴 |
| CS-02 | Web + Mobile | TC-SYNC-001 | Parcial | 🔴 |
| CS-03 | API + Web | TC-DASH-001 | ✅ API | 🔴 |
| CS-04 | API + Mobile | TC-PROG-001, TC-MOB-003 | ✅ API | 🔴 |
| CS-05 | API + Mobile | TC-PROG-002 | ✅ API | 🔴 |
| CS-06 | API + Web | TC-MAT-001 | ✅ API | 🔴 |

---

## 12. Registro de evidências (template)

Preencher a cada execução de regressão ou release candidate:

| Campo | Exemplo |
|-------|---------|
| Build / commit | `abc1234` |
| Ambiente | staging |
| Escopo | regressão MVP / RC |
| CS-01 startup (s) | 1.8 |
| CS-01 rebuffer (%) | 0.2 |
| CS-02 sync (s) | 2.1 |
| CS-03 divergências | 0/20 |
| CS-05 erro tempo (s) | 3 |
| Device / rede | Pixel 7, Wi-Fi |
| Resultado | **No-Go** — QA-001 aberto |
| Executor / data | Nome · 2026-09-05 |

---

## 13. Aprovações

| Papel | Nome | Data | Status |
|-------|------|------|--------|
| QA Lead | — | 05/09/2026 | Revisão inicial — **No-Go** |
| Tech Lead | — | — | Pendente |
| Product Owner | — | — | Pendente |

---

*Revisão alinhada ao escopo PRD v1 EducaFlex. Para procedimentos detalhados de teste, casos completos e DoD por história, consultar [ESTRATEGIA-QA.md](./ESTRATEGIA-QA.md).*
