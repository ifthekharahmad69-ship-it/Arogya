"use client";
// ============================================================
// MEDIBOT AI AGENT COMPONENT
// Floating AI chatbot with multilingual voice/text support
// ============================================================

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";

// ─── CONSTANTS ───────────────────────────────────────────────
const LANGUAGES = {
  en: { name: "English", flag: "🇬🇧" },
  te: { name: "తెలుగు", flag: "🇮🇳" },
  hi: { name: "हिंदी", flag: "🇮🇳" },
  ta: { name: "தமிழ்", flag: "🇮🇳" },
  kn: { name: "ಕನ್ನಡ", flag: "🇮🇳" },
  mr: { name: "मराठी", flag: "🇮🇳" },
  bn: { name: "বাংলা", flag: "🇮🇳" },
  bho: { name: "भोजपुरी", flag: "🇮🇳" },
};

const QUICK_ACTIONS = [
  { icon: "📅", label: "Book Appointment", query: "I want to book a doctor appointment" },
  { icon: "💊", label: "Medicine Help", query: "I need medicine suggestions for my symptoms" },
  { icon: "🏥", label: "Nearby Hospitals", query: "Find nearby hospitals for me" },
  { icon: "🧠", label: "Health Quiz", query: "Let's play a health quiz" },
  { icon: "📸", label: "Scan Medicine", query: "I want to scan a medicine" },
  { icon: "🩺", label: "Symptom Check", query: "Check my symptoms" },
];

// ─── STYLES ──────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

  .medibot-container * { box-sizing: border-box; font-family: 'Plus Jakarta Sans', sans-serif; }

  .medibot-fab {
    position: fixed; bottom: 28px; right: 28px; z-index: 9999;
    width: 62px; height: 62px; border-radius: 50%;
    background: linear-gradient(135deg, #00c896, #0095f6);
    border: none; cursor: pointer; box-shadow: 0 4px 24px rgba(0,200,150,0.45);
    display: flex; align-items: center; justify-content: center;
    transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1);
    animation: fabPulse 3s infinite;
  }
  .medibot-fab:hover { transform: scale(1.1); box-shadow: 0 8px 32px rgba(0,200,150,0.6); }
  .medibot-fab.open { transform: rotate(45deg) scale(0.9); background: linear-gradient(135deg, #ff4b6e, #ff6b35); }

  @keyframes fabPulse {
    0%,100% { box-shadow: 0 4px 24px rgba(0,200,150,0.45); }
    50% { box-shadow: 0 4px 32px rgba(0,200,150,0.75), 0 0 0 8px rgba(0,200,150,0.12); }
  }

  .medibot-panel {
    position: fixed; bottom: 105px; right: 28px; z-index: 9998;
    width: 400px; height: 600px;
    background: #0a0e1a; border-radius: 24px;
    border: 1px solid rgba(0,200,150,0.2);
    box-shadow: 0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,200,150,0.1);
    display: flex; flex-direction: column; overflow: hidden;
    transform-origin: bottom right;
    animation: panelIn 0.35s cubic-bezier(0.34,1.56,0.64,1);
  }

  @media (max-width: 480px) {
    .medibot-panel { width: calc(100vw - 16px); right: 8px; bottom: 90px; height: 70vh; }
  }

  @keyframes panelIn {
    from { transform: scale(0.7) translateY(20px); opacity: 0; }
    to { transform: scale(1) translateY(0); opacity: 1; }
  }

  .medibot-header {
    padding: 16px 20px;
    background: linear-gradient(135deg, rgba(0,200,150,0.15), rgba(0,149,246,0.1));
    border-bottom: 1px solid rgba(255,255,255,0.07);
    display: flex; align-items: center; gap: 12px;
  }

  .medibot-avatar {
    width: 40px; height: 40px; border-radius: 50%;
    background: linear-gradient(135deg, #00c896, #0095f6);
    display: flex; align-items: center; justify-content: center;
    font-size: 20px; flex-shrink: 0;
    box-shadow: 0 0 0 2px rgba(0,200,150,0.3), 0 0 16px rgba(0,200,150,0.3);
    animation: avatarGlow 2s infinite alternate;
  }

  @keyframes avatarGlow {
    from { box-shadow: 0 0 0 2px rgba(0,200,150,0.3), 0 0 16px rgba(0,200,150,0.3); }
    to { box-shadow: 0 0 0 3px rgba(0,200,150,0.5), 0 0 24px rgba(0,200,150,0.5); }
  }

  .medibot-header-info { flex: 1; }
  .medibot-title { font-size: 15px; font-weight: 700; color: #fff; margin: 0; }
  .medibot-subtitle { font-size: 11px; color: #00c896; margin: 0; display: flex; align-items: center; gap: 4px; }
  .medibot-online-dot { width: 6px; height: 6px; border-radius: 50%; background: #00c896; animation: blink 1.5s infinite; }
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }

  .lang-selector {
    background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12);
    color: #fff; font-size: 11px; border-radius: 8px; padding: 4px 8px;
    cursor: pointer; outline: none; font-family: 'Plus Jakarta Sans', sans-serif;
  }

  .medibot-messages {
    flex: 1; overflow-y: auto; padding: 16px;
    display: flex; flex-direction: column; gap: 12px;
    scrollbar-width: thin; scrollbar-color: rgba(0,200,150,0.3) transparent;
  }

  .msg-row { display: flex; gap: 8px; align-items: flex-end; }
  .msg-row.user { flex-direction: row-reverse; }

  .msg-avatar-sm {
    width: 28px; height: 28px; border-radius: 50%;
    background: linear-gradient(135deg, #00c896, #0095f6);
    display: flex; align-items: center; justify-content: center;
    font-size: 13px; flex-shrink: 0;
  }

  .msg-bubble {
    max-width: 78%; padding: 10px 14px; border-radius: 16px;
    font-size: 13.5px; line-height: 1.55; word-wrap: break-word;
  }
  .msg-bubble.bot {
    background: rgba(255,255,255,0.06); color: #e8eaf6;
    border-radius: 4px 16px 16px 16px;
    border: 1px solid rgba(255,255,255,0.08);
  }
  .msg-bubble.user {
    background: linear-gradient(135deg, #00c896, #0095f6);
    color: #fff; border-radius: 16px 4px 16px 16px;
  }

  .msg-bubble.bot pre { white-space: pre-wrap; font-family: inherit; margin: 0; }

  .tool-action-card {
    margin-top: 8px; padding: 10px 12px;
    background: rgba(0,200,150,0.1); border: 1px solid rgba(0,200,150,0.25);
    border-radius: 10px; font-size: 12px; color: #00c896;
  }
  .tool-action-card button {
    margin-top: 6px; padding: 5px 12px;
    background: linear-gradient(135deg, #00c896, #0095f6);
    border: none; border-radius: 6px; color: #fff;
    font-size: 12px; cursor: pointer; font-weight: 600;
  }

  .typing-indicator { display: flex; gap: 4px; align-items: center; padding: 6px 2px; }
  .typing-dot {
    width: 7px; height: 7px; border-radius: 50%;
    background: #00c896; animation: typingBounce 1.2s infinite;
  }
  .typing-dot:nth-child(2) { animation-delay: 0.2s; }
  .typing-dot:nth-child(3) { animation-delay: 0.4s; }
  @keyframes typingBounce {
    0%,80%,100% { transform: translateY(0); opacity: 0.4; }
    40% { transform: translateY(-8px); opacity: 1; }
  }

  .quick-actions {
    padding: 10px 16px; display: flex; gap: 7px; flex-wrap: wrap;
    border-top: 1px solid rgba(255,255,255,0.05);
  }
  .quick-action-btn {
    padding: 5px 10px; border-radius: 20px; font-size: 11px;
    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
    color: #ccd; cursor: pointer; white-space: nowrap; transition: all 0.2s;
    display: flex; align-items: center; gap: 4px; font-family: 'Plus Jakarta Sans', sans-serif;
  }
  .quick-action-btn:hover { background: rgba(0,200,150,0.15); border-color: rgba(0,200,150,0.4); color: #fff; }

  .medibot-input-row {
    padding: 12px 16px; display: flex; gap: 8px; align-items: flex-end;
    border-top: 1px solid rgba(255,255,255,0.07);
    background: rgba(0,0,0,0.3);
  }

  .input-actions { display: flex; gap: 6px; align-items: center; }

  .icon-btn {
    width: 36px; height: 36px; border-radius: 10px;
    background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
    color: #aab; font-size: 15px; cursor: pointer;
    display: flex; align-items: center; justify-content: center; transition: all 0.2s;
  }
  .icon-btn:hover { background: rgba(0,200,150,0.15); color: #00c896; border-color: rgba(0,200,150,0.3); }
  .icon-btn.active { background: rgba(255,75,110,0.2); color: #ff4b6e; border-color: rgba(255,75,110,0.4); animation: recordPulse 1s infinite; }
  @keyframes recordPulse { 0%,100%{opacity:1} 50%{opacity:0.5} }

  .medibot-input {
    flex: 1; background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.1); border-radius: 12px;
    color: #fff; font-size: 13.5px; padding: 10px 14px;
    outline: none; resize: none; font-family: 'Plus Jakarta Sans', sans-serif;
    min-height: 40px; max-height: 100px; line-height: 1.5; transition: border-color 0.2s;
  }
  .medibot-input::placeholder { color: rgba(255,255,255,0.3); }
  .medibot-input:focus { border-color: rgba(0,200,150,0.4); background: rgba(255,255,255,0.08); }

  .send-btn {
    width: 40px; height: 40px; border-radius: 12px;
    background: linear-gradient(135deg, #00c896, #0095f6);
    border: none; color: #fff; font-size: 16px; cursor: pointer;
    display: flex; align-items: center; justify-content: center; transition: all 0.2s;
    flex-shrink: 0;
  }
  .send-btn:hover { transform: scale(1.05); box-shadow: 0 4px 16px rgba(0,200,150,0.4); }
  .send-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

  .img-preview {
    position: relative; display: inline-block; margin: 4px 16px 0;
  }
  .img-preview img { width: 60px; height: 60px; border-radius: 8px; object-fit: cover; border: 1px solid rgba(0,200,150,0.3); }
  .img-preview-close {
    position: absolute; top: -6px; right: -6px; width: 18px; height: 18px;
    border-radius: 50%; background: #ff4b6e; border: none; color: #fff;
    font-size: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center;
  }

  .quiz-container {
    background: rgba(0,200,150,0.06); border: 1px solid rgba(0,200,150,0.2);
    border-radius: 14px; padding: 14px; margin-top: 6px;
  }
  .quiz-question { font-size: 13.5px; color: #e8eaf6; font-weight: 600; margin-bottom: 10px; }
  .quiz-option {
    width: 100%; text-align: left; padding: 8px 12px; margin-bottom: 6px;
    background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
    border-radius: 8px; color: #ccd; font-size: 12.5px; cursor: pointer; transition: all 0.2s;
    font-family: 'Plus Jakarta Sans', sans-serif;
  }
  .quiz-option:hover { background: rgba(0,200,150,0.12); border-color: rgba(0,200,150,0.3); color: #fff; }
  .quiz-option.correct { background: rgba(0,200,150,0.2); border-color: #00c896; color: #00c896; }
  .quiz-option.wrong { background: rgba(255,75,110,0.2); border-color: #ff4b6e; color: #ff4b6e; }
  .quiz-progress { font-size: 11px; color: #888; margin-bottom: 8px; }
  .quiz-score { font-size: 13px; color: #00c896; font-weight: 700; text-align: center; padding: 10px; }

  .booking-form {
    background: rgba(0,149,246,0.08); border: 1px solid rgba(0,149,246,0.2);
    border-radius: 14px; padding: 14px; margin-top: 6px;
  }
  .booking-form input, .booking-form select {
    width: 100%; padding: 8px 10px; margin-bottom: 8px;
    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
    border-radius: 8px; color: #fff; font-size: 12.5px; outline: none;
    font-family: 'Plus Jakarta Sans', sans-serif;
  }
  .booking-form input::placeholder { color: rgba(255,255,255,0.3); }
  .booking-form select option { background: #1a1f35; }
  .booking-submit {
    width: 100%; padding: 9px; background: linear-gradient(135deg, #0095f6, #00c896);
    border: none; border-radius: 8px; color: #fff; font-size: 13px;
    font-weight: 600; cursor: pointer; font-family: 'Plus Jakarta Sans', sans-serif;
  }

  .medicine-card {
    background: rgba(255,165,0,0.08); border: 1px solid rgba(255,165,0,0.2);
    border-radius: 10px; padding: 10px; margin-top: 4px;
  }
  .medicine-name { font-size: 14px; font-weight: 700; color: #ffa500; }
  .medicine-info { font-size: 12px; color: #bbc; line-height: 1.6; }
  .disclaimer { font-size: 11px; color: #ff4b6e; margin-top: 6px; padding: 5px 8px; background: rgba(255,75,110,0.1); border-radius: 6px; }

  .nav-notification {
    padding: 10px 14px; background: rgba(0,200,150,0.1);
    border: 1px solid rgba(0,200,150,0.25); border-radius: 10px;
    font-size: 12px; color: #00c896; display: flex; align-items: center; gap: 8px;
  }
`;

// ─── MAIN COMPONENT ──────────────────────────────────────────
export default function MediBotAgent({ userName = "Patient" }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: "bot",
      content: `👋 Hi ${userName}! I'm **MediBot**, your AI medical assistant.\n\nI can help you:\n• 📅 Book appointments\n• 💊 Suggest medicines\n• 🧠 Play health quizzes\n• 📸 Scan medicines & reports\n• 🏥 Find nearby hospitals\n• 🎤 Talk to me in your language!\n\nWhat can I help you with today?`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { language, setLanguage, t } = useLanguage();
  const [isRecording, setIsRecording] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [activeWidget, setActiveWidget] = useState(null);
  const [quizState, setQuizState] = useState(null);
  const [bookingData, setBookingData] = useState({});
  const [unreadCount, setUnreadCount] = useState(0);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!isOpen && messages.length > 1) setUnreadCount((p) => p + 1);
  }, [messages]);

  useEffect(() => {
    if (isOpen) setUnreadCount(0);
  }, [isOpen]);

  // ─── SEND MESSAGE ─────────────────────────────────────────
  const sendMessage = useCallback(
    async (text = input) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      const userMsg = {
        id: Date.now(),
        role: "user",
        content: trimmed,
        timestamp: new Date(),
        image: imagePreview,
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setIsLoading(true);

      const imageBase64 = uploadedImage;
      setUploadedImage(null);
      setImagePreview(null);

      try {
        const history = messages
          .filter((m) => m.role !== "system")
          .slice(-10)
          .map((m) => ({ role: m.role === "bot" ? "assistant" : "user", content: m.content }));

        history.push({ role: "user", content: trimmed });

        const res = await fetch("/api/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "chat",
            messages: history,
            language,
            userName,
            imageBase64,
            imageType: "jpeg",
          }),
        });

        const data = await res.json();
        if (!data.success) throw new Error(data.error);

        let widgetData = null;
        if (data.toolResults?.length > 0) {
          for (const tr of data.toolResults) {
            const action = tr.result?.ui_action;
            if (action === "navigate" || action === "navigate_with_filter") {
              router.push(tr.result.url || "/dashboard");
            } else if (action === "open_quiz") {
              await startQuiz(tr.result.data);
            } else if (action === "open_booking_form") {
              setActiveWidget("booking");
              setBookingData(tr.result.data || {});
            } else if (action === "show_image_analysis" && imageBase64) {
              widgetData = { type: "requesting_image" };
            }
          }
        }

        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            role: "bot",
            content: data.content,
            timestamp: new Date(),
            toolResults: data.toolResults,
            widgetData,
          },
        ]);
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            role: "bot",
            content: `⚠️ Sorry, I encountered an error: ${err.message}. Please try again.`,
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, messages, language, userName, uploadedImage, imagePreview, router]
  );

  // ─── VOICE INPUT ──────────────────────────────────────────
  const toggleVoice = () => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      alert("Speech recognition not supported in this browser.");
      return;
    }
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    const langMap = { en: "en-IN", te: "te-IN", hi: "hi-IN", ta: "ta-IN", kn: "kn-IN", ml: "ml-IN", mr: "mr-IN", bn: "bn-IN", bho: "hi-IN" };
    recognition.lang = langMap[language] || "en-IN";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setInput(transcript);
      setIsRecording(false);
      // AUTO-SEND FEATURE
      setTimeout(() => sendMessage(transcript), 500);
    };
    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);
    recognition.start();
    setIsRecording(true);
  };

  // ─── TEXT TO SPEECH ───────────────────────────────────────
  const speakText = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.replace(/[*#]/g, ""));
    const langMap = { en: "en-IN", te: "te-IN", hi: "hi-IN", ta: "ta-IN", kn: "kn-IN", ml: "ml-IN", mr: "mr-IN", bn: "bn-IN", bho: "hi-IN" };
    utterance.lang = langMap[language] || "en-IN";
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  // ─── IMAGE UPLOAD ─────────────────────────────────────────
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setUploadedImage(ev.target.result.split(",")[1]);
      setImagePreview(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  // ─── QUIZ FLOW ────────────────────────────────────────────
  const startQuiz = async (config) => {
    setActiveWidget("quiz");
    setIsLoading(true);
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "quiz",
          language,
          quizConfig: {
            topic: config?.topic || "general_health",
            difficulty: config?.difficulty || "medium",
            numQuestions: config?.num_questions || 5,
          },
        }),
      });
      const data = await res.json();
      if (data.questions?.length) {
        setQuizState({ questions: data.questions, current: 0, score: 0, answered: null, finished: false });
        setMessages((prev) => [
          ...prev,
          { id: Date.now(), role: "bot", content: "🧠 **Health Quiz started!** Answer below 👇", timestamp: new Date(), isQuizStart: true },
        ]);
      }
    } catch {}
    setIsLoading(false);
  };

  const handleQuizAnswer = (option) => {
    if (!quizState || quizState.answered !== null) return;
    const current = quizState.questions[quizState.current];
    const correct = option.startsWith(current.correct);
    const newScore = correct ? quizState.score + 1 : quizState.score;
    setQuizState((prev) => ({ ...prev, answered: option, score: newScore }));
    setTimeout(() => {
      const nextIdx = quizState.current + 1;
      if (nextIdx >= quizState.questions.length) {
        setQuizState((prev) => ({ ...prev, finished: true, score: newScore }));
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(), role: "bot",
            content: `🎉 Quiz complete! You scored **${newScore}/${quizState.questions.length}**!\n${newScore >= quizState.questions.length * 0.7 ? "Excellent health knowledge! 🌟" : "Keep learning about health! 📚"}`,
            timestamp: new Date(),
          },
        ]);
        setActiveWidget(null);
        setQuizState(null);
      } else {
        setQuizState((prev) => ({ ...prev, current: nextIdx, answered: null }));
      }
    }, 1500);
  };

  // ─── BOOKING SUBMIT ───────────────────────────────────────
  const handleBookingSubmit = () => {
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(), role: "bot",
        content: `✅ Appointment booked!\n📋 **${bookingData.specialty || "General"}**\n📅 ${bookingData.date || "TBD"} at ${bookingData.time || "TBD"}\n👤 Patient: ${bookingData.patient_name || userName}\n\nYou'll receive a confirmation shortly.`,
        timestamp: new Date(),
      },
    ]);
    setActiveWidget(null);
    router.push("/dashboard/appointments");
  };

  // ─── RENDER MESSAGE ───────────────────────────────────────
  const renderMessage = (msg) => {
    const isBot = msg.role === "bot";
    return (
      <div key={msg.id} className={`msg-row ${isBot ? "bot" : "user"}`}>
        {isBot && <div className="msg-avatar-sm">🤖</div>}
        <div>
          <div className={`msg-bubble ${isBot ? "bot" : "user"}`}>
            {msg.image && (
              <img src={msg.image} alt="uploaded" style={{ width: "100%", borderRadius: 8, marginBottom: 6, maxHeight: 150, objectFit: "cover" }} />
            )}
            <pre style={{ margin: 0, fontFamily: "inherit", whiteSpace: "pre-wrap", fontSize: "inherit" }}>
              {msg.content?.replace(/\*\*(.*?)\*\*/g, "$1")}
            </pre>
            {msg.toolResults?.map((tr, i) => {
              const r = tr.result;
              if (r?.ui_action === "navigate" || r?.ui_action === "navigate_with_filter") {
                return <div key={i} className="nav-notification">🗺️ Navigating to {r.page || r.url}...</div>;
              }
              if (r?.ui_action === "show_medicine_suggestions") {
                return (
                  <div key={i} className="medicine-card">
                    <div className="medicine-name">💊 Symptoms: {r.data?.symptoms?.join(", ")}</div>
                    <div className="medicine-info">Severity: {r.data?.severity}</div>
                    <div className="disclaimer">⚠️ Always consult a licensed doctor before taking any medication.</div>
                  </div>
                );
              }
              return null;
            })}
          </div>
          {isBot && (
            <button onClick={() => speakText(msg.content)} style={{ background: "none", border: "none", color: "#555", fontSize: 12, cursor: "pointer", padding: "2px 4px", marginTop: 2 }} title="Read aloud">
              🔊
            </button>
          )}
        </div>
      </div>
    );
  };

  // ─── RENDER QUIZ ──────────────────────────────────────────
  const renderQuiz = () => {
    if (!quizState || quizState.finished) return null;
    const q = quizState.questions[quizState.current];
    return (
      <div className="quiz-container">
        <div className="quiz-progress">Question {quizState.current + 1}/{quizState.questions.length} • Score: {quizState.score}</div>
        <div className="quiz-question">{q.question}</div>
        {q.options.map((opt) => {
          let cls = "quiz-option";
          if (quizState.answered !== null) {
            if (opt.startsWith(q.correct)) cls += " correct";
            else if (opt === quizState.answered && !opt.startsWith(q.correct)) cls += " wrong";
          }
          return <button key={opt} className={cls} onClick={() => handleQuizAnswer(opt)} disabled={quizState.answered !== null}>{opt}</button>;
        })}
        {quizState.answered !== null && <div style={{ fontSize: 12, color: "#aab", marginTop: 8 }}>💡 {q.explanation}</div>}
      </div>
    );
  };

  // ─── RENDER BOOKING ───────────────────────────────────────
  const renderBookingForm = () => {
    if (activeWidget !== "booking") return null;
    const specialties = ["General Physician", "Cardiologist", "Dermatologist", "Orthopedic", "Pediatrician", "Neurologist", "ENT Specialist", "Gynecologist", "Ophthalmologist", "Psychiatrist"];
    return (
      <div className="booking-form">
        <div style={{ fontSize: 14, fontWeight: 700, color: "#0095f6", marginBottom: 10 }}>📅 Book Appointment</div>
        <input placeholder="Your name" defaultValue={userName} onChange={(e) => setBookingData((p) => ({ ...p, patient_name: e.target.value }))} />
        <select defaultValue={bookingData.specialty || ""} onChange={(e) => setBookingData((p) => ({ ...p, specialty: e.target.value }))}>
          <option value="" disabled>Select Specialty</option>
          {specialties.map((s) => <option key={s}>{s}</option>)}
        </select>
        <input type="date" min={new Date().toISOString().split("T")[0]} onChange={(e) => setBookingData((p) => ({ ...p, date: e.target.value }))} />
        <input type="time" onChange={(e) => setBookingData((p) => ({ ...p, time: e.target.value }))} />
        <input placeholder="Reason for visit" onChange={(e) => setBookingData((p) => ({ ...p, reason: e.target.value }))} />
        <button className="booking-submit" onClick={handleBookingSubmit}>Confirm Booking ✓</button>
        <button onClick={() => setActiveWidget(null)} style={{ width: "100%", padding: 8, background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#888", fontSize: 12, cursor: "pointer", marginTop: 6 }}>Cancel</button>
      </div>
    );
  };

  // ─── RENDER ───────────────────────────────────────────────
  return (
    <>
      <style>{styles}</style>
      <div className="medibot-container">
        <button className={`medibot-fab ${isOpen ? "open" : ""}`} onClick={() => setIsOpen(!isOpen)} title="MediBot AI Assistant">
          {isOpen ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          ) : (
            <span style={{ fontSize: 26 }}>🤖</span>
          )}
          {!isOpen && unreadCount > 0 && (
            <span style={{ position: "absolute", top: -4, right: -4, background: "#ff4b6e", color: "#fff", fontSize: 10, fontWeight: 700, width: 18, height: 18, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {isOpen && (
          <div className="medibot-panel">
            <div className="medibot-header">
              <div className="medibot-avatar">🤖</div>
              <div className="medibot-header-info">
                <div className="medibot-title">MediBot AI</div>
                <div className="medibot-subtitle">
                  <span className="medibot-online-dot" />
                  Powered by Groq • Always available
                </div>
              </div>
              <select className="lang-selector" value={language} onChange={(e) => setLanguage(e.target.value)}>
                {Object.entries(LANGUAGES).map(([code, { name, flag }]) => (
                  <option key={code} value={code}>{flag} {name}</option>
                ))}
              </select>
            </div>

            <div className="medibot-messages">
              {messages.map(renderMessage)}
              {quizState && !quizState.finished && renderQuiz()}
              {activeWidget === "booking" && renderBookingForm()}
              {isLoading && (
                <div className="msg-row bot">
                  <div className="msg-avatar-sm">🤖</div>
                  <div className="msg-bubble bot">
                    <div className="typing-indicator">
                      <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {messages.length <= 2 && (
              <div className="quick-actions">
                {QUICK_ACTIONS.map((qa) => (
                  <button key={qa.label} className="quick-action-btn" onClick={() => sendMessage(qa.query)}>
                    {qa.icon} {qa.label}
                  </button>
                ))}
              </div>
            )}

            {imagePreview && (
              <div className="img-preview" style={{ padding: "4px 16px 0" }}>
                <img src={imagePreview} alt="preview" />
                <button className="img-preview-close" onClick={() => { setImagePreview(null); setUploadedImage(null); }}>✕</button>
              </div>
            )}

            <div className="medibot-input-row">
              <div className="input-actions">
                <button className="icon-btn" onClick={() => fileInputRef.current?.click()} title="Upload image">📸</button>
                <button className={`icon-btn ${isRecording ? "active" : ""}`} onClick={toggleVoice} title={isRecording ? "Stop recording" : "Voice input"}>
                  {isRecording ? "⏹" : "🎤"}
                </button>
              </div>
              <textarea
                ref={inputRef}
                className="medibot-input"
                placeholder={`Ask me anything... (${LANGUAGES[language]?.name || "English"})`}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                rows={1}
              />
              <button className="send-btn" onClick={() => sendMessage()} disabled={(!input.trim() && !imagePreview) || isLoading}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2z"/>
                </svg>
              </button>
            </div>

            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageUpload} />
          </div>
        )}
      </div>
    </>
  );
}
