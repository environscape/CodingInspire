// wavmod.js
//
// Hydra-synth extension: stream long .wav files as audio-reactive shader
// modulators (RMS / FFT / band) and textures (waveform / spectrum).
//
// Load via Hydra's built-in loadScript:
//
//   await loadScript('https://your.host/wavmod.js')
//   await wavLoad('./track.wav', { loop: true })
//   await wavPlay()
//   osc(() => wavRms() * 80).out()
//   src(wavWave()).kaleid(4).out(o1)
//
// Multi-track:
//
//   await wavLoad('./drums.wav', { id: 'dr' })
//   await wavLoad('./pad.wav',   { id: 'pad' })
//   osc(() => wavBand('low', 'dr') * 60)
//     .rotate(() => wavRms('pad'))
//     .out()

(function () {
  const getHydra = function () {
    if (typeof window === 'undefined') return null
    if (window.location?.href?.includes('hydra.ojack.xyz')) return window.hydraSynth
    if (window.atom?.packages) {
      return globalThis.atom?.packages?.loadedPackages?.['atom-hydra']?.mainModule?.main?.hydra
    }
    return [window.hydraSynth, window._hydra, window.hydra, window.h, window.H, window.hy]
      .find((h) => h?.regl)
  }

  const _hydra = getHydra()
  if (!_hydra) {
    console.error('[wavmod] could not find a running hydra-synth instance')
    return
  }
  window._hydra = _hydra
  const _hydraScope = _hydra.sandbox?.makeGlobal ? window : _hydra.synth
  window._hydraScope = _hydraScope

  const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x)

  const deriveId = (url) => {
    const base = String(url).split(/[?#]/)[0].split('/').pop() || 'track'
    return base.replace(/\.[^.]+$/, '') || 'track'
  }

  let _audioCtx = null
  const getAudioCtx = () => {
    if (!_audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext
      _audioCtx = new Ctx()
    }
    return _audioCtx
  }

  const tracks = new Map()
  let lastId = null

  const resolve = (id) => {
    const key = id ?? lastId
    if (key == null) return null
    return tracks.get(key) || null
  }

  const sliceAvg = (buf, a, b) => {
    if (b <= a) return 0
    let sum = 0
    for (let i = a; i < b; i++) sum += buf[i]
    return sum / ((b - a) * 255)
  }

  const drawWave = (ctx, canvas, timeBuf) => {
    const { width: W, height: H } = canvas
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, W, H)
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = Math.max(2, H / 256)
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.beginPath()
    const step = W / (timeBuf.length - 1)
    for (let i = 0; i < timeBuf.length; i++) {
      const y = (timeBuf[i] / 255) * H
      if (i === 0) ctx.moveTo(0, y)
      else ctx.lineTo(i * step, y)
    }
    ctx.stroke()
  }

  const drawSpectrum = (ctx, canvas, freqBuf) => {
    const { width: W, height: H } = canvas
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = '#fff'
    const n = freqBuf.length
    const barW = W / n
    for (let i = 0; i < n; i++) {
      const h = (freqBuf[i] / 255) * H
      ctx.fillRect(i * barW, H - h, barW, h)
    }
  }

  let rafId = 0
  const tick = () => {
    let anyPlaying = false
    for (const t of tracks.values()) {
      if (!t.playing) continue
      anyPlaying = true
      t.analyser.getByteFrequencyData(t.freqBuf)
      t.analyser.getByteTimeDomainData(t.timeBuf)
      let sumSq = 0
      for (let i = 0; i < t.timeBuf.length; i++) {
        const s = t.timeBuf[i] / 128 - 1
        sumSq += s * s
      }
      t.rms = Math.sqrt(sumSq / t.timeBuf.length)
      if (t.ctxs.wave) drawWave(t.ctxs.wave, t.canvases.wave, t.timeBuf)
      if (t.ctxs.spectrum) drawSpectrum(t.ctxs.spectrum, t.canvases.spectrum, t.freqBuf)
      if (t.sources.wave) t.sources.wave.tick(0)
      if (t.sources.spectrum) t.sources.spectrum.tick(0)
    }
    rafId = anyPlaying ? requestAnimationFrame(tick) : 0
  }
  const ensureLoop = () => { if (!rafId) rafId = requestAnimationFrame(tick) }

  const SourceCtor = _hydra.s[0].constructor

  const createTrack = async (url, opts) => {
    const fftSize = opts.fftSize ?? 1024
    const smoothing = opts.smoothing ?? 0.8
    const loop = !!opts.loop
    const [lowEnd, midEnd] = opts.bandSplits ?? [32, 128]
    const textureSize = opts.textureSize ?? [2048, 1024]

    const audio = new Audio()
    audio.crossOrigin = 'anonymous'
    audio.preload = 'auto'
    audio.loop = loop
    audio.src = url

    await new Promise((res, rej) => {
      audio.addEventListener('loadedmetadata', res, { once: true })
      audio.addEventListener('error', () => rej(new Error(`wavmod: failed to load ${url}`)), { once: true })
    })

    const ctx = getAudioCtx()
    const sourceNode = ctx.createMediaElementSource(audio)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = fftSize
    analyser.smoothingTimeConstant = smoothing
    sourceNode.connect(analyser)
    analyser.connect(ctx.destination)

    const binCount = analyser.frequencyBinCount
    const freqBuf = new Uint8Array(binCount)
    const timeBuf = new Uint8Array(analyser.fftSize)

    const t = {
      url,
      audio,
      sourceNode,
      analyser,
      freqBuf,
      timeBuf,
      binCount,
      textureSize,
      lowSlice: [0, Math.min(lowEnd, binCount)],
      midSlice: [Math.min(lowEnd, binCount), Math.min(midEnd, binCount)],
      highSlice: [Math.min(midEnd, binCount), binCount],
      rms: 0,
      playing: false,
      sources: { wave: null, spectrum: null },
      canvases: { wave: null, spectrum: null },
      ctxs: { wave: null, spectrum: null },
      disposed: false,
    }

    audio.addEventListener('ended', () => {
      if (!audio.loop) t.playing = false
    })

    return t
  }

  const ensureSource = (t, mode) => {
    if (t.sources[mode]) return t.sources[mode]
    const canvas = document.createElement('canvas')
    const [W, H] = t.textureSize
    canvas.width = W
    canvas.height = H
    const ctx2d = canvas.getContext('2d')
    t.canvases[mode] = canvas
    t.ctxs[mode] = ctx2d
    const s = new SourceCtor({
      regl: _hydra.regl,
      pb: _hydra.pb,
      width: canvas.width,
      height: canvas.height,
    })
    s.init({ src: canvas })
    t.sources[mode] = s
    return s
  }

  const disposeTrack = (t) => {
    if (t.disposed) return
    t.disposed = true
    t.playing = false
    try { t.audio.pause() } catch {}
    t.audio.src = ''
    try { t.sourceNode.disconnect() } catch {}
    try { t.analyser.disconnect() } catch {}
    for (const mode of ['wave', 'spectrum']) {
      const s = t.sources[mode]
      if (s) {
        try { s.clear?.() } catch {}
      }
      t.sources[mode] = null
      t.canvases[mode] = null
      t.ctxs[mode] = null
    }
  }

  const playTrack = async (t) => {
    const ctx = getAudioCtx()
    if (ctx.state === 'suspended') await ctx.resume()
    await t.audio.play()
    t.playing = true
    ensureLoop()
  }

  const makeInstance = (id) => {
    const get = () => tracks.get(id)
    return {
      get id() { return id },
      get url() { return get()?.url },
      get duration() { return get()?.audio.duration ?? 0 },
      playing() { return !!get()?.playing },
      async play() {
        const t = get(); if (!t) return
        await playTrack(t)
      },
      pause() {
        const t = get(); if (!t) return
        t.audio.pause()
        t.playing = false
      },
      stop() {
        const t = get(); if (!t) return
        t.audio.pause()
        t.audio.currentTime = 0
        t.playing = false
      },
      jump(t01) {
        const t = get(); if (!t) return
        const d = t.audio.duration
        if (!isFinite(d)) return
        t.audio.currentTime = clamp01(t01) * d
      },
      dispose() {
        const t = get(); if (!t) return
        disposeTrack(t)
        tracks.delete(id)
        if (lastId === id) lastId = tracks.size ? [...tracks.keys()].pop() : null
      },
      rms() { return get()?.rms ?? 0 },
      fft(bin) {
        const t = get(); if (!t) return 0
        if (bin < 0 || bin >= t.binCount) return 0
        return t.freqBuf[bin] / 255
      },
      band(name) {
        const t = get(); if (!t) return 0
        if (name === 'low') return sliceAvg(t.freqBuf, t.lowSlice[0], t.lowSlice[1])
        if (name === 'mid') return sliceAvg(t.freqBuf, t.midSlice[0], t.midSlice[1])
        if (name === 'high') return sliceAvg(t.freqBuf, t.highSlice[0], t.highSlice[1])
        return 0
      },
      position() {
        const t = get(); if (!t) return 0
        const d = t.audio.duration
        if (!isFinite(d) || d <= 0) return 0
        return t.audio.currentTime / d
      },
      source(mode = 'wave') {
        const t = get(); if (!t) return null
        if (mode !== 'wave' && mode !== 'spectrum') {
          throw new Error(`wavmod.source: mode must be 'wave' or 'spectrum', got '${mode}'`)
        }
        return ensureSource(t, mode)
      },
    }
  }

  const wavLoad = async (url, opts = {}) => {
    const id = opts.id ?? deriveId(url)
    const prev = tracks.get(id)
    if (prev) {
      disposeTrack(prev)
      tracks.delete(id)
    }
    const t = await createTrack(url, opts)
    tracks.set(id, t)
    lastId = id
    if (opts.autoplay) await playTrack(t)
    return makeInstance(id)
  }

  const wavRms = (id) => resolve(id)?.rms ?? 0
  const wavFft = (bin, id) => {
    const t = resolve(id); if (!t) return 0
    if (bin < 0 || bin >= t.binCount) return 0
    return t.freqBuf[bin] / 255
  }
  const wavBand = (name, id) => {
    const t = resolve(id); if (!t) return 0
    if (name === 'low') return sliceAvg(t.freqBuf, t.lowSlice[0], t.lowSlice[1])
    if (name === 'mid') return sliceAvg(t.freqBuf, t.midSlice[0], t.midSlice[1])
    if (name === 'high') return sliceAvg(t.freqBuf, t.highSlice[0], t.highSlice[1])
    return 0
  }
  const wavPosition = (id) => {
    const t = resolve(id); if (!t) return 0
    const d = t.audio.duration
    if (!isFinite(d) || d <= 0) return 0
    return t.audio.currentTime / d
  }
  const wavDuration = (id) => resolve(id)?.audio.duration ?? 0
  const wavPlaying = (id) => !!resolve(id)?.playing

  const wavWave = (id) => {
    const t = resolve(id); if (!t) return null
    return ensureSource(t, 'wave')
  }
  const wavSpectrum = (id) => {
    const t = resolve(id); if (!t) return null
    return ensureSource(t, 'spectrum')
  }

  const wavPlay = async (id) => {
    const t = resolve(id); if (!t) return
    await playTrack(t)
  }
  const wavPause = (id) => {
    const t = resolve(id); if (!t) return
    t.audio.pause()
    t.playing = false
  }
  const wavStop = (id) => {
    const t = resolve(id); if (!t) return
    t.audio.pause()
    t.audio.currentTime = 0
    t.playing = false
  }
  const wavJump = (t01, id) => {
    const t = resolve(id); if (!t) return
    const d = t.audio.duration
    if (!isFinite(d)) return
    t.audio.currentTime = clamp01(t01) * d
  }
  const wavDispose = (id) => {
    const key = id ?? lastId
    if (key == null) return
    const t = tracks.get(key)
    if (!t) return
    disposeTrack(t)
    tracks.delete(key)
    if (lastId === key) lastId = tracks.size ? [...tracks.keys()].pop() : null
  }
  const wavList = () => [...tracks.keys()]

  Object.assign(_hydraScope, {
    wavLoad,
    wavRms,
    wavFft,
    wavBand,
    wavPosition,
    wavDuration,
    wavPlaying,
    wavWave,
    wavSpectrum,
    wavPlay,
    wavPause,
    wavStop,
    wavJump,
    wavDispose,
    wavList,
  })

  console.log('[wavmod] loaded')
})()
