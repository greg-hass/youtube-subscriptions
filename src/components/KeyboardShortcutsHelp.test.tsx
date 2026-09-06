import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { KeyboardShortcutsHelp } from './KeyboardShortcutsHelp';

afterEach(() => {
  vi.clearAllMocks();
});

describe('KeyboardShortcutsHelp', () => {
  it('focuses the close control, wraps focus, and restores the opener', () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <>
        <button type="button">Open shortcuts</button>
        <KeyboardShortcutsHelp isOpen={false} onClose={onClose} />
      </>,
    );
    const opener = screen.getByRole('button', { name: 'Open shortcuts' });
    opener.focus();

    rerender(
      <>
        <button type="button">Open shortcuts</button>
        <KeyboardShortcutsHelp isOpen onClose={onClose} />
      </>,
    );

    const dialog = screen.getByRole('dialog', { name: 'Keyboard Shortcuts' });
    const closeButton = screen.getByRole('button', {
      name: 'Close keyboard shortcuts',
    });
    expect(closeButton).toHaveFocus();

    fireEvent.keyDown(closeButton, { key: 'Tab' });
    expect(closeButton).toHaveFocus();
    fireEvent.keyDown(closeButton, { key: 'Tab', shiftKey: true });
    expect(closeButton).toHaveFocus();

    fireEvent.keyDown(closeButton, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();

    rerender(
      <>
        <button type="button">Open shortcuts</button>
        <KeyboardShortcutsHelp isOpen={false} onClose={onClose} />
      </>,
    );
    expect(opener).toHaveFocus();
    expect(dialog).not.toBeInTheDocument();
  });
});
