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
 *
 * The function returns the validated address(es) so callers can pin the
 * connection to the exact IP that was checked, closing the DNS-rebinding
 * TOCTOU window (see assertSafeExternalUrl).
 */

export interface SafeAddress {
  address: string;
  family: number;
}

/**
 * Returns true if the given IPv4 string is loopback, private (RFC1918),
 * link-local, or the unspecified address.
 */
function isBlockedIPv4(ip: string): boolean {
  const parts = ip.split(".").map((p) => Number(p));
  if (
    parts.length !== 4 ||
    parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)
  ) {
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
 * Expands an IPv6 address to its full 8-group, 4-hex-digit form (lowercase).
 * Handles "::" compression and a trailing dotted-quad (IPv4-mapped) suffix.
 * Returns null if the address cannot be parsed as IPv6.
 */
function expandIPv6(ip: string): string[] | null {
  let work = ip.toLowerCase().trim();

  // Strip zone id (e.g. fe80::1%eth0) — not relevant to the address itself.
  const zoneIdx = work.indexOf("%");
  if (zoneIdx !== -1) {
    work = work.slice(0, zoneIdx);
  }

  if (work.length === 0) return null;

  // A trailing dotted-quad (e.g. ::ffff:127.0.0.1) is converted to two hex
  // groups so the whole address can be treated uniformly as 8 16-bit groups.
  const dottedMatch = work.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (dottedMatch) {
    const octets = dottedMatch[1].split(".").map((p) => Number(p));
    if (octets.some((o) => Number.isNaN(o) || o < 0 || o > 255)) {
      return null;
    }
    const [o1, o2, o3, o4] = octets;
    const g1 = ((o1 << 8) | o2).toString(16);
    const g2 = ((o3 << 8) | o4).toString(16);
    work = work.slice(0, dottedMatch.index) + `${g1}:${g2}`;
  }

  // Split on the "::" compression marker (at most one allowed).
  const halves = work.split("::");
  if (halves.length > 2) return null;

  const head = halves[0].length ? halves[0].split(":") : [];
  const tail =
    halves.length === 2 && halves[1].length ? halves[1].split(":") : [];

  let groups: string[];
  if (halves.length === 2) {
    // "::" present — fill the gap with enough zero groups to reach 8.
    const missing = 8 - (head.length + tail.length);
    if (missing < 0) return null;
    groups = [...head, ...Array(missing).fill("0"), ...tail];
  } else {
    groups = head;
  }

  if (groups.length !== 8) return null;

  // Validate and normalize each group to 4 hex digits.
  const normalized: string[] = [];
  for (const g of groups) {
    if (!/^[0-9a-f]{1,4}$/.test(g)) return null;
    normalized.push(g.padStart(4, "0"));
  }
  return normalized;
}

/**
 * Returns true if the given IPv6 string is loopback, unspecified, unique-local
 * (fc00::/7), link-local (fe80::/10), an IPv4-mapped IPv6 address whose
 * embedded IPv4 is blocked, or a NAT64 well-known/local-use prefix.
 *
 * Both the dotted form (::ffff:127.0.0.1) and the hex form (::ffff:7f00:1) of
 * IPv4-mapped addresses are handled by expanding to canonical groups first.
 */
function isBlockedIPv6(ip: string): boolean {
  const groups = expandIPv6(ip);
  if (groups === null) {
    // Unparseable IPv6 — be conservative and block.
    return true;
  }

  const numeric = groups.map((g) => parseInt(g, 16));

  const isAllZero = (from: number, to: number): boolean => {
    for (let i = from; i <= to; i++) {
      if (numeric[i] !== 0) return false;
    }
    return true;
  };

  // ::1 loopback
  if (isAllZero(0, 6) && numeric[7] === 1) return true;
  // :: unspecified
  if (isAllZero(0, 7)) return true;

  // IPv4-mapped IPv6 ::ffff:0:0/96 — groups 0-4 are zero, group 5 is ffff.
  // The embedded IPv4 lives in the low 32 bits (groups 6 and 7). This covers
  // BOTH ::ffff:127.0.0.1 and the equivalent hex form ::ffff:7f00:1.
  if (isAllZero(0, 4) && numeric[5] === 0xffff) {
    const a = numeric[6] >> 8;
    const b = numeric[6] & 0xff;
    const c = numeric[7] >> 8;
    const d = numeric[7] & 0xff;
    return isBlockedIPv4(`${a}.${b}.${c}.${d}`);
  }

  // NAT64 well-known prefix 64:ff9b::/96 — an attacker could embed a private
  // IPv4 in the low 32 bits and have a NAT64 gateway translate it internally.
  if (
    numeric[0] === 0x64 &&
    numeric[1] === 0xff9b &&
    isAllZero(2, 5)
  ) {
    return true;
  }

  // NAT64 local-use prefix 64:ff9b:1::/48 (RFC 8215).
  if (numeric[0] === 0x64 && numeric[1] === 0xff9b && numeric[2] === 1) {
    return true;
  }

  // Unique-local fc00::/7 — high 7 bits of the first byte are 1111110,
  // i.e. first group in 0xfc00..0xfdff.
  if (numeric[0] >= 0xfc00 && numeric[0] <= 0xfdff) return true;

  // Link-local fe80::/10 — first group in 0xfe80..0xfebf.
  if (numeric[0] >= 0xfe80 && numeric[0] <= 0xfebf) return true;

  return false;
}

function isBlockedAddress(address: string, family: number): boolean {
  return family === 6 ? isBlockedIPv6(address) : isBlockedIPv4(address);
}

/**
 * Validates that a user-supplied URL is safe to make a server-side request to.
 * Throws an Error with a clear message if the URL is rejected.
 *
 * Returns the validated resolved addresses. Callers that perform the outbound
 * request should pin the connection to one of these addresses (e.g. via a
 * custom https.Agent lookup) so that axios cannot independently re-resolve the
 * hostname to a different (internal) address at request time — closing the
 * DNS-rebinding TOCTOU window. Callers that only need the throw-on-unsafe
 * behavior (create/update validation) may ignore the return value.
 *
 * @param rawUrl the user-supplied URL string
 * @returns the resolved, validated addresses (non-empty)
 */
export async function assertSafeExternalUrl(
  rawUrl: string,
): Promise<SafeAddress[]> {
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
  let addresses: SafeAddress[];
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

  return addresses;
}
