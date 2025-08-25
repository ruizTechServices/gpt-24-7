// app/layout.tsx
import './globals.css';

export const metadata = {
  title: '24HourGPT',
  description: '24 hours of premium AI for $1',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
        <header className="border-b bg-white dark:bg-neutral-900">
          <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
            <div className="font-semibold">24HourGPT</div>
            <nav className="flex gap-4 text-sm">
              <a href="/">Home</a>
              <a href="/dashboard">Dashboard</a>
              <a href="/chat">Chat</a>
              <a href="/login">Login</a>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-5xl px-4 py-8 text-xs text-neutral-500">
          © {new Date().getFullYear()} Ruiz Tech Services
        </footer>
      </body>
    </html>
  );
}
