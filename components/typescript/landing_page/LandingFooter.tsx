export function LandingFooter() {
  return (
    <footer className="border-t border-zinc-200 dark:border-white/10 mt-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">© {new Date().getFullYear()} 24HourGPT. ruizTechServices| All rights reserved.</p>
        <nav className="flex gap-4 text-sm text-zinc-600 dark:text-zinc-400">
          <a href="#privacy" className="hover:underline">Privacy</a>
          <a href="#terms" className="hover:underline">Terms</a>
          <a href="#contact" className="hover:underline">Contact</a>
        </nav>
      </div>
    </footer>
  )
}
