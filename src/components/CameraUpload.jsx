import { useState, useRef } from 'react';

export default function CameraUpload({ onImageSelect, label = "Take Photo" }) {
    const fileInputRef = useRef(null);
    const [preview, setPreview] = useState(null);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result);
            };
            reader.readAsDataURL(file);
            onImageSelect(file);
        }
    };

    const handleClick = () => {
        fileInputRef.current.click();
    };

    return (
        <div className="camera-upload-container">
            <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={fileInputRef}
                onChange={handleFileChange}
                style={{ display: 'none' }}
            />

            {preview ? (
                <div className="image-preview" onClick={handleClick}>
                    <img src={preview} alt="Meal Preview" />
                    <div className="overlay-label">Retake</div>
                </div>
            ) : (
                <button className="pixel-btn" onClick={handleClick}>
                    [o] {label}
                </button>
            )}
        </div>
    );
}
