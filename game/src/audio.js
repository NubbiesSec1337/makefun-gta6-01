// Procedural sound: every effect is synthesized with WebAudio, so the game ships
export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let engineFilter = null;
  let sirenOsc = null;
  let sirenGain = null;
  let sirenTimer = 0;
  let muted = false;
  let sirenOn = false;
  const STATIONS = [
    ['VICE 98.5', 'square', 132, [220, 277, 330, 440, 330, 277]],
    ['LEONIDA FM', 'triangle', 104, [330, 392, 494, 587, 494, 392]],
    ['SWAMP 101', 'sawtooth', 96, [55, 55, 82, 65, 49, 62]],
  ];
  let radioOn = false;
  let radioStation = 0;
  let radioStep = 0;
  let radioNext = 0;
  function note(freq, at, dur, type, vol) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, at);
    gain.gain.exponentialRampToValueAtTime(0.001, at + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(at);
    osc.stop(at + dur + 0.02);
  }
  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 420;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
      // Siren: one oscillator, two alternating tones.
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'sine';
      sirenOsc.frequency.value = 720;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(master);
      sirenOsc.start();
    } catch {
      return false;
    }
    return true;
  }
  function blip(freq, seconds, type, volume) {
    if (!ensure()) return;
    note(freq, ctx.currentTime, seconds, type || 'sine', volume ?? 0.25);
  }
  function noiseBurst(seconds, volume, lowpass) {
    if (!ensure()) return;
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass || 1200;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start();
  }
  return {
    ensure,
    get muted() { return muted; },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    click() { blip(660, 0.07, 'square', 0.12); },
    pickup() { blip(880, 0.1, 'sine', 0.25); setTimeout(() => blip(1318, 0.16, 'sine', 0.25), 90); },
    missionDone() {
      [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => blip(f, 0.22, 'triangle', 0.28), i * 110));
    },
    fail() { blip(220, 0.3, 'sawtooth', 0.2); setTimeout(() => blip(165, 0.4, 'sawtooth', 0.2), 140); },
    gunshot() { noiseBurst(0.14, 0.5, 900); blip(90, 0.12, 'sine', 0.4); },
    hit() { noiseBurst(0.06, 0.25, 2400); },
    crash() { noiseBurst(0.25, 0.4, 500); },
    setEngine(speed01, driving) {
      if (!ctx) return;
      const target = driving ? 0.05 + speed01 * 0.09 : 0;
      engineGain.gain.setTargetAtTime(target, ctx.currentTime, 0.08);
      engineOsc.frequency.setTargetAtTime(52 + speed01 * 165, ctx.currentTime, 0.08);
      engineFilter.frequency.setTargetAtTime(380 + speed01 * 1400, ctx.currentTime, 0.08);
    },
    setSiren(on, dt) {
      if (!ctx) return;
      sirenOn = on;
      if (!on) {
        sirenGain.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
        return;
      }
      sirenGain.gain.setTargetAtTime(0.045, ctx.currentTime, 0.2);
      sirenTimer += dt;
      const high = Math.floor(sirenTimer * 1.6) % 2 === 0;
      sirenOsc.frequency.setTargetAtTime(high ? 720 : 960, ctx.currentTime, 0.03);
    },
    radio() {
      if (!ensure()) return '';
      if (!radioOn) { radioOn = true; radioStation = 0; }
      else {
        radioStation += 1;
        if (radioStation >= STATIONS.length) { radioOn = false; return ''; }
      }
      radioStep = 0;
      radioNext = ctx.currentTime + 0.05;
      return STATIONS[radioStation][0];
    },
    get radioName() { return radioOn ? STATIONS[radioStation][0] : ''; },
    setMusic() {
      if (!radioOn || !ctx) return;
      const [, wave, bpm, notes] = STATIONS[radioStation];
      const beat = 60 / bpm;
      while (radioNext < ctx.currentTime + 0.2) {
        note(notes[radioStep % notes.length], radioNext, beat * 0.9, wave, 0.07);
        radioNext += beat;
        radioStep += 1;
      }
    },
  };
}
