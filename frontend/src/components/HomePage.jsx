import InfoCard from './InfoCard.jsx';
import { cardStyle, primaryButtonStyle, secondaryButtonStyle } from './styles.js';

export default function HomePage({ navigate }) {
    return (
        <section style={{ display: 'grid', gap: 24 }}>
            <div style={cardStyle}>
                <h2 style={{ marginTop: 0 }}>Welcome to Bubbletea HQ</h2>
                <p style={{ marginTop: 8, color: '#4a5568' }}>
                    Manage your tea shop from one place. Customers can place orders, while staff and managers oversee
                    operations, team performance, and menu updates.
                </p>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 16 }}>
                    <button onClick={() => navigate('/order')} style={primaryButtonStyle}>
                        Start an order
                    </button>
                    <button onClick={() => navigate('/admin')} style={secondaryButtonStyle}>
                        Staff &amp; manager portal
                    </button>
                </div>
            </div>

            <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                <InfoCard title="Customers" description="Build orders, track favorites, and check out as a guest or registered member." />
                <InfoCard title="Staff" description="View order queues, mark drinks complete, and keep inventory in sync." />
                <InfoCard title="Managers" description="Review team performance, update menus, and access high-level dashboards." />
            </div>
        </section>
    );
}