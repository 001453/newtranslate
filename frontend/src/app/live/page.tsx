"use client";

import { KeetMeetingBridge } from "@/components/KeetMeetingBridge";
import { useLocale } from "@/hooks/useLocale";

export default function LivePage() {
  const { messages: m } = useLocale();
  return (
    <KeetMeetingBridge keetMode={false} title={m.meeting.liveTitle} subtitle={m.meeting.liveSubtitle} />
  );
}
