/** Merge overlapping Whisper chunk transcripts (word-boundary overlap). */
export function mergeDictationChunk(prev: string, next: string): string {
  const cleaned = next.trim();
  if (!cleaned) return "";
  if (!prev) return cleaned;

  const prevLower = prev.toLowerCase();
  const nextLower = cleaned.toLowerCase();
  if (prevLower.endsWith(nextLower)) return "";
  if (prevLower.includes(nextLower) && cleaned.length < prev.length * 0.6) return "";

  const prevWords = prev.split(/\s+/).filter(Boolean);
  const nextWords = cleaned.split(/\s+/).filter(Boolean);
  const maxOverlap = Math.min(6, prevWords.length, nextWords.length);

  for (let k = maxOverlap; k >= 1; k--) {
    const tail = prevWords.slice(-k).join(" ").toLowerCase();
    const head = nextWords.slice(0, k).join(" ").toLowerCase();
    if (tail === head) {
      const delta = nextWords.slice(k).join(" ").trim();
      return delta;
    }
  }

  return cleaned;
}
