import { createRoot } from 'react-dom/client';
import QAQCTracker from './QAQCTracker';

const el = document.getElementById('app');

if (el) {
    createRoot(el).render(<QAQCTracker />);
}
