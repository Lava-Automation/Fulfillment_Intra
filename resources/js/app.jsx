import { createRoot } from 'react-dom/client';
import ClientProfileApp from './ClientProfileApp';

const el = document.getElementById('app');

if (el) {
    createRoot(el).render(<ClientProfileApp />);
}
