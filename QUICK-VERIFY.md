# 🚀 Quick Verification Guide

## Test Virtualization with 50+ Meals

### Step 1: Add Test Data (2 minutes)
```bash
# Install dependency
npm install --save-dev dotenv

# Create .env file (if needed)
echo "VITE_SUPABASE_URL=your_url" > .env
echo "VITE_SUPABASE_ANON_KEY=your_key" >> .env

# Run seeder
node scripts/seed-test-meals.js --count=50
```

### Step 2: Start App & Verify (5 minutes)
```bash
# Start dev server
npm run dev

# Open browser: http://localhost:5173
# Click "Gallery" button
# Open DevTools (F12)
```

### Step 3: Check Virtualization ✅

**In Elements Tab:**
- Look for `.virtualized-gallery-grid`
- Count meal items: Should be 10-20, NOT 50+
- Scroll down: Items should appear/disappear

**In Performance Tab (Cmd+Shift+P → "Show FPS meter"):**
- Scroll through gallery
- FPS should stay 55-60
- Should not drop below 30

**In Task Manager (Shift+Esc):**
- Find your browser tab
- Memory should be < 100MB
- Should stay stable while scrolling

## ✅ Success Criteria

- [ ] Only 10-20 meal items in DOM (not all 50+)
- [ ] Scrolling is smooth (55-60 fps)
- [ ] Memory usage < 100MB
- [ ] Images load progressively (lazy loading)
- [ ] No console errors

## 📚 Detailed Guide

See `.auto-claude/specs/.../VERIFICATION_GUIDE.md` for comprehensive instructions.

## 🐛 Troubleshooting

**Issue:** All 50+ items in DOM
- **Fix:** Check that Grid component is being used (not div)

**Issue:** High memory usage
- **Fix:** Verify images are optimized, check for memory leaks

**Issue:** Jerky scrolling
- **Fix:** Reduce columnWidth, try incognito mode

---

**Need Help?** Check the full verification guide for detailed steps.
