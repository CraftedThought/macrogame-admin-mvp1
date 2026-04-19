// src/main.tsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { DataProvider } from './context/DataContext';
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase/config';

// --- TEMPORARY BACKFILL HELPER ---
// We are exposing this to the window for a one-time console command.
// This should be removed after the backfill is complete.
(window as any).runBackfill = async () => {
  try {
    // --- FIX: Use the correct v2 function name ---
    const backfill = httpsCallable(functions, 'backfillDataToAlgolia');
    console.log('Calling backfillDataToAlgolia... This may take a moment.');
    const result = await backfill();
    console.log('✅ Backfill Complete:', result.data);
  } catch (error) {
    console.error('❌ Backfill Error:', error);
  }
};
console.log(
  'Backfill helper is ready. Call `runBackfill()` in the console to start.',
);
// --- END TEMPORARY HELPER ---

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <DataProvider>
        <App />
      </DataProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
