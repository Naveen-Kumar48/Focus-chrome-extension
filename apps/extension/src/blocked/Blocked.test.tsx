import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { setupChromeMock } from '../../../../tests/mocks/chrome';
import { Blocked } from './Blocked';

describe('Blocked Splash Screen Component', () => {
  beforeEach(() => {
    setupChromeMock();
  });

  it('renders blocked screen with domain pill and return button', async () => {
    // Mock window.location.search
    Object.defineProperty(window, 'location', {
      value: {
        search: '?domain=youtube.com',
        pathname: '/blocked.html'
      },
      writable: true
    });

    render(<Blocked />);

    expect(screen.getByText('This website is currently blocked')).toBeDefined();
    expect(screen.getByText('youtube.com')).toBeDefined();
    expect(screen.getByRole('button', { name: /return to focus/i })).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText(/Remaining in Session/i)).toBeDefined();
    });
  });
});
