import { NextRequest, NextResponse } from 'next/server';
import { getGroqKeyManager } from '@/lib/groqKeyManager';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { image } = body; // base64 image data

    if (!image) {
      return NextResponse.json(
        { error: 'Please provide an image of the medicine.' },
        { status: 400 }
      );
    }

    const manager = getGroqKeyManager();

    const prompt = `You are an expert pharmacist AI for the Indian healthcare app "Arogya Raksha".

Analyze this medicine image carefully. Identify the medicine and provide comprehensive details.

You MUST respond with ONLY valid JSON in this exact format:
{
  "identified": true,
  "medicineName": "Full medicine name",
  "genericName": "Generic/salt name",
  "manufacturer": "Manufacturing company",
  "composition": "Complete composition with strengths",
  "form": "tablet" | "syrup" | "capsule" | "injection" | "cream" | "drops",
  "strength": "e.g. 500mg, 250mg/5ml",
  "packSize": "e.g. Strip of 10 tablets",
  "mrp": "Approximate MRP in INR",
  "uses": ["Primary use 1", "Primary use 2", "Primary use 3"],
  "sideEffects": ["Side effect 1", "Side effect 2", "Side effect 3"],
  "dosage": "Recommended dosage instruction",
  "storage": "Storage instructions",
  "warnings": ["Warning 1", "Warning 2"],
  "alternatives": [
    {"name": "Alternative 1", "manufacturer": "Company", "approxPrice": "₹XX"}
  ],
  "category": "e.g. Antibiotic, Analgesic, Antidiabetic",
  "prescriptionRequired": true | false,
  "description": "Brief description of what this medicine does and when it is typically used"
}

If you cannot identify the medicine clearly, set "identified" to false and provide your best guess with a note in description.`;

    // Try vision models with key rotation for maximum reliability
    const visionModels = [
      'meta-llama/llama-4-scout-17b-16e-instruct',
      'llama-3.2-11b-vision-preview',
      'llama-3.2-90b-vision-preview',
    ];

    let groqResponse: Response | null = null;
    let lastError = '';

    // Outer loop: try each key
    for (let keyAttempt = 0; keyAttempt < manager.keyCount; keyAttempt++) {
      const apiKey = manager.getNextKey();

      // Inner loop: try each vision model
      for (const model of visionModels) {
        try {
          const res = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model,
              messages: [
                {
                  role: 'user',
                  content: [
                    { type: 'text', text: prompt },
                    {
                      type: 'image_url',
                      image_url: {
                        url: image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}`,
                      },
                    },
                  ],
                },
              ],
              temperature: 0.2,
              max_tokens: 4000,
            }),
          });

          if (res.ok) {
            manager.reportSuccess(apiKey);
            groqResponse = res;
            console.log(`Medicine scan succeeded with model: ${model}, key: ${apiKey.slice(0, 12)}...`);
            break;
          }

          if (res.status === 429) {
            const retryAfter = res.headers.get('retry-after');
            manager.reportRateLimit(apiKey, retryAfter ? parseInt(retryAfter) * 1000 : 60000);
            console.warn(`Scan: Key ${apiKey.slice(0, 12)}... rate-limited on ${model}. Rotating key...`);
            break; // Break inner loop to try next key
          }

          lastError = await res.text();
          console.log(`Model ${model} failed with key ${apiKey.slice(0, 12)}..., trying next model...`);
        } catch (err: any) {
          lastError = err.message;
          console.log(`Model ${model} error: ${err.message}`);
        }
      }

      if (groqResponse) break; // Success, exit outer loop too
    }

    if (!groqResponse) {
      console.error('All vision models and keys failed. Last error:', lastError);
      return NextResponse.json(
        { error: 'No vision model available. Please try again in a moment.' },
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
        throw new Error('Invalid JSON from AI vision model');
      }
    }

    return NextResponse.json(resultData);
  } catch (error: any) {
    console.error('Scan Medicine API error:', error);
    return NextResponse.json(
      { error: error.message || 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
