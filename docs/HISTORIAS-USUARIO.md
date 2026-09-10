# Histórias de Usuário — EducaFlex

**Versão:** 1.0  
**Data:** 04/09/2026  
**Referências:** [PRD.md](./PRD.md) · [MODELO-DADOS.md](./MODELO-DADOS.md) · [ESTRATEGIA-QA.md](./ESTRATEGIA-QA.md)

---

## Legenda

| Prioridade | Significado | Versão |
|------------|-------------|--------|
| **P0** | Bloqueia MVP | v1 |
| **P1** | Essencial MVP | v1 |
| **P2** | Should Have | v1 |
| **P3** | Roadmap | v2+ |

**Estimativa:** Fibonacci (1, 2, 3, 5, 8, 13).

**Camadas v1:** `DB`, `API`, `Auth`, `Mobile`, `Web`, `Admin`.

**Papéis:** Aluno (Usuário final), Gestor (Administrador).

---

# PARTE A — MVP v1

## Épico E1 — Banco de Dados (MySQL)

### US-DB-001 — Schema e migrations iniciais

| Campo | Valor |
|-------|-------|
| **Prioridade** | P0 |
| **Versão** | v1 |
| **Estimativa** | 8 |
| **Camadas** | DB |

**Como** equipe de desenvolvimento,  
**Quero** schema MySQL versionado para `Usuario`, `Categoria`, `Curso`, `Modulo`, `Aula`, `Matricula`, `ProgressoAula`, `Notificacao`, `Arquivo` e `Departamento`,  
**Para que** a persistência seja reproduzível conforme [MODELO-DADOS.md](./MODELO-DADOS.md).

**Critérios de aceite:**
- [ ] Tabelas com FKs, enums (`Papel`: ALUNO/GESTOR; `TipoAula`: VIDEO/ARTIGO; `StatusCurso`: RASCUNHO/PUBLICADO).
- [ ] Relações: Gestor 1:N Curso; Curso 1:N Modulo 1:N Aula; Aluno N:M Curso; Aluno 1:N ProgressoAula.
- [ ] Migrations executáveis via script documentado.
- [ ] **DoD:** TC-DB-001 passa.

**Dependências:** Nenhuma.

---

### US-DB-002 — Seed de categorias e departamentos

| Campo | Valor |
|-------|-------|
| **Prioridade** | P0 |
| **Versão** | v1 |
| **Estimativa** | 2 |
| **Camadas** | DB |

**Como** gestor,  
**Quero** categorias padrão (Compliance, Técnico, Integração, Liderança) e departamentos exemplo,  
**Para que** eu classifique cursos e matricule equipes (RN-03).

**Critérios de aceite:**
- [ ] Seed idempotente.
- [ ] Disponível após setup do ambiente.
- [ ] **DoD:** TC-DB-002 passa.

**Dependências:** US-DB-001.

---

### US-DB-003 — Índices para dashboard e listagens

| Campo | Valor |
|-------|-------|
| **Prioridade** | P1 |
| **Versão** | v1 |
| **Estimativa** | 3 |
| **Camadas** | DB |

**Como** API de dashboard,  
**Quero** índices em `(curso_id, usuario_id)`, `(usuario_id, aula_id)` e `(departamento_id)`,  
**Para que** agregações respondam em **< 500 ms** com ~100 usuários (RNF-003, CS-03).

**Critérios de aceite:**
- [ ] Índices criados conforme MODELO-DADOS.
- [ ] EXPLAIN confirma uso em queries de conclusão.
- [ ] **DoD:** TC-PERF-001 passa.

**Dependências:** US-DB-001.

---

## Épico E2 — Login / Contas

### US-AUTH-001 — Login aluno e gestor

| Campo | Valor |
|-------|-------|
| **Prioridade** | P0 |
| **Versão** | v1 |
| **Estimativa** | 5 |
| **Camadas** | API, Auth, Mobile, Web |

**Como** aluno ou gestor,  
**Quero** fazer login com e-mail e senha,  
**Para que** eu acesse o app ou painel conforme meu papel (RF-AUTH-01, RF-AUTH-02).

**Critérios de aceite:**
- [ ] `POST /auth/login` retorna JWT + papel + dados perfil.
- [ ] Mobile redireciona aluno para Home; Web redireciona gestor para Dashboard.
- [ ] Credenciais inválidas retornam 401 sem vazar informação.
- [ ] **DoD:** TC-AUTH-001, TC-AUTH-002 passam.

**Dependências:** US-DB-001.

---

### US-AUTH-002 — Recuperação de senha

| Campo | Valor |
|-------|-------|
| **Prioridade** | P1 |
| **Versão** | v1 |
| **Estimativa** | 5 |
| **Camadas** | API, Auth, Mobile, Web |

**Como** usuário,  
**Quero** recuperar minha senha por e-mail,  
**Para que** eu recupere acesso sem suporte manual (RF-AUTH-03).

**Critérios de aceite:**
- [ ] Fluxo forgot → token → reset funcional.
- [ ] `MockEmailAdapter` registra e-mail em dev; flag `INTEGRATIONS_MODE=real` usa adapter real.
- [ ] Token expira em 1 h.
- [ ] **DoD:** TC-AUTH-003 passa.

**Dependências:** US-AUTH-001.

---

### US-AUTH-003 — Perfil do usuário

| Campo | Valor |
|-------|-------|
| **Prioridade** | P1 |
| **Versão** | v1 |
| **Estimativa** | 3 |
| **Camadas** | API, Mobile, Web |

**Como** aluno ou gestor,  
**Quero** visualizar e editar meu perfil (nome, avatar opcional),  
**Para que** meus dados estejam atualizados (RF-AUTH-04).

**Critérios de aceite:**
- [ ] `GET/PATCH /auth/me` funcional.
- [ ] Tela Perfil mobile e web equivalentes.
- [ ] **DoD:** TC-AUTH-004 passa.

**Dependências:** US-AUTH-001.

---

### US-AUTH-004 — Guards de papel na API

| Campo | Valor |
|-------|-------|
| **Prioridade** | P0 |
| **Versão** | v1 |
| **Estimativa** | 3 |
| **Camadas** | API, Auth |

**Como** sistema,  
**Quero** restringir endpoints por papel ALUNO/GESTOR,  
**Para que** alunos não criem cursos e gestores não consumam aulas (PRD §3.3).

**Critérios de aceite:**
- [ ] Endpoints gestor retornam 403 para token ALUNO.
- [ ] Endpoints aluno retornam 403 para token GESTOR onde aplicável.
- [ ] **DoD:** TC-AUTH-005 passa.

**Dependências:** US-AUTH-001.

---

## Épico E3 — API / Back-end — Cursos e conteúdo

### US-API-001 — CRUD de cursos (gestor)

| Campo | Valor |
|-------|-------|
| **Prioridade** | P0 |
| **Versão** | v1 |
| **Estimativa** | 8 |
| **Camadas** | API |

**Como** gestor,  
**Quero** criar, editar, listar e excluir cursos,  
**Para que** eu monte o catálogo de treinamentos (RF-CURSO-01).

**Critérios de aceite:**
- [ ] CRUD completo com validações (título obrigatório, categoria válida).
- [ ] Status RASCUNHO/PUBLICADO; só publicados visíveis a alunos matriculados.
- [ ] Curso vinculado ao gestor criador (Usuario 1:N Curso).
- [ ] **DoD:** TC-CURSO-001 passa.

**Dependências:** US-AUTH-004, US-DB-001.

---

### US-API-002 — CRUD módulos e aulas

| Campo | Valor |
|-------|-------|
| **Prioridade** | P0 |
| **Versão** | v1 |
| **Estimativa** | 8 |
| **Camadas** | API |

**Como** gestor,  
**Quero** adicionar módulos ordenados e aulas (vídeo ou artigo) a um curso,  
**Para que** o conteúdo fique estruturado (RF-CURSO-02, RF-CURSO-03).

**Critérios de aceite:**
- [ ] Ordem persistida (`ordem` INT).
- [ ] Aula VIDEO: `url_stream`, `duracao_segundos`.
- [ ] Aula ARTIGO: `conteudo` rich text.
- [ ] **DoD:** TC-CURSO-002 passa.

**Dependências:** US-API-001.

---

### US-API-003 — URL assinada para streaming

| Campo | Valor |
|-------|-------|
| **Prioridade** | P0 |
| **Versão** | v1 |
| **Estimativa** | 5 |
| **Camadas** | API |

**Como** aluno,  
**Quero** obter URL de streaming segura para vídeoaulas,  
**Para que** eu assista com baixa latência via CDN (RNF-006, CS-01).

**Critérios de aceite:**
- [ ] `GET /aulas/{id}/stream-url` retorna URL temporária.
- [ ] Apenas aluno matriculado e aula desbloqueada (RN-01).
- [ ] Token/URL expira em ≤ 4 h (RNF-007).
- [ ] **DoD:** TC-VIDEO-001 passa.

**Dependências:** US-API-002, US-API-005.

---

### US-API-004 — Adapters de integração (mock)

| Campo | Valor |
|-------|-------|
| **Prioridade** | P0 |
| **Versão** | v1 |
| **Estimativa** | 5 |
| **Camadas** | API |

**Como** equipe de desenvolvimento,  
**Quero** adapters mock para e-mail, push e storage,  
**Para que** o MVP funcione sem dependências externas reais (PRD §8).

**Critérios de aceite:**
- [ ] Interfaces `EmailAdapter`, `PushAdapter`, `StorageAdapter` definidas.
- [ ] Impl mock registradas via DI NestJS; flag env `INTEGRATIONS_MODE`.
- [ ] Fila e-mail in-process ou Bull com fallback sync.
- [ ] **DoD:** TC-INT-001 passa.

**Dependências:** Nenhuma (paralelo).

---

## Épico E4 — Matrículas e progresso

### US-API-005 — Matrícula individual e por departamento

| Campo | Valor |
|-------|-------|
| **Prioridade** | P0 |
| **Versão** | v1 |
| **Estimativa** | 8 |
| **Camadas** | API |

**Como** gestor,  
**Quero** matricular alunos individualmente ou por departamento,  
**Para que** as equipes certas acessem cada curso (RN-03, RF-PROG-01/02).

**Critérios de aceite:**
- [ ] `POST /cursos/{id}/matriculas` aceita `usuarioIds[]` ou `departamentoId`.
- [ ] Matrícula em lote cria N registros; ignora duplicatas.
- [ ] `DELETE /matriculas/{id}` remove vínculo (soft delete).
- [ ] **DoD:** TC-MAT-001, TC-MAT-002 passam.

**Dependências:** US-API-001, US-DB-002.

---

### US-API-006 — Registro de tempo assistido

| Campo | Valor |
|-------|-------|
| **Prioridade** | P0 |
| **Versão** | v1 |
| **Estimativa** | 5 |
| **Camadas** | API, Mobile |

**Como** aluno,  
**Quero** que o sistema registre quanto tempo assisti cada vídeoaula,  
**Para que** o RH tenha evidência de consumo (RN-04, RF-PROG-04, CS-05).

**Critérios de aceite:**
- [ ] `PATCH /progresso-aula/{aulaId}` aceita `tempoAssistidoSegundos`.
- [ ] Mobile envia heartbeat a cada 15 s durante reprodução.
- [ ] Erro acumulado ≤ 5 s em vídeo de 5 min (CS-05).
- [ ] **DoD:** TC-PROG-002 passa.

**Dependências:** US-API-005.

---

### US-API-007 — Conclusão sequencial de aulas

| Campo | Valor |
|-------|-------|
| **Prioridade** | P0 |
| **Versão** | v1 |
| **Estimativa** | 8 |
| **Camadas** | API |

**Como** aluno,  
**Quero** só avançar após concluir a aula anterior,  
**Para que** eu siga a trilha pedagógica (RN-01, RN-07, CS-04).

**Critérios de aceite:**
- [ ] Primeira aula do curso sempre desbloqueada.
- [ ] `POST /progresso-aula/{aulaId}/concluir` exige aula anterior concluída.
- [ ] Conclusão vídeo exige tempo assistido ≥ 90% duração (RN-07).
- [ ] Tentativa de pular retorna 403 (CS-04: 100% bloqueios).
- [ ] **DoD:** TC-PROG-001 passa.

**Dependências:** US-API-006.

---

### US-API-008 — Cálculo de progresso do curso

| Campo | Valor |
|-------|-------|
| **Prioridade** | P0 |
| **Versão** | v1 |
| **Estimativa** | 5 |
| **Camadas** | API |

**Como** aluno,  
**Quero** ver minha porcentagem de conclusão por curso,  
**Para que** eu saiba quanto falta (RF-PROG-06).

**Critérios de aceite:**
- [ ] % = aulas concluídas / total aulas publicadas × 100.
- [ ] Retornado em `GET /me/courses` e `GET /me/courses/{id}`.
- [ ] **DoD:** TC-PROG-003 passa.

**Dependências:** US-API-007.

---

## Épico E5 — Dashboard e administração

### US-API-009 — Dashboard taxa de conclusão

| Campo | Valor |
|-------|-------|
| **Prioridade** | P0 |
| **Versão** | v1 |
| **Estimativa** | 8 |
| **Camadas** | API |

**Como** gestor,  
**Quero** ver taxa de conclusão agregada por curso e departamento,  
**Para que** eu acompanhe efetividade dos treinamentos (RF-DASH-01/02, CS-03).

**Critérios de aceite:**
- [ ] `GET /dashboard/conclusao` retorna taxa global e por curso/departamento.
- [ ] Taxa = alunos com 100% / total matriculados.
- [ ] Divergência 0% vs cálculo manual em amostra de 20 alunos (CS-03).
- [ ] **DoD:** TC-DASH-001 passa.

**Dependências:** US-API-008.

---

### US-API-010 — Gestão de usuários

| Campo | Valor |
|-------|-------|
| **Prioridade** | P1 |
| **Versão** | v1 |
| **Estimativa** | 5 |
| **Camadas** | API |

**Como** gestor,  
**Quero** listar usuários e filtrar por departamento/papel,  
**Para que** eu gerencie matrículas (RF-DASH, PRD §5.2).

**Critérios de aceite:**
- [ ] `GET /usuarios` paginado com filtros.
- [ ] Exibe nome, e-mail, departamento, papel.
- [ ] **DoD:** TC-ADMIN-001 passa.

**Dependências:** US-AUTH-004.

---

## Épico E6 — Mobile App (Flutter)

### US-MOB-001 — Tela Login e sessão

| Campo | Valor |
|-------|-------|
| **Prioridade** | P0 |
| **Versão** | v1 |
| **Estimativa** | 5 |
| **Camadas** | Mobile |

**Como** aluno,  
**Quero** fazer login no app mobile,  
**Para que** eu acesse meus cursos (Fluxo F1).

**Critérios de aceite:**
- [ ] Formulário e-mail/senha; tratamento de erros.
- [ ] JWT persistido com segurança (flutter_secure_storage).
- [ ] Link para recuperar senha.
- [ ] **DoD:** TC-MOB-AUTH-001 passa.

**Dependências:** US-AUTH-001.

---

### US-MOB-002 — Home — lista de cursos matriculados

| Campo | Valor |
|-------|-------|
| **Prioridade** | P0 |
| **Versão** | v1 |
| **Estimativa** | 8 |
| **Camadas** | Mobile |

**Como** aluno,  
**Quero** ver meus cursos matriculados com progresso em cards,  
**Para que** eu escolha onde continuar (PRD §5.1, CS-02).

**Critérios de aceite:**
- [ ] Cards `rounded-xl`, cor primária `#800000`, barra de progresso.
- [ ] Pull-to-refresh dispara sync sob demanda (RNF-002).
- [ ] Curso publicado aparece em ≤ 3 s após sync (CS-02).
- [ ] FAB "Continuar" leva à última aula em progresso.
- [ ] **DoD:** TC-SYNC-001, TC-MOB-002 passam.

**Dependências:** US-API-005, US-API-008.

---

### US-MOB-003 — Detalhe curso e trilha de aulas

| Campo | Valor |
|-------|-------|
| **Prioridade** | P0 |
| **Versão** | v1 |
| **Estimativa** | 8 |
| **Camadas** | Mobile |

**Como** aluno,  
**Quero** ver módulos e aulas com status bloqueado/em progresso/concluído,  
**Para que** eu saiba o que posso acessar (RN-01).

**Critérios de aceite:**
- [ ] Aulas bloqueadas com ícone/cadeado; concluídas com check.
- [ ] Toque em aula desbloqueada abre player ou leitor.
- [ ] Toque em bloqueada exibe mensagem explicativa.
- [ ] **DoD:** TC-MOB-003 passa.

**Dependências:** US-MOB-002, US-API-007.

---

### US-MOB-004 — Player de vídeo

| Campo | Valor |
|-------|-------|
| **Prioridade** | P0 |
| **Versão** | v1 |
| **Estimativa** | 13 |
| **Camadas** | Mobile |

**Como** aluno,  
**Quero** assistir vídeoaulas com reprodução fluida,  
**Para que** eu complete treinamentos no celular (CS-01, RNF-006).

**Critérios de aceite:**
- [ ] Player integrado (video_player/chewie ou equivalente).
- [ ] Startup ≤ 2 s; rebuffer < 1% em sessão 10 min (CS-01).
- [ ] Heartbeat tempo assistido (US-API-006).
- [ ] Botão "Marcar como concluída" habilitado após 90% duração.
- [ ] **DoD:** TC-VIDEO-001 passa.

**Dependências:** US-API-003, US-API-006, US-API-007.

---

### US-MOB-005 — Leitor de artigos

| Campo | Valor |
|-------|-------|
| **Prioridade** | P0 |
| **Versão** | v1 |
| **Estimativa** | 5 |
| **Camadas** | Mobile |

**Como** aluno,  
**Quero** ler artigos formatados no app,  
**Para que** eu consuma conteúdo não video (RF-CURSO-05).

**Critérios de aceite:**
- [ ] Renderização markdown/HTML.
- [ ] Anexos clicáveis (PDF via url storage adapter).
- [ ] Botão concluir aula disponível após scroll ≥ 90%.
- [ ] **DoD:** TC-MOB-004 passa.

**Dependências:** US-MOB-003.

---

### US-MOB-006 — Onboarding e notificações in-app

| Campo | Valor |
|-------|-------|
| **Prioridade** | P2 |
| **Versão** | v1 |
| **Estimativa** | 5 |
| **Camadas** | Mobile |

**Como** aluno novo,  
**Quero** tour de boas-vindas e lista de notificações,  
**Para que** eu entenda o app e veja avisos de matrícula (RF-NOTIF-01).

**Critérios de aceite:**
- [ ] Onboarding exibido 1x; pulável.
- [ ] Tela notificações lista `GET /notificacoes`.
- [ ] **DoD:** TC-MOB-005 passa.

**Dependências:** US-MOB-001.

---

## Épico E7 — Front-end Web (Next.js)

### US-WEB-001 — Login gestor

| Campo | Valor |
|-------|-------|
| **Prioridade** | P0 |
| **Versão** | v1 |
| **Estimativa** | 3 |
| **Camadas** | Web |

**Como** gestor,  
**Quero** fazer login no painel web,  
**Para que** eu gerencie cursos e alunos (Fluxo F2).

**Critérios de aceite:**
- [ ] Login restrito a papel GESTOR.
- [ ] Layout limpo, primária `#800000`.
- [ ] **DoD:** TC-WEB-AUTH-001 passa.

**Dependências:** US-AUTH-001.

---

### US-WEB-002 — CRUD cursos, módulos e aulas

| Campo | Valor |
|-------|-------|
| **Prioridade** | P0 |
| **Versão** | v1 |
| **Estimativa** | 13 |
| **Camadas** | Web, Admin |

**Como** gestor,  
**Quero** criar e editar cursos com módulos e aulas no painel,  
**Para que** o conteúdo fique disponível aos alunos (RF-CURSO-01/02/03, CS-02).

**Critérios de aceite:**
- [ ] Formulários curso, módulo, aula com validação.
- [ ] Upload thumbnail via StorageAdapter.
- [ ] Publicar curso altera status para PUBLICADO.
- [ ] Reflete no mobile em ≤ 3 s após sync (CS-02).
- [ ] **DoD:** TC-CURSO-003, TC-SYNC-001 passam.

**Dependências:** US-API-001, US-API-002, US-WEB-001.

---

### US-WEB-003 — Matrícula de alunos

| Campo | Valor |
|-------|-------|
| **Prioridade** | P0 |
| **Versão** | v1 |
| **Estimativa** | 8 |
| **Camadas** | Web, Admin |

**Como** gestor,  
**Quero** matricular alunos por seleção individual ou departamento,  
**Para que** equipes acessem o curso (RN-03).

**Critérios de aceite:**
- [ ] UI seleção múltipla de alunos.
- [ ] Dropdown departamento matricula todos membros.
- [ ] Confirmação e feedback de sucesso.
- [ ] **DoD:** TC-MAT-001 passa.

**Dependências:** US-API-005, US-WEB-002.

---

### US-WEB-004 — Dashboard taxa de conclusão

| Campo | Valor |
|-------|-------|
| **Prioridade** | P0 |
| **Versão** | v1 |
| **Estimativa** | 8 |
| **Camadas** | Web, Admin |

**Como** gestor,  
**Quero** dashboard com KPIs e gráfico de taxa de conclusão,  
**Para que** eu monitore efetividade (RF-DASH-01, CS-03).

**Critérios de aceite:**
- [ ] Cards KPI: taxa global, cursos ativos, alunos matriculados.
- [ ] Gráfico barras por curso/departamento.
- [ ] Dados idênticos ao cálculo manual (CS-03: 0% divergência).
- [ ] **DoD:** TC-DASH-001 passa.

**Dependências:** US-API-009, US-WEB-001.

---

### US-WEB-005 — Gestão de usuários

| Campo | Valor |
|-------|-------|
| **Prioridade** | P1 |
| **Versão** | v1 |
| **Estimativa** | 5 |
| **Camadas** | Web, Admin |

**Como** gestor,  
**Quero** listar e filtrar usuários,  
**Para que** eu gerencie matrículas (PRD §5.2).

**Critérios de aceite:**
- [ ] Tabela paginada com filtros departamento/papel.
- [ ] Ação rápida matricular em curso.
- [ ] **DoD:** TC-ADMIN-001 passa.

**Dependências:** US-API-010, US-WEB-001.

---

## Épico E8 — Fluxos integrados e QA

### US-FLOW-001 — Fluxo ponta a ponta aluno

| Campo | Valor |
|-------|-------|
| **Prioridade** | P0 |
| **Versão** | v1 |
| **Estimativa** | 5 |
| **Camadas** | Mobile, API, Web |

**Como** QA,  
**Quero** validar fluxo F1 completo,  
**Para que** o MVP seja entregável (Fluxo F1).

**Critérios de aceite:**
- [ ] Gestor cria curso → matricula aluno → aluno login → assiste → conclui → progresso 100%.
- [ ] Roteiro documentado em ESTRATEGIA-QA.md (TC-FLOW-001).
- [ ] **DoD:** TC-FLOW-001 passa.

**Dependências:** US-MOB-004, US-WEB-003.

---

### US-FLOW-002 — Fluxo ponta a ponta gestor

| Campo | Valor |
|-------|-------|
| **Prioridade** | P0 |
| **Versão** | v1 |
| **Estimativa** | 3 |
| **Camadas** | Web, API |

**Como** QA,  
**Quero** validar fluxo F2 completo,  
**Para que** gestores operem autonomamente (Fluxo F2).

**Critérios de aceite:**
- [ ] Criar curso → módulos → aulas → publicar → matricular dept → dashboard atualizado.
- [ ] **DoD:** TC-FLOW-002 passa.

**Dependências:** US-WEB-002, US-WEB-004.

---

# PARTE B — Roadmap v2+

## Épico E9 — Avaliações e certificação (v2)

### US-V2-001 — Quiz de múltipla escolha por módulo

| Campo | Valor |
|-------|-------|
| **Prioridade** | P3 |
| **Versão** | v2 |
| **Estimativa** | 13 |
| **Camadas** | DB, API, Mobile, Web |

**Como** gestor,  
**Quero** adicionar quiz de múltipla escolha ao final de cada módulo,  
**Para que** alunos provem assimilação com nota mínima (RN-01 completa).

**Critérios de aceite:**
- [ ] Entidades `Quiz`, `Questao`, `Alternativa`, `RespostaAluno`.
- [ ] Nota mínima configurável por módulo.
- [ ] Aluno reprovado não avança até refazer.
- [ ] **DoD:** TC-QUIZ-001 passa.

**Dependências:** US-API-007.

---

### US-V2-002 — Emissão automática de certificado PDF

| Campo | Valor |
|-------|-------|
| **Prioridade** | P3 |
| **Versão** | v2 |
| **Estimativa** | 8 |
| **Camadas** | API, Mobile, Web |

**Como** aluno,  
**Quero** receber certificado PDF ao completar 100% do curso,  
**Para que** eu comprove conclusão (RN-02).

**Critérios de aceite:**
- [ ] Geração PDF somente com 100% aulas + quizzes aprovados.
- [ ] Download mobile e web; e-mail com anexo.
- [ ] **DoD:** TC-CERT-001 passa.

**Dependências:** US-V2-001, US-API-008.

---

## Épico E10 — Gamificação (v2+)

### US-V2-003 — Ranking entre funcionários

| Campo | Valor |
|-------|-------|
| **Prioridade** | P3 |
| **Versão** | v2+ |
| **Estimativa** | 13 |
| **Camadas** | DB, API, Mobile, Web |

**Como** aluno,  
**Quero** ver ranking de conclusão e pontos da empresa,  
**Para que** eu me motive com gamificação saudável.

**Critérios de aceite:**
- [ ] Pontuação por aula/quiz concluído.
- [ ] Leaderboard por departamento e global.
- [ ] Opt-out de privacidade (LGPD).
- [ ] **DoD:** TC-GAM-001 passa.

**Dependências:** US-V2-001.

---

### US-V2-004 — Push notifications nativas

| Campo | Valor |
|-------|-------|
| **Prioridade** | P3 |
| **Versão** | v2 |
| **Estimativa** | 8 |
| **Camadas** | API, Mobile |

**Como** aluno,  
**Quero** receber push ao ser matriculado ou quando curso novo publicado,  
**Para que** eu seja notificado proativamente (RF-NOTIF-03).

**Critérios de aceite:**
- [ ] Integração FCM/APNs via `PushAdapter` real.
- [ ] Opt-in/opt-out configurável.
- [ ] **DoD:** TC-PUSH-001 passa.

**Dependências:** US-API-004, US-MOB-006.

---

# PARTE C — Priorização e sprint sugerida

## Ordem de implementação (v1)

| Sprint | Histórias | Objetivo |
|--------|-----------|----------|
| **S1** | US-DB-001, US-DB-002, US-AUTH-001, US-AUTH-004, US-API-004 | Fundação: schema, auth, mocks |
| **S2** | US-API-001, US-API-002, US-WEB-001, US-WEB-002 | Gestor cria conteúdo |
| **S3** | US-API-005, US-API-006, US-API-007, US-API-008 | Matrículas e progresso |
| **S4** | US-MOB-001–005, US-API-003 | App mobile consumo |
| **S5** | US-API-009, US-WEB-003, US-WEB-004, US-WEB-005 | Dashboard e matrículas web |
| **S6** | US-AUTH-002, US-AUTH-003, US-MOB-006, US-FLOW-001, US-FLOW-002 | Polimento e E2E |

## Matriz de rastreabilidade (critérios de sucesso)

| Critério | Histórias relacionadas | Casos QA |
|----------|------------------------|----------|
| CS-01 | US-MOB-004, US-API-003 | TC-VIDEO-001 |
| CS-02 | US-MOB-002, US-WEB-002 | TC-SYNC-001 |
| CS-03 | US-API-009, US-WEB-004 | TC-DASH-001 |
| CS-04 | US-API-007, US-MOB-003 | TC-PROG-001 |
| CS-05 | US-API-006, US-MOB-004 | TC-PROG-002 |
| CS-06 | US-API-005, US-WEB-003 | TC-MAT-001 |

## Definition of Done global (v1)

1. Critérios de aceite da história marcados.
2. Code review aprovado.
3. Testes unitários/integração para lógica RN-*.
4. Casos P0 mapeados passando.
5. Strings PT-BR revisadas.
6. Sem regressão em TC-FLOW-001 e TC-FLOW-002.

---

*Backlog priorizado do EducaFlex v1. Histórias P3 compõem roadmap v2+ e não bloqueiam release do MVP.*
