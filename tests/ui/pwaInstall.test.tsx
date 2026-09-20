import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PwaInstallButton } from '../../src/components/PwaInstallButton';

type MockChoice = { outcome: 'accepted' | 'dismissed' };

function createMockInstallEvent(choice: MockChoice = { outcome: 'accepted' }) {
  const prompt = vi.fn().mockResolvedValue(undefined);
  const userChoice = Promise.resolve(choice);
  return { prompt, userChoice };
}

function dispatchBeforeInstallPrompt(mock: ReturnType<typeof createMockInstallEvent>) {
  const event = new Event('beforeinstallprompt', { cancelable: true });
  Object.assign(event, mock);
  fireEvent(window, event);
  return event;
}

describe('PwaInstallButton', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        onchange: null,
        dispatchEvent: vi.fn()
      }))
    });
  });

  it('permanece oculto cuando el navegador no soporta la instalación (sin evento)', () => {
    render(<PwaInstallButton />);

    expect(screen.queryByRole('button', { name: 'Instalar aplicación' })).not.toBeInTheDocument();
  });

  it('aparece tras capturar el evento beforeinstallprompt y lo cancela (para controlarlo)', () => {
    render(<PwaInstallButton />);

    const event = dispatchBeforeInstallPrompt(createMockInstallEvent());

    expect(event.defaultPrevented).toBe(true);
    expect(screen.getByRole('button', { name: 'Instalar aplicación' })).toBeInTheDocument();
  });

  it('al pulsar instalar invoca prompt() del evento capturado', async () => {
    render(<PwaInstallButton />);
    const mock = createMockInstallEvent();
    dispatchBeforeInstallPrompt(mock);

    fireEvent.click(screen.getByRole('button', { name: 'Instalar aplicación' }));

    expect(mock.prompt).toHaveBeenCalledTimes(1);

    await act(async () => {
      await mock.userChoice;
    });
  });

  it('oculta el botón tras una instalación aceptada', async () => {
    render(<PwaInstallButton />);
    const mock = createMockInstallEvent({ outcome: 'accepted' });
    dispatchBeforeInstallPrompt(mock);

    fireEvent.click(screen.getByRole('button', { name: 'Instalar aplicación' }));

    await act(async () => {
      await mock.userChoice;
      fireEvent(window, new Event('appinstalled'));
    });

    expect(screen.queryByRole('button', { name: 'Instalar aplicación' })).not.toBeInTheDocument();
  });

  it('oculta el botón cuando se recibe appinstalled sin interacción previa', () => {
    render(<PwaInstallButton />);
    dispatchBeforeInstallPrompt(createMockInstallEvent());
    expect(screen.getByRole('button', { name: 'Instalar aplicación' })).toBeInTheDocument();

    act(() => {
      fireEvent(window, new Event('appinstalled'));
    });

    expect(screen.queryByRole('button', { name: 'Instalar aplicación' })).not.toBeInTheDocument();
  });

  it('nunca muestra el botón si la app ya corre instalada (display-mode standalone)', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === '(display-mode: standalone)',
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        onchange: null,
        dispatchEvent: vi.fn()
      }))
    });
    render(<PwaInstallButton />);

    dispatchBeforeInstallPrompt(createMockInstallEvent());

    expect(screen.queryByRole('button', { name: 'Instalar aplicación' })).not.toBeInTheDocument();
  });

  it('oculta el botón tras mostrar el prompt aunque el usuario lo descarte', async () => {
    render(<PwaInstallButton />);
    const mock = createMockInstallEvent({ outcome: 'dismissed' });
    dispatchBeforeInstallPrompt(mock);

    fireEvent.click(screen.getByRole('button', { name: 'Instalar aplicación' }));

    await act(async () => {
      await mock.userChoice;
    });

    // El navegador impone un enfriamiento antes de permitir otro prompt;
    // el estado interno se limpia tras mostrarlo una vez.
    expect(screen.queryByRole('button', { name: 'Instalar aplicación' })).not.toBeInTheDocument();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
});
