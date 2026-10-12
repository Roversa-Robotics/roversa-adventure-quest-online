// Tiny 8-bit style sound effects made with the Web Audio API (no sound files).
(function (root) {
  'use strict';

  let ctx = null;
  let muted = false;
  try { muted = localStorage.getItem('roversa-muted') === '1'; } catch (e) { /* storage blocked */ }

  function ac() {
    if (!ctx) {
      const AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // notes: [[frequency, duration in seconds], ...] played one after another.
  function play(notes, type, volume) {
    if (muted) return;
    const a = ac();
    if (!a) return;
    let t = a.currentTime + 0.01;
    for (const [freq, dur] of notes) {
      if (freq) {
        const osc = a.createOscillator();
        const gain = a.createGain();
        osc.type = type || 'square';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(volume || 0.08, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.connect(gain).connect(a.destination);
        osc.start(t);
        osc.stop(t + dur);
      }
      t += dur;
    }
  }

  const sfx = {
    tap: () => play([[660, 0.05]]),
    drop: () => play([[520, 0.05], [780, 0.06]]),
    remove: () => play([[400, 0.05], [260, 0.07]]),
    move: () => play([[330, 0.06], [392, 0.06]], 'triangle', 0.15),
    turn: () => play([[523, 0.05], [659, 0.05]], 'triangle', 0.12),
    bump: () => play([[110, 0.12], [90, 0.16]], 'sawtooth', 0.09),
    noop: () => play([[300, 0.08]], 'triangle', 0.1),
    goal: () => play([[784, 0.08], [988, 0.08], [1319, 0.16]]),
    off: () => play([[600, 0.07], [450, 0.07], [300, 0.07], [200, 0.15]]),
    dice: () => play([[200 + Math.random() * 400, 0.03]], 'square', 0.05),
    win: () => play([[523, 0.12], [659, 0.12], [784, 0.12], [1047, 0.12], [784, 0.1], [1047, 0.35]]),
  };

  root.RoversaAudio = {
    sfx,
    isMuted: () => muted,
    setMuted(m) {
      muted = m;
      try { localStorage.setItem('roversa-muted', m ? '1' : '0'); } catch (e) { /* storage blocked */ }
    },
  };
})(globalThis);
