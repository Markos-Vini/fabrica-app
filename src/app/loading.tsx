export default function Loading() {
  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto max-w-4xl animate-pulse space-y-6 px-6 py-10">
        <div className="h-3 w-24 rounded bg-bg-2" />
        <div className="h-9 w-64 rounded bg-bg-2" />
        <div className="h-4 w-full max-w-xl rounded bg-bg-2" />
        <div className="h-48 rounded-2xl border border-line bg-panel" />
      </div>
    </div>
  );
}
