import { useState, useEffect, useCallback } from 'react';
import MealTracker from './components/MealTracker';
import MealGallery from './components/MealGallery';
import Leaderboard from './components/Leaderboard';
import { supabase, isCurrentlyBonusTime, checkTierUp, getUserTierInfo } from './services/supabase';
import { getTimeRemainingInBonus } from './utils/bonusTime';

// Tier display helpers
const getTierStars = (tier) => {
  if (tier === 0) return '';
  return '⭐'.repeat(Math.min(tier, 5)) + (tier > 5 ? `+${tier - 5}` : '');
};

const getTierColor = (tier) => {
  const colors = {
    0: '#888888', 1: '#cd7f32', 2: '#c0c0c0', 3: '#ffd700',
    4: '#e5e4e2', 5: '#b9f2ff', 6: '#ff6b6b', 7: '#ff3366',
    8: '#9b59b6', 9: '#f39c12', 10: '#e74c3c'
  };
  return colors[tier] || colors[0];
};

function App() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('track');
  const [username, setUsername] = useState('Player 1');
  const [bonusWindow, setBonusWindow] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);

  // Tier state
  const [tierInfo, setTierInfo] = useState({
    tier: 0,
    tierName: 'Starter',
    tierMultiplier: 1.0,
    cycleScore: 0,
    tierProgress: 0,
    pointsToNextTier: 10000
  });
  const [tierUpCelebration, setTierUpCelebration] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchUserData(session.user.id, session.user.email);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchUserData(session.user.id, session.user.email);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch all user data including tier info
  const fetchUserData = async (userId, email) => {
    // Get username
    try {
      const { data } = await supabase.from('profiles').select('username').eq('id', userId).single();
      if (data && data.username) {
        setUsername(data.username);
      } else {
        setUsername(email.split('@')[0]);
      }
    } catch {
      setUsername(email.split('@')[0]);
    }

    // Get tier info
    const info = await getUserTierInfo(userId);
    if (info) {
      setTierInfo(info);
    }
  };

  // Check for bonus time every minute
  useEffect(() => {
    const checkBonusTimeAsync = async () => {
      const { isBonus, window } = await isCurrentlyBonusTime();
      if (isBonus) {
        setBonusWindow(window);
        setTimeRemaining(getTimeRemainingInBonus(window));
      } else {
        setBonusWindow(null);
        setTimeRemaining(null);
      }
    };

    checkBonusTimeAsync();
    const interval = setInterval(checkBonusTimeAsync, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleLogin = useCallback(async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    setLoading(false);
  }, [email, password]);

  // Callback after meal saved - check for tier up!
  const handleMealSaved = useCallback(async () => {
    if (!session) return;

    // Check if user leveled up
    const tierResult = await checkTierUp(session.user.id);

    if (tierResult.tieredUp) {
      // Show celebration!
      setTierUpCelebration({
        oldTier: tierResult.oldTier,
        newTier: tierResult.newTier,
        tierName: tierResult.tierName
      });

      // Auto-hide after 5 seconds
      setTimeout(() => setTierUpCelebration(null), 5000);
    }

    // Refresh tier info
    const info = await getUserTierInfo(session.user.id);
    if (info) setTierInfo(info);
  }, [session]);

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

      {/* Tier Up Celebration Modal */}
      {tierUpCelebration && (
        <div className="tier-up-modal" style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.9)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          animation: 'fadeIn 0.5s ease'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
          <h2 style={{ fontSize: '2.5rem', color: getTierColor(tierUpCelebration.newTier), marginBottom: '1rem' }}>
            TIER UP!
          </h2>
          <p style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
            {getTierStars(tierUpCelebration.newTier)} {tierUpCelebration.tierName}
          </p>
          <p style={{ color: 'var(--color-text-dim)' }}>
            Score multiplier: {(1.15 ** tierUpCelebration.newTier).toFixed(2)}×
          </p>
          <button
            className="pixel-btn primary"
            style={{ marginTop: '2rem' }}
            onClick={() => setTierUpCelebration(null)}
          >
            Awesome! 🚀
          </button>
        </div>
      )}

      {/* Bonus Time Banner */}
      {bonusWindow && (
        <div className="bonus-banner" style={{
          position: 'fixed',
          top: 0, left: 0, right: 0,
          background: 'linear-gradient(135deg, #ffd700, #ff3366)',
          color: '#0a0a0a',
          padding: '1rem',
          textAlign: 'center',
          fontWeight: 'bold',
          fontSize: '1.2rem',
          zIndex: 1000,
          animation: 'pulse 2s infinite',
          borderBottom: '4px solid #fff'
        }}>
          🎁 {bonusWindow.label?.toUpperCase() || 'BONUS TIME'} ACTIVE! 🎁
          <span style={{ marginLeft: '1rem', fontSize: '0.9rem' }}>
            {timeRemaining} minute{timeRemaining !== 1 ? 's' : ''} left!
          </span>
        </div>
      )}

      {/* Player Score Badge with Tier */}
      <div className="player-badge" style={{
        marginTop: bonusWindow ? '60px' : '0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="player-label">{username}</span>
          {tierInfo.tier > 0 && (
            <span style={{ color: getTierColor(tierInfo.tier), fontSize: '0.9rem' }}>
              {getTierStars(tierInfo.tier)}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
          <span className="player-score">{tierInfo.cycleScore.toLocaleString()}</span>
          {tierInfo.tier > 0 && (
            <span style={{ fontSize: '0.8rem', color: 'var(--color-primary)' }}>
              ({tierInfo.tierMultiplier.toFixed(2)}×)
            </span>
          )}
        </div>
        {/* Tier progress bar */}
        {tierInfo.tier < 10 && (
          <div style={{
            width: '100%',
            height: '4px',
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '2px',
            marginTop: '4px'
          }}>
            <div style={{
              width: `${tierInfo.tierProgress}%`,
              height: '100%',
              background: getTierColor(tierInfo.tier + 1),
              borderRadius: '2px',
              transition: 'width 0.3s ease'
            }} />
          </div>
        )}
        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)', marginTop: '2px' }}>
          {tierInfo.tierName} • {tierInfo.pointsToNextTier.toLocaleString()} to next tier
        </span>
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
