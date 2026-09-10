/** Dicas contextuais do wizard — alinhadas ao guia em /ajuda */

export type FieldHint = {
  text: string;
  helpHref?: string;
};

export const FIELD_HINTS = {
  orderKind: {
    text: "Todo pedido novo começa com planejamento: PRD, arquitetura, backlog e planos técnicos. O software é gerado depois, na Etapa 2.",
    helpHref: "/ajuda#tipos-pedido",
  },
  domainTemplate: {
    text: "Modelos prontos (TaskList, E-commerce, etc.) preenchem exemplos no formulário. Você pode mudar qualquer campo depois — o template só acelera o início.",
    helpHref: "/ajuda#novo-pedido",
  },
  problem: {
    text: "Descreva a dor ou objetivo de negócio, não a lista de telas. Ex.: “Pequenos lojistas perdem vendas por falta de controle de estoque.”",
    helpHref: "/ajuda#novo-pedido",
  },
  audience: {
    text: "Quem vai usar no dia a dia? Inclua perfil e contexto. Ex.: “Donos de loja com até 5 funcionários, pouca familiaridade com tecnologia.”",
  },
  businessRules: {
    text: "Regras que o sistema deve respeitar: limites, permissões, cálculos, exceções. Ex.: “Só admin pode excluir pedido; estoque não pode ficar negativo.”",
  },
  mvpEssentials: {
    text: "O mínimo para a 1ª versão funcionar de verdade — 3 a 5 entregas objetivas. Evite colocar tudo aqui; o resto vai em “Depois do MVP”.",
    helpHref: "/ajuda#novo-pedido",
  },
  mvpLater: {
    text: "Funcionalidades desejáveis mas que podem esperar. Ajuda a PM e o backlog a priorizar sem inflar a v1.",
  },
  userRoles: {
    text: "Tipos de pessoa no sistema (admin, cliente, operador…). Define quem vê e faz o quê — base para login e permissões.",
  },
  mainFlows: {
    text: "Jornadas passo a passo, como um roteiro de uso. Ex.: “Cadastro → Login → Lista de tarefas → Criar tarefa → Marcar concluída.”",
    helpHref: "/ajuda#novo-pedido",
  },
  screens: {
    text: "Marque as telas que o app ou painel web deve ter. Orienta o plano de front-end e o backlog — não desenha a UI final.",
  },
  successCriteria: {
    text: "Como saber que deu certo? Use critérios observáveis. Ex.: “Usuário cria 3 tarefas em menos de 2 minutos no demo.”",
  },
  nfr: {
    text: "Requisitos não funcionais: offline, escala, idiomas, privacidade. Opcional, mas evita surpresas na arquitetura e no QA.",
    helpHref: "/ajuda#novo-pedido",
  },
  integrations: {
    text: "Serviços externos (pagamento, e-mail, mapas…). Orienta o planejamento e o backlog — não configura chaves reais automaticamente.",
    helpHref: "/ajuda#integracoes",
  },
  entities: {
    text: "Dados que o sistema guarda (usuário, pedido, produto…). Acelera o modelo de dados e alinha backend, app e painel.",
  },
  entityRelations: {
    text: "Como os dados se ligam. Ex.: “Um usuário tem várias tarefas; cada tarefa pertence a uma categoria.”",
  },
  visualStyle: {
    text: "Diretriz visual para os agentes de front/mobile. Escolha um estilo e, se quiser, uma cor — a esteira usa como referência, não como design final.",
  },
  primaryColor: {
    text: "Cor principal do app (hex). Aparece na prévia dos estilos abaixo. Opcional — deixe em branco para usar a cor padrão do estilo.",
  },
  uiReference: {
    text: "Referências em texto livre. Ex.: “Layout limpo como Todoist” ou “Cards arredondados estilo Nubank.”",
  },
  scope: {
    text: "Quais partes do software serão geradas: app mobile, site, API, banco, login, painel admin. Marque só o necessário.",
    helpHref: "/ajuda#novo-pedido",
  },
  deliverableType: {
    text: "Na Etapa 2: MVP básico (código + docs do planejamento) ou pacote completo (com testes smoke e infra extra).",
    helpHref: "/ajuda#tipos-saida",
  },
  stacks: {
    text: "Tecnologias de cada camada ativa (Flutter, Next.js, Node…). Aparece só para as camadas que você marcou no escopo.",
  },
} as const satisfies Record<string, FieldHint>;
