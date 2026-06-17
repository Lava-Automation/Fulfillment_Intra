// resources/js/app.jsx
// Vite entry point. Fixed mount referenced by welcome.blade.php.
// This file stays tiny on every branch: it only imports and renders the shell.
// All real shell logic lives in mainapp.jsx.
import { createRoot } from 'react-dom/client';
import MainApp from './mainapp';

const el = document.getElementById('app');
if (el) createRoot(el).render(<MainApp />);
