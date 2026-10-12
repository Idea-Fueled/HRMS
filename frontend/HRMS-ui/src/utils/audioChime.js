/**
 * Synthesizes:
 * 1. playEmailChime(): Elegant, soft 2-tone notification chime (~0.4s) for incoming inbox emails.
 * 2. playDsrChime(): Distinct, richer 4-note melodic bell/harp chime (~2.0s) for 5:30 PM DSR reminder.
 * Uses Web Audio API with automatic user-gesture unlock and HTML5 Audio fallback.
 * Works seamlessly across Chrome, Edge, Safari, and Firefox.
 */

let audioCtx = null;
let fallbackEmailAudio = null;
let fallbackDsrAudio = null;

/* ─────────────────────────────────────────────
   1. INBOX EMAIL CHIME (2-tone, ~0.45s)
───────────────────────────────────────────── */
const createEmailChimeDataUri = () => {
    try {
        const sampleRate = 22050;
        const duration = 0.45;
        const numSamples = Math.floor(sampleRate * duration);
        const buffer = new ArrayBuffer(44 + numSamples * 2);
        const view = new DataView(buffer);

        const writeString = (offset, string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };

        writeString(0, "RIFF");
        view.setUint32(4, 36 + numSamples * 2, true);
        writeString(8, "WAVE");
        writeString(12, "fmt ");
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true); // PCM
        view.setUint16(22, 1, true); // Mono
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * 2, true);
        view.setUint16(32, 2, true);
        view.setUint16(34, 16, true);
        writeString(36, "data");
        view.setUint32(40, numSamples * 2, true);

        let offset = 44;
        for (let i = 0; i < numSamples; i++) {
            const t = i / sampleRate;
            let sample = 0;
            if (t < 0.25) {
                const env1 = Math.exp(-t * 14) * Math.min(t / 0.02, 1);
                sample += Math.sin(2 * Math.PI * 659.25 * t) * env1 * 0.35;
            }
            if (t >= 0.1) {
                const t2 = t - 0.1;
                const env2 = Math.exp(-t2 * 12) * Math.min(t2 / 0.02, 1);
                sample += Math.sin(2 * Math.PI * 987.77 * t) * env2 * 0.4;
            }
            const s = Math.max(-1, Math.min(1, sample));
            view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
            offset += 2;
        }

        const bytes = new Uint8Array(buffer);
        let binary = "";
        const chunkSize = 8192;
        for (let i = 0; i < bytes.length; i += chunkSize) {
            binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
        }

        if (typeof window !== "undefined" && window.btoa) {
            return "data:audio/wav;base64," + window.btoa(binary);
        }
    } catch (e) {}
    return null;
};

const getFallbackEmailAudio = () => {
    if (fallbackEmailAudio) return fallbackEmailAudio;
    if (typeof window === "undefined") return null;
    try {
        const uri = createEmailChimeDataUri();
        if (uri) {
            fallbackEmailAudio = new Audio(uri);
            fallbackEmailAudio.volume = 0.5;
        }
    } catch (e) {}
    return fallbackEmailAudio;
};

/* ─────────────────────────────────────────────
   2. DSR REMINDER CHIME (4-note bell arpeggio, ~2.0s)
───────────────────────────────────────────── */
const createDsrChimeDataUri = () => {
    try {
        const sampleRate = 22050;
        const duration = 2.0;
        const numSamples = Math.floor(sampleRate * duration);
        const buffer = new ArrayBuffer(44 + numSamples * 2);
        const view = new DataView(buffer);

        const writeString = (offset, string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };

        writeString(0, "RIFF");
        view.setUint32(4, 36 + numSamples * 2, true);
        writeString(8, "WAVE");
        writeString(12, "fmt ");
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true); // PCM
        view.setUint16(22, 1, true); // Mono
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * 2, true);
        view.setUint16(32, 2, true);
        view.setUint16(34, 16, true);
        writeString(36, "data");
        view.setUint32(40, numSamples * 2, true);

        // F Major 4-note ascending bell chime: F4 -> A4 -> C5 -> F5
        const notes = [
            { freq: 349.23, start: 0.0, dur: 0.8, gain: 0.35 },
            { freq: 440.0, start: 0.28, dur: 0.85, gain: 0.38 },
            { freq: 523.25, start: 0.58, dur: 0.95, gain: 0.4 },
            { freq: 698.46, start: 0.9, dur: 1.1, gain: 0.45 },
        ];

        let offset = 44;
        for (let i = 0; i < numSamples; i++) {
            const t = i / sampleRate;
            let sample = 0;

            for (const n of notes) {
                if (t >= n.start && t < n.start + n.dur) {
                    const elapsed = t - n.start;
                    const attack = Math.min(elapsed / 0.025, 1);
                    const decay = Math.exp(-elapsed * 3.6);
                    const fund = Math.sin(2 * Math.PI * n.freq * elapsed);
                    const harm = Math.sin(4 * Math.PI * n.freq * elapsed) * 0.22;
                    sample += (fund + harm) * attack * decay * n.gain;
                }
            }

            const s = Math.max(-1, Math.min(1, sample));
            view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
            offset += 2;
        }

        const bytes = new Uint8Array(buffer);
        let binary = "";
        const chunkSize = 8192;
        for (let i = 0; i < bytes.length; i += chunkSize) {
            binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
        }

        if (typeof window !== "undefined" && window.btoa) {
            return "data:audio/wav;base64," + window.btoa(binary);
        }
    } catch (e) {}
    return null;
};

const getFallbackDsrAudio = () => {
    if (fallbackDsrAudio) return fallbackDsrAudio;
    if (typeof window === "undefined") return null;
    try {
        const uri = createDsrChimeDataUri();
        if (uri) {
            fallbackDsrAudio = new Audio(uri);
            fallbackDsrAudio.volume = 0.55;
        }
    } catch (e) {}
    return fallbackDsrAudio;
};

/* ─────────────────────────────────────────────
   GLOBAL AUDIOCONTEXT & USER GESTURE UNLOCK
───────────────────────────────────────────── */
const getAudioContext = () => {
    if (audioCtx) return audioCtx;
    if (typeof window === "undefined") return null;
    try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
            audioCtx = new AudioContextClass();
        }
    } catch (e) {}
    return audioCtx;
};

export const unlockAudio = () => {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;

        if (ctx.state === "suspended") {
            ctx.resume().catch(() => {});
        }

        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);

        getFallbackEmailAudio();
        getFallbackDsrAudio();

        if (ctx.state === "running") {
            cleanupUnlockListeners();
        }
    } catch (e) {}
};

const cleanupUnlockListeners = () => {
    if (typeof window === "undefined") return;
    const events = ["click", "touchstart", "touchend", "keydown", "pointerdown", "mousedown"];
    events.forEach((ev) => window.removeEventListener(ev, unlockAudio, true));
};

if (typeof window !== "undefined") {
    const events = ["click", "touchstart", "touchend", "keydown", "pointerdown", "mousedown"];
    events.forEach((ev) => {
        window.addEventListener(ev, unlockAudio, { capture: true, passive: true });
    });
}

/* ─────────────────────────────────────────────
   WEB AUDIO SYNTHESIS: EMAIL CHIME (~0.4s)
───────────────────────────────────────────── */
const playWebAudioEmailSynth = (ctx) => {
    const now = ctx.currentTime + 0.01;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.25, now);
    masterGain.connect(ctx.destination);

    // Note 1: E5 (659.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(659.25, now);

    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.85, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc1.connect(gain1);
    gain1.connect(masterGain);
    osc1.start(now);
    osc1.stop(now + 0.25);

    // Note 2: B5 (987.77 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(987.77, now + 0.1);

    gain2.gain.setValueAtTime(0, now + 0.1);
    gain2.gain.linearRampToValueAtTime(0.9, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc2.connect(gain2);
    gain2.connect(masterGain);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.45);
};

/* ─────────────────────────────────────────────
   WEB AUDIO SYNTHESIS: DSR CHIME (~2.0s)
   Warm 4-note bell harmony: F4 -> A4 -> C5 -> F5
───────────────────────────────────────────── */
const playWebAudioDsrSynth = (ctx) => {
    const now = ctx.currentTime + 0.01;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.28, now);
    masterGain.connect(ctx.destination);

    const notes = [
        { freq: 349.23, start: 0.0, dur: 0.85, peak: 0.75 },  // F4
        { freq: 440.0, start: 0.28, dur: 0.90, peak: 0.80 },  // A4
        { freq: 523.25, start: 0.58, dur: 1.00, peak: 0.85 }, // C5
        { freq: 698.46, start: 0.90, dur: 1.10, peak: 0.90 }, // F5 (resolving high chime)
    ];

    notes.forEach((n) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(n.freq, now + n.start);

        const startTime = now + n.start;
        const endTime = startTime + n.dur;

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(n.peak, startTime + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, endTime);

        osc.connect(gain);
        gain.connect(masterGain);

        osc.start(startTime);
        osc.stop(endTime);
    });
};

/* ─────────────────────────────────────────────
   EXPORTED PLAYERS
───────────────────────────────────────────── */

/**
 * Plays standard email chime (~0.4s) on new email arrival.
 */
export const playEmailChime = () => {
    try {
        const ctx = getAudioContext();
        if (ctx && ctx.state === "running") {
            playWebAudioEmailSynth(ctx);
            return;
        }

        if (ctx && ctx.state === "suspended") {
            ctx.resume()
                .then(() => playWebAudioEmailSynth(ctx))
                .catch(() => playFallbackEmailChime());
            return;
        }

        playFallbackEmailChime();
    } catch (e) {
        playFallbackEmailChime();
    }
};

const playFallbackEmailChime = () => {
    try {
        const audio = getFallbackEmailAudio();
        if (audio) {
            audio.currentTime = 0;
            audio.play().catch(() => {});
        }
    } catch (e) {}
};

/**
 * Plays distinct, longer 4-note bell chime (~2.0s) for 5:30 PM DSR reminder.
 */
export const playDsrChime = () => {
    try {
        const ctx = getAudioContext();
        if (ctx && ctx.state === "running") {
            playWebAudioDsrSynth(ctx);
            return;
        }

        if (ctx && ctx.state === "suspended") {
            ctx.resume()
                .then(() => playWebAudioDsrSynth(ctx))
                .catch(() => playFallbackDsrChime());
            return;
        }

        playFallbackDsrChime();
    } catch (e) {
        playFallbackDsrChime();
    }
};

const playFallbackDsrChime = () => {
    try {
        const audio = getFallbackDsrAudio();
        if (audio) {
            audio.currentTime = 0;
            audio.play().catch(() => {});
        }
    } catch (e) {}
};
