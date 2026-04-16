import { NextRequest, NextResponse } from 'next/server';
import { groqFetchWithRetry } from '@/lib/groqKeyManager';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { symptoms, age, gender, bpSystolic, bpDiastolic, isDiabetic, isPregnant } = body;

    if (!symptoms || typeof symptoms !== 'string' || symptoms.trim().length < 2) {
      return NextResponse.json(
        { error: 'Please describe your symptoms (at least 2 characters).' },
        { status: 400 }
      );
    }

    const patientProfile = `
Patient Profile:
- Age: ${age || 'Not specified'}
- Gender: ${gender || 'Not specified'}
- Blood Pressure: ${bpSystolic || '?'}/${bpDiastolic || '?'} mmHg
- Diabetes: ${isDiabetic ? 'Yes' : 'No'}
- Pregnancy: ${isPregnant ? 'Yes (pregnant)' : 'No / Not applicable'}
`;

    const prompt = `You are an expert Indian clinical pharmacologist AI for the healthcare app "Arogya Raksha".

${patientProfile}

The patient reports these symptoms: "${symptoms.trim()}"

Based on the patient's profile and symptoms, recommend appropriate medicines. Consider:
1. Age-appropriate dosages
2. Blood pressure interactions (their BP is ${bpSystolic || '?'}/${bpDiastolic || '?'})
3. Diabetes drug interactions if diabetic
4. Pregnancy-safe alternatives if pregnant
5. Both tablet AND syrup forms when available

You MUST respond with ONLY valid JSON in this exact format:
{
  "diagnosis": "Brief probable diagnosis description",
  "severity": "mild" | "moderate" | "severe",
  "medicines": [
    {
      "name": "Medicine name (generic)",
      "brandName": "Common Indian brand name",
      "form": "tablet" | "syrup" | "injection" | "capsule" | "drops",
      "power": "e.g. 500mg, 250mg/5ml",
      "dosage": "e.g. 1 tablet twice daily",
      "frequency": "e.g. Every 8 hours",
      "duration": "e.g. 5 days",
      "timing": "e.g. After food",
      "purpose": "What this medicine does",
      "warnings": ["Warning 1", "Warning 2"],
      "contraindications": ["If applicable based on patient profile"]
    }
  ],
  "generalAdvice": ["Advice 1", "Advice 2"],
  "whenToSeeDoctor": "When the patient should visit a doctor urgently",
  "disclaimer": "This is AI-generated advice. Always consult a qualified doctor before taking any medicine."
}

Recommend 3-5 medicines. Include both tablet and syrup options when relevant. Use Indian brand names. Be specific with dosages considering the patient's age and conditions.`;

    const groqResponse = await groqFetchWithRetry(GROQ_API_URL, {
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are a clinical pharmacologist AI. Respond ONLY with valid JSON. No markdown, no code blocks. Always include safety warnings and contraindications.'
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 4000,
      response_format: { type: 'json_object' },
    });

    if (!groqResponse.ok) {
      const errText = await groqResponse.text();
      console.error('Groq API error:', errText);
      return NextResponse.json(
        { error: 'Failed to analyze symptoms. Please try again.' },
        { status: 502 }
      );
    }

    const groqData = await groqResponse.json();
    const content = groqData.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: 'No response from AI. Please try again.' },
        { status: 502 }
      );
    }

    let resultData;
    try {
      resultData = JSON.parse(content);
    } catch {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        resultData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Invalid JSON from AI');
      }
    }

    return NextResponse.json(resultData);
  } catch (error: any) {
    console.error('Symptoms API error:', error);
    return NextResponse.json(
      { error: error.message || 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
