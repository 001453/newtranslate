"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  FileText,
  Languages,
  MessageSquare,
  Radio,
  ScrollText,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";

const modules = [
  { href: "/conversation", icon: MessageSquare, label: "Konuşma" },
  { href: "/meeting", icon: Video, label: "Toplantı" },
  { href: "/live", icon: Radio, label: "Canlı" },
  { href: "/document", icon: ScrollText, label: "Belge" },
  { href: "/pdf", icon: FileText, label: "PDF" },
  { href: "/glossary", icon: BookOpen, label: "Sözlük" },
];

export function ModuleQuickBar({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <div className={cn("flex flex-wrap justify-center gap-2", className)}>
      {modules.map(({ href, icon: Icon, label }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition",
              active
                ? "border-[var(--gb-accent)] bg-[var(--gb-accent-muted)] text-[var(--gb-accent)]"
                : "border-[var(--gb-border)] text-[var(--gb-muted)] hover:border-[var(--gb-accent)] hover:text-[var(--gb-accent)]"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </Link>
        );
      })}
    </div>
  );
}

export const bottomTabs = [
  { href: "/", icon: Languages, label: "Çeviri" },
  { href: "/conversation", icon: MessageSquare, label: "Konuşma" },
  { href: "/live", icon: Radio, label: "Canlı" },
  { href: "/document", icon: ScrollText, label: "Belge" },
] as const;
