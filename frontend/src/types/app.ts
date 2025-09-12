// --- application type definitions ---
export type S2SModel = 'gpt-4o-realtime-preview' | 'gpt-4o-mini-realtime-preview' | 'gpt-realtime';
export type TTSVoice = string;
export type S2SPrompt = string;

export interface AppConfig {
  prompt: S2SPrompt;
  s2s: {
    model: S2SModel;
    voice: TTSVoice;
  };
}

// --- chat message ---
export interface Message {
  id: number;
  text: string;
  sender: 'user' | 'bot' | 'error';
  time?: number;
  price?: number;
}