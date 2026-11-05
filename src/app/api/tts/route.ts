import { NextResponse } from 'next/server';
import { auth } from '@/auth';

// Azure AI Speech (Neural TTS) proxy. The subscription key stays on the server.
// Required env vars: AZURE_SPEECH_KEY, AZURE_SPEECH_REGION (e.g. "southeastasia").

const ALLOWED_VOICES = new Set([
  'th-TH-PremwadeeNeural',
  'th-TH-NiwatNeural',
  'th-TH-AcharaNeural',
]);

// Keeps a single request (and its cost) bounded.
const MAX_CHARS = 3000;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function POST(request: Request) {
  try {
    // Only signed-in users can spend the Azure quota.
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'ต้องเข้าสู่ระบบก่อนใช้เสียงคุณภาพสูง', code: 'unauthorized' },
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

    const body = await request.json().catch(() => null);
    const text = typeof body?.text === 'string' ? body.text.trim() : '';
    const voice = typeof body?.voice === 'string' ? body.voice : 'th-TH-PremwadeeNeural';
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
