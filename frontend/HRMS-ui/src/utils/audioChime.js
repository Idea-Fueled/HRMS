/**
  * Synthesizes an elegant, soft 2-tone notification chime (Apple/Slack style)
  * using Web Audio API. 0 KB, 0ms latency, zero external asset dependencies.
  */
let audioCtx = null;

export const playEmailChime = () => {
    try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;

        if (!audioCtx) {
            audioCtx = new AudioContextClass();
        }

        if (audioCtx.state === "suspended") {
            audioCtx.resume();
        }

        const now = audioCtx.currentTime;

        // Master Gain
        const masterGain = audioCtx.createGain();
        masterGain.gain.setValueAtTime(0.18, now);
        masterGain.connect(audioCtx.destination);

        // Note 1: E5 (659.25 Hz)
        const osc1 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(659.25, now);

        gain1.gain.setValueAtTime(0, now);
        gain1.gain.linearRampToValueAtTime(0.8, now + 0.02);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        osc1.connect(gain1);
        gain1.connect(masterGain);

        osc1.start(now);
        osc1.stop(now + 0.25);

        // Note 2: B5 (987.77 Hz) - crisp, bright resolution
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(987.77, now + 0.1);

        gain2.gain.setValueAtTime(0, now + 0.1);
        gain2.gain.linearRampToValueAtTime(0.9, now + 0.12);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        osc2.connect(gain2);
        gain2.connect(masterGain);

        osc2.start(now + 0.1);
        osc2.stop(now + 0.45);
    } catch (e) {
        console.warn("Could not play audio chime:", e);
    }
};
