import axios from "axios";
import { tracker } from "clients/google-analytics";

jest.mock("axios");

const sentParams = () =>
  (axios.post as jest.Mock).mock.calls[0][1].events[0].params;

describe("GA4EventTracker.sendEvent", () => {
  beforeEach(() => {
    (axios.post as jest.Mock).mockReset().mockResolvedValue({ data: {} });
  });

  it("sends the platform, architecture and OS version as separate params", async () => {
    await tracker.sendEvent("user-uuid", "CLIENT_START", {
      app_type: "native macos arm64 27.2",
      app_version: "0.17.2",
    });

    expect(sentParams()).toMatchObject({
      user_uuid: "user-uuid",
      app_type: "native macos",
      app_arch: "arm64",
      app_os_version: "27.2",
      app_version: "0.17.2",
    });
  });

  it("sends an older client's type unchanged, with no architecture or OS version", async () => {
    await tracker.sendEvent("user-uuid", "CLIENT_START", {
      app_type: "native w64",
      app_version: "0.16.1",
    });

    const params = sentParams();
    expect(params.app_type).toBe("native w64");
    expect(params.app_arch).toBeUndefined();
    expect(params.app_os_version).toBeUndefined();
  });

  it("sends an event that has no app type", async () => {
    await tracker.sendEvent("user-uuid", "DREAM_UPLOADED", { size_bytes: 1 });

    expect(sentParams()).toEqual({ user_uuid: "user-uuid", size_bytes: 1 });
  });
});
