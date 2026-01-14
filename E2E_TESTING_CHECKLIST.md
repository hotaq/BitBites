# Quick E2E Testing Checklist

**Subtask**: 3-2 - End-to-end meal tracking flow verification
**Date**: 2026-01-14
**Status**: Ready for manual testing

---

## Pre-Test Setup

- [ ] Dev server running: http://localhost:5173
- [ ] Browser DevTools open (F12)
- [ ] Console tab visible
- [ ] Network tab visible
- [ ] Test images ready (2x JPEG files, 3-5MB each)

---

## Test Execution

### Step 1: Open App and Login
- [ ] App loads without errors
- [ ] No console errors
- [ ] UI displays correctly

### Step 2: Navigate to Track Meal
- [ ] MealTracker component renders
- [ ] Progress indicator shows "1. Snap" as active
- [ ] "Capture Meal" button visible

### Step 3: Upload Before Photo
- [ ] Click "Capture Meal"
- [ ] Select 3-5MB test image
- [ ] Image preview displays
- [ ] Progress advances to "2. Eat"
- [ ] No console errors

### Step 4: Click "I'm Finished!"
- [ ] Button click advances flow
- [ ] Progress shows "3. Score" as active
- [ ] "Capture Aftermath" button appears

### Step 5: Upload After Photo
- [ ] Click "Capture Aftermath"
- [ ] Select 3-5MB test image
- [ ] After image preview displays
- [ ] "Calculate Score" button appears
- [ ] No console errors

### Step 6: Click "Calculate Score"
- [ ] Button shows "AI Analyzing..."
- [ ] Network tab shows Gemini API request
- [ ] Request payload size < 2MB (compressed)
- [ ] No console errors

### Step 7: Verify AI Analysis Completes
- [ ] Result screen appears
- [ ] Score is displayed (0-100)
- [ ] Commentary is shown
- [ ] No timeout errors

### Step 8: Verify Meal Saved
- [ ] No upload errors in console
- [ ] Result screen displays correctly
- [ ] No error alerts
- [ ] (Optional) Supabase storage shows 500KB-1MB files

### Step 9: Navigate to Gallery
- [ ] Gallery loads without errors
- [ ] Your meal appears in gallery
- [ ] Both images display correctly
- [ ] Images load quickly
- [ ] Image quality acceptable

### Step 10: Check Console
- [ ] No JavaScript errors
- [ ] No network errors
- [ ] No compression errors
- [ ] No Supabase errors
- [ ] No AI API errors

---

## Overall Result

**PASS** if: All 10 steps complete without blocking errors ✓

**FAIL** if: Any step fails with error ✗

---

## Test Notes

**Images used**:
- Before: [File size, format]
- After: [File size, format]

**Issues found**:
- [None]

**Performance observations**:
- Compression time: ~___ms
- AI analysis time: ~___s
- Upload time: ~___s
- Gallery load time: ~___s

**Browser tested**: ___________________
**OS**: ___________________
**Date/time**: ___________________

---

## Tester Signature

**Tested by**: ___________________
**Date**: ___________________
**Result**: [ ] PASS  [ ] FAIL

**Additional comments**:
_______________________________________________________________
_______________________________________________________________
_______________________________________________________________

---

**For detailed instructions, see E2E_TESTING_GUIDE.md**
