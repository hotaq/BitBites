import { Grid } from 'react-window';
import { fetchMeals } from '../services/supabase';
import { useEffect, useState } from 'react';

export default function VirtualizedGallery() {
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

    if (meals.length === 0) {
        return (
            <div className="meal-gallery">
                <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>community bites 🌎</h2>
                <p style={{ textAlign: 'center' }}>No meals shared yet. Be the first!</p>
            </div>
        );
    }

    // Calculate grid dimensions
    const columnCount = Math.floor(window.innerWidth / 350) || 1;
    const rowCount = Math.ceil(meals.length / columnCount);

    return (
        <div className="meal-gallery">
            <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>community bites 🌎</h2>

            <Grid
                columnCount={columnCount}
                columnWidth={350}
                height={600}
                rowCount={rowCount}
                rowHeight={450}
                width={Math.min(window.innerWidth - 40, columnCount * 350)}
                itemData={meals}
            >
                {MealItem}
            </Grid>
        </div>
    );
}

// Meal item component for grid cells
function MealItem({ columnIndex, rowIndex, style, data }) {
    const mealIndex = rowIndex * Math.floor(window.innerWidth / 350) + columnIndex;
    const meal = data[mealIndex];

    if (!meal) {
        return null;
    }

    return (
        <div style={style}>
            <div className="pixel-card gallery-item" style={{ margin: '0.5rem' }}>
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
        </div>
    );
}
