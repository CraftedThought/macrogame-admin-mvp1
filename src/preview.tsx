import React from 'react';
import ReactDOM from 'react-dom/client';
import PreviewHost from './PreviewHost';
import './index.css';
import { DataProvider } from './context/DataContext';

const rootElement = document.createElement('div');
rootElement.id = 'react-root';
document.body.appendChild(rootElement);

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <DataProvider>
      <PreviewHost />
    </DataProvider>
  </React.StrictMode>
);