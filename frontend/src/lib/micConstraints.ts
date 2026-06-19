export type MicProfile = "default" | "headset";

export function micConstraints(
  deviceId: string | undefined,
  profile: MicProfile,
  strictDevice = false
): MediaTrackConstraints {
  const base: MediaTrackConstraints =
    profile === "headset"
      ? { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
      : { echoCancellation: true, noiseSuppression: true, autoGainControl: true };
  if (deviceId) {
    base.deviceId = strictDevice ? { exact: deviceId } : { ideal: deviceId };
  }
  return base;
}

export async function resumeAudioContext(ctx: AudioContext): Promise<void> {
  if (ctx.state === "running") return;
  await ctx.resume();
}
