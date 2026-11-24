import type { Speech } from './CommandVisuals'

/** Mono PCM keeps the processed voice portable without changing duration or alignment. */
export function encodeVoice(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const bytes = new ArrayBuffer(44 + samples.length * 2),
    v = new DataView(bytes)
  const ascii = (at: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(at + i, s.charCodeAt(i))
  }
  ascii(0, 'RIFF')
  v.setUint32(4, 36 + samples.length * 2, true)
  ascii(8, 'WAVE')
  ascii(12, 'fmt ')
  v.setUint32(16, 16, true)
  v.setUint16(20, 1, true)
  v.setUint16(22, 1, true)
  v.setUint32(24, sampleRate, true)
  v.setUint32(28, sampleRate * 2, true)
  v.setUint16(32, 2, true)
  v.setUint16(34, 16, true)
  ascii(36, 'data')
  v.setUint32(40, samples.length * 2, true)
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, Number.isFinite(samples[i]) ? samples[i] : 0))
    v.setInt16(44 + i * 2, s < 0 ? s * 32768 : s * 32767, true)
  }
  return bytes
}
let cached: { source: string; result: Promise<Speech> } | undefined
export function prepareSpeech(speech: Speech): Promise<Speech> {
  if (speech.effect !== 'computer-v1' || typeof OfflineAudioContext === 'undefined')
    return Promise.resolve(speech)
  if (cached?.source === speech.audioUrl) return cached.result
  const result = process(speech).catch(() => speech)
  cached = { source: speech.audioUrl, result }
  return result
}
async function process(speech: Speech): Promise<Speech> {
  // The worker returns its own bounded fictional narration, never arbitrary remote media.
  if (!speech.audioUrl.startsWith('data:audio/')) return speech
  const bytes = Uint8Array.from(atob(speech.audioUrl.split(',')[1]), (c) => c.charCodeAt(0))
  const decoder = new OfflineAudioContext(1, 1, 22050),
    buffer = await decoder.decodeAudioData(bytes.buffer)
  if (buffer.duration > 60 || !buffer.length) return speech
  const context = new OfflineAudioContext(1, buffer.length, buffer.sampleRate)
  const source = context.createBufferSource()
  source.buffer = buffer
  const high = context.createBiquadFilter()
  high.type = 'highpass'
  high.frequency.value = 170
  const low = context.createBiquadFilter()
  low.type = 'lowpass'
  low.frequency.value = 6200
  const presence = context.createBiquadFilter()
  presence.type = 'peaking'
  presence.frequency.value = 2400
  presence.Q.value = 0.85
  presence.gain.value = 2
  const texture = context.createGain()
  texture.gain.value = 0.94
  const oscillator = context.createOscillator()
  oscillator.frequency.value = 42
  const depth = context.createGain()
  depth.gain.value = 0.06
  oscillator.connect(depth)
  depth.connect(texture.gain)
  const compressor = context.createDynamicsCompressor()
  compressor.threshold.value = -20
  compressor.knee.value = 12
  compressor.ratio.value = 3
  compressor.attack.value = 0.003
  compressor.release.value = 0.12
  source.connect(high)
  high.connect(low)
  low.connect(presence)
  presence.connect(texture)
  texture.connect(compressor)
  compressor.connect(context.destination)
  // A quiet, short parallel reflection adds a mechanical edge without obscuring words.
  const delay = context.createDelay(0.1)
  delay.delayTime.value = 0.011
  const wet = context.createGain()
  wet.gain.value = 0.1
  texture.connect(delay)
  delay.connect(wet)
  wet.connect(compressor)
  source.start()
  oscillator.start()
  const rendered = await context.startRendering(),
    wave = new Uint8Array(encodeVoice(rendered.getChannelData(0), rendered.sampleRate))
  let binary = ''
  for (let offset = 0; offset < wave.length; offset += 16384)
    binary += String.fromCharCode(...wave.subarray(offset, offset + 16384))
  return { ...speech, audioUrl: 'data:audio/wav;base64,' + btoa(binary) }
}
