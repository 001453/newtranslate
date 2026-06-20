import { KeetMeetingBridge } from "@/components/KeetMeetingBridge";

type Props = {
  searchParams: Promise<{ invite?: string; from?: string; to?: string; keet?: string }>;
};

export default async function MeetingPage({ searchParams }: Props) {
  const sp = await searchParams;
  return (
    <KeetMeetingBridge
      keetMode
      initialInvite={sp.invite ?? sp.keet}
      initialMyLang={sp.from}
      initialOtherLang={sp.to}
    />
  );
}
