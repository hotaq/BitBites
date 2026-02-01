import { useEffect, useState, memo } from 'react';
import { fetchLeaderboard } from '../services/supabase';

// Tier star display helper
const getTierStars = (tier) => {
    if (tier === 0) return '';
    return '⭐'.repeat(Math.min(tier, 5)) + (tier > 5 ? `+${tier - 5}` : '');
};

// Tier color based on level
const getTierColor = (tier) => {
    const colors = {
        0: '#888888',   // Starter - gray
        1: '#cd7f32',   // Bronze
        2: '#c0c0c0',   // Silver
        3: '#ffd700',   // Gold
        4: '#e5e4e2',   // Platinum
        5: '#b9f2ff',   // Diamond
        6: '#ff6b6b',   // Master
        7: '#ff3366',   // Grandmaster
        8: '#9b59b6',   // Champion
        9: '#f39c12',   // Legend
        10: '#e74c3c'   // Mythic
    };
    return colors[tier] || colors[0];
};

function Leaderboard() {
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const data = await fetchLeaderboard();
        setPlayers(data);
        setLoading(false);
    };

    if (loading) return <div className="loading-spinner">Loading...</div>;

    return (
        <div className="leaderboard-container">
            <h3>🏆 Leaderboard</h3>
            <div className="leaderboard-list">
                {players.map((p, index) => (
                    <div key={p.id} className={`leaderboard-item ${index === 0 ? 'top-rank' : ''}`}>
                        <div className="leaderboard-left">
                            <span className="rank">#{p.rank}</span>
                            <div className="player-info">
                                <span className="name">{p.username}</span>
                                {p.tier > 0 && (
                                    <span
                                        className="tier-badge"
                                        style={{
                                            color: getTierColor(p.tier),
                                            fontSize: '0.8rem'
                                        }}
                                    >
                                        {getTierStars(p.tier)} {p.tierName}
                                    </span>
                                )}
                                {p.tier === 0 && (
                                    <span className="tier-badge" style={{ color: '#888', fontSize: '0.75rem' }}>
                                        {p.tierName}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="leaderboard-right">
                            <span className="score">{p.cycleScore.toLocaleString()} pts</span>
                            {p.tier > 0 && (
                                <span className="multiplier" style={{
                                    fontSize: '0.7rem',
                                    color: 'var(--color-primary)',
                                    marginLeft: '0.5rem'
                                }}>
                                    {p.tierMultiplier.toFixed(2)}×
                                </span>
                            )}
                        </div>
                        {/* Progress bar to next tier */}
                        {p.tier < 10 && (
                            <div className="tier-progress-bar" style={{
                                position: 'absolute',
                                bottom: 0,
                                left: 0,
                                right: 0,
                                height: '3px',
                                background: 'rgba(255,255,255,0.1)'
                            }}>
                                <div style={{
                                    width: `${p.tierProgress}%`,
                                    height: '100%',
                                    background: getTierColor(p.tier + 1),
                                    transition: 'width 0.3s ease'
                                }} />
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default memo(Leaderboard);
