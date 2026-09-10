import type { OrderInput } from "@/lib/types";

export type MockItem = { id: number; title: string; status: string };
export type MockCustomer = { id: number; name: string; segment: string };

export type MockDatabase = {
  meta: {
    name: string;
    problem: string;
    audience: string;
    rules: string;
    stack: {
      mobile: string;
      frontend: string;
      backend: string;
      database: string;
    };
  };
  items: MockItem[];
  customers: MockCustomer[];
};

export function buildMockDatabase(order: OrderInput): MockDatabase {
  return {
    meta: {
      name: order.name,
      problem: order.problem,
      audience: order.audience,
      rules: order.businessRules,
      stack: {
        mobile: order.mobileStack,
        frontend: order.frontendStack,
        backend: order.backendStack,
        database: order.databaseStack,
      },
    },
    items: [
      {
        id: 1,
        title: `Primeiro fluxo de ${order.name}`,
        status: "aberto",
      },
      {
        id: 2,
        title: "Validação das regras de negócio",
        status: "em_andamento",
      },
      {
        id: 3,
        title: "Pedido de exemplo pré-populado",
        status: "concluido",
      },
    ],
    customers: [
      { id: 1, name: "Cliente piloto", segment: order.audience },
      { id: 2, name: "Conta demo", segment: order.audience },
    ],
  };
}

export function collectionOf(
  db: MockDatabase,
  resource: string,
): unknown[] {
  if (resource === "items") return db.items;
  if (resource === "customers") return db.customers;
  return [];
}

export function mockHarnessFiles(order: OrderInput): Record<string, string> {
  const db = buildMockDatabase(order);
  return {
    "mock/db.json": JSON.stringify(db, null, 2) + "\n",
    "mock/package.json": JSON.stringify(
      {
        name: "mock-api",
        private: true,
        scripts: {
          start: "json-server --watch db.json --port 3002 --host 0.0.0.0",
        },
        dependencies: { "json-server": "0.17.4" },
      },
      null,
      2,
    ) + "\n",
    "mock/README.md": `# API mockada — ${order.name}

Pré-populada para o app de teste funcionar sem infraestrutura real.

\`\`\`bash
cd mock && npm install && npm start
# GET http://localhost:3002/items
\`\`\`

Também sobe com \`docker-compose up\` (serviço \`mock-api\`).
`,
  };
}
