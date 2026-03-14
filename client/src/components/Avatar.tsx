import { useState } from "react";
import { resolveMediaUrl } from "../services/fileService";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

/**
 * Resolve a profile picture URL — handles both server-relative paths
 * (e.g. `/public/123.jpg`) and absolute URLs (e.g. Google profile images).
 */
function resolveAvatarSrc(pic: string | undefined | null): string | null {
  if (!pic) return null;
  // absolute URL → use as-is (Google, etc.)
  if (pic.startsWith("http://") || pic.startsWith("https://")) return pic;
  // server-relative → prepend API base
  if (pic.startsWith("/")) return `${API_URL}${pic}`;
  return resolveMediaUrl(pic) ?? null;
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface AvatarProps {
  /** The raw profilePicture value from the user object */
  src?: string | null;
  /** Username used for the initial-letter fallback */
  username: string;
  /** Pixel size (width & height) */
  size: number;
  /** Extra CSS class names forwarded to the root element */
  className?: string;
}

/**
 * Shared avatar component with built-in image error fallback.
 *
 * Renders the user's profile image when available; if the image fails to load
 * (e.g. expired Google URL) or no `src` is provided, a coloured circle with the
 * user's initial letter is shown instead.
 */
export default function Avatar({
  src,
  username,
  size,
  className = "",
}: AvatarProps) {
  const resolved = resolveAvatarSrc(src);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const isCurrentSrcFailed = Boolean(resolved && failedSrc === resolved);

  if (resolved && !isCurrentSrcFailed) {
    return (
      <img
        src={resolved}
        alt={username}
        className={`rounded-circle object-fit-cover ${className}`.trim()}
        style={{ width: size, height: size }}
        onError={() => setFailedSrc(resolved)}
      />
    );
  }

  return (
    <div
      className={`rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center fw-bold ${className}`.trim()}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        fontWeight: 600,
      }}
    >
      {(username?.[0] || "U").toUpperCase()}
    </div>
  );
}
