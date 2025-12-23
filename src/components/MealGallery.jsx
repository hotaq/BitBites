import { useEffect, useState } from 'react';
import { fetchMeals } from '../services/supabase';

export default function MealGallery() {
    const [meals, setMeals] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadMeals();
    }, []);

    const loadMeals = async () => {
        setLoading(true);
        const data = await fetchMeals();
        setMeals(data);
        setLoading(false);
    };

    if (loading) {
        return <div style={{ textAlign: 'center', marginTop: '2rem' }}>Loading Gallery...</div>;
    }

    return (
        <div className="meal-gallery">
            <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>community bites 🌎</h2>

            {meals.length === 0 && (
                <p style={{ textAlign: 'center' }}>No meals shared yet. Be the first!</p>
            )}

            <div className="gallery-grid">
                {meals.map((meal) => (
                    <div key={meal.id} className="pixel-card gallery-item">
                        <div className="gallery-header">
                            <span className="gallery-date">
                                {new Date(meal.created_at).toLocaleDateString()}
                            </span>
                            <span className="gallery-score" style={{ color: 'var(--color-success)' }}>
                                Score: {meal.score}
                            </span>
                        </div>

                        <div className="gallery-images">
                            <div className="img-wrapper">
                                <span className="img-label">Before</span>
                                <img src={meal.image_before} alt="Before" loading="lazy" />
                            </div>
                            <div className="img-wrapper">
                                <span className="img-label">After</span>
                                <img src={meal.image_after} alt="After" loading="lazy" />
                            </div>
                        </div>

                        <p className="gallery-analysis">
                            {meal.analysis ? `"${meal.analysis}"` : 'No commentary.'}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}
