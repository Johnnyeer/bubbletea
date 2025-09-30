import InfoCard from '../components/InfoCard.jsx';

export default function HomePage({ navigate }) {
    return (
        <section>
            <div style={{ marginBottom: '1.5rem' }}>
                <h2>Welcome to Bubbletea HQ</h2>
                <p>
                    Manage your tea shop from one place. Customers can place orders, while staff and managers oversee
                    operations and updates.
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button type="button" onClick={() => navigate('/order')}>
                        Start an order
                    </button>
                    <button type="button" onClick={() => navigate('/admin')}>
                        Staff and manager portal
                    </button>
                </div>
            </div>

            <div>
                <InfoCard title="Customers" description="Build orders, track favorites, and check out as a guest or registered member." />
                <InfoCard title="Staff" description="View order queues, mark drinks complete, and keep inventory in sync." />
                <InfoCard title="Managers" description="Review team performance, update menus, and access high-level dashboards." />
            </div>
        </section>
    );
}