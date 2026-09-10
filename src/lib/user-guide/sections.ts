import type { GuideSection } from "./types";

export const USER_GUIDE_SECTIONS: GuideSection[] = [
  {
    id: "visao-geral",
    title: "Visão geral",
    summary: "O que é a Fábrica e o que ela entrega.",
    blocks: [
      {
        kind: "p",
        text: "A Fábrica de Software é uma plataforma web onde você descreve um app (nome, problema, regras, escopo) e uma equipe virtual de agentes de IA produz documentação de planejamento e/ou código empacotado em ZIP — com foco em MVPs testáveis, não em produtos 100% prontos para produção.",
      },
      {
        kind: "p",
        text: "O fluxo é em duas etapas: primeiro planejamento (documentação para alinhar gestão e TI), depois software (MVP básico ou pacote completo) a partir do planejamento aprovado.",
      },
      {
        kind: "callout",
        variant: "tip",
        title: "Recomendação",
        text: "Sempre comece pelo planejamento. Na Etapa 2, escolha MVP básico para testar rápido (Vercel/APK) ou pacote completo para entrega mais robusta ao time de TI.",
      },
    ],
  },
  {
    id: "fluxo-recomendado",
    title: "Fluxo recomendado",
    summary: "Planejamento → aprovação → software.",
    blocks: [
      {
        kind: "ol",
        items: [
          "Crie um pedido do tipo Planejamento e preencha o wizard (Identificação → Produto → Requisitos → Escopo).",
          "Aguarde a esteira concluir. Baixe o ZIP ou consulte o repositório GitHub (se configurado).",
          "Avalie o pacote. Se precisar mudar requisitos, use Editar planejamento ou Duplicar e editar na página do pedido.",
          "Quando estiver OK, use Gerar software a partir deste planejamento (tipos B, C ou D).",
          "Teste o pacote: ZIP, clone do GitHub ou APK de teste (Flutter).",
        ],
      },
      {
        kind: "callout",
        variant: "info",
        text: "Um pedido de planejamento pode gerar um pedido filho de software. Os dados do formulário (MVP, telas, integrações, etc.) são reaproveitados.",
      },
      {
        kind: "callout",
        variant: "tip",
        title: "Atalho MVP",
        text: "Se o objetivo é só testar código (APK, painel, API local), crie pedido Software direto (MVP) — 3 etapas, tipo B — sem passar pelo planejamento.",
      },
    ],
  },
  {
    id: "novo-pedido",
    title: "Novo pedido (wizard)",
    summary: "Planejamento em 5 etapas; Software direto (MVP) em 3.",
    blocks: [
      {
        kind: "h3",
        text: "Planejamento — 5 etapas",
      },
      {
        kind: "table",
        headers: ["Etapa", "O que preencher"],
        rows: [
          [
            "1 · Identificação",
            "Tipo de pedido, template de domínio, nome, problema, público e regras de negócio.",
          ],
          [
            "2 · Produto",
            "MVP v1 vs v2+, papéis de usuário, fluxos principais, checklist de telas e critérios de sucesso.",
          ],
          [
            "3 · Requisitos",
            "RNF (offline, sync, escala, idiomas, LGPD), integrações externas, entidades do modelo de dados e diretriz visual (estilo + cor primária + preview).",
          ],
          [
            "4 · Escopo e stack",
            "Camadas (mobile, web, API, banco), preset de escopo e stacks.",
          ],
          [
            "5 · Revisão",
            "Confira tudo antes de enviar para a esteira.",
          ],
        ],
      },
      {
        kind: "h3",
        text: "Software direto (MVP) — 3 etapas",
      },
      {
        kind: "p",
        text: "Wizard enxuto para gerar código testável sem preencher dezenas de campos. Produto, RNF, integrações e telas vêm do template de domínio escolhido (você pode trocar o template na etapa 1).",
      },
      {
        kind: "table",
        headers: ["Etapa", "O que preencher"],
        rows: [
          [
            "1 · Identificação",
            "Template, nome, problema, público e regras de negócio.",
          ],
          [
            "2 · Escopo e stack",
            "Preset (ex.: stack completa), camadas e stacks tecnológicas.",
          ],
          [
            "3 · Revisão",
            "Confirme e envie. Na Etapa 2, escolha MVP básico ou pacote completo.",
          ],
        ],
      },
      {
        kind: "h3",
        text: "Templates de domínio",
      },
      {
        kind: "p",
        text: "TaskList, Calculadora, E-commerce e Agenda pré-preenchem campos, escopo, stacks e diretriz visual. Escolha o mais próximo do seu produto e ajuste nome, regras e cor primária.",
      },
      {
        kind: "callout",
        variant: "tip",
        title: "Diretriz visual",
        text: "O preview do wizard (Moderno, Corporativo, etc.) mostra sidebar e topbar coloridas no painel web. A esteira orienta os agentes a reproduzir esse padrão — sidebar na cor primária escurecida, não branca.",
      },
    ],
  },
  {
    id: "tipos-pedido",
    title: "Tipos de pedido",
    summary: "Planejamento vs Software direto.",
    blocks: [
      {
        kind: "table",
        headers: ["Tipo", "Entrega"],
        rows: [
          [
            "Planejamento (Etapa 1)",
            "PRD, histórias de usuário, arquitetura, modelo de dados, planos de backend/front, estratégia de QA, roadmap e backlog de tarefas ordenado. Sem código de aplicativo.",
          ],
          [
            "Software direto (MVP)",
            "Wizard de 3 etapas. Gera código testável (tipos B ou C), ZIP e — em full-stack — guia de execução local (Docker, API, web, mobile). Ideal para validar MVP antes de investir em planejamento longo.",
          ],
        ],
      },
    ],
  },
  {
    id: "tipos-saida",
    title: "Tipos de saída (A–D)",
    summary: "Quanto documentação e código vão no pacote.",
    blocks: [
      {
        kind: "table",
        headers: ["Tipo", "Conteúdo"],
        rows: [
          ["A", "Apenas documentação (PRD, arquitetura Mermaid, etc.)."],
          ["B", "Apenas MVP / código das camadas escolhidas (padrão em Software direto)."],
          ["C", "MVP + documentação técnica gerada na esteira (PRD, arquitetura, QA)."],
          ["D", "Aplicação completa: código, banco, testes smoke e documentação."],
        ],
      },
      {
        kind: "p",
        text: "Em pedidos de Planejamento, a saída é sempre documentação (equivalente ao pacote de planejamento). Ao gerar software depois, você escolhe B, C ou D na Etapa 2 do painel de entregas — B é o mais indicado para testar APK/código; C/D reutilizam a documentação já aprovada.",
      },
    ],
  },
  {
    id: "esteira-agentes",
    title: "Esteira de agentes",
    summary: "Quem faz o quê na produção.",
    blocks: [
      {
        kind: "table",
        headers: ["Agente", "Função"],
        rows: [
          ["PM", "PRD e histórias de usuário; separa MVP de v2+."],
          ["Arquiteto", "Arquitetura, diagramas Mermaid e modelo de dados."],
          ["Dev Back-end", "API, rotas e persistência (se escopo incluir backend)."],
          ["Dev Front / Mobile", "Telas web e/ou app mobile conforme escopo (passagens separadas quando há as duas camadas)."],
          ["QA", "Revisão, riscos e estratégia de testes."],
          ["DevOps", "README, Docker, scripts setup-dev, docs/COMO-RODAR-MVP.md (full-stack) e ZIP."],
        ],
      },
      {
        kind: "p",
        text: "Agentes fora do escopo são marcados como ignorados (ex.: sem backend → Dev Back-end não roda). Acompanhe status e logs em tempo real na página do pedido.",
      },
      {
        kind: "callout",
        variant: "info",
        title: "Recuperação e validação",
        text: "Se a esteira concluir com arquivos faltando (ex.: pastas backend/ ou frontend/ incompletas), use Recuperar arquivos e finalizar na página do pedido. Em pedidos de planejamento concluídos, Regenerar documentação refaz o pacote de docs a partir dos dados salvos e das fontes do pedido.",
      },
    ],
  },
  {
    id: "integracoes",
    title: "Integrações externas",
    summary: "O que acontece quando você marca Stripe, e-mail, etc.",
    blocks: [
      {
        kind: "p",
        text: "As integrações marcadas no wizard (pagamento, SSO, push, mapas, etc.) orientam o planejamento: arquitetura, plano de backend, backlog e QA.",
      },
      {
        kind: "callout",
        variant: "warn",
        title: "Importante",
        text: "Marcar uma integração não configura automaticamente SDKs reais nem chaves de produção. O MVP costuma prever mocks, stubs ou simulações; a implementação real com credenciais fica para a equipe de desenvolvimento.",
      },
      {
        kind: "ul",
        items: [
          "Planejamento: tarefas explícitas no backlog e seções no PLANO-BACKEND.",
          "Software: agentes podem gerar interfaces/adapters e .env.example, mas você precisa das contas nos provedores (Stripe, Google Cloud, FCM, etc.).",
        ],
      },
    ],
  },
  {
    id: "entregas",
    title: "Entregas do pedido",
    summary: "ZIP, GitHub, APK e PDF.",
    blocks: [
      {
        kind: "ul",
        items: [
          "ZIP completo — pacote gerado em storage/orders/{id}/; botão Baixar ZIP na página do pedido.",
          "GitHub — se houver token em Configurações, a Fábrica cria repo privado e envia os arquivos. Use Republicar para atualizar.",
          "APK de teste — disponível para pedidos Flutter com build de teste; dispara workflow no GitHub Actions (requer token GitHub).",
          "PDF de planejamento — documento formatado para gestores: resumo em linguagem simples, PRD, histórias de usuário, roadmap e dados (sem backlog técnico de tarefas — esse fica no ZIP).",
          "Gerar software — no pedido de planejamento concluído, cria pedido filho de software com os mesmos requisitos.",
          "Full-stack MVP — pedidos com API + banco + (web ou mobile) incluem docs/COMO-RODAR-MVP.md, scripts/setup-dev.ps1 e setup-dev.sh, docker-compose com healthcheck e mobile/run-dev.ps1 (IP da rede para celular físico).",
          "Recuperar arquivos — botão na esteira de software quando a entrega ficou incompleta; remonta ZIP a partir de arquivos recuperados no disco.",
        ],
      },
      {
        kind: "callout",
        variant: "info",
        text: "O preview PWA foi removido. Para testar apps mobile, use o ZIP (pasta mobile/), clone do GitHub ou instale o APK.",
      },
    ],
  },
  {
    id: "rodar-mvp",
    title: "Rodar o MVP gerado",
    summary: "Stack completa localmente (Docker, API, painel, mobile).",
    blocks: [
      {
        kind: "p",
        text: "Projetos full-stack (back-end + banco + painel web e/ou app mobile) saem com guia e scripts de setup. Use após baixar o ZIP ou clonar do GitHub.",
      },
      {
        kind: "ol",
        items: [
          "Pré-requisitos: Node.js 20+, Docker Desktop e (para mobile) Flutter 3+.",
          "No Windows: .\\scripts\\setup-dev.ps1 na raiz do projeto — copia .env, sobe MySQL/Postgres no Docker, roda migrations/seed.",
          "Terminal 1 — API: cd backend && npm run start:dev (porta 3001).",
          "Terminal 2 — Painel: cd frontend && npm install && npm run dev (porta 3002). Confirme NEXT_PUBLIC_USE_MOCK_API=false.",
          "Terminal 3 — Mobile: cd mobile && .\\run-dev.ps1 (celular na mesma Wi-Fi) ou flutter run com API em 10.0.2.2 (emulador Android).",
        ],
      },
      {
        kind: "callout",
        variant: "warn",
        title: "Celular físico vs emulador",
        text: "10.0.2.2 só funciona no emulador Android. No celular real use o IP da sua máquina na rede (run-dev.ps1 detecta automaticamente). Defina PUBLIC_BASE_URL no backend/.env com esse IP para vídeos e uploads.",
      },
      {
        kind: "p",
        text: "Detalhes, portas e troubleshooting estão em docs/COMO-RODAR-MVP.md dentro do ZIP.",
      },
    ],
  },
  {
    id: "mock-vs-real",
    title: "Modo MOCK vs IA real",
    summary: "Demonstração sem tokens vs modelos configurados.",
    blocks: [
      {
        kind: "table",
        headers: ["Modo", "Comportamento"],
        rows: [
          [
            "MOCK (demonstração)",
            "Templates pré-definidos interpolados com os dados do seu pedido. Não consome API de LLM. Ideal para demos e testes de fluxo.",
          ],
          [
            "IA real",
            "Cada agente chama o modelo escolhido em Configurações. Exige chave do provedor (OpenAI, Anthropic, Gemini, Ollama ou Cursor).",
          ],
        ],
      },
      {
        kind: "p",
        text: "Com MOCK desligado, se faltar chave para o provedor do modelo selecionado, o agente falha com mensagem clara na esteira.",
      },
      {
        kind: "callout",
        variant: "info",
        text: "Em MVPs full-stack, o pacote MOCK também inclui scaffold real (NestJS/Express + Docker + guia de execução), não apenas json-server. O mock-api genérico só aparece em escopos parciais (ex.: backend sem banco dedicado).",
      },
    ],
  },
  {
    id: "configuracoes",
    title: "Configurações (admin)",
    summary: "Chaves, modelos e publicação remota.",
    blocks: [
      {
        kind: "ul",
        items: [
          "Chaves de API — OpenAI, Anthropic, Gemini, Ollama (URL base) e Cursor; armazenadas cifradas.",
          "Mapeamento agente → modelo — escolha qual LLM cada agente usa.",
          "Modo MOCK — liga/desliga demonstração sem tokens.",
          "Entrega remota — token GitHub (Personal Access Token) para criar repos e build de APK.",
          "URL pública base — usada em links de entrega quando aplicável.",
        ],
      },
      {
        kind: "callout",
        variant: "tip",
        text: "Para GitHub: crie um PAT com permissão de repositório. A Fábrica cria o repo automaticamente ao concluir o pedido — não é necessário criar repositório vazio manualmente.",
      },
    ],
  },
  {
    id: "usuarios",
    title: "Usuários e acesso",
    summary: "Admin vs membro.",
    blocks: [
      {
        kind: "table",
        headers: ["Papel", "Permissões"],
        rows: [
          ["Administrador", "Vê todos os pedidos, acessa Configurações e Usuários, gerencia chaves e modelos."],
          ["Membro", "Vê e cria apenas os próprios pedidos."],
        ],
      },
      {
        kind: "p",
        text: "Login com e-mail e senha. Sessão segura em cookie httpOnly.",
      },
    ],
  },
  {
    id: "limites",
    title: "Limitações e expectativas",
    summary: "O que a Fábrica não faz hoje.",
    blocks: [
      {
        kind: "ul",
        items: [
          "Não substitui desenvolvimento humano para integrações de produção, deploy em nuvem do cliente ou publicação em stores.",
          "Código gerado é ponto de partida (MVP); revise, teste e ajuste antes de produção — pequenos ajustes manuais após o primeiro teste são normais.",
          "APK via GitHub Actions depende de quota e configuração do GitHub; não há build Android local na Fábrica.",
          "Fila de jobs roda no mesmo processo do servidor (JSON local), não é fila distribuída.",
          "Upload de imagens de referência visual no wizard ainda não está disponível — use texto em Referência visual e a cor primária.",
        ],
      },
      {
        kind: "callout",
        variant: "info",
        text: "Planejamento detalhado: quanto mais completo o wizard (produto, telas, RNF, entidades), melhor ficam PRD e backlog. Em Software direto (MVP), o template de domínio já traz defaults — foque em nome, regras e escopo.",
      },
    ],
  },
  {
    id: "faq",
    title: "Perguntas frequentes",
    summary: "Dúvidas comuns.",
    blocks: [
      {
        kind: "h3",
        text: "O pedido ficou em falha na esteira. O que fazer?",
      },
      {
        kind: "p",
        text: "Abra o detalhe do pedido, leia a mensagem de erro do agente. Em modo real, confira chaves e modelos em Configurações. Use Reexecutar esteira após corrigir.",
      },
      {
        kind: "h3",
        text: "Posso editar o pedido depois de criado?",
      },
      {
        kind: "p",
        text: "Sim, para planejamentos concluídos: Editar planejamento (mesmo pedido, regenera docs) ou Duplicar e editar (novo pedido com cópia dos dados). Não é possível editar enquanto houver software vinculado em andamento na esteira.",
      },
      {
        kind: "h3",
        text: "Onde ficam os arquivos gerados?",
      },
      {
        kind: "p",
        text: "Metadados em data/fabrica.json; pacote completo em storage/orders/{id}/ (tree.json + ZIP). GitHub, se configurado, recebe cópia publicada.",
      },
      {
        kind: "h3",
        text: "Preciso de Redis ou serviços extras para rodar a Fábrica?",
      },
      {
        kind: "p",
        text: "Não. npm run dev sobe um único processo Next.js com persistência JSON local.",
      },
      {
        kind: "h3",
        text: "O app mobile não conecta no back local. O que verificar?",
      },
      {
        kind: "p",
        text: "Celular e PC na mesma Wi-Fi; use run-dev.ps1 ou API_BASE_URL com IP da máquina (não 10.0.2.2). Back-end escutando na porta 3001; PUBLIC_BASE_URL no .env do backend para URLs de mídia. Veja docs/COMO-RODAR-MVP.md no ZIP.",
      },
      {
        kind: "h3",
        text: "O painel ficou sem cor na sidebar. É bug?",
      },
      {
        kind: "p",
        text: "Projetos gerados antes das melhorias visuais podem ter sidebar clara. Versões recentes orientam sidebar/topbar na cor primária (como o preview do wizard). Ajuste globals.css ou regenere o software com diretriz visual definida.",
      },
    ],
  },
];

export function getGuideSection(id: string): GuideSection | undefined {
  return USER_GUIDE_SECTIONS.find((section) => section.id === id);
}
