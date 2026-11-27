import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const facts = body.facts ?? body.question?.facts ?? '';
    const prompt = body.prompt ?? body.question?.prompt ?? '';
    const officialAnswer = body.officialAnswer ?? body.question?.officialAnswer ?? '';
    const keyIssues = body.keyIssues ?? body.question?.keyIssues ?? [];
    const userDraft = body.userDraft ?? '';
    const clientApiKey = body.apiKey;

    // 1. Validate inputs
    if (typeof userDraft !== 'string' || !userDraft.trim()) {
      return NextResponse.json({ error: 'กรุณาพิมพ์คำตอบก่อนขอรับการประเมินจาก AI' }, { status: 400 });
    }

    // Input length limits to prevent DoS / buffer / token explosion
    if (userDraft.length > 6000) {
      return NextResponse.json({ error: 'เนื้อหาคำตอบยาวเกินไป (จำกัดไม่เกิน 6,000 ตัวอักษร)' }, { status: 413 });
    }
    if (typeof facts === 'string' && facts.length > 8000) {
      return NextResponse.json({ error: 'ข้อเท็จจริงในโจทย์ยาวเกินขีดจำกัด (ไม่เกิน 8,000 ตัวอักษร)' }, { status: 413 });
    }
    if (typeof prompt === 'string' && prompt.length > 2000) {
      return NextResponse.json({ error: 'คำถามวินิจฉัยยาวเกินขีดจำกัด (ไม่เกิน 2,000 ตัวอักษร)' }, { status: 413 });
    }
    if (typeof officialAnswer === 'string' && officialAnswer.length > 8000) {
      return NextResponse.json({ error: 'ธงคำตอบยาวเกินขีดจำกัด (ไม่เกิน 8,000 ตัวอักษร)' }, { status: 413 });
    }

    // 2. Determine effective API key & apply auth / rate limits
    const trimmedApiKey = typeof clientApiKey === 'string' ? clientApiKey.trim() : '';
    let effectiveApiKey = '';

    if (trimmedApiKey) {
      // Validate client key format (Google API keys are ~39 alphanumeric chars)
      if (!/^[A-Za-z0-9_-]{20,80}$/.test(trimmedApiKey)) {
        return NextResponse.json({
          error: 'รูปแบบ Gemini API Key ไม่ถูกต้อง กรุณาตรวจสอบ API Key ในหน้าต่างตั้งค่า'
        }, { status: 400 });
      }

      // Rate limit by IP for custom keys: 30 requests / minute
      const clientIp = getClientIp(request);
      const rl = checkRateLimit(`ai:key:${clientIp}`, { windowMs: 60 * 1000, maxRequests: 30 });
      if (!rl.success) {
        return NextResponse.json(
          { error: 'คุณเรียกใช้งาน AI ถี่เกินไป กรุณารอสักครู่แล้วลองใหม่อีกครั้ง' },
          { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.resetMs / 1000)) } }
        );
      }

      effectiveApiKey = trimmedApiKey;
    } else {
      // Falling back to server's GEMINI_API_KEY -> Require authenticated user session
      const session = await auth();
      if (!session?.user) {
        return NextResponse.json({
          error: 'กรุณาเข้าสู่ระบบก่อนใช้ AI ของระบบ หรือระบุ Gemini API Key ของตนเองในหน้าต่างตั้งค่า',
          requiresAuthOrKey: true,
          requiresApiKey: true
        }, { status: 401 });
      }

      if (!process.env.GEMINI_API_KEY) {
        return NextResponse.json({
          error: 'เซิร์ฟเวอร์ยังไม่ได้ตั้งค่า GEMINI_API_KEY กรุณาระบุ API Key ของตนเองในหน้าต่างตั้งค่าเพื่อใช้งาน',
          requiresApiKey: true
        }, { status: 503 });
      }

      // Rate limit by user session for server quota: 10 requests / 5 minutes
      const userIdentifier = session.user.email || session.user.id || getClientIp(request);
      const rl = checkRateLimit(`ai:server:${userIdentifier}`, { windowMs: 5 * 60 * 1000, maxRequests: 10 });
      if (!rl.success) {
        return NextResponse.json(
          { error: 'คุณใช้โควตาตรวจข้อสอบด้วย AI ของระบบครบกำหนดชั่วคราว (10 ครั้ง/5 นาที) กรุณารอสักครู่ หรือระบุ API Key ของตนเองในหน้าต่างตั้งค่า' },
          { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.resetMs / 1000)) } }
        );
      }

      effectiveApiKey = process.env.GEMINI_API_KEY;
    }

    // 3. Build specialized Thai legal evaluation prompt
    const systemInstruction = `คุณเป็นอาจารย์ผู้เชี่ยวชาญด้านการตรวจข้อสอบกฎหมายระดับเนติบัณฑิตและผู้ช่วยผู้พิพากษาของไทย 
ภารกิจของคุณคือวิเคราะห์คำตอบอัตนัยของผู้เข้าสอบ เทียบกับโจทย์ คำถามวินิจฉัย และธงคำตอบมาตรฐานอย่างเป็นกลาง ชัดเจน และสร้างสรรค์

เกณฑ์การประเมิน 3 มิติ:
1. การตั้งหลักกฎหมาย (Rule): ตรวจว่าระบุเลขมาตราหรือหลักกฎหมายสำคัญที่เกี่ยวข้องได้ถูกต้องหรือไม่
2. การปรับบทเข้ากับข้อเท็จจริง (Application): มีการนำข้อเท็จจริงในโจทย์มาปรับเข้ากับองค์ประกอบของตัวบทกฎหมายและแนวคำพิพากษาศาลฎีกาหรือไม่
3. การสรุปผล (Conclusion): ฟันธงผลแห่งคดีได้ถูกต้องตรงตามธงคำตอบหรือไม่

ให้ส่งคำตอบกลับมาเป็น JSON ตามรูปแบบนี้เท่านั้น ห้ามใส่ markdown code block หรือคำนำหน้าใดๆ นอกเหนือจาก JSON:
{
  "overallScore": 7.5,
  "maxScore": 10,
  "ruleScore": 2.5,
  "ruleMaxScore": 3.0,
  "ruleFeedback": "คำอธิบายประเมินการตั้งหลักกฎหมาย",
  "appScore": 3.5,
  "appMaxScore": 5.0,
  "appFeedback": "คำอธิบายประเมินการปรับบทข้อเท็จจริง",
  "concScore": 1.5,
  "concMaxScore": 2.0,
  "concFeedback": "คำอธิบายประเมินการฟันธงสรุปผล",
  "strengths": ["จุดเด่นข้อที่ 1", "จุดเด่นข้อที่ 2"],
  "improvements": ["จุดที่ควรปรับปรุงข้อที่ 1", "จุดที่ควรปรับปรุงข้อที่ 2"],
  "recommendedPhrasing": "ตัวอย่างการเกลาสำนวนการเขียนตอบให้สละสลวยและได้คะแนนดีขึ้น"
}`;

    const userContent = `[ข้อเท็จจริงของโจทย์]:
${facts || 'ไม่มีข้อเท็จจริง'}

[คำถามวินิจฉัย]:
${prompt || 'ให้วินิจฉัย'}

[ธงคำตอบมาตรฐาน]:
${officialAnswer || 'ไม่มีธงคำตอบ'}

[ประเด็นสำคัญที่ต้องจับให้ได้ (Key Issues)]:
${Array.isArray(keyIssues) ? keyIssues.join('\n- ') : (keyIssues || 'ไม่มี')}

[คำตอบของผู้เข้าสอบ]:
${userDraft}`;

    // 4. Call Gemini REST API (gemini-2.5-flash or gemini-1.5-flash)
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${effectiveApiKey}`;

    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemInstruction}\n\n${userContent}` }]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json'
        }
      })
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('Gemini API Error:', errText);
      return NextResponse.json({
        error: `เกิดข้อผิดพลาดในการเรียกใช้ Gemini API: ${geminiRes.status} ${geminiRes.statusText}`,
        details: errText
      }, { status: 502 });
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      throw new Error('ไม่ได้รับข้อมูลผลลัพธ์จาก AI');
    }

    let parsedResult;
    try {
      parsedResult = JSON.parse(rawText.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim());
    } catch (e) {
      console.error('Failed to parse AI JSON:', rawText);
      return NextResponse.json({ error: 'ไม่สามารถประมวลผลคำตอบจาก AI ได้', rawText }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      evaluation: parsedResult
    });

  } catch (error: any) {
    console.error('Evaluate Answer Error:', error);
    return NextResponse.json({
      error: error.message || 'เกิดข้อผิดพลาดภายในระบบ'
    }, { status: 500 });
  }
}
