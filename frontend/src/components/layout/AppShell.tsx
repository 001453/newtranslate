"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LocaleToggle } from "@/components/layout/LocaleToggle";
import { useLocale } from "@/hooks/useLocale";
import { useTheme } from "@/hooks/useTheme";
import { bottomTabKeys, moduleKeys } from "@/components/layout/ModuleQuickBar";
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
  const { theme, toggle: toggleTheme } = useTheme();
  const { messages: m } = useLocale();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  const closeMobile = () => setMobileOpen(false);

  const bottomTabs = bottomTabKeys.map((tab) => ({
    ...tab,
    label:
      tab.key === "translate"
        ? m.nav.translate
        : tab.key === "conversation"
          ? m.nav.conversation
          : tab.key === "live"
            ? m.modules.live
            : m.modules.document,
  }));

  return (
    <div className="gb-app">
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={closeMobile}
          aria-label={m.nav.closeMenu}
        />
      )}

      <aside
        className={cn(
          "gb-sidebar",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="gb-sidebar-brand">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="gb-brand-mark">G</div>
              <div>
                <div className="text-sm font-bold tracking-tight">GlobalBridge AI</div>
                <div className="text-[0.65rem] font-medium uppercase tracking-wider text-[var(--gb-muted)]">
                  {m.brand.tagline}
                </div>
              </div>
            </div>
            <LocaleToggle className="shrink-0" />
          </div>
          <div className="mt-4 flex flex-wrap gap-1.5">
            <span className="gb-badge gb-badge-accent">
              <Shield className="mr-1 inline h-3 w-3" />
              {m.badges.local}
            </span>
            <span className="gb-badge">QVAC</span>
            <span className="gb-badge gb-badge-gold">{m.badges.enterprise}</span>
          </div>
        </div>

        <nav className="flex flex-1 flex-col overflow-y-auto">
          <div className="gb-sidebar-section border-0">
            <div className="gb-sidebar-label">{m.nav.help}</div>
            <button type="button" className="gb-menu-item w-full" onClick={() => setShowGuide(true)}>
              <HelpCircle className="h-4 w-4 shrink-0" />
              {m.nav.gettingStarted}
            </button>
            <NavItem
              href="/glossary"
              icon={BookOpen}
              label={m.nav.glossary}
              active={isActive("/glossary")}
              onClick={closeMobile}
            />
            <NavItem
              href="/history"
              icon={History}
              label={m.nav.history}
              active={isActive("/history")}
              onClick={closeMobile}
            />
          </div>

          <div className="gb-sidebar-section flex-1 border-0">
            <div className="gb-sidebar-label">{m.nav.mode}</div>
            <NavItem
              href="/"
              icon={Languages}
              label={m.nav.translate}
              active={isActive("/")}
              badge={m.badges.mic}
              onClick={closeMobile}
            />
            <NavItem
              href="/conversation"
              icon={MessageSquare}
              label={m.nav.conversation}
              active={isActive("/conversation")}
              badge={m.badges.mic}
              onClick={closeMobile}
            />
            <NavItem
              href="/meeting"
              icon={Video}
              label={m.nav.keetMeeting}
              active={isActive("/meeting")}
              live
              badge={m.badges.p2p}
              onClick={closeMobile}
            />
            <NavItem
              href="/live"
              icon={Radio}
              label={m.nav.liveCaption}
              active={isActive("/live")}
              live
              badge={m.badges.mic}
              onClick={closeMobile}
            />
          </div>

          <div className="gb-sidebar-section border-0">
            <div className="gb-sidebar-label">{m.nav.document}</div>
            <NavItem
              href="/document"
              icon={ScrollText}
              label={m.nav.docTranslate}
              active={isActive("/document")}
              onClick={closeMobile}
            />
            <NavItem
              href="/pdf"
              icon={FileText}
              label={m.nav.pdf}
              active={isActive("/pdf")}
              onClick={closeMobile}
            />
          </div>
        </nav>

        <div className="border-t p-3" style={{ borderColor: "var(--gb-border-subtle)" }}>
          <button type="button" className="gb-menu-item w-full" onClick={toggleTheme}>
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {theme === "dark" ? m.nav.lightTheme : m.nav.darkTheme}
          </button>
        </div>
      </aside>

      <div className="gb-main flex min-h-screen flex-col">
        <header className="gb-topbar lg:hidden">
          <button type="button" className="gb-btn-ghost p-2" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <span className="flex-1 text-sm font-semibold">GlobalBridge AI</span>
          <LocaleToggle />
        </header>

        <main className="gb-main-inner gb-main-with-tabs flex-1">{children}</main>

        <nav
          className="gb-bottom-nav lg:hidden"
          style={{ borderColor: "var(--gb-border-subtle)", background: "var(--gb-bg-elevated)" }}
        >
          {bottomTabs.map(({ href, icon: Icon, label }) => {
            const active = isActive(href);
            return (
              <Link key={href} href={href} className={cn("gb-bottom-tab", active && "active")}>
                <Icon className="h-5 w-5" />
                <span>{label}</span>
              </Link>
            );
          })}
          <button type="button" className="gb-bottom-tab" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
            <span>{m.nav.menu}</span>
          </button>
        </nav>

        <footer
          className="hidden border-t px-6 py-3 text-center text-[0.65rem] lg:block"
          style={{ borderColor: "var(--gb-border-subtle)", color: "var(--gb-muted)" }}
        >
          {m.brand.footer}
        </footer>
      </div>

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowGuide(false)}
        >
          <div className="gb-card max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{m.guide.title}</h2>
              <button type="button" onClick={() => setShowGuide(false)}>
                <X className="h-5 w-5 text-[var(--gb-muted)]" />
              </button>
            </div>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-[var(--gb-muted)]">
              <li>{m.guide.step1}</li>
              <li>{m.guide.step2}</li>
              <li>{m.guide.step3}</li>
              <li>{m.guide.step4}</li>
            </ol>
            <button type="button" className="gb-btn-primary mt-5 w-full" onClick={() => setShowGuide(false)}>
              {m.guide.ok}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
