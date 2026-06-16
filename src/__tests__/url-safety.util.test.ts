import dns from "dns";
import type { LookupAddress } from "dns";
import https from "https";
import type { LookupFunction } from "net";

describe("url-safety.util", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
  });

  describe("assertSafeExternalUrl — IP literal classification", () => {
    // Adversarial table. IP-LITERAL urls are used so the FIX 2 short-circuit
    // validates them directly (no DNS) → fully deterministic, hermetic.
    const BLOCK: Array<[string, string]> = [
      ["IPv4 loopback", "https://127.0.0.1/models"],
      ["IPv4 private 10/8", "https://10.0.0.1/models"],
      ["IPv4 private 172.16/12", "https://172.16.0.1/models"],
      ["IPv4 private 192.168/16", "https://192.168.1.1/models"],
      ["IPv4 link-local metadata", "https://169.254.169.254/models"],
      ["IPv4 unspecified 0.0.0.0", "https://0.0.0.0/models"],
      ["IPv6 loopback ::1", "https://[::1]/models"],
      ["IPv6 link-local fe80::1", "https://[fe80::1]/models"],
      ["IPv6 unique-local fc00::1", "https://[fc00::1]/models"],
      ["IPv6 unique-local fd12:3456::1", "https://[fd12:3456::1]/models"],
      ["IPv4-mapped dotted loopback", "https://[::ffff:127.0.0.1]/models"],
      ["IPv4-mapped hex loopback", "https://[::ffff:7f00:1]/models"],
      ["IPv4-mapped private 10", "https://[::ffff:10.0.0.1]/models"],
      ["NAT64 well-known + loopback hex", "https://[64:ff9b::7f00:1]/models"],
      ["NAT64 well-known + loopback dotted", "https://[64:ff9b::127.0.0.1]/models"],
    ];

    const ALLOW: Array<[string, string]> = [
      ["IPv6 documentation 2001:db8::1", "https://[2001:db8::1]/models"],
      ["IPv6 public Cloudflare DNS", "https://[2606:4700:4700::1111]/models"],
      ["IPv4-mapped public 8.8.8.8", "https://[::ffff:8.8.8.8]/models"],
      ["IPv4 outside RFC1918 (172.32)", "https://172.32.0.1/models"],
    ];

    it.each(BLOCK)("blocks %s", async (_label, url) => {
      const { assertSafeExternalUrl } = await import("utils/url-safety.util");
      await expect(assertSafeExternalUrl(url)).rejects.toThrow();
    });

    it.each(ALLOW)("allows %s", async (_label, url) => {
      const { assertSafeExternalUrl } = await import("utils/url-safety.util");
      const result = await assertSafeExternalUrl(url);
      expect(result.length).toBeGreaterThan(0);
    });

    it("blocks public IPv6 literal does NOT regress: [2606:4700:4700::1111] is allowed", async () => {
      const { assertSafeExternalUrl } = await import("utils/url-safety.util");
      const result = await assertSafeExternalUrl(
        "https://[2606:4700:4700::1111]/models",
      );
      expect(result).toEqual([
        { address: "2606:4700:4700::1111", family: 6 },
      ]);
    });

    it("blocks IPv6 loopback literal [::1]", async () => {
      const { assertSafeExternalUrl } = await import("utils/url-safety.util");
      await expect(
        assertSafeExternalUrl("https://[::1]/models"),
      ).rejects.toThrow(/private\/internal address/);
    });

    it("returns the de-bracketed address (no brackets) for IPv6 literals", async () => {
      const { assertSafeExternalUrl } = await import("utils/url-safety.util");
      const result = await assertSafeExternalUrl("https://[2001:db8::1]/x");
      expect(result[0].address).toBe("2001:db8::1");
      expect(result[0].family).toBe(6);
    });
  });

  describe("assertSafeExternalUrl — protocol and TLD checks", () => {
    it("rejects non-https (http://) URLs", async () => {
      const { assertSafeExternalUrl } = await import("utils/url-safety.util");
      await expect(
        assertSafeExternalUrl("http://8.8.8.8/models"),
      ).rejects.toThrow(/https/);
    });

    it("rejects .internal TLD before DNS", async () => {
      const lookupSpy = jest.spyOn(dns.promises, "lookup");
      const { assertSafeExternalUrl } = await import("utils/url-safety.util");
      await expect(
        assertSafeExternalUrl("https://foo.internal/models"),
      ).rejects.toThrow(/not allowed/);
      expect(lookupSpy).not.toHaveBeenCalled();
    });

    it("rejects .local TLD before DNS", async () => {
      const lookupSpy = jest.spyOn(dns.promises, "lookup");
      const { assertSafeExternalUrl } = await import("utils/url-safety.util");
      await expect(
        assertSafeExternalUrl("https://foo.local/models"),
      ).rejects.toThrow(/not allowed/);
      expect(lookupSpy).not.toHaveBeenCalled();
    });

    it("rejects an unparseable URL", async () => {
      const { assertSafeExternalUrl } = await import("utils/url-safety.util");
      await expect(assertSafeExternalUrl("not a url")).rejects.toThrow(
        /Invalid endpoint URL/,
      );
    });
  });

  describe("assertSafeExternalUrl — hostname DNS resolution (mocked)", () => {
    it("allows a public hostname that resolves to a public address", async () => {
      jest
        .spyOn(dns.promises, "lookup")
        // @ts-expect-error overload: { all: true } returns LookupAddress[]
        .mockResolvedValue([
          { address: "93.184.216.34", family: 4 },
        ] as LookupAddress[]);
      const { assertSafeExternalUrl } = await import("utils/url-safety.util");
      const result = await assertSafeExternalUrl("https://example.com/models");
      expect(result).toEqual([{ address: "93.184.216.34", family: 4 }]);
    });

    it("blocks when ANY resolved address is private (all-addresses loop)", async () => {
      jest
        .spyOn(dns.promises, "lookup")
        // @ts-expect-error overload: { all: true } returns LookupAddress[]
        .mockResolvedValue([
          { address: "93.184.216.34", family: 4 }, // public
          { address: "10.0.0.1", family: 4 }, // private — must trigger block
        ] as LookupAddress[]);
      const { assertSafeExternalUrl } = await import("utils/url-safety.util");
      await expect(
        assertSafeExternalUrl("https://rebind.example.com/models"),
      ).rejects.toThrow(/disallowed address/);
    });

    it("rejects when DNS resolution fails", async () => {
      jest
        .spyOn(dns.promises, "lookup")
        .mockRejectedValue(new Error("ENOTFOUND"));
      const { assertSafeExternalUrl } = await import("utils/url-safety.util");
      await expect(
        assertSafeExternalUrl("https://no-such-host.example/models"),
      ).rejects.toThrow(/Could not resolve/);
    });
  });

  describe("createPinnedAgent — Node lookup contract (the FIX 1 regression)", () => {
    // Reach into the Agent's lookup option that Node merges into TLS connect.
    function getAgentLookup(agent: https.Agent): LookupFunction {
      const lookup = (agent.options as { lookup?: LookupFunction }).lookup;
      if (!lookup) throw new Error("Agent has no lookup option");
      return lookup;
    }

    it("returns an ARRAY when called with { all: true } (the exact regression)", async () => {
      const { __test } = await import("services/endpoint-tester.service");
      const agent = __test.createPinnedAgent({
        address: "93.184.216.34",
        family: 4,
      });
      const lookup = getAgentLookup(agent);
      const cb = jest.fn();
      lookup("example.com", { all: true } as dns.LookupAllOptions, cb);
      expect(cb).toHaveBeenCalledTimes(1);
      expect(cb).toHaveBeenCalledWith(null, [
        { address: "93.184.216.34", family: 4 },
      ]);
    });

    it("uses the positional form when called with { all: false }", async () => {
      const { __test } = await import("services/endpoint-tester.service");
      const agent = __test.createPinnedAgent({
        address: "2606:4700:4700::1111",
        family: 6,
      });
      const lookup = getAgentLookup(agent);
      const cb = jest.fn();
      lookup("cloudflare-dns.com", { all: false } as dns.LookupOptions, cb);
      expect(cb).toHaveBeenCalledTimes(1);
      expect(cb).toHaveBeenCalledWith(null, "2606:4700:4700::1111", 6);
    });
  });
});
