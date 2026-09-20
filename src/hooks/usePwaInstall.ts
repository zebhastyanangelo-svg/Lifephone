import { useCallback, useEffect, useState } from 'react';

/**
 * Evento nativo `beforeinstallprompt` del navegador. No forma parte de las
 * definiciones estándar de DOM (aún es no-estándar, soportado por Chromium),
 * por eso se declara aquí.
 */
export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

function detectInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia?.('(display-mode: standalone)').matches) return true;
  return (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export type PwaInstallState = {
  /** true cuando el navegador ofreció instalar y la app aún no está instalada. */
  canInstall: boolean;
  /** true cuando la app ya corre como PWA instalada (o acaba de instalarse). */
  isInstalled: boolean;
  /** Dispara el prompt nativo. Devuelve true si el usuario aceptó. */
  promptInstall: () => Promise<boolean>;
};

/**
 * Captura el evento global `beforeinstallprompt` para ofrecer la instalación
 * manual de la PWA, y limpia el estado cuando llega `appinstalled` o cuando la
 * app ya corre en modo standalone (instalada previamente).
 */
export function usePwaInstall(): PwaInstallState {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(() => detectInstalled());

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };
    const onAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<boolean> => {
    const installEvent = deferredPrompt;
    if (!installEvent) return false;

    // El evento solo puede usarse una vez; se limpia antes de mostrar el prompt.
    setDeferredPrompt(null);
    await installEvent.prompt();
    const choice = await installEvent.userChoice.catch(() => null);
    return choice?.outcome === 'accepted';
  }, [deferredPrompt]);

  return {
    canInstall: !isInstalled && deferredPrompt !== null,
    isInstalled,
    promptInstall
  };
}
