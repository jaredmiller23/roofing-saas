/**
 * PCM Audio Worklet Processor
 *
 * Runs on the audio rendering thread for low-latency microphone capture.
 * Converts Float32 audio samples to Int16 PCM and posts them to the main thread.
 *
 * Used by: lib/voice/providers/gemini-provider.ts
 */
class PCMProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0]
    if (input.length > 0) {
      const channelData = input[0]
      if (channelData.length === 0) return true

      // Convert Float32Array to Int16Array (16-bit PCM)
      const pcmData = new Int16Array(channelData.length)
      for (let i = 0; i < channelData.length; i++) {
        const s = Math.max(-1, Math.min(1, channelData[i]))
        pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
      }

      // Transfer buffer to main thread (zero-copy via transferable)
      this.port.postMessage(pcmData.buffer, [pcmData.buffer])
    }
    return true
  }
}

registerProcessor('pcm-processor', PCMProcessor)
