export function adminEmail(): string {
  return process.env.ADMIN_EMAIL || "admin@fabrica.local";
}

export function adminPassword(): string {
  return process.env.ADMIN_PASSWORD || "admin";
}

export function sessionSecret(): string {
  return process.env.SESSION_SECRET || "fabrica-dev-session-secret";
}
