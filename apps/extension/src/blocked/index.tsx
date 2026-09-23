import React from 'react';
import ReactDOM from 'react-dom/client';
import { Blocked } from './Blocked';

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <Blocked />
    </React.StrictMode>
  );
}
