import { useEffect, useState } from 'react';
import { Grid } from 'react-window';
import { fetchMeals } from '../services/supabase';

export default function MealGallery() {
    const [meals, setMeals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [containerWidth, setContainerWidth] = useState(window.innerWidth - 40);

    const loadMeals = async () => {
        setLoading(true);
        const data = await fetchMeals();
        setMeals(data);
        setLoading(false);
    };

    useEffect(() => {
        loadMeals();

        const handleResize = () => {
            setContainerWidth(Math.min(window.innerWidth - 40, 1400));
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Calculate grid dimensions based on container width
    const columnWidth = 350;
    const rowHeight = 450;
    const columnCount = Math.max(1, Math.floor(containerWidth / columnWidth));
    const rowCount = Math.ceil(meals.length / columnCount);

    if (loading) {
        return <div style={{ textAlign: 'center', marginTop: '2rem' }}>Loading Gallery...</div>;
    }

    return (
        <div className="meal-gallery">
            <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>community bites 🌎</h2>

            {meals.length === 0 && (
                <p style={{ textAlign: 'center' }}>No meals shared yet. Be the first!</p>
            )}

            {meals.length > 0 && (
                <Grid
                    columnCount={columnCount}
                    columnWidth={columnWidth}
                    height={600}
                    rowCount={rowCount}
                    rowHeight={rowHeight}
                    width={containerWidth}
                    itemData={meals}
                    className="virtualized-gallery-grid"
                >
                    {MealItem}
                </Grid>
            )}
        </div>
    );
}

// Meal item component for grid cells
function MealItem({ columnIndex, rowIndex, style, data }) {
    const columnCount = Math.max(1, Math.floor((window.innerWidth - 40) / 350));
    const mealIndex = rowIndex * columnCount + columnIndex;
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
