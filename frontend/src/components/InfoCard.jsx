export default function InfoCard({ title, description }) {
    return (
        <div style={{ marginBottom: '1rem' }}>
            <h3>{title}</h3>
            <p>{description}</p>
        </div>
    );
}