import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AnimationSyncProvider } from './context/AnimationSyncContext';
import ErrorBoundary from './components/ErrorBoundary';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <AnimationSyncProvider>
        <App />
      </AnimationSyncProvider>
    </ErrorBoundary>
  </React.StrictMode>
);