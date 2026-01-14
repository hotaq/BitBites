import { useEffect, useState, memo } from 'react';
import { fetchLeaderboard } from '../services/supabase';

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

    if (loading) return null; // Or a spinner

    return (
        <div className="leaderboard-container">
            <h3>🏆 Leaderboard</h3>
            <div className="leaderboard-list">
                {players.map((p, index) => (
                    <div key={p.id} className={`leaderboard-item ${index === 0 ? 'top-rank' : ''}`}>
                        <span className="rank">#{index + 1}</span>
                        <span className="name">{p.username}</span>
                        <span className="score">{p.totalScore} pts</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default memo(Leaderboard);
