import type { OrderInput } from "@/lib/types";
import { hasClientLayer, scopeLayersLabel } from "@/lib/order-scope";
import { mermaidDbNode, mermaidEdge, mermaidNode } from "./mermaid-label";
import { androidWorkflow } from "./android-workflow";
import { mockHarnessFiles } from "./mock-api";
import { slugify } from "./slug";
import { ensureRunArtifacts } from "./ensure-run-artifacts";
import { isFullStackMvp, mvpDockerCompose } from "./mvp-stack-scaffold";

function scopeOf(order: OrderInput) {
  return {
    includeMobile: order.includeMobile,
    includeFrontend: order.includeFrontend,
    includeBackend: order.includeBackend,
    includeDatabase: order.includeDatabase,
    includeAuth: order.includeAuth,
    includeAdmin: order.includeAdmin,
  };
}

export function generateMockProject(order: OrderInput): Record<string, string> {
  const scope = scopeOf(order);
  const files: Record<string, string> = {};
  const slug = slugify(order.name);
  const includeDocs = order.deliverableType !== "B";
  const includeCode = order.deliverableType !== "A";

  files["README.md"] = readme(order, slug, includeDocs, includeCode, scope);

  if (scope.includeBackend && !isFullStackMvp(order)) {
    Object.assign(files, mockHarnessFiles(order));
  }

  if (scope.includeMobile && order.generateTestBuild) {
    files[".github/workflows/android-debug.yml"] = androidWorkflow(
      order.mobileStack,
    );
  }

  if (includeDocs) {
    files["docs/PRD.md"] = prd(order, scope);
    files["docs/ARQUITETURA.md"] = architecture(order, scope);
    files["docs/QA.md"] = qaReport(order, includeCode, scope);
  }

  if (includeCode) {
    if (scope.includeBackend) Object.assign(files, backendFiles(order));
    if (scope.includeFrontend) Object.assign(files, webFrontendFiles(order));
    if (scope.includeMobile) Object.assign(files, mobileFiles(order, slug));
    if (scope.includeBackend || scope.includeDatabase) {
      files["docker-compose.yml"] = isFullStackMvp(order)
        ? mvpDockerCompose(order, slug)
        : dockerCompose(order, slug);
    }
  }

  if (order.deliverableType === "D") {
    files["tests/smoke.test.js"] = smokeTest(order);
  }

  Object.assign(files, ensureRunArtifacts(order, files));
  return files;
}

function readme(
  order: OrderInput,
  slug: string,
  includeDocs: boolean,
  includeCode: boolean,
  scope: ReturnType<typeof scopeOf>,
): string {
  const stackLines = [
    scope.includeMobile ? `- Mobile: ${order.mobileStack}` : "",
    scope.includeFrontend ? `- Front-end: ${order.frontendStack}` : "",
    scope.includeBackend ? `- Back-end: ${order.backendStack}` : "",
    scope.includeDatabase ? `- Banco: ${order.databaseStack}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return `# ${order.name}

Pacote gerado pela **Fábrica de Software** (modo MOCK / demonstração).

## Problema
${order.problem}

## Público-alvo
${order.audience}

## Escopo
${scopeLayersLabel(scope)}

## Stack
${stackLines || "- Escopo mínimo"}

## Como subir
${includeCode && scope.includeBackend ? `\`\`\`bash
docker-compose up
# ou, no back-end:
cd backend && npm install && npm start
\`\`\`` : includeCode ? "Abra o projeto mobile ou front conforme README da pasta correspondente." : "Este pacote contém apenas documentação."}

${includeDocs ? "Documentação em `docs/`." : ""}
## Teste rápido
${scope.includeMobile ? "- App mobile: abra a pasta `mobile/` com Flutter/React Native ou use o repositório GitHub.\n" : ""}${scope.includeFrontend ? "- Front-end: siga o README em `frontend/`.\n" : ""}${scope.includeBackend ? "- API mock: `cd mock && npm start` ou serviço `mock-api` no docker-compose.\n" : ""}${order.generateTestBuild && scope.includeMobile ? "- APK debug: rode o workflow `.github/workflows/android-debug.yml` no GitHub Actions.\n" : ""}

Slug: \`${slug}\`
`;
}

function prd(order: OrderInput, scope: ReturnType<typeof scopeOf>): string {
  const mvpItems = ["Fluxo principal descrito no pedido"];
  if (scope.includeAuth) mvpItems.unshift("Login ou identificação do usuário");
  if (scope.includeAdmin) mvpItems.push("Painel administrativo básico");
  if (scope.includeBackend) mvpItems.push("Persistência via API");

  return `# PRD — ${order.name}

## 1. Visão
${order.problem}

## 2. Público-alvo
${order.audience}

## 3. Regras de negócio
${order.businessRules}

## 4. Escopo incluído
${scopeLayersLabel(scope)}

## 5. Entregável
Tipo ${order.deliverableType} selecionado no pedido.

## 6. MVP funcional
${mvpItems.map((item, i) => `${i + 1}. ${item}`).join("\n")}

## 7. Critérios de aceite
- O usuário consegue completar o fluxo principal em menos de 2 minutos
${scope.includeBackend ? `- As regras de negócio acima são validadas no servidor\n- Os dados persistem no ${order.databaseStack}` : "- A lógica roda localmente no app, sem servidor"}
`;
}

function architecture(order: OrderInput, scope: ReturnType<typeof scopeOf>): string {
  const rows: string[] = [];
  if (scope.includeMobile) rows.push(`| Mobile | ${order.mobileStack} |`);
  if (scope.includeFrontend) rows.push(`| Front-end | ${order.frontendStack} |`);
  if (scope.includeBackend) rows.push(`| Back-end | ${order.backendStack} |`);
  if (scope.includeDatabase) rows.push(`| Banco | ${order.databaseStack} |`);

  const user = mermaidNode("user", "Usuário");
  const edges: string[] = [];
  if (scope.includeMobile) {
    const mobile = mermaidNode("mobile", order.mobileStack);
    edges.push(mermaidEdge(user, mobile));
  }
  if (scope.includeFrontend) {
    const web = mermaidNode("web", order.frontendStack);
    edges.push(mermaidEdge(user, web));
  }
  if (scope.includeBackend) {
    const api = mermaidNode("api", order.backendStack);
    if (scope.includeMobile) {
      edges.push(mermaidEdge(mermaidNode("mobile", order.mobileStack), api));
    }
    if (scope.includeFrontend) {
      edges.push(mermaidEdge(mermaidNode("web", order.frontendStack), api));
    }
    if (scope.includeDatabase) {
      edges.push(mermaidEdge(api, mermaidDbNode("db", order.databaseStack)));
    }
  }

  return `# Arquitetura — ${order.name}

Escopo: ${scopeLayersLabel(scope)}

| Camada | Tecnologia |
|--------|------------|
${rows.join("\n")}

\`\`\`mermaid
flowchart LR
${edges.join("\n")}
\`\`\`

## Decisões
${scope.includeBackend ? "- API REST versionada em `/api/v1`\n- Autenticação por sessão/JWT no back-end" : "- Sem back-end — estado e lógica no cliente"}
${scope.includeDatabase ? `- Banco ${order.databaseStack} como fonte da verdade` : "- Sem banco de dados persistente"}
`;
}

function qaReport(
  order: OrderInput,
  includeCode: boolean,
  scope: ReturnType<typeof scopeOf>,
): string {
  const stackNote = [
    scope.includeFrontend ? order.frontendStack : "",
    scope.includeBackend ? order.backendStack : "",
    scope.includeDatabase ? order.databaseStack : "",
  ]
    .filter(Boolean)
    .join(" / ");

  return `# Relatório QA — ${order.name}

- [x] PRD cobre problema, público e regras
- [x] Arquitetura respeita escopo: ${scopeLayersLabel(scope)}
${stackNote ? `- [x] Stack de referência: ${stackNote}` : ""}
${includeCode ? "- [x] Esqueleto gerado apenas para camadas marcadas\n" : "- [x] Pacote apenas documental, sem código de runtime\n"}
- [ ] Testes de integração reais (aguardam ambiente do cliente)
`;
}

function backendFiles(order: OrderInput): Record<string, string> {
  const stack = order.backendStack.toLowerCase();
  if (stack.includes("python") || stack.includes("fastapi") || stack.includes("django")) {
    return {
      "backend/main.py": pythonBackend(order),
      "backend/requirements.txt": "fastapi\nuvicorn\n",
    };
  }
  if (stack.includes("java") || stack.includes("spring")) {
    return {
      "backend/src/main/java/app/Application.java": javaBackend(order),
      "backend/pom.xml": "<project><!-- Spring Boot esqueleto --></project>\n",
    };
  }
  if (stack.includes(".net") || stack.includes("c#")) {
    return {
      "backend/Program.cs": csharpBackend(order),
    };
  }
  if (stack.includes("laravel") || stack.includes("php")) {
    return {
      "backend/routes/api.php": phpBackend(order),
    };
  }
  return {
    "backend/src/server.js": nodeBackend(order),
    "backend/package.json": JSON.stringify(
      {
        name: `${slugify(order.name)}-api`,
        private: true,
        scripts: { start: "node src/server.js" },
        dependencies: { express: "^4.21.0" },
      },
      null,
      2,
    ),
    ...(order.includeDatabase
      ? {
          "backend/prisma/schema.prisma": `// Schema MOCK — ${order.name}
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Item {
  id    String @id @default(cuid())
  title String
}
`,
        }
      : {}),
  };
}

function nodeBackend(order: OrderInput): string {
  return `const express = require("express");
const app = express();
app.use(express.json());

app.get("/api/v1/health", (_req, res) => {
  res.json({ ok: true, app: ${JSON.stringify(order.name)} });
});

app.get("/api/v1/exemplo", (_req, res) => {
  res.json({
    problema: ${JSON.stringify(order.problem)},
    regras: ${JSON.stringify(order.businessRules)},
  });
});

app.listen(3001, () => console.log("API ${order.name} em :3001"));
`;
}

function pythonBackend(order: OrderInput): string {
  return `from fastapi import FastAPI

app = FastAPI(title="${order.name}")

@app.get("/api/v1/health")
def health():
    return {"ok": True, "app": "${order.name}"}
`;
}

function javaBackend(order: OrderInput): string {
  return `package app;
// Esqueleto Spring Boot — ${order.name}
public class Application {
  public static void main(String[] args) {
    System.out.println("${order.name}");
  }
}
`;
}

function csharpBackend(order: OrderInput): string {
  return `var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();
app.MapGet("/api/v1/health", () => new { ok = true, app = "${order.name}" });
app.Run();
`;
}

function phpBackend(order: OrderInput): string {
  return `<?php
Route::get('/api/v1/health', fn () => ['ok' => true, 'app' => '${order.name}']);
`;
}

function webFrontendFiles(order: OrderInput): Record<string, string> {
  return {
    "frontend/package.json": JSON.stringify(
      { name: `${slugify(order.name)}-frontend`, private: true },
      null,
      2,
    ),
    "frontend/README.md": `# Front-end — ${order.name}

Stack: **${order.frontendStack}**

Suba o back-end e aponte o cliente para \`http://localhost:3001\` quando houver API.
`,
    "frontend/src/App.jsx": `import { useEffect, useState } from "react";

export default function App() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    fetch("http://localhost:3002/items")
      .then((res) => res.json())
      .then(setItems)
      .catch(() => setItems([]));
  }, []);
  return (
    <main>
      <h1>${order.name}</h1>
      <p>${order.problem}</p>
      <p>Público: ${order.audience}</p>
      <ul>
        {items.map((item) => (
          <li key={item.id}>{item.title}</li>
        ))}
      </ul>
    </main>
  );
}
`,
  };
}

function mobileFiles(order: OrderInput, slug: string): Record<string, string> {
  const mobile = order.mobileStack.toLowerCase();
  if (mobile.includes("flutter")) return flutterScaffold(order, slug);
  if (mobile.includes("react native")) return reactNativeScaffold(order, slug);
  return {
    "mobile/README.md": `# Mobile — ${order.name}

Stack: **${order.mobileStack}**
`,
  };
}

function flutterScaffold(order: OrderInput, slug: string): Record<string, string> {
  const safeName = order.name.replace(/'/g, "\\'");
  const safeProblem = order.problem.replace(/'/g, "\\'");
  return {
    "mobile/pubspec.yaml": `name: ${slug.replace(/-/g, "_")}
description: ${order.name}
publish_to: "none"
version: 1.0.0+1
environment:
  sdk: ">=3.0.0 <4.0.0"
dependencies:
  flutter:
    sdk: flutter
dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^4.0.0
flutter:
  uses-material-design: true
`,
    "mobile/lib/main.dart": `import 'package:flutter/material.dart';

void main() {
  runApp(const PreviewApp());
}

class PreviewApp extends StatelessWidget {
  const PreviewApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '${safeName}',
      theme: ThemeData(colorSchemeSeed: const Color(0xFFD4894A)),
      home: Scaffold(
        appBar: AppBar(title: const Text('${safeName}')),
        body: Padding(
          padding: const EdgeInsets.all(16),
          child: Text('${safeProblem}'),
        ),
      ),
    );
  }
}
`,
    "mobile/README.md": `# Mobile Flutter — ${order.name}

Gerado pela Fábrica de Software. O workflow \`android-debug.yml\` roda \`flutter create\` e compila um APK debug.
`,
  };
}

function reactNativeScaffold(order: OrderInput, slug: string): Record<string, string> {
  const safeName = order.name.replace(/'/g, "\\'");
  const safeProblem = order.problem.replace(/'/g, "\\'").replace(/\n/g, " ");
  const packageId = `com.fabrica.${slug.replace(/-/g, "")}`;
  const npmName = slug.replace(/-/g, "_");

  return {
    "mobile/package.json": JSON.stringify(
      {
        name: npmName,
        version: "1.0.0",
        private: true,
        main: "index.js",
        scripts: {
          start: "expo start",
          android: "expo run:android",
        },
        dependencies: {
          expo: "~52.0.0",
          "expo-status-bar": "~2.0.0",
          react: "18.3.1",
          "react-native": "0.76.3",
        },
        devDependencies: {
          "@babel/core": "^7.25.0",
          "babel-preset-expo": "~12.0.0",
        },
      },
      null,
      2,
    ),
    "mobile/app.json": JSON.stringify(
      {
        expo: {
          name: order.name,
          slug,
          version: "1.0.0",
          orientation: "portrait",
          android: {
            package: packageId,
          },
        },
      },
      null,
      2,
    ),
    "mobile/babel.config.js": `module.exports = function (api) {
  api.cache(true);
  return { presets: ["babel-preset-expo"] };
};
`,
    "mobile/index.js": `import { registerRootComponent } from "expo";
import App from "./App";

registerRootComponent(App);
`,
    "mobile/App.tsx": `import { StatusBar } from "expo-status-bar";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>${safeName}</Text>
        <Text style={styles.body}>${safeProblem}</Text>
      </View>
      <StatusBar style="light" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#100e0c",
    padding: 16,
    justifyContent: "center",
  },
  card: {
    backgroundColor: "#1e1914",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#3a3228",
  },
  title: {
    color: "#f4ece3",
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 8,
  },
  body: {
    color: "#b3a394",
    fontSize: 16,
    lineHeight: 22,
  },
});
`,
    "mobile/README.md": `# Mobile React Native (Expo) — ${order.name}

Gerado pela Fábrica de Software. O workflow \`android-debug.yml\` roda \`expo prebuild\` e compila um APK debug com Gradle.
`,
  };
}

function dockerCompose(order: OrderInput, slug: string): string {
  const db = order.databaseStack.toLowerCase();
  const service = db.includes("mongo")
    ? `  mongo:
    image: mongo:7
    ports: ["27017:27017"]`
    : db.includes("mysql")
      ? `  mysql:
    image: mysql:8
    environment:
      MYSQL_ROOT_PASSWORD: example
      MYSQL_DATABASE: ${slug.replace(/-/g, "_")}
    ports: ["3306:3306"]`
      : db.includes("sqlite")
        ? `  # SQLite não precisa de container — arquivo local em backend/data.db`
        : db.includes("firebase") || db.includes("supabase")
          ? `  # ${order.databaseStack} é gerenciado fora do docker-compose local`
          : `  postgres:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: example
      POSTGRES_DB: ${slug.replace(/-/g, "_")}
    ports: ["5432:5432"]`;

  return `services:
${service}
  mock-api:
    image: node:20-alpine
    working_dir: /app
    volumes:
      - ./mock:/app
    command: sh -c "npm install --omit=dev && npx json-server --watch db.json --port 3002 --host 0.0.0.0"
    ports:
      - "3002:3002"
`;
}

function smokeTest(order: OrderInput): string {
  return `const assert = require("node:assert");

test("nome do app está definido", () => {
  assert.equal(${JSON.stringify(order.name)}.length > 0, true);
});
`;
}
