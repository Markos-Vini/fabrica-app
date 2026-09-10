import { detectVercelFramework } from "@/lib/vercel/detect-framework";

export type DeployVercelInput = {
  token: string;
  name: string;
  files: Record<string, string>;
  env?: Record<string, string>;
  fetchImpl?: typeof fetch;
};

export async function deployToVercel(
  input: DeployVercelInput,
): Promise<{ url: string }> {
  const token = input.token.trim();
  if (!token) {
    throw new Error("Token da Vercel não configurado.");
  }
  const fetchImpl = input.fetchImpl ?? fetch;
  const files = Object.entries(input.files).map(([file, data]) => ({
    file,
    data,
  }));
  const framework = detectVercelFramework(input.files);
  const payload: Record<string, unknown> = {
    name: input.name,
    files,
    target: "production",
  };
  if (framework) {
    payload.projectSettings = { framework };
  }
  if (input.env && Object.keys(input.env).length > 0) {
    payload.env = input.env;
    payload.build = { env: input.env };
  }
  const res = await fetchImpl("https://api.vercel.com/v13/deployments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const body = (await res.json()) as {
    url?: string;
    error?: { message?: string };
    message?: string;
  };
  if (!res.ok || !body.url) {
    throw new Error(
      body.error?.message ?? body.message ?? `Vercel HTTP ${res.status}`,
    );
  }
  const url = body.url.startsWith("http") ? body.url : `https://${body.url}`;
  return { url };
}
