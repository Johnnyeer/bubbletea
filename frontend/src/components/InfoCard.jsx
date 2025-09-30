import { cardStyle } from './styles.js';

export default function InfoCard({ title, description }) {
    return (
        <div style={cardStyle}>
            <h3 style={{ marginTop: 0 }}>{title}</h3>
            <p style={{ marginTop: 8, color: '#4a5568' }}>{description}</p>
        </div>
    );
}