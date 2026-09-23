import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { setupChromeMock } from '../../../../tests/mocks/chrome';
import { Popup } from './Popup';

describe('Popup UI Component with Phase 2 Timer Engine', () => {
  beforeEach(() => {
    setupChromeMock();
  });

  it('renders presets and updates time display when presets are clicked', async () => {
    render(<Popup />);

    expect(screen.getByText('FocusFlow')).toBeDefined();
    expect(screen.getByText('Ready to focus?')).toBeDefined();
    expect(screen.getByText('25:00')).toBeDefined();

    // Check presets exist
    expect(screen.getByText('15m')).toBeDefined();
    expect(screen.getByText('25m')).toBeDefined();
    expect(screen.getByText('45m')).toBeDefined();
    expect(screen.getByText('60m')).toBeDefined();
    expect(screen.getByText('90m')).toBeDefined();

    // Click 15m preset
    fireEvent.click(screen.getByText('15m'));
    await waitFor(() => {
      expect(screen.getByText('15:00')).toBeDefined();
    });

    // Click 45m preset
    fireEvent.click(screen.getByText('45m'));
    await waitFor(() => {
      expect(screen.getByText('45:00')).toBeDefined();
    });
  });

  it('transitions through start -> pause -> resume -> reset states smoothly', async () => {
    render(<Popup />);

    const startBtn = screen.getByRole('button', { name: /start focus/i });
    expect(startBtn).toBeDefined();

    // 1. Start timer
    fireEvent.click(startBtn);

    // Should now show Pause and Stop buttons
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /pause/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /stop/i })).toBeDefined();
    });

    // 2. Pause timer
    fireEvent.click(screen.getByRole('button', { name: /pause/i }));

    // Should now show Resume and Reset buttons
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /resume/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /reset/i })).toBeDefined();
    });

    // 3. Reset timer back to idle
    fireEvent.click(screen.getByRole('button', { name: /reset/i }));

    // Should return to Start Focus button
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /start focus/i })).toBeDefined();
    });
  });
});
