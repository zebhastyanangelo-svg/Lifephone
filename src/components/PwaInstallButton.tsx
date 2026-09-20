import { useState } from 'react';
import { usePwaInstall } from '../hooks/usePwaInstall';
import { LifeButton } from './LifeButton';

/**
 * Botón "Instalar aplicación" (PWA). Solo se renderiza cuando el navegador
 * ofreció `beforeinstallprompt` y la app no está instalada; al pulsarlo dispara
 * el prompt nativo de instalación. Se oculta solo al completarse la instalación
 * (`appinstalled`) o si el navegador no soporta la instalación.
 */
export function PwaInstallButton() {
  const { canInstall, promptInstall } = usePwaInstall();
  const [installing, setInstalling] = useState(false);

  if (!canInstall) return null;

  const handleInstall = () => {
    if (installing) return;
    setInstalling(true);
    void promptInstall().finally(() => setInstalling(false));
  };

  return (
    <LifeButton
      label="Instalar aplicación"
      onPress={handleInstall}
      loading={installing}
      variant="glass"
      size="sm"
      accessibilityLabel="Instalar aplicación"
    />
  );
}
