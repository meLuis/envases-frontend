import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Grafos & Complejidad — Envases",
  description:
    "Plataforma didáctica: algoritmos sobre grafos comerciales reales para el curso de Complejidad Algorítmica.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b border-border bg-surface/60 backdrop-blur sticky top-0 z-20">
          <div className="mx-auto max-w-6xl px-5 py-3 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <span className="text-accent text-lg">◆</span>
              <span>Grafos &amp; Complejidad</span>
            </Link>
            <nav className="flex items-center gap-4 text-sm text-muted">
              <Link href="/upload" className="hover:text-foreground transition">
                Empezar
              </Link>
              <a
                href={`${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"}/docs`}
                target="_blank"
                rel="noreferrer"
                className="hover:text-foreground transition"
              >
                API / Swagger
              </a>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-border text-xs text-muted">
          <div className="mx-auto max-w-6xl px-5 py-4">
            Curso de Complejidad Algorítmica · Estructura de datos: grafos · Cada
            algoritmo se ejecuta en vivo contra el backend.
          </div>
        </footer>
      </body>
    </html>
  );
}
