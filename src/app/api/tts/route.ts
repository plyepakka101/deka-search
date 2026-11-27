import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { normalizeLawTextForTTS } from '@/lib/lawPhonetics';

// Multi-provider TTS proxy:
// 1. 'google': Free, unlimited, no key required (with auto-chunking & stitching)
// 2. 'edge': Microsoft Edge TTS (Premwadee/Niwat free, auto-falls back to Google if blocked)
// 3. 'azure': Official Azure Neural TTS (highest quality, requires session + key)

const ALLOWED_VOICES = new Set([
  'th-TH-PremwadeeNeural',
  'th-TH-NiwatNeural',
  'th-TH-AcharaNeural',
]);

const MAX_CHARS = 3000;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function chunkText(str: string, maxLen = 140): string[] {
  if (str.length <= maxLen) return [str];
  const chunks: string[] = [];
  let remaining = str;
  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      chunks.push(remaining);
      break;
    }
    let splitIdx = -1;
    for (const delimiter of ['\n', ' ', '，', '、', '。', ',', '.', ';']) {
      const idx = remaining.lastIndexOf(delimiter, maxLen);
      if (idx > 25 && idx > splitIdx) {
        splitIdx = idx + delimiter.length;
      }
    }
    if (splitIdx === -1) {
      splitIdx = maxLen;
    }
    chunks.push(remaining.slice(0, splitIdx).trim());
    remaining = remaining.slice(splitIdx).trim();
  }
  return chunks.filter(Boolean);
}

async function fetchGoogleTTS(text: string): Promise<Buffer> {
  const chunks = chunkText(text, 140);
  const buffers: Buffer[] = [];
  for (const chunk of chunks) {
    const res = await fetch(
      'https://translate.google.com/translate_tts?ie=UTF-8&tl=th&client=tw-ob&q=' + encodeURIComponent(chunk),
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
          'Referer': 'https://translate.google.com/',
        },
      }
    );
    if (!res.ok) {
      throw new Error(`Google TTS error: ${res.status}`);
    }
    const ab = await res.arrayBuffer();
    buffers.push(Buffer.from(ab));
  }
  return Buffer.concat(buffers);
}

async function fetchEdgeTTS(text: string, voice = 'th-TH-PremwadeeNeural'): Promise<Buffer | null> {
  try {
    const { EdgeTTS } = await import('@travisvn/edge-tts');
    const tts = new EdgeTTS(text, voice);
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Edge-TTS timeout')), 5000)
    );
    const res = await Promise.race([tts.synthesize(), timeout]);
    const ab = await res.audio.arrayBuffer();
    return Buffer.from(ab);
  } catch (err) {
    console.warn('Edge-TTS synthesis error or timeout:', err);
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const rawText = typeof body?.text === 'string' ? body.text.trim() : '';
    const text = normalizeLawTextForTTS(rawText);
    const voice = typeof body?.voice === 'string' ? body.voice : 'th-TH-PremwadeeNeural';
    const provider = typeof body?.provider === 'string' ? body.provider : 'azure';
    const rawRate = Number(body?.rate);
    const rate = Number.isFinite(rawRate) ? Math.min(2, Math.max(0.5, rawRate)) : 1;

    if (!text) {
      return NextResponse.json({ error: 'ไม่มีข้อความให้อ่าน', code: 'bad_request' }, { status: 400 });
    }
    if (text.length > MAX_CHARS) {
      return NextResponse.json(
        { error: `ข้อความยาวเกิน ${MAX_CHARS} ตัวอักษร`, code: 'too_long' },
        { status: 413 }
      );
    }

    // 1. Google Cloud TTS (100% Free, no keys required)
    if (provider === 'google') {
      try {
        const audio = await fetchGoogleTTS(text);
        return new Response(audio as any, {
          status: 200,
          headers: {
            'Content-Type': 'audio/mpeg',
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        });
      } catch (err) {
        console.error('Google TTS error:', err);
        return NextResponse.json({ error: 'บริการ Google TTS ขัดข้อง', code: 'upstream_error' }, { status: 502 });
      }
    }

    // 2. Edge-TTS (Premwadee / Niwat free, falls back to Google TTS if blocked)
    if (provider === 'edge') {
      const selectedVoice = ALLOWED_VOICES.has(voice) ? voice : 'th-TH-PremwadeeNeural';
      const audio = await fetchEdgeTTS(text, selectedVoice);
      if (audio && audio.length > 0) {
        return new Response(audio as any, {
          status: 200,
          headers: {
            'Content-Type': 'audio/mpeg',
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        });
      }

      // Fallback to Google TTS if Edge-TTS failed or timed out
      console.warn('Edge-TTS unavailable or blocked by Microsoft, falling back to Google TTS');
      try {
        const fallbackAudio = await fetchGoogleTTS(text);
        return new Response(fallbackAudio as any, {
          status: 200,
          headers: {
            'Content-Type': 'audio/mpeg',
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        });
      } catch (fallbackErr) {
        return NextResponse.json(
          { error: 'บริการ Edge-TTS และ Fallback ขัดข้อง', code: 'upstream_error' },
          { status: 502 }
        );
      }
    }

    // 3. Azure Neural TTS (Default official service)
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'ต้องเข้าสู่ระบบก่อนใช้เสียงคุณภาพสูง Azure', code: 'unauthorized' },
        { status: 401 }
      );
    }

    const key = process.env.AZURE_SPEECH_KEY;
    const region = process.env.AZURE_SPEECH_REGION;
    if (!key || !region || !/^[a-z0-9-]+$/i.test(region)) {
      return NextResponse.json(
        { error: 'ยังไม่ได้ตั้งค่า Azure Speech บนเซิร์ฟเวอร์', code: 'not_configured' },
        { status: 503 }
      );
    }

    if (!ALLOWED_VOICES.has(voice)) {
      return NextResponse.json({ error: 'ไม่รู้จักเสียงที่เลือก', code: 'bad_request' }, { status: 400 });
    }

    const percent = Math.round((rate - 1) * 100);
    const rateValue = `${percent >= 0 ? '+' : ''}${percent}%`;
    const ssml =
      `<speak version='1.0' xml:lang='th-TH'>` +
      `<voice name='${voice}'><prosody rate='${rateValue}'>${escapeXml(text)}</prosody></voice>` +
      `</speak>`;

    const azureRes = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
        'User-Agent': 'deka-search-tts',
      },
      body: ssml,
    });

    if (!azureRes.ok) {
      console.error('Azure TTS error:', azureRes.status, await azureRes.text().catch(() => ''));
      return NextResponse.json(
        { error: 'บริการอ่านออกเสียงขัดข้อง', code: 'upstream_error' },
        { status: 502 }
      );
    }

    const audio = await azureRes.arrayBuffer();
    return new Response(audio, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'private, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('TTS route error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการสร้างเสียง', code: 'server_error' }, { status: 500 });
  }
}
