export default function DebugPage() {
    return (
        <div style={{ padding: '2rem', backgroundColor: '#000', color: '#0f0', fontFamily: 'monospace' }}>
            <h1>🔧 Debug Info</h1>
            <hr />
            <h2>Environment Variables:</h2>
            <p>VITE_SUPABASE_URL: <strong>{import.meta.env.VITE_SUPABASE_URL || '❌ MISSING'}</strong></p>
            <p>VITE_SUPABASE_ANON_KEY: <strong>{import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅ EXISTS' : '❌ MISSING'}</strong></p>
            <p>VITE_GEMINI_API_KEY: <strong>{import.meta.env.VITE_GEMINI_API_KEY ? '✅ EXISTS' : '❌ MISSING'}</strong></p>
            <hr />
            <h2>All Environment Variables:</h2>
            <pre>{JSON.stringify(import.meta.env, null, 2)}</pre>
        </div>
    );
}
