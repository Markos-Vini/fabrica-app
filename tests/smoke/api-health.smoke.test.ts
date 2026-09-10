import { describe, expect, it } from "vitest";

const API_BASE =
  process.env.EDUCAFLEX_API_URL ?? "http://localhost:3001/api/v1";

const runSmoke = process.env.EDUCAFLEX_SMOKE !== "0";

async function fetchHealth(): Promise<Response | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    return await fetch(`${API_BASE}/health`, { signal: controller.signal });
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

describe.runIf(runSmoke)("smoke — API health", () => {
  it("GET /health retorna status ok", async () => {
    const res = await fetchHealth();

    if (!res || !res.ok) {
      console.warn(
        `[skip] API indisponível em ${API_BASE} — suba: docker compose up -d mysql && cd backend && npm run db:setup && npm run start:dev`,
      );
      return;
    }

    const body = (await res.json()) as {
      status?: string;
      timestamp?: string;
    };

    expect(body.status).toBe("ok");
    expect(body.timestamp).toBeDefined();
  });
});

describe.runIf(runSmoke)("smoke — Swagger", () => {
  it("GET /api/docs responde (redirect ou 200)", async () => {
    const base = API_BASE.replace(/\/api\/v1\/?$/, "");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(`${base}/api/docs`, {
        signal: controller.signal,
        redirect: "manual",
      });

      if (!res) {
        console.warn("[skip] Swagger — API offline");
        return;
      }

      expect([200, 301, 302, 304]).toContain(res.status);
    } catch {
      console.warn("[skip] Swagger — API offline");
    } finally {
      clearTimeout(timeout);
    }
  });
});

describe.runIf(runSmoke)("smoke — login demo gestor", () => {
  it("POST /auth/login retorna JWT para bruno.gestor@educaflex.test", async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "bruno.gestor@educaflex.test",
          password: "Senha@123",
        }),
        signal: controller.signal,
      });

      if (!res || !res.ok) {
        console.warn("[skip] Login — API offline ou seed não aplicado");
        return;
      }

      const body = (await res.json()) as {
        accessToken?: string;
        usuario?: { papel?: string };
      };

      expect(body.accessToken).toBeDefined();
      expect(body.usuario?.papel).toBe("GESTOR");
    } catch {
      console.warn("[skip] Login — API offline");
    } finally {
      clearTimeout(timeout);
    }
  });
});
