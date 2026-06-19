const TARGET_RATE = 16000;

export function downsampleTo16k(input: Float32Array, inputRate: number): Float32Array {
  if (inputRate === TARGET_RATE) return input;
  const ratio = inputRate / TARGET_RATE;
  const outLen = Math.max(1, Math.floor(input.length / ratio));
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    out[i] = input[Math.floor(i * ratio)] ?? 0;
  }
  return out;
}

export function rmsLevel(samples: Float32Array): number {
  if (!samples.length) return 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
  return Math.sqrt(sum / samples.length);
}

export function floatTo16BitPCM(float32: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(float32.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}

export type PcmCaptureStats = { level: number; chunksSent: number };

type CaptureHandlers = {
  onChunk: (pcm: ArrayBuffer) => void;
  onStats?: (stats: PcmCaptureStats) => void;
};

type CaptureOpts = {
  ctx: AudioContext;
  stream: MediaStream;
  chunkMs: number;
  minRmsToSend: number;
  overlapMs?: number;
};

const WORKLET_SRC = `
class MicCaptureProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0] && inputs[0][0];
    if (input && input.length) this.port.postMessage(input);
    return true;
  }
}
registerProcessor("mic-capture-processor", MicCaptureProcessor);
`;

function createChunkEmitter(
  ctx: AudioContext,
  chunkMs: number,
  minRmsToSend: number,
  overlapMs: number,
  handlers: CaptureHandlers
) {
  const chunkSamples = Math.floor((TARGET_RATE * chunkMs) / 1000);
  const overlapSamples = Math.max(0, Math.floor((TARGET_RATE * overlapMs) / 1000));
  let samplesCollected = 0;
  let chunksSent = 0;
  const bufferRef: Float32Array[] = [];

  const pushSamples = (input: Float32Array) => {
    const level = rmsLevel(input);
    const resampled = downsampleTo16k(input, ctx.sampleRate);
    bufferRef.push(resampled);
    samplesCollected += resampled.length;

    if (samplesCollected >= chunkSamples) {
      const merged = new Float32Array(samplesCollected);
      let offset = 0;
      for (const buf of bufferRef) {
        merged.set(buf, offset);
        offset += buf.length;
      }
      const slice = merged.subarray(0, chunkSamples);
      const remainder = merged.subarray(chunkSamples);
      const sliceLevel = rmsLevel(slice);
      if (sliceLevel >= minRmsToSend) {
        handlers.onChunk(floatTo16BitPCM(slice));
        chunksSent += 1;
      }
      handlers.onStats?.({ level: sliceLevel, chunksSent });
      bufferRef.length = 0;
      const keep = overlapSamples > 0 ? merged.subarray(Math.max(0, chunkSamples - overlapSamples)) : remainder;
      if (keep.length) bufferRef.push(keep);
      samplesCollected = keep.length;
    } else {
      handlers.onStats?.({ level, chunksSent });
    }
  };

  return { pushSamples };
}

function startScriptCapture({ ctx, stream, chunkMs, minRmsToSend, overlapMs = 0 }: CaptureOpts, handlers: CaptureHandlers) {
  const audioOnly = new MediaStream(stream.getAudioTracks());
  const source = ctx.createMediaStreamSource(audioOnly);
  const processor = ctx.createScriptProcessor(4096, 1, 1);
  const { pushSamples } = createChunkEmitter(ctx, chunkMs, minRmsToSend, overlapMs, handlers);

  processor.onaudioprocess = (e) => {
    pushSamples(e.inputBuffer.getChannelData(0));
  };

  source.connect(processor);
  const silent = ctx.createGain();
  silent.gain.value = 0;
  processor.connect(silent);
  silent.connect(ctx.destination);

  return () => {
    processor.disconnect();
    source.disconnect();
    silent.disconnect();
  };
}

async function startWorkletCapture({ ctx, stream, chunkMs, minRmsToSend, overlapMs = 0 }: CaptureOpts, handlers: CaptureHandlers) {
  const blob = new Blob([WORKLET_SRC], { type: "application/javascript" });
  const url = URL.createObjectURL(blob);
  try {
    await ctx.audioWorklet.addModule(url);
  } finally {
    URL.revokeObjectURL(url);
  }

  const audioOnly = new MediaStream(stream.getAudioTracks());
  const source = ctx.createMediaStreamSource(audioOnly);
  const node = new AudioWorkletNode(ctx, "mic-capture-processor");
  const { pushSamples } = createChunkEmitter(ctx, chunkMs, minRmsToSend, overlapMs, handlers);

  node.port.onmessage = (ev: MessageEvent<Float32Array>) => {
    pushSamples(ev.data);
  };

  source.connect(node);
  const silent = ctx.createGain();
  silent.gain.value = 0;
  node.connect(silent);
  silent.connect(ctx.destination);

  return () => {
    node.port.onmessage = null;
    node.disconnect();
    source.disconnect();
    silent.disconnect();
  };
}

export async function startPcmCapture(
  opts: CaptureOpts,
  handlers: CaptureHandlers
): Promise<() => void> {
  if (typeof AudioWorkletNode !== "undefined" && opts.ctx.audioWorklet) {
    try {
      return await startWorkletCapture(opts, handlers);
    } catch {
      /* fall back */
    }
  }
  return startScriptCapture(opts, handlers);
}
