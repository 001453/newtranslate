/** Keet (Holepunch P2P) invite link helpers — keet:// and pear:// schemes */

const KEET_PREFIXES = ["keet://", "pear://keet", "pear://"];

export function normalizeKeetInvite(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const lower = trimmed.toLowerCase();
  if (KEET_PREFIXES.some((p) => lower.startsWith(p))) {
    return trimmed;
  }
  // Raw room key / invite token
  if (/^[a-zA-Z0-9+/=_-]{20,}$/.test(trimmed)) {
    return `keet://${trimmed}`;
  }
  return trimmed;
}

export function isKeetInvite(raw: string): boolean {
  const n = normalizeKeetInvite(raw);
  const lower = n.toLowerCase();
  return lower.startsWith("keet://") || lower.startsWith("pear://");
}

export function keetOpenHref(invite: string): string {
  return normalizeKeetInvite(invite);
}

/** Short label for UI (room key fingerprint, not secret). */
export function extractKeetRoomLabel(invite: string): string {
  const n = normalizeKeetInvite(invite);
  if (!n) return "";
  const key = n.replace(/^keet:\/\//i, "").replace(/^pear:\/\/keet\/?/i, "").replace(/^pear:\/\//i, "");
  if (key.length <= 16) return key;
  return `${key.slice(0, 8)}…${key.slice(-4)}`;
}

export type MeetingDeepLinkParams = {
  invite?: string;
  myLang?: string;
  otherLang?: string;
};

/** Parse `/meeting?invite=…&from=tr&to=en` deep links. */
export function parseMeetingDeepLink(search: string | URLSearchParams): MeetingDeepLinkParams {
  const params =
    typeof search === "string"
      ? new URLSearchParams(search.startsWith("?") ? search.slice(1) : search)
      : search;

  const inviteRaw = params.get("invite") ?? params.get("keet") ?? "";
  const invite = inviteRaw ? normalizeKeetInvite(decodeURIComponent(inviteRaw)) : undefined;
  const myLang = params.get("from")?.split("-")[0]?.toLowerCase() || undefined;
  const otherLang = params.get("to")?.split("-")[0]?.toLowerCase() || undefined;

  return {
    invite: invite && isKeetInvite(invite) ? invite : inviteRaw ? invite : undefined,
    myLang,
    otherLang,
  };
}

/** Shareable GlobalBridge setup URL (invite + language pair for participants). */
export function buildMeetingDeepLink(opts: {
  invite: string;
  myLang?: string;
  otherLang?: string;
  basePath?: string;
  origin?: string;
}): string {
  const origin = opts.origin ?? (typeof window !== "undefined" ? window.location.origin : "");
  const path = opts.basePath ?? "/meeting";
  const url = new URL(path, origin || "http://localhost:3000");
  const normalized = normalizeKeetInvite(opts.invite);
  if (normalized) url.searchParams.set("invite", normalized);
  if (opts.myLang) url.searchParams.set("from", opts.myLang);
  if (opts.otherLang) url.searchParams.set("to", opts.otherLang);
  return url.toString();
}

export const KEET_DOWNLOAD_URL = "https://keet.io/";
export const KEET_HELP_JOIN = "https://support.keet.io/keet-groups/joining-groups/";
export const PEAR_DOCS_URL = "https://docs.pears.com/";
export const HOLEPUNCH_URL = "https://holepunch.to/";
