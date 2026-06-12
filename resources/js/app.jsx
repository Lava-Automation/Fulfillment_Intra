import { createRoot } from 'react-dom/client';

function App() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-black">
            <h1 className="text-5xl font-semibold text-white">
                Welcome to Lava
            </h1>
        </div>
    );
}

const el = document.getElementById('app');

if (el) {
    createRoot(el).render(<App />);
}
