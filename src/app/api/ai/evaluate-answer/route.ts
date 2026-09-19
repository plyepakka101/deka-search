import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { facts, prompt, officialAnswer, userDraft, keyIssues, apiKey: clientApiKey } = body;

    if (!userDraft || !userDraft.trim()) {
      return NextResponse.json({ error: 'กรุณาพิมพ์คำตอบก่อนขอรับการประเมินจาก AI' }, { status: 400 });
    }

    const apiKey = clientApiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        error: 'กรุณาระบุ Gemini API Key ในการตั้งค่าหรือในกล่องข้อความ เพื่อเปิดใช้งานระบบ AI ตรวจคำตอบ',
        requiresApiKey: true
      }, { status: 401 });
    }

    // Build specialized Thai legal evaluation prompt
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

    // Call Gemini REST API (gemini-2.5-flash or gemini-1.5-flash)
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

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
