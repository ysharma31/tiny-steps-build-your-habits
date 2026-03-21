```markdown
# Tiny Steps — Lovable Build Plan
### Clawkathon 2026 · Final version · March 21, 2026

---

## Overview
A warm, organic-themed habit tracker with responsive navigation
(bottom tabs on mobile, left sidebar on desktop), Google OAuth,
Supabase backend, and rich tracking features including daily
checkboxes, streaks, calendar views, progress percentages,
stage-based habit progression inspired by Atomic Habits, and
voice coach integration via ClawdTalk API.

---

## Color Palette (Warm & Organic)
- Background: warm cream (#FAF7F2)
- Primary: deep sage green (#4A7C59)
- Accent: warm honey (#D4A843)
- Cards: soft white (#FFFFFF) with subtle warm shadow
- Text: dark charcoal (#2C2C2A), never pure black
- Muted text: warm gray (#6B6560)

---

## Typography
- Headings: Playfair Display (serif) — import from Google Fonts
- Body: DM Sans — import from Google Fonts
- Never use Inter, Roboto, or system fonts

---

## Responsive Navigation
- **Mobile (< 768px):** fixed bottom tab bar with icons only
  - Home (dashboard), History (habit detail), Settings
- **Desktop (≥ 768px):** fixed left sidebar (240px wide)
  - Full labels: Dashboard, Habit History, Settings
  - Nova's number shown at bottom: "📞 Call Nova: +15096925293"
  - Tiny Steps logo and tagline at top of sidebar

---

## Pages & Layout

### 0. Auth Page (/auth)
- Google OAuth sign-in button (large, full-width, sage green)
- "Tiny Steps" branding with warm friendly tagline:
  "Your daily habit coach. One tiny step at a time."
- Warm cream background, centered card layout
- Redirects to /onboarding for new users, / for returning users

### 1. Onboarding (/onboarding)
- Shown only to first-time users after Google OAuth
- Step 1: Headline "Start tiny. Change everything."
  Phone number input field with label "Nova will call you here"
- Step 2: "Which habits are you building?"
  5 predefined habit tiles in a 2-column grid:
  Workout 🏃, Reading 📚, Screen Time 📵,
  Singing Practice 🎵, AI Tools 🤖
  Each tile toggles selected/unselected on tap
- "Let's go" full-width sage green button at bottom
- Progress dots showing Step 1 / Step 2
- Saves name (from Google profile), phone number,
  and selected habits to Supabase on submit

### 2. Dashboard / Home (/)
- Top bar: "Good morning, [name]" greeting
  Changes based on time of day: morning / afternoon / evening
- Overall daily completion progress bar (sage green)
  Label: "X of Y habits done today"
- Vertical list of habit cards (see Habit Card spec below)
- "Call me now — Nova is ready" pulsing sage green button
  above the bottom tab bar (mobile) or at bottom of main
  content area (desktop)
- Outlined "+" button below habit cards:
  "Add a new habit" — opens inline Add New Habit form

### Habit Card Component
Each habit card shows:
- Habit name in Playfair Display, 18px
- Current stage label: "Stage 2 · 30 min jog"
- Streak badge: rounded pill, sage green, "🔥 5 day streak"
- Progress bar toward next stage (sage green with warm glow)
  Label: "3 of 5 days — 60% to Stage 3"
  Final stage shows: "You've mastered this level! Keep it up."
- 7-day week strip (Mon–Sun):
  Green filled circle = completed
  Gray filled circle = missed
  Outline circle = future
  Day initials above: M T W T F S S
- Full-width "Log Today ✓" button (sage green, 56px height)
  On tap: checkmark animation, button changes to "Logged ✓"
  Rotating affirmation appears below:
  "Small steps, big change." / "You showed up today." /
  "Nova would be proud." / "Every rep counts."
- If already logged today: show logged state, no button

### 3. Add New Habit (inline form on dashboard)
Opens inline below the "+" button — not a modal or popup
- Habit name text input
  Placeholder: "e.g. Meditation, Cold shower, Journaling"
- Dynamic stages list:
  Each stage row has:
  a. Goal description input: "e.g. 5 minutes of meditation"
  b. Days to advance number input: "e.g. 5"
  c. "Final stage" toggle — when on:
     Days to advance disappears
     Shows "Final stage — streak tracked, no advancement"
  "Add another stage +" link below list
- Starting stage dropdown (defaults to Stage 1)
- "Save Habit" sage green button
- Validation errors in warm amber (#D4A843), never red:
  - Habit name cannot be empty
  - At least one stage required
  - Non-final stages need days > 0

### 4. Calling Screen (/calling)
Two options shown side by side:

[📞 I'll call Nova]        [Nova, call me]
Opens tel:+15096925293     Triggers POST to ClawdTalk API

Below both buttons:
"After your call, come back here to log your habits."

Pulsing soft circle animation in background.
"Back from my call" button at bottom — triggers transcript fetch.

### 5. Post-Call Confirmation (/post-call)
- Loading state: "Nova is reviewing your conversation..."
  Soft pulsing animation, warm cream background
- Heading: "Here's what Nova heard today"
- Nova's AI-generated summary in italic, sage green
  left border card, labeled "Nova's notes from your call"
- List of all active habits, each with:
  - Habit name and today's goal
  - "Done ✓" button (sage green filled)
  - "Not today" button (outlined)
  - AI pre-selects based on transcript parsing
  - Low confidence: "Not today" with note
    "Nova wasn't sure — did you do this?"
  - Habit notes from conversation shown in small italic
- "Save to my log" sage green button at bottom
- Error state: "Couldn't reach Nova's notes —
  just tell us what you did today."
  All habits default to manual selection

### 6. Habit Detail (/habit/:id)
- Habit name and current stage at top
- Monthly calendar heatmap:
  Green = completed, gray = missed
- Streak stats: Current streak + best streak
- Stage history: list of stages completed with dates
- Progress percentage toward next stage
- Edit habit name and stages
- Archive habit option

### 7. Settings (/settings)
- Profile section:
  Display name, avatar from Google, phone number (editable)
- Daily check-in time picker:
  "Nova calls me every day at [time picker]"
  Label: "Nova will call you daily at [selected time]"
  Saves to profiles.preferred_call_time in Supabase
- Notification toggles:
  "Browser notifications" on/off
  "SMS reminder from Nova" on/off (15 min before call)
  "In-app reminder" on/off (if habits not logged by 8pm)
- Habit thresholds:
  Each habit listed with editable "days to advance" per stage
  Final stages shown as read-only "Final stage"
  Save button: "Got it — Nova will adjust your pace."
- Sign out button (outlined, bottom of page)

---

## Database Schema (Supabase)

**profiles**
- user_id (FK auth.users)
- display_name (text)
- avatar_url (text)
- phone_number (text)
- preferred_call_time (time)
- created_at

**categories**
- id (uuid)
- user_id (nullable for predefined)
- name (text)
- icon (text)
- is_custom (boolean)

**habits**
- id (uuid)
- user_id (FK auth.users)
- category_id (FK categories)
- name (text)
- current_stage (int, default 0)
- streak (int, default 0)
- habit_stages (jsonb) — [{goal, advanceAfterDays, isFinal}]
- target_count (int, nullable)
- created_at
- archived (boolean, default false)

**habit_logs**
- id (uuid)
- habit_id (FK habits)
- user_id (FK auth.users)
- date (date)
- completed (boolean)
- notes (text, nullable) — from AI transcript parsing
- progress_value (int, nullable)
- created_at

**pending_confirmations**
- id (uuid)
- user_id (FK auth.users)
- conversation_id (text) — from ClawdTalk
- parsed_habits (jsonb) — Claude's parsed output
- created_at
- confirmed (boolean, default false)

RLS on all tables scoped to auth.uid().
Trigger to auto-create profile on signup.
Predefined categories seeded with user_id = null.

---

## Implementation Order

1. Supabase setup — all tables, RLS, seed predefined categories
2. Auth — Google OAuth, profile auto-creation, redirect logic
3. Onboarding — phone input, habit tile selection, Supabase write
4. Dashboard UI — habit cards (static data first), daily progress bar
5. Habit card component — all tracking features, animations
6. Add New Habit — inline form with dynamic stages
7. Connect Supabase to dashboard — live data, replace static
8. Stage progression logic — src/lib/progression.ts
9. Weekly day tracker — 7-day circle strip on each card
10. Calling screen — two call options, tel: link + API trigger
11. Post-call confirmation — transcript fetch, Claude parsing,
    habit confirmation, Supabase write
12. Habit Detail page — calendar heatmap, streak stats
13. Settings — time picker, notification toggles, thresholds
14. SMS reminder — ClawdTalk SMS API on schedule
15. Scheduled call — Supabase cron + ClawdTalk events API
16. Webhook handler — auto post-call processing (if time allows)
17. Styling pass — CSS variables, fonts, responsive polish
18. Visual Edit pass — free tweaks, no credits

---

## Technical Notes

- Import Playfair Display and DM Sans from Google Fonts
- Use shadcn/ui: Card, Button, Dialog, Calendar, Progress,
  Checkbox, Toggle, Tabs
- All Supabase queries via React Query
- src/lib/habits.ts — predefined habit config, provided separately,
  NEVER auto-generate or modify this file
- src/lib/progression.ts — stage advancement logic
- src/lib/clawdtalk.ts — all ClawdTalk API calls
- src/lib/claude.ts — Anthropic transcript parsing

## Environment Variables
- CLAWDTALK_API_KEY
- CLAWDTALK_ASSISTANT_ID: 253ec8ef-4702-4bfd-b433-5f7f1a4718ec
- NOVA_PHONE_NUMBER: +15096925293
- ANTHROPIC_API_KEY
- SUPABASE_URL
- SUPABASE_ANON_KEY

Never hardcode any of these values.
Never modify src/lib/habits.ts automatically.
Always handle loading states and error states for every API call.
Never use localStorage.
Always use Tailwind classes, never inline styles.

```