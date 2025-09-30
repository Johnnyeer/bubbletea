export default function NotFoundPage({ navigate }) {
    return (
        <div>
            <h2>Page not found</h2>
            <p>The page you were looking for has moved. Try heading back to the home screen.</p>
            <button type="button" onClick={() => navigate('/')}>Back to home</button>
        </div>
    );
}