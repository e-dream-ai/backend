import { parseClientType } from "utils/client-type.util";

describe("parseClientType", () => {
  it.each([
    // 0.17+ clients, as sent in the Edream-Client-Type header
    [
      "native macOS arm64 27.2",
      { type: "native macos", arch: "arm64", osVersion: "27.2" },
    ],
    [
      "native macOS x86_64 15.8",
      { type: "native macos", arch: "x64", osVersion: "15.8" },
    ],
    [
      "native W64 x64 10.0.26300",
      { type: "native w64", arch: "x64", osVersion: "10.0.26300" },
    ],
    [
      "native W64 arm64 10.0.28000",
      { type: "native w64", arch: "arm64", osVersion: "10.0.28000" },
    ],
    [
      "Linux x86_64 ubuntu 26.04",
      { type: "linux", arch: "x64", osVersion: "ubuntu 26.04" },
    ],
    [
      "Linux x86_64 cachyos",
      { type: "linux", arch: "x64", osVersion: "cachyos" },
    ],
    [
      "Linux aarch64 debian 13",
      { type: "linux", arch: "arm64", osVersion: "debian 13" },
    ],
    // uname failed on Linux, so there is a distro but no architecture
    ["Linux arch", { type: "linux", osVersion: "arch" }],
  ])("splits %s", (raw, expected) => {
    // toEqual ignores undefined properties, so a missing arch matches.
    expect(parseClientType(raw)).toEqual(expected);
  });

  it.each([
    ["native macOS", "native macos"],
    ["native W64", "native w64"],
    ["Linux", "linux"],
    ["react", "react"],
    ["web", "web"],
    ["desktop", "desktop"],
  ])("leaves the older platform-only type %s alone", (raw, type) => {
    expect(parseClientType(raw)).toEqual({
      type,
      arch: undefined,
      osVersion: undefined,
    });
  });

  it("gives every version of a platform the same type", () => {
    const types = [
      "native macOS",
      "native macos arm64 27.2",
      "native macOS x86_64 12.7",
    ].map((raw) => parseClientType(raw).type);

    expect(new Set(types)).toEqual(new Set(["native macos"]));
  });
});
