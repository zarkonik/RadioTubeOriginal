// Extracts the videoId from various YouTube link shapes (watch?v=, youtu.be/, embed/, shorts/).
export function extractVideoId(input: string): string | null {
  const trimmed = input.trim();

  // If the user pasted a bare ID (11 chars, letters/digits/-/_)
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed);
    if (url.hostname.includes("youtu.be")) {
      return url.pathname.slice(1) || null;
    }
    if (url.hostname.includes("youtube.com")) {
      if (url.pathname === "/watch") return url.searchParams.get("v");
      const match = url.pathname.match(/\/(embed|shorts)\/([\w-]{11})/);
      if (match) return match[2];
    }
  } catch {
    return null;
  }

  return null;
}
