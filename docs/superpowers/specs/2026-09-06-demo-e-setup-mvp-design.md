# Demo e setup MVP — design

Data: 2026-09-06

## Objetivo

Pedidos de software saem com **demo para stakeholders** (Vercel/APK sem back-end) e **setup leve para devs**, sem compilar na esteira.

## Escopo

- Opção **B**: checkbox APK pré-marcado ao gerar software do planejamento (desmarcável).
- `ensureRunArtifacts`: guias e env por escopo (front-only, back, full-stack).
- `docs/DEMO-ACCOUNTS.md` + validação soft de mock/credenciais.
- Bloco **Demonstração** na aba Entregas (link Vercel, APK, contas demo).

## Fora do escopo

- Build/typecheck na esteira.
- Preview PWA público.

## Matriz demo

| Escopo | Gestor vê |
|--------|-----------|
| Front | Vercel + mock |
| Mobile + generateTestBuild | APK debug |
| Ambos | Vercel + APK |

Tokens GitHub/Vercel em Configurações.
