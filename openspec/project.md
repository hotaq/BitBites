# Project Context

## Purpose
A shared website for a couple to track their meals. The core interaction consists of a two-step process:
1. Creating an entry with a photo of the full meal.
2. Updating the entry with a photo of the meal after eating (leftovers/empty plate).
The system utilizes AI (specifically Multimodal/Vision LLMs like Gemini API) to detect and analyze the meal consumption.
- **Scoring System**: The AI will assign a score to the user based on the amount of food consumed (e.g., higher score for finishing the meal).

## Tech Stack
- **Frontend**: Vite + React (Suggested for a fast, modern web app)
- **Styling**: Vanilla CSS (Focusing on rich aesthetics and responsiveness)
- **Backend/Database**: Supabase (Database, Auth, Storage)
- **AI Integration**: Gemini API (Vision capabilities)

## Project Conventions

### Code Style
- Modern JavaScript/ES6+ syntax.
- React Functional Components with Hooks.
- CSS Variables for theming (Colors, Fonts).

### Architecture Patterns
- **Client-Side Rendering (CSR)**: Single Page Application.
- **Service Layer**: Dedicated services for Supabase and Gemini API interactions.

### Design Theme
- **Aesthetic**: Pixel Art + Romantic (Hearts, warm tones, retro feel).
- **Color Scheme**: High-contrast Dark/White base with Romantic accents (pinks, reds).
- **Typography**: Retro/Pixel fonts for headers, clean sans-serif for body text.

### Testing Strategy
- Manual testing of the upload flows.
- [Future] Unit tests for utility functions.

### Git Workflow
- Main branch for production-ready code.
- Feature branches for new development.

## Domain Context
- The application focuses on the delta between "Food Full" and "Food Left".
- User base is primarily the user and their girlfriend.

## Important Constraints
- Must handle image uploads efficiently.
- AI analysis should provide meaningful insights on the food eaten.

## External Dependencies
- `@supabase/supabase-js`: For backend interactions.
- `@google/generative-ai`: For Gemini API integration.
