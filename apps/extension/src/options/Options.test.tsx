import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { setupChromeMock } from '../../../../tests/mocks/chrome';
import { Options } from './Options';

describe('Options UI - Website Management Component', () => {
  beforeEach(() => {
    setupChromeMock();
  });

  it('renders blocked websites list for the active profile', async () => {
    render(<Options />);

    // Wait for hydration and heading
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /blocked websites/i })).toBeDefined();
    });

    // Default Deep Work profile has YouTube, Instagram, etc.
    await waitFor(() => {
      expect(screen.getByLabelText('Remove youtube.com')).toBeDefined();
      expect(screen.getByLabelText('Remove instagram.com')).toBeDefined();
      expect(screen.getByLabelText('Remove reddit.com')).toBeDefined();
    });
  });

  it('adds and normalizes a new blocked domain', async () => {
    render(<Options />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /blocked websites/i })).toBeDefined();
    });

    const input = screen.getByPlaceholderText(/e\.g\. youtube\.com/i);
    const addBtn = screen.getByRole('button', { name: /add website/i });

    // Enter a URL with protocol and path
    fireEvent.change(input, { target: { value: 'https://www.twitch.tv/directory?filter=live' } });
    fireEvent.click(addBtn);

    // Verify it normalized to twitch.tv and added to the list
    await waitFor(() => {
      expect(screen.getByLabelText('Remove twitch.tv')).toBeDefined();
      expect(screen.getByText('Twitch')).toBeDefined();
    });
  });

  it('prevents adding duplicate domains and displays an error', async () => {
    render(<Options />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /blocked websites/i })).toBeDefined();
    });

    const input = screen.getByPlaceholderText(/e\.g\. youtube\.com/i);
    const addBtn = screen.getByRole('button', { name: /add website/i });

    // Try adding youtube.com which is already present
    fireEvent.change(input, { target: { value: 'https://youtube.com' } });
    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
      expect(screen.getByText(/already in your blocked list/i)).toBeDefined();
    });
  });

  it('removes a domain when the delete button is clicked', async () => {
    render(<Options />);

    await waitFor(() => {
      expect(screen.getByLabelText('Remove youtube.com')).toBeDefined();
    });

    const deleteBtn = screen.getByLabelText('Remove youtube.com');
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(screen.queryByLabelText('Remove youtube.com')).toBeNull();
    });
  });
});
