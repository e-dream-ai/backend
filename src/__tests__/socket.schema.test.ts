import { remoteControlSchema } from "schemas/socket.schema";

describe("remoteControlSchema", () => {
  const finished = {
    event: "finished",
    uuid: "0b6c9a4e-9f1e-4d3a-8c2b-1f2e3d4c5b6a",
    reason: "next",
    progress: 42.5,
    seconds: 12.3,
    frame: 101,
    frames: 240,
  };

  it("accepts a playback end report", () => {
    expect(remoteControlSchema.validate(finished).error).toBeUndefined();
  });

  it("rejects a progress outside 0-100", () => {
    expect(
      remoteControlSchema.validate({ ...finished, progress: 101 }).error,
    ).toBeDefined();
  });

  it("rejects a fractional frame", () => {
    expect(
      remoteControlSchema.validate({ ...finished, frame: 1.5 }).error,
    ).toBeDefined();
  });
});
