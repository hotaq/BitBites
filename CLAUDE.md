# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BitBites is a gamified meal tracking application for couples with retro pixel-art aesthetics. It's a React-based SPA where users track meals via a two-step photo process (before/after), receive AI-powered scores from Gemini Vision API, and compete on a leaderboard.

## Tech Stack

- **Frontend**: React 19.2 + Vite 7.2
- **Styling**: Vanilla CSS with CSS variables (pixel-art theme, VT323 font)
- **Backend**: Supabase (Auth, PostgreSQL, Storage)
- **AI**: Google Gemini API (`gemini-3-flash-preview`)
- **Package Manager**: npm

## Common Commands

```bash
# Development
npm run dev          # Start dev server at http://localhost:5173

# Build & Preview
npm run build        # Production build (outputs to dist/)
npm run preview      # Preview production build locally

# Linting
npm run lint         # Run ESLint with React Hooks/Refresh plugins
```

**Note**: No test runner is configured. Testing is manual per `MANUAL_TESTING_GUIDE.md` and `E2E_TESTING_GUIDE.md`.

## Environment Variables

Required in `.env.local`:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GEMINI_API_KEY=your_gemini_api_key
```

## Architecture

### Application Flow
1. **Authentication**: Supabase auth with email/password (`App.jsx`)
2. **Meal Tracking**: 3-step process in `MealTracker.jsx`:
   - Upload "before" meal photo → stored in Supabase Storage
   - User clicks "I'm Finished" after eating
   - Upload "after" photo → Gemini API compares images and returns score 0-100
3. **Bonus System**: Random 30-minute bonus windows (1.5x points) during meal times (`utils/bonusTime.js`)
4. **Gallery**: Displays meal history with before/after comparisons (`MealGallery.jsx`)
5. **Leaderboard**: Ranks users by total score (`Leaderboard.jsx`)

### Directory Structure
```
src/
├── components/           # React components
│   ├── CameraUpload.jsx  # File upload with preview
│   ├── MealTracker.jsx   # Main meal tracking flow (before → after → score)
│   ├── MealGallery.jsx   # Meal history display
│   └── Leaderboard.jsx   # User rankings
├── services/             # External service integrations
│   ├── ai.js            # Gemini API integration (analyzeMeal, calculateMealScore)
│   └── supabase.js      # Supabase client & operations (uploadMealImage, saveMeal, fetchMeals, fetchLeaderboard)
├── utils/                # Utility functions
│   ├── bonusTime.js     # Bonus time calculation system
│   └── imageCompression.js  # Client-side image optimization (used before upload and AI analysis)
├── App.jsx              # Main app with auth state, navigation, bonus banner
├── main.jsx             # React entry point
└── index.css            # Global styles & design system
```

### Key Patterns

**Service Layer**: All external API calls are isolated in `services/`:
- `services/ai.js`: Gemini Vision API for meal analysis and scoring
- `services/supabase.js`: Database operations and storage uploads

**Image Compression**: All images are compressed client-side using `utils/imageCompression.js` before upload to Supabase Storage and before sending to Gemini API. This reduces file sizes by 70-80%.

**Scoring Rules** (enforced in `services/ai.js`):
- Main courses: Full score 0-100
- Instant noodles: Score ÷ 2 (half points)
- Snacks/desserts: Max 70 points with scolding commentary
- Bonus time: Score × 1.5 during random 30-minute windows

**State Management**: React hooks (useState, useEffect, useCallback). Props drilling for callbacks. No external state library.

## OpenSpec Workflow

This project uses OpenSpec for spec-driven development. Read `openspec/AGENTS.md` for full details.

**Quick commands**:
```bash
openspec list                  # List active changes
openspec list --specs          # List specifications
openspec show [item]           # Display change or spec
openspec validate [item] --strict   # Validate changes or specs
openspec archive <change-id> --yes  # Archive after deployment
```

**When to create a proposal**:
- New features or functionality
- Breaking changes (API, schema)
- Architecture or pattern changes
- Performance optimizations that change behavior

**Skip proposal for**:
- Bug fixes (restore intended behavior)
- Typos, formatting, comments
- Dependency updates (non-breaking)

**Structure**: `openspec/changes/[change-id]/`
- `proposal.md` - Why, what, impact
- `tasks.md` - Implementation checklist
- `design.md` - Technical decisions (optional)
- `specs/[capability]/spec.md` - Delta specs with ADDED/MODIFIED/REMOVED requirements

## Design System

CSS variables in `index.css`:
```css
--color-bg: #0a0a0a           /* Dark background */
--color-primary: #ff3366      /* Hot pink */
--color-success: #33ff66      /* Green */
--color-text: #ffffff         /* White */
```

Typography: VT323 (headers), Inter (body). Pixel borders, retro gaming aesthetic.

## Supabase Schema

**meals table**:
```sql
CREATE TABLE meals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  image_before TEXT NOT NULL,
  image_after TEXT NOT NULL,
  score INTEGER NOT NULL,
  analysis TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**profiles table** (optional):
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  username TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Storage**: Public bucket named `meal-images`

## Deployment

Configured for Vercel (`vercel.json`):
- Build command: `npm run build`
- Output directory: `dist`
- SPA routing enabled
