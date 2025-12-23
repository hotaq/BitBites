import { useState, useEffect } from 'react';
import MealTracker from './components/MealTracker';
import MealGallery from './components/MealGallery';
import Leaderboard from './components/Leaderboard';
import { supabase } from './services/supabase';

function App() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [totalScore, setTotalScore] = useState(0);
  const [view, setView] = useState('track'); // 'track', 'gallery', 'leaderboard'
  const [username, setUsername] = useState('Player 1');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchTotalScore(session.user.id);
        fetchUsername(session.user.id, session.user.email);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchTotalScore(session.user.id);
        fetchUsername(session.user.id, session.user.email);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUsername = async (userId, email) => {
    try {
      // 1. Try to get name from profiles table
      const { data } = await supabase.from('profiles').select('username').eq('id', userId).single();

      if (data && data.username) {
        setUsername(data.username);
      } else {
        // 2. Fallback to email username (e.g., 'john' from 'john@test.com')
        const nameFromEmail = email.split('@')[0];
        setUsername(nameFromEmail);
      }
    } catch (error) {
      // If profiles table doesn't exist, just use email
      const nameFromEmail = email.split('@')[0];
      setUsername(nameFromEmail);
    }
  };

  const fetchTotalScore = async (userId) => {
    const { data, error } = await supabase
      .from('meals')
      .select('score')
      .eq('user_id', userId);

    if (data) {
      const total = data.reduce((acc, curr) => acc + (curr.score || 0), 0);
      setTotalScore(total);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) alert(error.message);
    setLoading(false);
  };

  // Callback to update score immediately after a new meal is tracked
  const handleMealSaved = () => {
    if (session) fetchTotalScore(session.user.id);
  };

  if (!session) {
    return (
      <div style={{ maxWidth: '400px', margin: '5rem auto', padding: '2rem', textAlign: 'center' }}>
        <header style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>
            BitBites <span className="heart-icon">♥</span>
          </h1>
          <p>Enter our secret code.</p>
        </header>

        <div className="pixel-card">
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ padding: '0.5rem', fontFamily: 'inherit', fontSize: '1rem' }}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ padding: '0.5rem', fontFamily: 'inherit', fontSize: '1rem' }}
            />
            <button className="pixel-btn primary" disabled={loading}>
              {loading ? 'Unlocking...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem', position: 'relative' }}>

      {/* Player Score Badge */}
      <div className="player-badge">
        <span className="player-label">{username}</span>
        <span className="player-score">{totalScore}</span>
      </div>

      <header style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <h1 style={{ fontSize: '4rem', marginBottom: '1rem' }}>
          BitBites <span className="heart-icon">♥</span>
        </h1>
        <p style={{ fontSize: '1.2rem', color: 'var(--color-text-dim)' }}>
          Level up your relationship, one meal at a time.
        </p>

        <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button
            className={`pixel-btn ${view === 'track' ? 'primary' : ''}`}
            onClick={() => setView('track')}
          >
            Track Meal
          </button>
          <button
            className={`pixel-btn ${view === 'gallery' ? 'primary' : ''}`}
            onClick={() => setView('gallery')}
          >
            Gallery
          </button>
          <button
            className={`pixel-btn ${view === 'leaderboard' ? 'primary' : ''}`}
            onClick={() => setView('leaderboard')}
          >
            Rank
          </button>
        </div>

        <button className="pixel-btn" style={{ fontSize: '0.8rem', marginTop: '2rem' }} onClick={() => supabase.auth.signOut()}>
          Sign Out
        </button>
      </header>

      <main>
        {view === 'track' && <MealTracker onMealSaved={handleMealSaved} />}
        {view === 'gallery' && <MealGallery />}
        {view === 'leaderboard' && <Leaderboard />}
      </main>
    </div>
  );
}

export default App;
