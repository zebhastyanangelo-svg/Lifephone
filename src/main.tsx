import './index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { inject } from '@vercel/analytics';
import { App } from './App';

/**
 * Arranque de la SPA en #app (SPEC-07): tema oscuro/glassmorphism de marca,
 * máquina de sesión Supabase y router determinista. Reemplaza el placeholder
 * plano por la UI real.
 */
function bootstrap(): void {
  inject({ mode: 'auto', debug: false });

  const container = document.getElementById('app');
  if (!container) {
    console.error('[LifePhone] Elemento raíz #app no encontrado');
    return;
  }

  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
  console.log('[LifePhone] App mounted');
}

bootstrap();
