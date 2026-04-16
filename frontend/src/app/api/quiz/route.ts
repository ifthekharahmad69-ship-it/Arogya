import { NextRequest, NextResponse } from 'next/server';
import { groqFetchWithRetry } from '@/lib/groqKeyManager';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export async function POST(req: NextRequest) {
  try {
    const { topic } = await req.json();

    if (!topic || typeof topic !== 'string' || topic.trim().length < 2) {
      return NextResponse.json(
        { error: 'Please provide a valid health topic (at least 2 characters).' },
        { status: 400 }
      );
    }

    const prompt = `You are a medical health quiz generator for an Indian healthcare app called "Arogya Raksha".

Generate exactly 10 multiple-choice quiz questions about: "${topic.trim()}"

Rules:
- Questions should be medically accurate and educational
- Each question must have exactly 4 options
- Include a clear, informative explanation for each answer
- Questions should range from basic to intermediate difficulty
- Make it relevant to Indian healthcare context where applicable
- Keep language simple and understandable

You MUST respond with ONLY valid JSON in this exact format, no markdown, no code blocks, no extra text:
{
  "categoryName": "Display name for this topic",
  "categoryIcon": "a single relevant emoji",
  "questions": [
    {
      "id": 1,
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Explanation of the correct answer."
    }
  ]
}

correctAnswer is a 0-based index (0, 1, 2, or 3).`;

    const groqResponse = await groqFetchWithRetry(GROQ_API_URL, {
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'You are a medical quiz generator. Respond ONLY with valid JSON. No markdown formatting, no code blocks, no explanatory text before or after the JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 4000,
      response_format: { type: 'json_object' },
    });

    if (!groqResponse.ok) {
      const errText = await groqResponse.text();
      console.error('Groq API error:', errText);
      return NextResponse.json(
        { error: 'Failed to generate quiz. Please try again.' },
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

    // Parse the JSON response
    let quizData;
    try {
      quizData = JSON.parse(content);
    } catch {
      // Try to extract JSON from the response if it has extra text
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        quizData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Invalid JSON response from AI');
      }
    }

    // Validate structure
    if (!quizData.questions || !Array.isArray(quizData.questions) || quizData.questions.length === 0) {
      return NextResponse.json(
        { error: 'AI generated an invalid quiz format. Please try again.' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      categoryName: quizData.categoryName || topic,
      categoryIcon: quizData.categoryIcon || '🧠',
      questions: quizData.questions.map((q: any, idx: number) => ({
        id: idx + 1,
        question: q.question,
        options: q.options,
        correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
        explanation: q.explanation || 'No explanation provided.',
      })),
    });
  } catch (error: any) {
    console.error('Quiz API error:', error);
    return NextResponse.json(
      { error: error.message || 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
