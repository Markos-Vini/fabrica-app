import { LoginForm } from "@/components/LoginForm";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BRAND_NAME } from "@/lib/brand";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-full flex-1 items-center justify-center px-6">
      <div className="absolute right-6 top-6">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md rounded-2xl border border-line bg-panel p-8 shadow-[0_20px_80px_var(--panel-shadow)]">
        <p className="font-mono text-xs tracking-[0.35em] text-copper">ACESSO</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{BRAND_NAME}</h1>
        <p className="mt-2 mb-8 text-sm text-muted">
          Entre com seu e-mail e senha para acessar a esteira de pedidos.
        </p>
        <LoginForm />
        <p className="mt-6 font-mono text-xs text-steel">
          Admin local: <span className="text-ink">admin@fabrica.local</span> / senha do{" "}
          <span className="text-ink">ADMIN_PASSWORD</span>
        </p>
      </div>
    </div>
  );
}
