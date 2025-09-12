// App.jsx — Ready-to-run single-file React voice assistant for Copilot Studio
// Instructions: paste this file into a Vite React app (src/App.jsx) and follow the run steps I give in chat.

import React, { useEffect, useRef, useState } from 'react';
import { DirectLine } from 'botframework-directlinejs';

// ======= CONFIG =======
// Replace this with the Copilot Studio 'Direct Line' token URL you have.
// Example: const COPILOT_TOKEN_URL = 'https://copilot-something.mscrm.../token'
const COPILOT_TOKEN_URL = 'https://7f700e69bd00e2339f9c628d67c458.04.environment.api.powerplatform.com/powervirtualagents/botsbyschema/cr016_childAgent1/directline/token?api-version=2022-03-01-preview';

// Optional: language for speech recognition and synthesis
const LOCALE = 'en-US';

// =======================

export default function App() {
  const [messages, setMessages] = useState([]); // {id, from, text}
  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState('idle');
  const directLineRef = useRef(null);
  const userIdRef = useRef(`user_${Math.floor(Math.random() * 1000000)}`);
  const recognitionRef = useRef(null);
  const lastUserMessageRef = useRef(''); // To store the last user query to prevent echo.

  useEffect(() => {
    // Initialize speech recognition if available
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const r = new SpeechRecognition();
      r.lang = LOCALE;
      r.interimResults = false;
      r.maxAlternatives = 1;
      r.onresult = (ev) => {
        const transcript = ev.results[0][0].transcript;
        pushMessage({ from: 'user', text: transcript });
        lastUserMessageRef.current = transcript;
        sendToBot(transcript);
      };
      r.onerror = (e) => {
        console.error('Speech recognition error', e);
        setStatus('recognition-error');
        setListening(false);
      };
      r.onend = () => {
        setListening(false);
        setStatus('idle');
      };
      recognitionRef.current = r;
    } else {
      console.warn('SpeechRecognition API not available');
    }

    // Clean up on unmount
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.onresult = null; recognitionRef.current.onend = null; } catch(e){}
      }
      if (directLineRef.current) {
        try { directLineRef.current.end(); } catch(e){}
      }
    };
  }, []);

  useEffect(() => {
    // initialize DirectLine when component mounts
    initDirectLine();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pushMessage(msg) {
    setMessages(m => [...m, { id: Date.now() + Math.random(), ...msg }]);
  }

  async function initDirectLine() {
    setStatus('fetching-token');
    try {
      if (!COPILOT_TOKEN_URL || COPILOT_TOKEN_URL.includes('PASTE_YOUR')) {
        setStatus('need-token-url');
        console.error('Please set COPILOT_TOKEN_URL at top of file.');
        return;
      }

      // The Copilot "Direct Line token URL" (from Copilot Studio) usually returns JSON like { token, conversationId }
      const tokenResp = await fetch("/api/directline/token");
      if (!tokenResp.ok) throw new Error(`token fetch failed: ${tokenResp.status}`);
      //p-const tokJson = await tokenResp.json();
      //p-const token = tokJson.token || tokJson.accessToken || tokJson.value || tokJson.directLineToken;
      //p-if (!token) throw new Error('Token not found in token endpoint response');
      const tokJson = await tokenResp.json();
      console.log("Token response from backend:", tokJson);   // Debug log

      // Force token extraction
      const token = tokJson.token;
      if (!token) {
      throw new Error('Token not found in token endpoint response: ' + JSON.stringify(tokJson));
      }


      setStatus('connecting-directline');
      const dl = new DirectLine({ token });
      directLineRef.current = dl;

      // Subscribe to activities
      dl.activity$.subscribe(activity => {
        // filter out messages not from bot
        try {
          if (!activity || !activity.type) return;
          if (activity.type === 'message' && activity.from && activity.from.id !== userIdRef.current) {
            let text = activity.text || (activity.channelData && activity.channelData.text);
            if (text) {
              // Check if the bot's message is an echo of the last user message.
              if (text.trim() === lastUserMessageRef.current.trim()) {
                return; // Ignore the message if it's an echo.
              }

              // The fix to remove citations and trailing text.
              const citationIndex = text.indexOf('[');
              if (citationIndex !== -1) {
                text = text.substring(0, citationIndex).trim();
              }

              pushMessage({ from: 'bot', text });
              speakText(text);
            }
          }
        } catch (e) {
          console.error('activity handling error', e);
        }
      }, err => console.error(err));

      setStatus('ready');
    } catch (e) {
      console.error('initDirectLine error', e);
      setStatus('dl-error');
    }
  }

  function sendToBot(text) {
    if (!directLineRef.current) {
      console.warn('DirectLine not initialized');
      pushMessage({ from: 'bot', text: "Sorry — bot not connected." });
      return;
    }

    // Post activity to bot
    directLineRef.current.postActivity({
      from: { id: userIdRef.current, name: 'WebUser' },
      type: 'message',
      text
    }).subscribe(id => {
      // optional: you get back the activity id
    }, err => console.error(err));
  }

  function speakText(text) {
    if (!('speechSynthesis' in window)) {
      console.warn('SpeechSynthesis not available');
      return;
    }
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = LOCALE;
      u.onstart = () => setStatus('speaking');
      u.onend = () => setStatus('idle');
      speechSynthesis.cancel(); // stop any existing speech to avoid overlapping
      speechSynthesis.speak(u);
    } catch (e) {
      console.error('TTS error', e);
    }
  }

  function toggleListening() {
    if (!recognitionRef.current) {
      alert('SpeechRecognition API not supported in this browser. Use Chrome/Edge on desktop or a compatible browser.');
      return;
    }
    if (listening) {
      try { recognitionRef.current.stop(); } catch(e){}
      setListening(false);
      setStatus('idle');
      return;
    }
    try {
      recognitionRef.current.start();
      setListening(true);
      setStatus('listening');
    } catch (e) {
      console.error('start listening failed', e);
      setListening(false);
      setStatus('idle');
    }
  }

  function handleManualSend(e) {
    e.preventDefault();
    const text = e.target.elements.message.value.trim();
    if (!text) return;
    pushMessage({ from: 'user', text });
    lastUserMessageRef.current = text;
    sendToBot(text);
    e.target.reset();
  }

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <h2>Copilot Voice Assistant</h2>
        <div style={styles.status}>Status: <strong>{status}</strong></div>
      </header>

      <main style={styles.chatWrap}>
        <div style={styles.messages}>
          {messages.map(m => (
            <div key={m.id} style={m.from === 'user' ? styles.userMsg : styles.botMsg}>
              <div style={styles.bubble}>{m.text}</div>
            </div>
          ))}
        </div>

        <form onSubmit={handleManualSend} style={styles.form}>
          <input name="message" placeholder="Type or press mic and speak..." style={styles.input} />
          <button type="submit" style={styles.send}>Send</button>
          <button type="button" onClick={toggleListening} style={{...styles.mic, background: listening ? '#b71c1c' : '#1976d2'}}>
            {listening ? 'Stop' : '🎤'}
          </button>
        </form>

        {/*<div style={styles.hint}>Tip: your Copilot token URL must allow CORS for this to work from the browser. If token fetch fails, you'll need a small server proxy to request token server-side.</div>*/}
      </main>
    </div>
  );
}

const styles = {
  app: { fontFamily: 'Inter, Roboto, sans-serif', display: 'flex', flexDirection: 'column', height: '100vh', background: '#f5f7fb' },
  header: { padding: '12px 20px', borderBottom: '1px solid #e0e6ef', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  status: { fontSize: 14, color: '#333' },
  chatWrap: { padding: 20, flex: 1, display: 'flex', flexDirection: 'column' },
  messages: { flex: 1, overflowY: 'auto', paddingBottom: 10 },
  userMsg: { display: 'flex', justifyContent: 'flex-end', margin: '8px 0' },
  botMsg: { display: 'flex', justifyContent: 'flex-start', margin: '8px 0' },
  bubble: { maxWidth: '70%', padding: '10px 14px', borderRadius: 14, background: '#fff', boxShadow: '0 1px 3px rgba(12,20,40,0.06)' },
  form: { display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 },
  input: { flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid #dfe6f0' },
  send: { padding: '10px 14px', borderRadius: 8, border: 'none', background: '#2e7d32', color: '#fff' },
  mic: { padding: '10px 12px', borderRadius: 8, border: 'none', color: '#fff' },
  hint: { marginTop: 12, fontSize: 13, color: '#666' }
};