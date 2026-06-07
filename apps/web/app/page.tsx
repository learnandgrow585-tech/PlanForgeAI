import Link from 'next/link';

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6">
      <p className="mb-3 font-mono text-xs uppercase tracking-widest text-brand">
        AI Planning Operating System
      </p>
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
        PlanForge <span className="text-brand">AI</span>
      </h1>
      <p className="mt-4 max-w-xl text-muted">
        Turn any goal — wealth, career, fitness, a startup — into a structured,
        12-section plan with milestones, risk analysis and a success score.
      </p>
      <div className="mt-8 flex gap-3">
        <Link
          href="/login"
          className="rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-neutral-950 hover:opacity-90"
        >
          Get started
        </Link>
        <Link
          href="/dashboard"
          className="rounded-md border border-border px-5 py-2.5 text-sm font-semibold text-fg hover:bg-card"
        >
          Dashboard
        </Link>
        <Link
          href="/blog"
          className="rounded-md border border-border px-5 py-2.5 text-sm font-semibold text-fg hover:bg-card"
        >
          Blog
        </Link>
      </div>
    </main>
  );
}
