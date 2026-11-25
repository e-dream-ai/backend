/**
 * Clients from 0.17.0 on append the hardware architecture and the OS version to
 * the Edream-Client-Type header, e.g. "native macOS arm64 27.2",
 * "native W64 x64 10.0.26300" or "Linux x86_64 ubuntu 26.04". Older clients
 * send only the platform ("native macOS", "native W64", "Linux").
 *
 * Analytics needs the platform on its own, or every OS version becomes its own
 * "type" and nothing can be grouped by platform.
 */
export type ParsedClientType = {
  /** Platform alone, as older clients sent it: "native macos", "native w64", "linux", "react", "web". */
  type: string;
  /** "arm64", "x64", "x86", ... Undefined when the client did not report one. */
  arch?: string;
  /** macOS "27.2", Windows "10.0.26300", Linux "ubuntu 26.04". */
  osVersion?: string;
};

const ARCH_PATTERN =
  /^(arm64|aarch64|x64|x86_64|amd64|x86|i[3-6]86|armv\w+|riscv\d+|ppc\w+|unknown)$/;

// Windows says "x64", macOS and Linux say "x86_64": one name per architecture.
const ARCH_ALIASES: Record<string, string> = {
  x86_64: "x64",
  amd64: "x64",
  aarch64: "arm64",
};

export function parseClientType(raw: string): ParsedClientType {
  const tokens = raw.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!tokens.length) {
    return { type: raw };
  }

  // "native" is a prefix of the platform name, not a platform.
  const typeLength = tokens[0] === "native" && tokens.length > 1 ? 2 : 1;
  const type = tokens.slice(0, typeLength).join(" ");
  const rest = tokens.slice(typeLength);

  let arch: string | undefined;
  if (rest.length && ARCH_PATTERN.test(rest[0])) {
    const reported = rest.shift()!;
    arch = ARCH_ALIASES[reported] ?? reported;
  }

  return {
    type,
    arch,
    osVersion: rest.length ? rest.join(" ") : undefined,
  };
}
