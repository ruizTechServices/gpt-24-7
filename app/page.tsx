import { LandingMain } from '@/components/typescript/landing_page/LandingMain'

export default function Home() {
  return (
    <div className="">
      <section className="grid gap-8">
        <div className="text-center py-12 dark:text-neutral-100">
          <h1 className="text-3xl font-bold">24HourGPT</h1>
          <p className="mt-3 text-neutral-700 dark:text-neutral-100">24 hours of premium AI for $1. Simple.</p>
          <div className="mt-6 flex justify-center gap-3">
            <a className="px-4 py-2 rounded bg-black text-white" href="/login">Get Started</a>
            <a className="px-4 py-2 rounded border" href="/chat">Go to Chat</a>
          </div>
        </div>
        <ul className="grid sm:grid-cols-3 gap-4 dark:text-neutral-100">
          <li className="rounded border bg-white p-4 dark:bg-neutral-900 dark:text-neutral-100">✔ Supabase Auth</li>
          <li className="rounded border bg-white p-4 dark:bg-neutral-900 dark:text-neutral-100">✔ Stripe $1 for 24h</li>
          <li className="rounded border bg-white p-4 dark:bg-neutral-900 dark:text-neutral-100">✔ OpenAI & Anthropic Auto‑Router</li>
        </ul>
      </section>
      <LandingMain />
    </div>
  );
}