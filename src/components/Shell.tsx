"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpenCheck, LayoutGrid, LineChart, Mic, Radio, Upload } from "lucide-react";
import type { ReactNode } from "react";

const NAV = [
  { href: "/", label: "Overview", icon: LayoutGrid },
  { href: "/live", label: "Live", icon: Mic },
  { href: "/lessons", label: "Lessons", icon: Radio },
  { href: "/lessons/new", label: "Import", icon: Upload },
  { href: "/insights", label: "Insights", icon: LineChart },
  { href: "/rubric", label: "Rubric", icon: BookOpenCheck },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/lessons") return pathname === "/lessons" || /^\/lessons\/(?!new)/.test(pathname);
  return pathname.startsWith(href);
}

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-3 group">
      <span className="relative grid place-items-center size-9 rounded-xl bg-gradient-to-br from-cyan to-violet shadow-[0_0_30px_-6px_var(--cyan)]">
        <span className="absolute inset-[3px] rounded-[9px] bg-bg" />
        <span className="relative flex items-end gap-[2px] h-4">
          {[6, 12, 16, 9].map((h, i) => (
            <span key={i} className="w-[3px] rounded-full bg-gradient-to-t from-cyan to-violet" style={{ height: h }} />
          ))}
        </span>
      </span>
      <span className="leading-none">
        <span className="block font-semibold tracking-tight text-[15px]">RTR</span>
        <span className="block text-[10px] font-mono uppercase tracking-[0.18em] text-muted">Read the Room</span>
      </span>
    </Link>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="relative z-10 flex min-h-screen">
      <aside className="hidden lg:flex w-60 shrink-0 flex-col gap-8 border-r border-line px-5 py-6 sticky top-0 h-screen">
        <Logo />
        <nav className="flex flex-col gap-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-xl px-3 h-10 text-sm transition-colors ${
                  active ? "bg-panel-strong text-text border border-line" : "text-muted hover:text-text border border-transparent"
                }`}
              >
                <Icon size={16} className={active ? "text-cyan" : ""} />
                {label}
              </Link>
            );
          })}
        </nav>
        <Link href="/live" className="btn btn-primary mt-auto">
          <Mic size={16} /> Start lesson
        </Link>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="lg:hidden flex items-center justify-between px-4 h-16 border-b border-line sticky top-0 z-30 bg-bg/80 backdrop-blur-xl">
          <Logo />
          <Link href="/live" className="btn btn-primary h-9 px-4">
            <Mic size={14} /> Live
          </Link>
        </header>
        <main className="flex-1 min-w-0 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-6 lg:py-10 pb-28 lg:pb-10">{children}</main>
      </div>

      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-line bg-bg/85 backdrop-blur-xl grid grid-cols-5 pb-[env(safe-area-inset-bottom)]">
        {NAV.filter((n) => n.href !== "/lessons/new").map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link key={href} href={href} className={`flex flex-col items-center gap-1 py-2.5 text-[10px] ${active ? "text-cyan" : "text-muted"}`}>
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
