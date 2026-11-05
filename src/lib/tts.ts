// Client-side helpers for Text-to-Speech: Azure Neural, Edge-TTS, Google Cloud TTS
// and browser speechSynthesis fallback.
import { TtsProvider } from '@/components/law-mate/types';

export type { TtsProvider };

export const AZURE_THAI_VOICES = [
  { id: 'th-TH-PremwadeeNeural', label: 'Premwadee (หญิง)' },
  { id: 'th-TH-NiwatNeural', label: 'Niwat (ชาย)' },
  { id: 'th-TH-AcharaNeural', label: 'Achara (หญิง)' },
] as const;

export const DEFAULT_AZURE_VOICE = AZURE_THAI_VOICES[0].id;

// ---------------------------------------------------------------------------
// Browser voices: prefer natural/neural Thai voices over the first one found.
// ---------------------------------------------------------------------------
function scoreThaiVoice(v: SpeechSynthesisVoice): number {
  const name = v.name.toLowerCase();
  let score = 0;
  if (v.lang === 'th-TH') score += 1;
  if (name.includes('natural') || name.includes('online')) score += 4;
  if (/premwadee|niwat|achara/.test(name)) score += 2;
  if (name.includes('google')) score += 1;
  return score;
}

export function pickBrowserVoice(
  voices: SpeechSynthesisVoice[],
  voiceURI?: string
): SpeechSynthesisVoice | null {
  if (voiceURI) {
    const chosen = voices.find(v => v.voiceURI === voiceURI);
    if (chosen) return chosen;
  }
  const thai = voices.filter(v => v.lang.toLowerCase().includes('th'));
  if (thai.length === 0) return null;
  return [...thai].sort((a, b) => scoreThaiVoice(b) - scoreThaiVoice(a))[0];
}

// ---------------------------------------------------------------------------
// Audio cache: memory + Cache Storage so loops and repeat reviews don't re-fetch.
// ---------------------------------------------------------------------------
const CACHE_NAME = 'deka-tts-v2';
const MEMORY_LIMIT = 50;
const memoryCache = new Map<string, string>(); // key -> object URL

let azureUnavailable = false;

export function isAzureUnavailable(): boolean {
  return azureUnavailable;
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function rememberInMemory(key: string, url: string) {
  memoryCache.set(key, url);
  if (memoryCache.size > MEMORY_LIMIT) {
    const oldest = memoryCache.keys().next().value;
    if (oldest !== undefined) {
      const oldUrl = memoryCache.get(oldest);
      if (oldUrl) URL.revokeObjectURL(oldUrl);
      memoryCache.delete(oldest);
    }
  }
}

export async function getAudioUrl(
  text: string,
  voice: string,
  rate: number,
  provider: TtsProvider = 'azure'
): Promise<string> {
  const key = await sha256Hex(`${provider}|${voice}|${rate}|${text}`);

  const inMemory = memoryCache.get(key);
  if (inMemory) return inMemory;

  let cache: Cache | null = null;
  const cacheRequest = new Request(`/__tts-cache/${key}`);
  try {
    if (typeof caches !== 'undefined') {
      cache = await caches.open(CACHE_NAME);
      const hit = await cache.match(cacheRequest);
      if (hit) {
        const url = URL.createObjectURL(await hit.blob());
        rememberInMemory(key, url);
        return url;
      }
    }
  } catch {
    cache = null;
  }

  const res = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice, rate, provider }),
  });

  if (!res.ok) {
    // If Azure credentials missing or unauthorized, mark as unavailable for this session
    if (res.status === 401 || res.status === 503) {
      if (provider === 'azure') azureUnavailable = true;
    }
    throw new Error(`TTS request failed (${res.status})`);
  }

  const blob = await res.blob();
  try {
    await cache?.put(cacheRequest, new Response(blob, { headers: { 'Content-Type': 'audio/mpeg' } }));
  } catch {
    // Caching is best-effort.
  }
  const url = URL.createObjectURL(blob);
  rememberInMemory(key, url);
  return url;
}

// Backward compatibility alias
export const getAzureAudioUrl = getAudioUrl;

// ---------------------------------------------------------------------------
// Mobile Safari only allows audio.play() on an element that was started inside
// a user gesture. Our audio arrives after a network call, so we "unlock" the
// element synchronously first with a silent clip.
// ---------------------------------------------------------------------------
const SILENT_WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
const unlocked = new WeakSet<HTMLAudioElement>();

export function unlockAudio(el: HTMLAudioElement) {
  if (unlocked.has(el)) return;
  unlocked.add(el);
  el.src = SILENT_WAV;
  el.play().catch(() => {});
}

// Detach handlers and pause, so a stale clip can't fire callbacks.
export function resetAudio(el: HTMLAudioElement | null | undefined) {
  if (!el) return;
  el.onended = null;
  el.onerror = null;
  el.pause();
}

// Start playing an audio URL on an already-unlocked element.
export function playAudioUrl(
  el: HTMLAudioElement,
  url: string,
  handlers: { onEnded: () => void; onError: () => void },
  playbackRate = 1.0
): Promise<void> {
  el.onended = handlers.onEnded;
  el.onerror = handlers.onError;
  el.src = url;
  if (Number.isFinite(playbackRate) && playbackRate > 0) {
    el.playbackRate = playbackRate;
  }
  return el.play();
}
