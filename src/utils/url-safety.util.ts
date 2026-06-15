import dns from "dns";

/**
 * SSRF protection for user-supplied endpoint URLs.
 *
 * User endpoints may be arbitrary public URLs (the "Custom OpenAI-Compatible"
 * option), so we cannot use a hard allowlist. Instead we require https, resolve
 * the hostname, and reject any URL that resolves to a loopback, private,
 * link-local, or otherwise internal address — blocking internal-network and
 * cloud-metadata (169.254.169.254) probing while preserving public custom
 * endpoints.
 */

/**
 * Returns true if the given IPv4 string is loopback, private (RFC1918),
 * link-local, or the unspecified address.
 */
function isBlockedIPv4(ip: string): boolean {
  const parts = ip.split(".").map((p) => Number(p));
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) {
    // Not a parseable IPv4 — be conservative and block.
    return true;
  }
  const [a, b] = parts;

  if (a === 0) return true; // 0.0.0.0/8 (incl. 0.0.0.0)
  if (a === 127) return true; // 127.0.0.0/8 loopback
  if (a === 10) return true; // 10.0.0.0/8 private
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 private
  if (a === 192 && b === 168) return true; // 192.168.0.0/16 private
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local (metadata)

  return false;
}

/**
 * Returns true if the given IPv6 string is loopback, unspecified, unique-local
 * (fc00::/7), or link-local (fe80::/10). Also handles IPv4-mapped IPv6.
 */
function isBlockedIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();

  if (normalized === "::1") return true; // loopback
  if (normalized === "::") return true; // unspecified

  // IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1) — validate the embedded IPv4.
  const mapped = normalized.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) {
    return isBlockedIPv4(mapped[1]);
  }

  // Unique-local fc00::/7 (fc.. or fd..)
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;

  // Link-local fe80::/10
  if (
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb")
  ) {
    return true;
  }

  return false;
}

function isBlockedAddress(address: string, family: number): boolean {
  return family === 6 ? isBlockedIPv6(address) : isBlockedIPv4(address);
}

/**
 * Validates that a user-supplied URL is safe to make a server-side request to.
 * Throws an Error with a clear message if the URL is rejected.
 *
 * @param rawUrl the user-supplied URL string
 */
export async function assertSafeExternalUrl(rawUrl: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error(`Invalid endpoint URL: ${rawUrl}`);
  }

  if (parsed.protocol !== "https:") {
    throw new Error("Endpoint URL must use https");
  }

  const hostname = parsed.hostname.toLowerCase();

  // Reject internal-only TLDs outright.
  if (hostname.endsWith(".internal") || hostname.endsWith(".local")) {
    throw new Error(`Endpoint URL host is not allowed: ${hostname}`);
  }

  // Resolve the hostname to ALL addresses and ensure none are internal.
  let addresses: { address: string; family: number }[];
  try {
    addresses = await dns.promises.lookup(hostname, { all: true });
  } catch {
    throw new Error(`Could not resolve endpoint URL host: ${hostname}`);
  }

  if (addresses.length === 0) {
    throw new Error(`Could not resolve endpoint URL host: ${hostname}`);
  }

  for (const { address, family } of addresses) {
    if (isBlockedAddress(address, family)) {
      throw new Error(
        `Endpoint URL resolves to a disallowed address: ${hostname}`,
      );
    }
  }
}
