import { playChime } from '../services/soundService';

if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((message) => {
    if (message && message.type === 'PLAY_AUDIO') {
      const soundType = message.payload?.type || 'complete';
      const volume = message.payload?.volume ?? 0.8;
      playChime(soundType, volume);
    }
  });
}
