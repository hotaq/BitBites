/**
 * Image Compression Utility
 * Compresses images using HTMLCanvasElement to reduce file size by 70-80%.
 * Targets 500KB-1MB output while maintaining acceptable visual quality.
 */

// Default compression settings
const DEFAULT_MAX_WIDTH = 1920; // Max width in pixels
const DEFAULT_MAX_HEIGHT = 1080; // Max height in pixels
const DEFAULT_QUALITY = 0.8; // Initial JPEG quality (0.0 - 1.0)
const DEFAULT_TARGET_SIZE = 1024 * 1024; // 1MB target size in bytes
const MIN_QUALITY = 0.1; // Minimum quality to prevent degradation
const QUALITY_STEP = 0.1; // Quality reduction step size

/**
 * Load an image file into an HTMLImageElement
 * @param {File|Blob} file - The image file to load
 * @returns {Promise<HTMLImageElement>} - Resolves with loaded image element
 */
function loadImage(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img);
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load image'));
        };

        img.src = url;
    });
}

/**
 * Calculate dimensions that fit within max bounds while maintaining aspect ratio
 * @param {number} width - Original width
 * @param {number} height - Original height
 * @param {number} maxWidth - Maximum allowed width
 * @param {number} maxHeight - Maximum allowed height
 * @returns {{width: number, height: number}} - Calculated dimensions
 */
function calculateDimensions(width, height, maxWidth, maxHeight) {
    if (width <= maxWidth && height <= maxHeight) {
        return { width, height };
    }

    const widthRatio = maxWidth / width;
    const heightRatio = maxHeight / height;
    const ratio = Math.min(widthRatio, heightRatio);

    return {
        width: Math.round(width * ratio),
        height: Math.round(height * ratio)
    };
}

/**
 * Draw image to canvas and return as blob with specified quality
 * @param {HTMLImageElement} img - Source image
 * @param {number} quality - JPEG quality (0.0 - 1.0)
 * @param {number} maxWidth - Maximum width
 * @param {number} maxHeight - Maximum height
 * @returns {Promise<Blob>} - Compressed image blob
 */
function compressToBlob(img, quality, maxWidth, maxHeight) {
    return new Promise((resolve, reject) => {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                reject(new Error('Failed to get canvas context'));
                return;
            }

            const { width, height } = calculateDimensions(
                img.width,
                img.height,
                maxWidth,
                maxHeight
            );

            canvas.width = width;
            canvas.height = height;

            // Use better quality settings
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            // Draw image to canvas
            ctx.drawImage(img, 0, 0, width, height);

            // Convert to blob with JPEG compression
            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Failed to create blob'));
                    }
                },
                'image/jpeg',
                quality
            );
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Compress an image file using HTMLCanvasElement
 * Automatically adjusts quality to meet target size while maintaining acceptable quality
 *
 * @param {File|Blob} file - The image file to compress
 * @param {Object} options - Compression options
 * @param {number} [options.maxWidth=1920] - Maximum width in pixels
 * @param {number} [options.maxHeight=1080] - Maximum height in pixels
 * @param {number} [options.initialQuality=0.8] - Initial quality (0.0 - 1.0)
 * @param {number} [options.targetSize=1048576] - Target size in bytes (default 1MB)
 * @returns {Promise<{blob: Blob, originalSize: number, compressedSize: number, compressionRatio: number, quality: number}>}
 *   Resolves with compressed blob and metadata
 */
export async function compressImage(file, options = {}) {
    const {
        maxWidth = DEFAULT_MAX_WIDTH,
        maxHeight = DEFAULT_MAX_HEIGHT,
        initialQuality = DEFAULT_QUALITY,
        targetSize = DEFAULT_TARGET_SIZE
    } = options;

    // Validate input
    if (!file) {
        throw new Error('No file provided');
    }

    const originalSize = file.size;

    // Load the image
    let img;
    try {
        img = await loadImage(file);
    } catch (error) {
        throw new Error(`Failed to load image: ${error.message}`);
    }

    // Try compressing with progressively lower quality until target size is met
    let quality = initialQuality;
    let blob = null;
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
        try {
            const compressed = await compressToBlob(img, quality, maxWidth, maxHeight);

            // Check if we met the target size or reached minimum quality
            if (compressed.size <= targetSize || quality <= MIN_QUALITY) {
                blob = compressed;
                break;
            }

            // Reduce quality and try again
            quality = Math.max(MIN_QUALITY, quality - QUALITY_STEP);
            attempts++;
        } catch (error) {
            throw new Error(`Compression failed: ${error.message}`);
        }
    }

    // Fallback: if we still don't have a blob, use the last attempt
    if (!blob && attempts >= maxAttempts) {
        try {
            blob = await compressToBlob(img, MIN_QUALITY, maxWidth, maxHeight);
        } catch (error) {
            throw new Error(`Compression failed after ${maxAttempts} attempts`);
        }
    }

    const compressedSize = blob.size;
    const compressionRatio = ((originalSize - compressedSize) / originalSize * 100);

    return {
        blob,
        originalSize,
        compressedSize,
        compressionRatio,
        quality
    };
}

/**
 * Simple compression wrapper that returns just the compressed blob
 * @param {File|Blob} file - The image file to compress
 * @param {Object} options - Compression options (same as compressImage)
 * @returns {Promise<Blob>} - Compressed image blob
 */
export async function compressImageSimple(file, options = {}) {
    const result = await compressImage(file, options);
    return result.blob;
}
