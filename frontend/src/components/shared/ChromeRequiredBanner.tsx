"use client";

import { useLocale } from "@/hooks/useLocale";
import { isChromeBrowser } from "@/lib/meetingExport";

export function ChromeRequiredBanner() {
  const { messages: m } = useLocale();
  if (isChromeBrowser()) return null;

  return (
    <div className="gb-alert-warning text-sm">
      <strong>{m.meeting.chromeRequiredTitle}</strong>
      <p className="mt-1">{m.meeting.chromeRequiredBody}</p>
    </div>
  );
}
