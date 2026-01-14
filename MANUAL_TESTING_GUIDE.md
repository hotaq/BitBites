# Manual Testing Guide - Image Compression (Subtask 3-1)

## Overview

This guide provides step-by-step instructions for testing the image compression functionality with various image sizes and formats.

## Test Setup

1. **Start the dev server** (if not already running):
   ```bash
   npm run dev
   ```

2. **Open the test suite**:
   - Navigate to: `http://localhost:5173/test-compression.html`
   - Alternatively, open `test-compression.html` directly in your browser

## Test Cases

### Test Case 1: Small JPEG Image (< 1MB)

**Purpose**: Verify that small images compress while maintaining acceptable quality.

**Steps**:
1. Find or create a JPEG image under 1MB (e.g., 500KB-800KB)
2. In the test suite, select this file for the "Small JPEG" test
3. Click "Test" button
4. Review the results

**Expected Results**:
- ✓ Compressed size should be under 1MB
- ✓ Quality should be ≥ 0.5 (maintains good quality)
- ✓ Visual comparison should show minimal quality loss
- ✓ Compression ratio may vary (small images compress less)

**Pass Criteria**:
```
✓ Output file is under 1MB
✓ Quality maintained (≥ 0.5)
✓ Images look visually similar
```

---

### Test Case 2: Medium JPEG Image (1-3MB)

**Purpose**: Verify that medium images compress to target size range.

**Steps**:
1. Find or create a JPEG image between 1-3MB
2. In the test suite, select this file for the "Medium JPEG" test
3. Click "Test" button
4. Review the results

**Expected Results**:
- ✓ Compressed size should be 500KB-1MB
- ✓ Quality should be reasonable (0.5-0.8)
- ✓ Compression ratio should be 50-70%
- ✓ Visual comparison should show acceptable quality

**Pass Criteria**:
```
✓ Compressed size: 500KB - 1MB
✓ Compression ratio: ≥ 50%
✓ Visual quality acceptable
```

---

### Test Case 3: Large JPEG Image (3-5MB)

**Purpose**: Verify that large images compress efficiently to target size.

**Steps**:
1. Find or create a JPEG image between 3-5MB (typical smartphone photo)
2. In the test suite, select this file for the "Large JPEG" test
3. Click "Test" button
4. Review the results

**Expected Results**:
- ✓ Compressed size should be 500KB-1MB
- ✓ Compression ratio should be 70-80%
- ✓ Quality should be acceptable (0.5-0.8)
- ✓ Visual comparison should show good results

**Pass Criteria**:
```
✓ Compressed size: 500KB - 1MB
✓ Compression ratio: ≥ 70%
✓ Significant file size reduction
✓ Visual quality acceptable for meal photos
```

---

### Test Case 4: PNG Image Conversion

**Purpose**: Verify that PNG images are converted to JPEG for better compression.

**Steps**:
1. Find or create a PNG image (screenshot or graphic)
2. In the test suite, select this file for the "PNG" test
3. Click "Test" button
4. Review the results

**Expected Results**:
- ✓ PNG is converted to JPEG format
- ✓ Compressed size should be significantly smaller
- ✓ Compression ratio should be ≥ 50%
- ✓ Visual quality should be acceptable (some loss expected from format conversion)

**Pass Criteria**:
```
✓ Format converted to JPEG
✓ Compressed size: 500KB - 1MB
✓ Compression ratio: ≥ 50%
✓ Visual quality acceptable
```

---

### Test Case 5: HEIC Image Handling

**Purpose**: Verify that HEIC images are handled gracefully.

**Steps**:
1. Find a HEIC image (from iPhone camera)
2. In the test suite, select this file for the "HEIC" test
3. Click "Test" button
4. Review the results

**Expected Results**:
- ✓ Browser may or may not support HEIC natively
- ✓ If supported: Should compress to JPEG format
- ✓ If not supported: Should show clear error message
- ✓ No crashes or hanging

**Pass Criteria**:
```
✓ If supported: Compresses successfully to JPEG
✓ If not supported: Graceful error handling
✓ No browser crashes or hangs
```

**Note**: HEIC support varies by browser. This test verifies graceful handling rather than successful compression.

---

## Batch Testing

To run all tests at once:

1. Select test images for all 5 test cases
2. Click the green "▶ Run All Tests" button
3. Wait for all tests to complete
4. Review the summary and individual results

## Interpreting Results

### Summary Section

- **Total Tests**: Number of tests run
- **Passed**: Tests that met all criteria
- **Failed**: Tests that didn't meet criteria
- **Avg Compression**: Average compression ratio across all tests

### Individual Test Results

Each test shows:
- Original file size in MB
- Compressed file size in MB
- Compression ratio (percentage)
- Quality level used (0.1-1.0)
- Duration (milliseconds)
- Target met (under 1MB?)
- Visual comparison (original vs compressed)

### Status Indicators

- **Green border + PASS**: Test passed all criteria
- **Red border + FAIL**: Test failed one or more criteria

## Test Evaluation Criteria

The test suite automatically evaluates:

1. **Size Target**: Compressed file must be ≤ 1MB
2. **Quality Target**: Small images must maintain quality ≥ 0.5
3. **Range Target**: Medium/large images must compress to 500KB-1MB range

## Common Issues and Solutions

### Issue: "No tests run yet"
**Solution**: Select at least one test image and click a Test button

### Issue: Test fails with "Over 1MB"
**Solution**: Check if original image is extremely high resolution. The compressor tries to hit 1MB target but may need lower quality for very large images.

### Issue: HEIC test shows error
**Solution**: Expected behavior if browser doesn't support HEIC. Try in Safari or use a different format.

### Issue: Images look too compressed
**Solution**: Check the quality metric. If quality is < 0.5, the compressor had to reduce quality significantly to meet the 1MB target.

## Verification Checklist

After running all tests, verify:

- [ ] All 5 test cases have been run
- [ ] Small JPEG: Maintains quality
- [ ] Medium JPEG: Compresses to 500KB-1MB
- [ ] Large JPEG: Compresses to 500KB-1MB with 70%+ reduction
- [ ] PNG: Converts to JPEG successfully
- [ ] HEIC: Handles gracefully (or compresses if supported)
- [ ] Visual quality is acceptable for all compressed images
- [ ] No console errors in browser DevTools
- [ ] Average compression ratio is 50%+ across all tests

## Expected Performance

Based on the implementation:

- **Compression Speed**: 100-500ms per image (varies by size)
- **Large Images (3-5MB)**: Should compress to 500KB-1MB (70-80% reduction)
- **Medium Images (1-3MB)**: Should compress to 500KB-1MB (50-70% reduction)
- **Small Images (< 1MB)**: May compress less but should maintain quality

## Next Steps After Testing

1. **If all tests pass**: Proceed to subtask-3-2 (End-to-end meal tracking flow test)
2. **If tests fail**: Review failure criteria, adjust compression settings if needed
3. **Document results**: Note any edge cases or issues found

## Test Data Suggestions

For comprehensive testing, use:

1. **Small JPEG**: Webcam photo or resized image (500-800KB)
2. **Medium JPEG**: Digital camera photo at medium resolution (1.5-2.5MB)
3. **Large JPEG**: Smartphone photo at full resolution (3-5MB)
4. **PNG**: Screenshot or logo with text (500KB-2MB)
5. **HEIC**: iPhone photo (if available)

## Additional Notes

- The compression uses HTMLCanvasElement API (browser-native)
- All compressed images are output as JPEG format
- Target settings: Max 1920x1080, initial quality 0.8, target size 1MB
- Quality automatically adjusts downward if needed to meet size target
- Minimum quality is 0.1 to prevent extreme degradation
