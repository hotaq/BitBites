# BitBites 🎮🍔

> Level up your relationship, one meal at a time.

A gamified meal tracking app for couples with retro pixel-art aesthetics. Track your meals, earn points, and compete on the leaderboard!

![BitBites Banner](https://img.shields.io/badge/Status-Live-success?style=for-the-badge) ![React](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react) ![Vite](https://img.shields.io/badge/Vite-7.2-646CFF?style=for-the-badge&logo=vite)

---

## 🌟 Features

### 📸 Two-Step Meal Tracking
1. **Before Photo**: Snap your full meal
2. **After Photo**: Capture the aftermath (empty plate or leftovers)
3. **AI Analysis**: Gemini Vision API scores your meal completion (0-100 points)

### 🎁 Bonus Time System
- **Random Daily Windows**: Get 1.5x points during random 30-minute bonus periods
- **Three Meal Times**: Breakfast (7-10 AM), Lunch (12-2 PM), Dinner (6-9 PM)
- **Live Banner**: See when bonus time is active with countdown timer
- **Persistent**: Bonus windows stay consistent throughout the day

### 🤖 Smart AI Scoring
- **Main Courses**: Full scoring (0-100 points)
- **Instant Noodles**: Half points (quick power-up penalty!)
- **Snacks**: Max 70 points + scolding commentary ("Go eat real food!")
- **Bonus Multiplier**: 1.5x during bonus time windows

### 🏆 Competitive Features
- **Personal Score Tracking**: See your total points
- **Leaderboard**: Compete with your partner
- **Meal Gallery**: Browse your meal history
- **User Profiles**: Personalized usernames

### 🎨 Retro Aesthetic
- **Pixel Art Design**: VT323 font headers, pixel-bordered cards
- **Dark Mode**: High-contrast with hot pink accents (#ff3366)
- **Animations**: Heartbeat icons, pulsing bonus banners
- **Responsive**: Works on desktop, tablet, and mobile

---

## 🛠 Tech Stack

| Category | Technology |
|----------|-----------|
| **Frontend** | React 19.2 + Vite 7.2 |
| **Styling** | Vanilla CSS (Custom Design System) |
| **Backend** | Supabase (Auth, Database, Storage) |
| **AI** | Google Gemini API (`gemini-3-flash-preview`) |
| **Fonts** | VT323 (Headers), Inter (Body) |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- Supabase account
- Google Gemini API key

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd Projectg

# Install dependencies
npm install

# Set up environment variables
# Create .env.local file with:
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GEMINI_API_KEY=your_gemini_api_key

# Run development server
npm run dev
```

### Supabase Setup

Create the following tables in your Supabase project:

**`meals` table:**
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

**`profiles` table (optional):**
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  username TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Storage bucket:**
- Create a public bucket named `meal-images`

---

## 📖 How to Use

1. **Sign Up/Login**: Create an account or sign in
2. **Track a Meal**:
   - Click "Track Meal"
   - Take a photo of your full meal
   - Eat your meal
   - Take a photo of the aftermath
   - Get your AI-powered score!
3. **Earn Bonus Points**: Watch for the bonus time banner and submit meals during those windows for 1.5x points
4. **View History**: Check the Gallery to see past meals
5. **Compete**: View the Leaderboard to see who's winning!

---

## 🎯 Scoring System

### Base Scores
- **Main Course (Clean Plate)**: 90-100 points
- **Main Course (Half Eaten)**: 50-69 points
- **Instant Noodles**: Base score ÷ 2
- **Snacks**: Max 70 points (with scolding!)

### Bonus Multiplier
- **During Bonus Time**: Score × 1.5
- **Example**: 80 points → 120 points 🎉

---

## 🎨 Design System

### Colors
```css
--color-bg: #0a0a0a           /* Dark background */
--color-primary: #ff3366      /* Hot pink */
--color-success: #33ff66      /* Green */
--color-text: #ffffff         /* White */
```

### Typography
- **Headers**: VT323 (Retro pixel font)
- **Body**: Inter (Clean sans-serif)

---

## 📁 Project Structure

```
Projectg/
├── src/
│   ├── components/
│   │   ├── CameraUpload.jsx      # Camera/file upload
│   │   ├── MealTracker.jsx       # Main tracking flow
│   │   ├── MealGallery.jsx       # Meal history
│   │   └── Leaderboard.jsx       # Rankings
│   ├── services/
│   │   ├── ai.js                 # Gemini API integration
│   │   └── supabase.js           # Supabase client
│   ├── utils/
│   │   └── bonusTime.js          # Bonus time logic
│   ├── App.jsx                   # Main app component
│   └── index.css                 # Global styles
├── public/
├── .env.local                    # Environment variables
└── package.json
```

---

## 🔧 Configuration

### Bonus Time Settings
Edit `src/utils/bonusTime.js` to customize:
- **Multiplier**: Change `BONUS_MULTIPLIER` (default: 1.5)
- **Window Duration**: Modify `generateRandomWindow()` (default: 30 min)
- **Meal Periods**: Update `MEAL_PERIODS` object

### AI Scoring Rules
Edit `src/services/ai.js` to adjust:
- Score ranges for different food types
- Commentary style
- Food type classifications

---

## 🚢 Deployment

### Vercel (Recommended)
```bash
npm run build
# Deploy to Vercel via CLI or GitHub integration
```

Make sure to set environment variables in Vercel dashboard:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_GEMINI_API_KEY`

---

## 🤝 Contributing

This is a personal couples project, but feel free to fork and customize for your own use!

---

## 📝 License

MIT License - Feel free to use this for your own relationship goals! 💕

---

## 🎮 Credits

Built with love using:
- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [Supabase](https://supabase.com/)
- [Google Gemini API](https://ai.google.dev/)
- [VT323 Font](https://fonts.google.com/specimen/VT323)

---

**Made with ❤️ for couples who love food and gaming**
