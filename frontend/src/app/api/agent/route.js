import { NextResponse } from "next/server";
import { runMedicalAgent, generateHealthQuiz, analyzeMedicalImage } from "@/lib/groqAgent";

export async function POST(request) {
  try {
    const body = await request.json();
    const { type, messages, language, userName, imageBase64, imageType, quizConfig } = body;

    switch (type) {
      case "chat": {
        const result = await runMedicalAgent({
          messages,
          language: language || "en",
          userName: userName || "Patient",
          imageBase64: imageBase64 || null,
          imageType: imageType || "jpeg",
        });
        return NextResponse.json({ success: true, ...result });
      }

      case "quiz": {
        const questions = await generateHealthQuiz({
          topic: quizConfig?.topic || "general_health",
          difficulty: quizConfig?.difficulty || "medium",
          numQuestions: quizConfig?.numQuestions || 5,
          language: language || "en",
        });
        return NextResponse.json({ success: true, questions });
      }

      case "analyze_image": {
        const analysis = await analyzeMedicalImage({
          imageBase64,
          imageType: imageType || "prescription",
          analysisType: imageType || "prescription",
          language: language || "en",
        });
        return NextResponse.json({ success: true, analysis });
      }

      default:
        return NextResponse.json({ error: "Invalid request type" }, { status: 400 });
    }
  } catch (error) {
    console.error("Agent API Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
