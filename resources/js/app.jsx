import { createRoot } from 'react-dom/client';

function App() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
            <h1 className="text-5xl font-semibold text-gray-900">
                Welcome to Lava
            </h1>
        </div>
    );
}

const el = document.getElementById('app');

if (el) {
    createRoot(el).render(<App />);
}
