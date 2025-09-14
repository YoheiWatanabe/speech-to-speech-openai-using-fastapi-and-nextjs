'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { AppConfig, Message } from '@/types/app';
import { loadConfig, saveConfig } from '@/lib/config';
import { voiceOptions } from '@/types/tts';

// --- main component ---
export default function Home() {
  // --- State management ---
  const [config, setConfig] = useState<AppConfig>(loadConfig);
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isConversationActive, setIsConversationActive] = useState(false);
  const [status, setStatus] = useState({ message: 'Ready', color: '#007bff' });
  const [isLoading, setIsLoading] = useState(false);

  // --- Ref management ---
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const chatBoxRef = useRef<HTMLDivElement>(null);

  // --- userEffect and a helper function ---
  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages]);
  
  const addMessage = useCallback((text: string, sender: Message['sender'], time?: number, price?: number) => {
    setMessages(prev => [...prev, { id: Date.now(), text, sender, time, price }]);
  }, []);

  // --- logic of stopping conversation ---
  const stopConversation = useCallback(() => {
    if (!isConversationActive) return;
    
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    setIsConversationActive(false);
    setStatus({ message: 'Conversation ended.', color: '#6c757d' });
  }, [isConversationActive]);

  // --- logic of starting conversation ---
  const startConversation = useCallback(async () => {
    if (isConversationActive) return;
    setIsConversationActive(true);
    setStatus({ message: 'Initializing...', color: '#ffc107' });


    try {
      // get mic
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      const newPc = new RTCPeerConnection();
      pcRef.current = newPc;

      // add a voice track
      stream.getTracks().forEach(track => newPc.addTrack(track, stream));

      // generate voice
      newPc.ontrack = (event) => {
        const remoteStream = event.streams[0];
        
        // 1. generate AI voice
        const audioEl = document.createElement("audio");
        audioEl.srcObject = remoteStream;
        audioEl.autoplay = true;
        document.body.appendChild(audioEl);

        const audioCtx = new (window.AudioContext)();
        const localSource = audioCtx.createMediaStreamSource(stream);
        const remoteSource = audioCtx.createMediaStreamSource(remoteStream);
        const destination = audioCtx.createMediaStreamDestination();
        localSource.connect(destination);
        remoteSource.connect(destination);

        const mixedStream = destination.stream;
        const recorder = new MediaRecorder(mixedStream, { mimeType: 'audio/webm' });

        recorder.start();
      };

      // DataChannel
      const dc = newPc.createDataChannel("oai-events");
      dataChannelRef.current = dc;
      dc.onopen = () => {
        const initRequest = {
          type: "session.update",
          session: { instructions: config.prompt, voice: config.s2s.voice }
        };
        dc.send(JSON.stringify(initRequest));
      };

      // excution when receiving a message from AI
      dc.onmessage = (event) => {
        const data = JSON.parse(event.data);

        // output a transcript
        if (data.type === 'response.audio_transcript.done') {
          const transcript: string = data.transcript;
          addMessage(transcript, 'bot');
        }
      };

      // --- OpenAI Realtime fetch session ---
      const model: string = config.s2s.model as string;

      const tokenResp = await fetch("/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model })
      });
      const data = await tokenResp.json();
      
      const offer = await newPc.createOffer();
      await newPc.setLocalDescription(offer);
      
      const sdpResp = await fetch(`https://api.openai.com/v1/realtime?model=${model}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${data.client_secret.value}`,
          "Content-Type": "application/sdp"
        },
        body: offer.sdp
      });

      if (!sdpResp.ok) {
        throw new Error(`Signaling server error: ${sdpResp.status}`);
      }
      
      const answer: RTCSessionDescriptionInit = {
        type: "answer",
        sdp: await sdpResp.text()
      };
      await newPc.setRemoteDescription(answer);

      setStatus({ message: "Conversation started via WebRTC", color: "#28a745" });

    } catch (err) {
      console.error("WebRTC Error:", err);
      addMessage("Failed to initialize WebRTC.", "error");
      stopConversation();
    }
  }, [isConversationActive, config, addMessage, stopConversation]);  

  // --- event handlers ---
  const handleMicClick = () => {
    isConversationActive ? stopConversation() : startConversation();
  };

  const handleSendMessage = useCallback(() => {
    if (!userInput.trim()) return;
    addMessage(userInput, 'user');
    setUserInput('');
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 2000);
  }, [userInput, addMessage]);

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    saveConfig(config);
    alert('Saved the setting!');
  };
  
  const handleConfigChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    const keys = name.split('.');
    setConfig(prev => {
      const newConfig = JSON.parse(JSON.stringify(prev));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let currentLevel: any = newConfig;
      for (let i = 0; i < keys.length - 1; i++) {
        currentLevel = currentLevel[keys[i]];
      }
      
      const finalKey = keys[keys.length - 1];

      if (e.target.type === 'range') {
        currentLevel[finalKey] = parseFloat(value);
      } else {
        currentLevel[finalKey] = value;
      }

      return newConfig;
    });
  };

  // --- rendering ---
  const isFormDisabled = isConversationActive;
  const currentVoiceOptions = voiceOptions.openai_realtime;

  return (
    <div className="flex flex-row max-lg:flex-col items-stretch w-full max-w-[1400px] h-[95vh] max-lg:h-screen bg-white rounded-lg max-lg:rounded-none shadow-lg overflow-hidden">
      
      {/* --- center chat container --- */}
      <div className="flex-grow flex flex-col overflow-hidden min-w-0 order-2 max-lg:order-3">
        <div ref={chatBoxRef} className="flex-grow p-5 overflow-y-auto flex flex-col gap-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`max-w-[75%] p-3 px-4 rounded-2xl leading-snug break-words ${
              msg.sender === 'user' ? 'bg-blue-500 text-white self-end rounded-br-md' :
              msg.sender === 'bot' ? 'bg-gray-200 text-gray-800 self-start rounded-bl-md' :
              'bg-red-100 text-red-700 self-start rounded-bl-md'
            }`}>
              <span>{msg.text}</span>
            </div>
          ))}
          {isLoading && (
            <div className="self-start p-4">
              <div className="w-9 h-9 border-4 border-gray-200 border-l-blue-500 rounded-full animate-spin"></div>
            </div>
          )}
        </div>

        <div className="flex p-4 border-t border-gray-200">
          <button onClick={handleMicClick} title="Input voice" className={`border rounded-full w-11 h-11 flex-shrink-0 mr-2.5 cursor-pointer text-xl flex justify-center items-center transition-all 
            ${isConversationActive 
              ? 'bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/50' 
              : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
            }`}>
            🎤
          </button>
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Input a message..."
            className="flex-grow border border-gray-300 rounded-full py-2.5 px-4 text-base outline-none"
            disabled={isFormDisabled}
          />
          <button onClick={handleSendMessage} className="bg-blue-500 text-white border-none rounded-full py-2.5 px-5 ml-2.5 cursor-pointer text-base transition-colors hover:bg-blue-700 disabled:bg-gray-300" disabled={isFormDisabled}>
            Send
          </button>
        </div>
        <div className="px-4 pb-4">
          <div style={{ color: status.color }}>{status.message}</div>
        </div>
      </div>

      {/* --- right panel: settings --- */}
      <div className="flex-[0_0_280px] p-5 border-l border-gray-200 bg-gray-50 flex flex-col order-3 max-lg:flex-auto max-lg:h-auto max-lg:max-h-[40vh] max-lg:border-l-0 max-lg:border-t max-lg:order-2">
        <h2 className="mt-0 mb-4 text-base font-semibold text-center text-gray-800">Settings</h2>
        <form onSubmit={handleFormSubmit} className="flex flex-col flex-grow gap-4">
          <fieldset disabled={isFormDisabled}>
            <div className="flex flex-col gap-2">
              <label htmlFor="s2s.model" className="font-semibold">Model:</label>
              <select id="s2s.model" name="s2s.model" value={config.s2s.model} onChange={handleConfigChange} className="w-full p-2 border rounded-md border-gray-300">
                <option value="gpt-realtime">gpt-realtime</option>
                <option value="gpt-4o-realtime-preview">gpt-4o-realtime-preview</option>
                <option value="gpt-4o-mini-realtime-preview">gpt-4o-mini-realtime-preview</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="s2s.voice" className="font-semibold">Voice:</label>
              <select id="s2s.voice" name="s2s.voice" value={config.s2s.voice} onChange={handleConfigChange} className="w-full p-2 border rounded-md border-gray-300">
                {Object.entries(currentVoiceOptions).map(([value, text]) => (
                  <option key={value} value={value}>{text}</option>
                ))}
              </select>
            </div>
          </fieldset>
          
          <div className="prompt-section flex flex-col flex-grow">
            <h2 className="mt-0 mb-2.5 text-lg text-center font-normal">Prompt</h2>
            <textarea id="prompt" name="prompt" value={config.prompt} onChange={handleConfigChange} placeholder="..." disabled={isFormDisabled} className="flex-grow border border-gray-300 rounded-lg p-2.5 text-sm resize-none outline-none leading-normal min-h-24 disabled:bg-gray-100"></textarea>
          </div>
          <button type="submit" className="bg-blue-500 text-white border-none rounded-md py-2.5 px-4 cursor-pointer text-sm mt-auto hover:bg-blue-700 flex-shrink-0 disabled:bg-gray-300" disabled={isFormDisabled}>
            Save
          </button>
        </form>
      </div>
    </div>
  );
}