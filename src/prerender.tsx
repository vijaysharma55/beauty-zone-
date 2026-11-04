import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { BrandProvider } from './context/BrandContext';

export function renderHome() {
  return renderToString(
    <MemoryRouter initialEntries={['/']}>
      <AuthProvider><BrandProvider><App /></BrandProvider></AuthProvider>
    </MemoryRouter>
  );
}
