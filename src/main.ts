import './index.css';
import { supabase } from './lib/supabase';

function initApp(): void {
  const app = document.getElementById('app');
  if (app) {
    app.textContent = 'LifePhone CRM - Listo';
  }
  console.log('[LifePhone] App initialized');
  console.log('[LifePhone] Supabase client:', supabase);
}

initApp();
