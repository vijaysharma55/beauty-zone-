import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { BrandProvider } from './context/BrandContext.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import { AppErrorBoundary } from './components/AppErrorBoundary.tsx';
import './index.css';

// The outermost boundary also covers the providers, so a crash in any of them shows a
// recoverable message instead of leaving the visitor on a blank white screen.
createRoot(document.getElementById('root')!).render(
  <AppErrorBoundary name="root">
    <BrowserRouter>
      <AuthProvider>
        <BrandProvider>
          <App />
        </BrandProvider>
      </AuthProvider>
    </BrowserRouter>
  </AppErrorBoundary>
);
