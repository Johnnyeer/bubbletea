import { useEffect, useState } from 'react';

export default function App() {
    const [health, setHealth] = useState(null);
    useEffect(() => {
        fetch('/api/health').then(r => r.json()).then(setHealth).catch(console.error);
    }, []);
    return (
        <div style={{ fontFamily: 'system-ui', padding: 16 }}>
            <h1>Restaurant Management</h1>
            <p>Backend health: {health ? health.status : '...'}</p>
        </div>
    );
}

