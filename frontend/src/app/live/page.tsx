import { KeetMeetingBridge } from "@/components/KeetMeetingBridge";

export default function LivePage() {
  return (
    <KeetMeetingBridge
      keetMode={false}
      title="Canlı Altyazı"
      subtitle="Zoom · Meet · Teams — ana dilinizde anlık çeviri"
    />
  );
}
