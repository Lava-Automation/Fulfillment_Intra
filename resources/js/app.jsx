import { createRoot } from 'react-dom/client';
import LavaPortal from './LavaPortal';

const el = document.getElementById('app');

if (el) {
    createRoot(el).render(<LavaPortal />);
}
