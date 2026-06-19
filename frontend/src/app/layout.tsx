import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { LocaleProvider } from "@/hooks/useLocale";
import "./globals.css";

export const metadata: Metadata = {
  title: "GlobalBridge AI — Enterprise Translation",
  description: "Translation, conversation, live captions & PDF — on your device",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body>
        <LocaleProvider>
          <AppShell>{children}</AppShell>
        </LocaleProvider>
      </body>
    </html>
  );
}
