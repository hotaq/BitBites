/**
 * Test file for image compression utility
 * This file can be used to manually verify the compression functionality
 *
 * To test in a browser:
 * 1. Import this file in your HTML or use it in browser console
 * 2. Create an HTML file with a file input and call testCompression()
 * 3. Select a 3-5MB image file
 * 4. Check the console for results
 */

import { compressImage } from './imageCompression.js';

/**
 * Test compression with a file input
 * Call this function from browser console after user selects a file
 * @param {File} file - File from file input element
 */
export async function testCompression(file) {
    console.log('=== Image Compression Test ===');
    console.log('Original file:', {
        name: file.name,
        type: file.type,
        size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
        sizeBytes: file.size
    });

    try {
        const startTime = performance.now();

        const result = await compressImage(file, {
            maxWidth: 1920,
            maxHeight: 1080,
            initialQuality: 0.8,
            targetSize: 1024 * 1024 // 1MB target
        });

        const endTime = performance.now();
        const duration = (endTime - startTime).toFixed(2);

        console.log('✓ Compression successful!');
        console.log('Result:', {
            compressedSize: `${(result.compressedSize / 1024 / 1024).toFixed(2)} MB`,
            compressedSizeBytes: result.compressedSize,
            compressionRatio: `${result.compressionRatio.toFixed(2)}%`,
            quality: result.quality,
            duration: `${duration}ms`
        });

        // Verify requirements
        if (result.compressedSize <= 1024 * 1024) {
            console.log('✓ PASS: Output file is under 1MB');
        } else {
            console.log('✗ FAIL: Output file exceeds 1MB');
        }

        if (result.compressionRatio >= 70) {
            console.log('✓ PASS: Compression ratio is 70% or higher');
        } else {
            console.log('✗ FAIL: Compression ratio is below 70%');
        }

        // Return blob for visual inspection
        console.log('Compressed blob:', result.blob);

        return result;
    } catch (error) {
        console.error('✗ Compression failed:', error);
        throw error;
    }
}

/**
 * Test that the compressImage function exists and is exported
 */
export function testFunctionExists() {
    console.log('=== Function Existence Test ===');
    console.log('compressImage function exists:', typeof compressImage === 'function');
    console.log('compressImage is exported:', typeof compressImage !== 'undefined');

    return typeof compressImage === 'function';
}

/**
 * Create a test HTML file for manual testing
 * @returns {string} - HTML content for testing
 */
export function getTestHTML() {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Image Compression Test</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
        }
        .test-section {
            border: 1px solid #ccc;
            padding: 20px;
            margin-bottom: 20px;
            border-radius: 8px;
        }
        button {
            padding: 10px 20px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
        }
        button:hover {
            background: #0056b3;
        }
        #results {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 4px;
            white-space: pre-wrap;
            font-family: monospace;
            font-size: 14px;
        }
        .image-preview {
            display: flex;
            gap: 20px;
            margin-top: 20px;
        }
        .image-container {
            flex: 1;
        }
        .image-container h3 {
            margin-bottom: 10px;
        }
        .image-container img {
            max-width: 100%;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
    </style>
</head>
<body>
    <h1>Image Compression Test</h1>

    <div class="test-section">
        <h2>Test Image Compression</h2>
        <p>Select a 3-5MB image file to test compression:</p>
        <input type="file" id="fileInput" accept="image/*">
        <br><br>
        <button onclick="runTest()">Compress Image</button>
    </div>

    <div class="test-section">
        <h2>Results</h2>
        <div id="results">No results yet</div>
    </div>

    <div class="image-preview" id="imagePreview" style="display: none;">
        <div class="image-container">
            <h3>Original Image</h3>
            <img id="originalImage" alt="Original">
        </div>
        <div class="image-container">
            <h3>Compressed Image</h3>
            <img id="compressedImage" alt="Compressed">
        </div>
    </div>

    <script type="module">
        import { compressImage } from './src/utils/imageCompression.js';

        window.runTest = async function() {
            const fileInput = document.getElementById('fileInput');
            const resultsDiv = document.getElementById('results');
            const imagePreview = document.getElementById('imagePreview');

            if (!fileInput.files[0]) {
                resultsDiv.textContent = 'Please select a file first!';
                return;
            }

            const file = fileInput.files[0];
            resultsDiv.textContent = 'Compressing...';

            try {
                const result = await compressImage(file);
                const duration = performance.now();

                const output = \`
Compression Results:
==================
Original Size: \${(result.originalSize / 1024 / 1024).toFixed(2)} MB (\${result.originalSize} bytes)
Compressed Size: \${(result.compressedSize / 1024 / 1024).toFixed(2)} MB (\${result.compressedSize} bytes)
Compression Ratio: \${result.compressionRatio.toFixed(2)}%
Quality Used: \${result.quality}

✓ Output file is under 1MB: \${result.compressedSize <= 1024 * 1024 ? 'PASS' : 'FAIL'}
✓ Compression ratio is 70%+: \${result.compressionRatio >= 70 ? 'PASS' : 'FAIL'}
                \`;

                resultsDiv.textContent = output;

                // Show image previews for visual comparison
                const originalUrl = URL.createObjectURL(file);
                const compressedUrl = URL.createObjectURL(result.blob);

                document.getElementById('originalImage').src = originalUrl;
                document.getElementById('compressedImage').src = compressedUrl;
                imagePreview.style.display = 'flex';

            } catch (error) {
                resultsDiv.textContent = \`Error: \${error.message}\`;
                console.error(error);
            }
        };
    </script>
</body>
</html>
    `;
}
