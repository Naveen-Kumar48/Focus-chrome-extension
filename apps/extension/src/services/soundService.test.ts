import { describe, it, expect, vi } from 'vitest';
import { playChime } from './soundService';

describe('Sound Service Synthesizer', () => {
  it('safely attempts to play audio without throwing errors', () => {
    expect(() => playChime('complete')).not.toThrow();
    expect(() => playChime('break')).not.toThrow();
    expect(() => playChime('tick')).not.toThrow();
  });

  it('interacts with AudioContext if available on window', () => {
    const mockOscillator = {
      type: 'sine',
      frequency: { setValueAtTime: vi.fn() },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn()
    };
    const mockGain = {
      gain: {
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn()
      },
      connect: vi.fn()
    };
    const mockAudioContext = vi.fn().mockImplementation(() => ({
      currentTime: 0,
      destination: {},
      createOscillator: vi.fn(() => mockOscillator),
      createGain: vi.fn(() => mockGain)
    }));

    (window as any).AudioContext = mockAudioContext;

    playChime('complete', 0.5);
    expect(mockAudioContext).toHaveBeenCalled();
  });
});
