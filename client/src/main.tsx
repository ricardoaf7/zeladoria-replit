import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Register Service Worker for PWA (production only for better stability)
if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('✅ Service Worker registrado com sucesso!', registration.scope);
      })
      .catch((error) => {
        console.error('❌ Falha ao registrar Service Worker:', error.message || error);
      });
  });
} else if ('serviceWorker' in navigator) {
  console.log('ℹ️ Service Worker desabilitado em desenvolvimento (HTTP). Será ativado em produção (HTTPS).');
}

createRoot(document.getElementById("root")!).render(<App />);
