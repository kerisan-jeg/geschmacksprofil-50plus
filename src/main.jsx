import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/atkinson-hyperlegible-next/index.css';
import './theme/tokens.css';
import './styles/base.css';
import './styles/controls.css';
import './styles/app.css';
import './styles/card.css';
import './styles/screens.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
