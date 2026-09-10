import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["jszip", "@cursor/sdk", "pdfkit", "better-sqlite3"],
  outputFileTracingExcludes: {
    "*": [
      "./backend/**",
      "./frontend/**",
      "./mobile/**",
      "./storage/**",
      "./data/**",
      "./tests/**",
      "./docs/**",
    ],
  },
  turbopack: {
    ignoreIssue: [
      {
        path: "**/src/lib/artifacts/agent-disk-recovery.ts",
        title: /Dynamic filesystem access/,
      },
      {
        path: "**/src/lib/artifacts/order-workspace.ts",
        title: /Dynamic filesystem access/,
      },
      {
        path: "**/src/lib/store.ts",
        title: /Dynamic filesystem access/,
      },
      {
        path: "**/src/lib/agents/**",
        title: /Dynamic filesystem access/,
      },
      {
        path: "**/src/lib/jobs/**",
        title: /Dynamic filesystem access/,
      },
    ],
  },
};

export default nextConfig;
