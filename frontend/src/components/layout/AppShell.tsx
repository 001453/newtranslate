"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useTheme } from "@/hooks/useTheme";
import { bottomTabs } from "@/components/layout/ModuleQuickBar";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  FileText,
  HelpCircle,
  History,
  Languages,
  Menu,
  MessageSquare,
  Moon,
  Radio,
  ScrollText,
  Shield,
  Sun,
  Video,
  X,
} from "lucide-react";

function NavItem({
  href,
  icon: Icon,
  label,
  active,
  live,
  badge,
  onClick,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
  live?: boolean;
  badge?: string;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn("gb-menu-item", active && "active", live && active && "gb-menu-item-live")}
    >
      <Icon className="h-4 w-4 shrink-0 opacity-80" />
      <span className="flex-1">{label}</span>
      {badge && <span className="text-[0.6rem] uppercase opacity-60">{badge}</span>}
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  const closeMobile = () => setMobileOpen(false);

  return (
    <div className="gb-app">
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={closeMobile}
          aria-label="Menüyü kapat"
        />
      )}

      <aside
        className={cn(
          "gb-sidebar",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="gb-sidebar-brand">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl text-lg font-bold text-white"
              style={{ background: "linear-gradient(135deg, var(--gb-accent), #1a4d8c)" }}
            >
              G
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight">GlobalBridge AI</div>
              <div className="text-[0.65rem] font-medium uppercase tracking-wider text-[var(--gb-muted)]">
                Cihazda çeviri
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-1.5">
            <span className="gb-badge gb-badge-accent">
              <Shield className="mr-1 inline h-3 w-3" />
              Yerel
            </span>
            <span className="gb-badge">QVAC</span>
            <span className="gb-badge gb-badge-gold">Enterprise</span>
          </div>
        </div>

        <nav className="flex flex-1 flex-col overflow-y-auto">
          <div className="gb-sidebar-section border-0">
            <div className="gb-sidebar-label">Yardım</div>
            <button type="button" className="gb-menu-item w-full" onClick={() => setShowGuide(true)}>
              <HelpCircle className="h-4 w-4 shrink-0" />
              Başlangıç
            </button>
            <NavItem href="/glossary" icon={BookOpen} label="Sözlük" active={isActive("/glossary")} onClick={closeMobile} />
            <NavItem href="/history" icon={History} label="Geçmiş" active={isActive("/history")} onClick={closeMobile} />
          </div>

          <div className="gb-sidebar-section flex-1 border-0">
            <div className="gb-sidebar-label">Mod</div>
            <NavItem href="/" icon={Languages} label="Çeviri" active={isActive("/")} badge="mic" onClick={closeMobile} />
            <NavItem href="/conversation" icon={MessageSquare} label="Konuşma" active={isActive("/conversation")} badge="mic" onClick={closeMobile} />
            <NavItem href="/meeting" icon={Video} label="Keet Toplantı" active={isActive("/meeting")} live badge="P2P" onClick={closeMobile} />
            <NavItem href="/live" icon={Radio} label="Canlı Altyazı" active={isActive("/live")} live badge="mic" onClick={closeMobile} />
          </div>

          <div className="gb-sidebar-section border-0">
            <div className="gb-sidebar-label">Belge</div>
            <NavItem href="/document" icon={ScrollText} label="Belge çevirisi" active={isActive("/document")} onClick={closeMobile} />
            <NavItem href="/pdf" icon={FileText} label="PDF" active={isActive("/pdf")} onClick={closeMobile} />
          </div>
        </nav>

        <div className="border-t p-3" style={{ borderColor: "var(--gb-border-subtle)" }}>
          <button type="button" className="gb-menu-item w-full" onClick={toggle}>
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {theme === "dark" ? "Açık tema" : "Koyu tema"}
          </button>
        </div>
      </aside>

      <div className="gb-main flex min-h-screen flex-col">
        <header
          className="sticky top-0 z-20 flex items-center gap-3 border-b px-4 py-3 lg:hidden"
          style={{ background: "var(--gb-bg-elevated)", borderColor: "var(--gb-border-subtle)" }}
        >
          <button type="button" className="gb-btn-ghost p-2" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold">GlobalBridge AI</span>
        </header>

        <main className="gb-main-inner gb-main-with-tabs flex-1">{children}</main>

        <nav
          className="gb-bottom-nav lg:hidden"
          style={{ borderColor: "var(--gb-border-subtle)", background: "var(--gb-bg-elevated)" }}
        >
          {bottomTabs.map(({ href, icon: Icon, label }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn("gb-bottom-tab", active && "active")}
              >
                <Icon className="h-5 w-5" />
                <span>{label}</span>
              </Link>
            );
          })}
          <button type="button" className="gb-bottom-tab" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
            <span>Menü</span>
          </button>
        </nav>

        <footer
          className="hidden border-t px-6 py-3 text-center text-[0.65rem] lg:block"
          style={{ borderColor: "var(--gb-border-subtle)", color: "var(--gb-muted)" }}
        >
          GlobalBridge AI · Veriler cihazınızda · UI v2
        </footer>
      </div>

      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowGuide(false)}>
          <div className="gb-card max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Başlangıç</h2>
              <button type="button" onClick={() => setShowGuide(false)}>
                <X className="h-5 w-5 text-[var(--gb-muted)]" />
              </button>
            </div>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-[var(--gb-muted)]">
              <li><strong className="text-[var(--gb-text)]">Çeviri</strong> — ortadaki kutuya yazın veya dikte edin.</li>
              <li><strong className="text-[var(--gb-text)]">Konuşma</strong> — iki dilli diyalog modu.</li>
              <li><strong className="text-[var(--gb-text)]">Keet Toplantı</strong> — P2P görüşme, ana dilinizde altyazı.</li>
              <li>Veriler cihazınızda kalır.</li>
            </ol>
            <button type="button" className="gb-btn-primary mt-5 w-full" onClick={() => setShowGuide(false)}>
              Tamam
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
