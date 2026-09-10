import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-3 px-6">
      <p className="font-mono text-xs tracking-[0.3em] text-copper">404</p>
      <h1 className="text-2xl font-semibold">Pedido não encontrado</h1>
      <Link href="/" className="text-sm text-copper hover:underline">
        Voltar aos pedidos
      </Link>
    </div>
  );
}
