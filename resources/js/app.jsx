import { createRoot } from 'react-dom/client';
import DevSupportQueue from './DevSupportQueue';

const el = document.getElementById('app');

if (el) {
    createRoot(el).render(<DevSupportQueue />);
}
