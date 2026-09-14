import './index.css';
import { supabase } from './lib/supabase';
import { inject } from '@vercel/analytics';

function initApp(): void {
  inject({ mode: 'auto', debug: false });
  const app = document.getElementById('app');
  if (app) {
    app.textContent = 'LifePhone CRM - Listo';
  }
  console.log('[LifePhone] App initialized');
  console.log('[LifePhone] Supabase client:', supabase);
}

initApp();
