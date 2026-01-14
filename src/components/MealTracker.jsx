
import { useState, memo } from 'react';
import CameraUpload from './CameraUpload';
import { analyzeMeal, calculateMealScore } from '../services/ai';
import { uploadMealImage, saveMeal } from '../services/supabase';

function MealTracker({ onMealSaved }) {
    const [step, setStep] = useState('start'); // start, eating, finish, result
    const [beforeImage, setBeforeImage] = useState(null);
    const [afterImage, setAfterImage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    // Step 1: User takes photo of full meal
    const handleBeforeImage = async (file) => {
        setBeforeImage(file);
        // Optional: Quick analysis of what the food is could go here
        setStep('eating');
    };

    // Step 2: User finishes eating and takes photo of aftermath
    const handleAfterImage = (file) => {
        setAfterImage(file);
        setStep('finish');
    };

    // Step 3: AI Analysis
    const handleAnalysis = async () => {
        if (!beforeImage || !afterImage) return;

        setLoading(true);
        try {
            const scoreData = await calculateMealScore(beforeImage, afterImage);

            // Upload Images
            const beforeUrl = await uploadMealImage(beforeImage);
            const afterUrl = await uploadMealImage(afterImage);

            // Save to DB
            if (beforeUrl && afterUrl) {
                await saveMeal({
                    image_before: beforeUrl,
                    image_after: afterUrl,
                    score: scoreData.score,
                    analysis: scoreData.commentary
                });
                if (onMealSaved) onMealSaved();
            }

            setResult(scoreData);
            setStep('result');

        } catch (error) {
            console.error(error);
            alert('AI got confused! Try again.');
        } finally {
            setLoading(false);
        }
    };

    const resetRotation = () => {
        setStep('start');
        setBeforeImage(null);
        setAfterImage(null);
        setResult(null);
    };

    return (
        <div className="meal-tracker">
            {/* progress bar */}
            <div className="progress-indicator">
                <span className={step === 'start' ? 'active' : ''}>1. Snap</span>
                <span className="divider">→</span>
                <span className={step === 'eating' ? 'active' : ''}>2. Eat</span>
                <span className="divider">→</span>
                <span className={step === 'finish' ? 'active' : ''}>3. Score</span>
            </div>

            <div className="pixel-card tracker-card">
                {step === 'start' && (
                    <div className="step-content">
                        <h2>🍽️ The "Before" Shot</h2>
                        <p>Show us the full spread!</p>
                        <CameraUpload onImageSelect={handleBeforeImage} label="Capture Meal" />
                    </div>
                )}

                {step === 'eating' && (
                    <div className="step-content">
                        <h2>😋 Bon Appétit!</h2>
                        <img src={URL.createObjectURL(beforeImage)} alt="Before" className="thumbnail-sm" />
                        <p>Enjoy your meal. Come back when you're done.</p>
                        <div className="action-row">
                            <button className="pixel-btn secondary" onClick={() => setStep('finish')}>
                                I'm Finished!
                            </button>
                        </div>
                    </div>
                )}

                {step === 'finish' && (
                    <div className="step-content">
                        <h2>🗑️ The "Aftermath"</h2>
                        <p>Leftovers? Clean plate? Let's see.</p>
                        <CameraUpload onImageSelect={handleAfterImage} label="Capture Aftermath" />

                        {afterImage && (
                            <div className="action-row" style={{ marginTop: '20px' }}>
                                <button className="pixel-btn primary" onClick={handleAnalysis} disabled={loading}>
                                    {loading ? 'AI Analyzing...' : 'Calculate Score ✨'}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {step === 'result' && result && (
                    <div className="step-content result-view">
                        <h2>💘 Meal Score</h2>

                        {result.bonusApplied && (
                            <div className="bonus-badge" style={{
                                background: 'linear-gradient(135deg, #ffd700, #ff3366)',
                                padding: '0.5rem 1rem',
                                borderRadius: '8px',
                                marginBottom: '1rem',
                                fontWeight: 'bold',
                                animation: 'pulse 2s infinite'
                            }}>
                                🎁 {result.bonusType} Applied!
                            </div>
                        )}

                        <div className="score-display">
                            <span className="score-number">{result.score}</span>
                            <span className="score-max">/100</span>
                        </div>

                        {result.bonusApplied && (
                            <p style={{ fontSize: '0.9rem', color: 'var(--color-primary)', marginTop: '0.5rem' }}>
                                Base Score: {result.originalScore} × 1.5 = {result.score} 🎉
                            </p>
                        )}

                        <p className="ai-commentary">"{result.commentary}"</p>

                        <button className="pixel-btn" onClick={resetRotation}>
                            Track Another Meal
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default memo(MealTracker);
