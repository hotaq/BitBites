# BitBites 👾🍔

A shared meal tracking application for couples, designed with a retro "Pixel Art + Romance" aesthetic.

## 🌟 Project Vision
To gamify and share the meal experience between partners.
- **Step 1:** Snap a photo of your full meal.
- **Step 2:** Snap a photo of the "aftermath" (empty plate/leftovers).
- **AI Analysis:** The app uses Gemini API (Vision) to analyze consumption and award a **Score**.
- **Aesthetic:** High-contrast Dark mode with hot pink accents and pixelated fonts.

## 🛠 Tech Stack
- **Frontend:** React + Vite
- **Styling:** Vanilla CSS (Custom Design System with Variables)
- **Backend:** Supabase (Auth, Database, Storage) [Pending Setup]
- **AI:** Google Gemini API [Pending Setup]

## 🎨 Design System
- **Fonts:** `VT323` (Headers), `Inter` (Body)
- **Colors:** Dark Background (`#0a0a0a`), Primary Pink (`#ff3366`)
- **Components:** Pixel-bordered cards, Retro buttons.

## 🚧 Current Status & Next Steps
**Last Update:** Initial Project Scaffold & Design System Implementation.

### ✅ Completed
- [x] Project initialized with Vite/React.
- [x] Dependencies installed (`@supabase/supabase-js`, `@google/generative-ai`).
- [x] Custom CSS Design System implemented (`index.css`).
- [x] Landing Page UI (`App.jsx`).

### 📋 To Do (When Resuming)
1.  **Environment Setup**:
    - Create `.env` file.
    - Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
    - Add `VITE_GEMINI_API_KEY`.
2.  **Backend (Supabase)**:
    - Create `meals` table (columns: `id`, `user_id`, `image_before`, `image_after`, `score`, `created_at`).
    - Set up Storage bucket for images.
3.  **Features**:
    - Implement Camera/File Upload component.
    - Connect Gemini API for image analysis.
    - Build "History" view to see past meals.

## 🚀 How to Run
1.  `npm install` (if dependencies are missing)
2.  `npm run dev`
