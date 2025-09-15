// src/App.jsx
import React, { useEffect, useRef, useState } from "react";
import { DirectLine } from "botframework-directlinejs";
//import logo from './assets/logo.jpg'; 
import logo from './assets/logo.png'; 
import "./custom.css"

const COPILOT_TOKEN_URL = "/api/directline/token";
const LOCALE = "en-US";

export default function App() {
  const [messages, setMessages] = useState([]);
  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState("idle");
  const [theme, setTheme] = useState("light");
  const [botTyping, setBotTyping] = useState(false);

  const directLineRef = useRef(null);
  const userIdRef = useRef(`user_${Math.floor(Math.random() * 1000000)}`);
  const recognitionRef = useRef(null);
  const lastUserMessageRef = useRef("");
  const messagesEndRef = useRef(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Speech recognition
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const r = new SpeechRecognition();
    r.lang = LOCALE;
    r.interimResults = false;
    r.maxAlternatives = 1;

    r.onresult = (ev) => {
      const transcript = ev.results[0][0].transcript;
      pushMessage({ from: "user", text: transcript });
      lastUserMessageRef.current = transcript;
      sendToBot(transcript);
    };
    r.onerror = () => {
      setStatus("recognition-error");
      setListening(false);
    };
    r.onend = () => {
      setListening(false);
      setStatus("idle");
    };

    recognitionRef.current = r;
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
      }
    };
  }, []);

  // DirectLine init
  useEffect(() => {
    initDirectLine();
    return () => {
      try {
        if (directLineRef.current?.end) directLineRef.current.end();
      } catch {}
    };
  }, []);

  function pushMessage(msg) {
    setMessages((prev) => [...prev, { id: Date.now() + Math.random(), ...msg }]);
  }

  async function initDirectLine() {
    setStatus("fetching-token");
    try {
      const resp = await fetch(COPILOT_TOKEN_URL);
      const data = await resp.json();
      const dl = new DirectLine({ token: data.token });
      directLineRef.current = dl;

      dl.activity$.subscribe((activity) => {
        if (!activity || activity.type !== "message") return;
        if (activity.from?.id === userIdRef.current) return;

        setBotTyping(true);
        let text = activity.text || activity.channelData?.text || "";
        if (text.trim() === lastUserMessageRef.current?.trim()) return;

        const citationIndex = text.indexOf("[");
        if (citationIndex !== -1) text = text.substring(0, citationIndex).trim();

        setTimeout(() => {
          pushMessage({ from: "bot", text });
          speakText(text);
          setBotTyping(false);
        }, 500); // small delay for realism
      });

      setStatus("ready");
    } catch (err) {
      console.error(err);
      setStatus("dl-error");
    }
  }

  function sendToBot(text) {
    if (!directLineRef.current) {
      pushMessage({ from: "bot", text: "Sorry — bot not connected." });
      return;
    }
    directLineRef.current
      .postActivity({
        from: { id: userIdRef.current, name: "WebUser" },
        type: "message",
        text,
      })
      .subscribe(
        () => {},
        (err) => console.error(err)
      );
  }

  function speakText(text) {
    if (!("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = LOCALE;
    u.onstart = () => setStatus("speaking");
    u.onend = () => setStatus("idle");
    try { speechSynthesis.cancel(); } catch {}
    speechSynthesis.speak(u);
  }

  function toggleListening() {
    if (!recognitionRef.current) return;
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
      setStatus("idle");
    } else {
      recognitionRef.current.start();
      setListening(true);
      setStatus("listening");
    }
  }

  function handleManualSend(e) {
    e.preventDefault();
    const text = e.target.elements.message.value.trim();
    if (!text) return;
    pushMessage({ from: "user", text });
    lastUserMessageRef.current = text;
    sendToBot(text);
    e.target.reset();
  }

  return (
    <div className={`min-h-screen flex flex-col
      ${theme === "light" ? "bg-gradient-to-b from-gray-50 to-gray-100" : "bg-gradient-to-b from-gray-900 to-black"}
    `}>
      {/* Header */}
      <header className={`bottom-frm-bg sticky top-0 z-20 flex items-center justify-between px-4 py-3
        ${theme === "light" ? "bg-white/80" : "bg-gray-900/80"} backdrop-blur-md border-b
      `}>
        <div className="flex items-center gap-3">
          <img src={logo} alt="logo" className="w-8 h-8 rounded-md shadow-sm" />
          <div className="flex flex-col">
            <span className={`ttl-head text-sm font-semibold ${theme === "light" ? "text-gray-800" : "text-gray-100"}`}>
              Copilot Voice Assistant
            </span>
            <span className="text-xs text-gray-400">{status === "ready" ? "Ready" : status}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="dark-btn px-3 py-1 rounded-md border text-sm bg-transparent hover:bg-gray-200/30 transition"
            aria-label="Toggle theme"
          >
            {theme === "light" ? "🌙 Dark" : "☀️ Light"}
          </button>
        </div>
      </header>

      {/* Messages area */}
      <main className="main-gradient-bg flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
            <div className={` rounded-2xl px-4 py-2 max-w-[80%] text-sm shadow transform transition-all
              ${m.from === "user"
                ? "user-msg-dsn bg-emerald-600 text-white rounded-br-none hover:scale-105"
                : theme === "light"
                  ? "bg-white text-gray-900 border rounded-bl-none hover:scale-105"
                  : "bg-gray-800 text-gray-100 rounded-bl-none hover:scale-105"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {botTyping && (
          <div className="flex justify-start">
            <div className={`rounded-2xl px-4 py-2 max-w-[40%] text-sm shadow
              ${theme === "light" ? "bg-white" : "bg-gray-800"}`}
            >
              <div className="flex gap-1">
                <span className="animate-bounce">•</span>
                <span className="animate-bounce delay-150">•</span>
                <span className="animate-bounce delay-300">•</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* Input area */}
      <form
        onSubmit={handleManualSend}
        className={`bottom-frm-bg sticky bottom-0 z-20 px-4 py-3
          ${theme === "light" ? "bg-white/90" : "bg-gray-900/90"} border-t backdrop-blur-md
        `}
      >
        <div className="max-w-4xl mx-auto flex items-center gap-2">
          <input
            name="message"
            className={`flex-1 rounded-full px-4 py-2 text-sm focus:outline-none
              ${theme === "light" ? "bg-gray-100 text-gray-900" : "bg-gray-800 text-gray-100"}`}
            placeholder="Type or press mic and speak..."
          />
          <button
            type="button"
            onClick={toggleListening}
            className={`mic-red px-3 py-2 rounded-full text-white transition transform active:scale-95
              ${listening ? "bg-red-600 hover:bg-red-700" : "mic-red bg-blue-600 hover:bg-blue-700"}`}
          >
            {listening ? "Stop" : "🎤"}
          </button>
          <button
            type="submit"
            className="snd-green px-4 py-2 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 transition transform active:scale-95"
          >
            Send
          </button>
          
        </div>
      </form>
    </div>
  );
}
