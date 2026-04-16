import { NextRequest } from 'next/server';
import { getGroqKeyManager } from '@/lib/groqKeyManager';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, userName } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Messages are required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const manager = getGroqKeyManager();

    const patientName = userName || 'User';
    const systemMessage = {
      role: 'system',
      content: `You are "Arogya AI", the intelligent healthcare assistant for the Indian healthcare platform "Arogya Raksha".

Your capabilities:
- Answer medical and health questions accurately
- Help analyze symptoms and suggest possible conditions
- Provide general health advice and wellness tips
- Explain medical terms, reports, and test results in simple language
- Suggest when to see a doctor
- Provide information about medicines, their uses, and side effects
- Give diet and lifestyle recommendations
- Discuss mental health and wellness

Important rules:
- Always recommend consulting a qualified doctor for serious symptoms
- Never diagnose definitively — provide possible conditions and advice
- Be empathetic, caring, and professional
- Use simple language, avoid excessive medical jargon
- Consider Indian healthcare context (common diseases, available medicines, local practices)
- Format your responses with clear sections using markdown when helpful (bold, bullet points, etc.)
- Keep responses concise but thorough
- Always include a disclaimer for medical advice

You are speaking with a patient named ${patientName}. Address them by name occasionally. Be warm and professional.`,
    };

    // Try with key rotation (up to all available keys)
    let groqResponse: Response | null = null;
    let lastError = '';

    for (let attempt = 0; attempt < manager.keyCount; attempt++) {
      const apiKey = manager.getNextKey();

      try {
        const res = await fetch(GROQ_API_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [systemMessage, ...messages],
            temperature: 0.7,
            max_tokens: 2000,
            stream: true,
          }),
        });

        if (res.ok) {
          manager.reportSuccess(apiKey);
          groqResponse = res;
          break;
        }

        if (res.status === 429) {
          const retryAfter = res.headers.get('retry-after');
          manager.reportRateLimit(apiKey, retryAfter ? parseInt(retryAfter) * 1000 : 60000);
          console.warn(`Chat: Key ${apiKey.slice(0, 12)}... rate-limited, trying next...`);
          continue;
        }

        lastError = await res.text();
        manager.reportFailure(apiKey);
      } catch (err: any) {
        lastError = err.message;
        manager.reportFailure(apiKey);
      }
    }

    if (!groqResponse) {
      console.error('Chat: All keys failed. Last error:', lastError);
      return new Response(JSON.stringify({ error: 'Failed to get AI response. Please try again.' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Stream the response
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        const reader = groqResponse!.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter(line => line.trim() !== '');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                  controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
                  break;
                }
                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                  }
                } catch {
                  // skip unparseable chunks
                }
              }
            }
          }
        } catch (error) {
          console.error('Stream error:', error);
        } finally {
          controller.close();
          reader.releaseLock();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Chat API error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Something went wrong.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
