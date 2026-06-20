const TARGET_RATE = 16000;

export function downsampleTo16k(input, inputRate) {
  if (inputRate === TARGET_RATE) return input;
  const ratio = inputRate / TARGET_RATE;
  const outLen = Math.max(1, Math.floor(input.length / ratio));
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    out[i] = input[Math.floor(i * ratio)] ?? 0;
  }
  return out;
}

export function rmsLevel(samples) {
  if (!samples.length) return 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
  return Math.sqrt(sum / samples.length);
}

export function floatTo16BitPCM(float32) {
  const buffer = new ArrayBuffer(float32.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}

export function createChunkEmitter(ctx, chunkMs, minRmsToSend, overlapMs, handlers) {
  const chunkSamples = Math.floor((TARGET_RATE * chunkMs) / 1000);
  const overlapSamples = Math.max(0, Math.floor((TARGET_RATE * overlapMs) / 1000));
  let samplesCollected = 0;
  let chunksSent = 0;
  const bufferRef = [];

  const pushSamples = (input) => {
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
      const sliceLevel = rmsLevel(slice);
      if (sliceLevel >= minRmsToSend) {
        handlers.onChunk(floatTo16BitPCM(slice));
        chunksSent += 1;
      }
      handlers.onStats?.({ level: sliceLevel, chunksSent });
      bufferRef.length = 0;
      const keep =
        overlapSamples > 0 ? merged.subarray(Math.max(0, chunkSamples - overlapSamples)) : merged.subarray(chunkSamples);
      if (keep.length) bufferRef.push(keep);
      samplesCollected = keep.length;
    }
  };

  return { pushSamples };
}

export async function startPcmCapture({ ctx, stream, chunkMs, minRmsToSend, overlapMs = 0 }, handlers) {
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
    stream.getTracks().forEach((t) => t.stop());
    ctx.close();
  };
}
