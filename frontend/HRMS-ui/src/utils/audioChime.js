/**
 * Synthesizes an elegant, soft 2-tone notification chime (Apple/Slack style)
 * using Web Audio API with automatic user-gesture unlock and HTML5 Audio fallback.
 * Works seamlessly across Chrome, Edge, Safari, and Firefox.
 */

let audioCtx = null;
let fallbackAudio = null;

// Generate a lightweight base64 WAV chime Data URI in memory (0 KB bundle size, 0 network requests)
const createChimeDataUri = () => {
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

        // Generate 2 chime tones: E5 (659Hz) and B5 (987Hz)
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
    } catch (e) {
        // ignore fallback generation failure
    }
    return null;
};

// Lazily initialize fallback audio
const getFallbackAudio = () => {
    if (fallbackAudio) return fallbackAudio;
    if (typeof window === "undefined") return null;
    try {
        const uri = createChimeDataUri();
        if (uri) {
            fallbackAudio = new Audio(uri);
            fallbackAudio.volume = 0.5;
        }
    } catch (e) {}
    return fallbackAudio;
};

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

/**
 * Proactively unlocks audio on the user's first gesture (click, tap, keypress).
 * Standard Howler.js technique to comply with Chrome & Safari Autoplay Policies.
 */
export const unlockAudio = () => {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;

        if (ctx.state === "suspended") {
            ctx.resume().catch(() => {});
        }

        // Play a silent 1-sample buffer to unlock audio hardware
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);

        // Preload fallback audio
        getFallbackAudio();

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

// Register global one-time interaction unlockers immediately
if (typeof window !== "undefined") {
    const events = ["click", "touchstart", "touchend", "keydown", "pointerdown", "mousedown"];
    events.forEach((ev) => {
        window.addEventListener(ev, unlockAudio, { capture: true, passive: true });
    });
}

/**
 * Play synthesized chime via Web Audio API oscillators.
 */
const playWebAudioSynth = (ctx) => {
    const now = ctx.currentTime + 0.01;

    // Master Gain
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

    // Note 2: B5 (987.77 Hz) - bright, friendly resolution
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

const playFallbackChime = () => {
    try {
        const audio = getFallbackAudio();
        if (audio) {
            audio.currentTime = 0;
            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise.catch((e) => {
                    console.debug("Autoplay blocked pending user interaction:", e);
                });
            }
        }
    } catch (e) {}
};

/**
 * Primary function to play email notification sound.
 * Tries running Web Audio API; if suspended, attempts resume; falls back to HTML5 Audio.
 */
export const playEmailChime = () => {
    try {
        const ctx = getAudioContext();
        if (ctx && ctx.state === "running") {
            playWebAudioSynth(ctx);
            return;
        }

        if (ctx && ctx.state === "suspended") {
            ctx.resume().then(() => {
                playWebAudioSynth(ctx);
            }).catch(() => {
                playFallbackChime();
            });
            return;
        }

        playFallbackChime();
    } catch (e) {
        playFallbackChime();
    }
};
