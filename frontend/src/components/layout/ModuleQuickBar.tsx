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
import { useLocale } from "@/hooks/useLocale";
import { cn } from "@/lib/utils";

export const moduleKeys = [
  { href: "/conversation", icon: MessageSquare, key: "conversation" as const },
  { href: "/meeting", icon: Video, key: "keet" as const },
  { href: "/live", icon: Radio, key: "live" as const },
  { href: "/document", icon: ScrollText, key: "document" as const },
  { href: "/pdf", icon: FileText, key: "pdf" as const },
  { href: "/glossary", icon: BookOpen, key: "glossary" as const },
];

export const bottomTabKeys = [
  { href: "/", icon: Languages, key: "translate" as const },
  { href: "/conversation", icon: MessageSquare, key: "conversation" as const },
  { href: "/live", icon: Radio, key: "live" as const },
  { href: "/document", icon: ScrollText, key: "document" as const },
] as const;

export function ModuleQuickBar({ className }: { className?: string }) {
  const pathname = usePathname();
  const { messages: m } = useLocale();

  return (
    <div className={cn("flex flex-wrap justify-center gap-2", className)}>
      {moduleKeys.map(({ href, icon: Icon, key }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        const label = m.modules[key];
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "gb-module-chip",
              active && "active"
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
