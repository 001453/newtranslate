/** Keet (Holepunch P2P) davet linki yardımcıları */

const KEET_PREFIXES = ["keet://", "pear://keet", "pear://"];

export function normalizeKeetInvite(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (KEET_PREFIXES.some((p) => trimmed.toLowerCase().startsWith(p))) {
    return trimmed;
  }
  // Ham oda anahtarı / invite metni
  if (/^[a-zA-Z0-9+/=_-]{20,}$/.test(trimmed)) {
    return `keet://${trimmed}`;
  }
  return trimmed;
}

export function isKeetInvite(raw: string): boolean {
  const n = normalizeKeetInvite(raw);
  return n.startsWith("keet://") || n.startsWith("pear://");
}

export function keetOpenHref(invite: string): string {
  return normalizeKeetInvite(invite);
}

export const KEET_DOWNLOAD_URL = "https://keet.io/";
export const KEET_HELP_JOIN = "https://support.keet.io/keet-groups/joining-groups/";

export const KEET_SETUP_STEPS = [
  {
    title: "Keet'i açın",
    body: "Keet uçtan uca şifreli P2P görüşme sağlar — sunucu yok, doğrudan bağlantı. Henüz yoksa keet.io adresinden indirin.",
  },
  {
    title: "Oda davetini yapıştırın",
    body: "Keet'te oda oluşturun veya davet linkini alın (keet://…). Linki aşağıya yapıştırın — Keet uygulamasında açılır.",
  },
  {
    title: "Ana dilinizi seçin",
    body: "Altyazılar sizin ana dilinizde görünür. Karşı taraf farklı dilde konuşursa otomatik çevrilir; siz konuşunca kendi dilinizde görürsünüz.",
  },
  {
    title: "Köprüyü başlatın",
    body: "Keet sekmesinin sesini paylaşın (veya mikrofon). GlobalBridge yerel QVAC ile anlık altyazı üretir — ses buluta gitmez.",
  },
] as const;
