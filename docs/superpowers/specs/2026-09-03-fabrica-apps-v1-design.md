# Fábrica de Apps v1 — Design

Data: 2026-09-03

## Objetivo

Plataforma web onde um administrador descreve um app, escolhe entregáveis e stacks, e uma equipe virtual de agentes de IA gera documentação e/ou código empacotado em ZIP. A plataforma é agnóstica a provedores de LLM, com modo MOCK para demonstrações sem consumir tokens.

## Escopo v1

Inclui:

- Formulário de pedido (identificação, tipo de saída A–D, stacks por camada, flag de build de teste persistida)
- Senha única de administrador
- Painel de API keys (OpenAI, Anthropic, Gemini, Ollama) e mapeamento agente → modelo
- Modo MOCK / demonstração
- Pipeline dos 6 agentes com status ao vivo
- Download do ZIP conforme o tipo de saída
- Preview PWA público (`/p/:id`) com QR e API mockada
- Workflow de APK debug no ZIP e criação de repo GitHub quando há token
- Scaffold mobile mínimo (Flutter + React Native/Expo) e APK via GitHub Actions

Fora desta fatia: compilação local de APK (Android SDK), deploy Netlify e fila distribuída (Redis/Inngest).

## Stack da fábrica

Next.js App Router (TypeScript) + persistência JSON em `data/fabrica.json` + Vitest. Um único processo (`npm run dev`).

## Autenticação

Senha em `ADMIN_PASSWORD`. Sessão HMAC em cookie httpOnly. Proxy Next.js redireciona rotas protegidas para `/login`.

## Dados

- `Setting` singleton: mockMode, chaves cifradas (AES-256-GCM), URL Ollama, JSON de modelos por agente
- `Order`: dados do formulário, status, agente atual, erro
- `AgentRun`: status, modelo, texto de saída
- Artefatos em disco em `storage/orders/{id}/` + ZIP

## Pipeline

| Tipo | Agentes |
|------|---------|
| A Documentação | PM, Arquiteto, QA, DevOps (zip) |
| B MVP | Arquiteto, Backend, Frontend, QA, DevOps |
| C MVP + docs | todos |
| D Completo | todos (DevOps inclui testes no pacote) |

Modo MOCK: templates interpolados com os dados do pedido. Modo real: LLM Router chama o provedor do modelo escolhido.

## LLM Router

Modelo → provedor (prefixo `gpt`/`o1`/`o3` → OpenAI, `claude` → Anthropic, `gemini` → Gemini, restante → Ollama). Sem chave do provedor, o agente falha com mensagem clara.

## UI

Português. Tema escuro industrial (cobre/âmbar). Páginas: login, dashboard de pedidos, wizard de novo pedido, detalhe com linha de agentes, configurações.
