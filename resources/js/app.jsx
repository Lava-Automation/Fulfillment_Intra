import { createRoot } from 'react-dom/client';
import TrainerWorkloadApp from './TrainerWorkloadDashboard';

const el = document.getElementById('app');

if (el) {
    createRoot(el).render(<TrainerWorkloadApp />);
}
