import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { setupChromeMock } from '../../../../tests/mocks/chrome';
import { Popup } from './Popup';

describe('Popup UI Component', () => {
  beforeEach(() => {
    setupChromeMock();
  });

  it('renders FocusFlow branding, ready prompt, 25:00 timer, start button, and today focus metric', async () => {
    render(<Popup />);

    // Brand title
    expect(screen.getByText('FocusFlow')).toBeDefined();

    // Tagline prompt
    expect(screen.getByText('Ready to focus?')).toBeDefined();

    // 25:00 initial timer display
    expect(screen.getByText('25:00')).toBeDefined();

    // Start Focus button
    expect(screen.getByRole('button', { name: /start focus/i })).toBeDefined();

    // Today's Focus label and initial value
    expect(screen.getByText("Today's Focus")).toBeDefined();
    await waitFor(() => {
      expect(screen.getByText('0 minutes')).toBeDefined();
    });
  });
});
