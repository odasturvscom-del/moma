# Moma: pregnancy to postpartum companion (Expo / React Native)

Runs on iPhone and Android, and in a browser.

## Run it on your phone (about 5 minutes)
1. Install Node.js 20+ on your laptop (nodejs.org) and the free **Expo Go** app on your phone.
2. Unzip this folder, open a terminal in it and run:
   ```
   npm install
   npx expo start
   ```
3. Scan the QR code with your phone camera (iPhone) or the Expo Go app (Android). Phone and laptop need to be on the same Wi-Fi.
   If it won't connect, try `npx expo start --tunnel`.

Moma works straight away in offline mode (common questions, week-by-week content, all tracking and the safety checks).

## Turn on the full AI
The model key stays on a small server, never on the phone.
```
ANTHROPIC_API_KEY=sk-ant-...  node server/index.mjs
# or: OPENAI_API_KEY=sk-...    node server/index.mjs
# optional: MOMA_MODEL=<model id> to pick a specific model
```
Then in the app go to **Me → AI companion**, enter `http://<your laptop's local IP>:8787`, tap Save and Test connection.
(On a Mac: System Settings → Wi-Fi → Details shows the IP.) You can also set `EXPO_PUBLIC_MOMA_API_URL` in a `.env` file.

## What's inside
- `App.tsx` app shell and tab bar
- `src/screens/` Onboarding, Today, Check-in, Track (symptoms, movements, contractions, appointments, feeds, nappies), Ask Moma, Journey, Me
- `src/safety.ts` deterministic red-flag rules that run before any AI call, with one-tap call buttons for local emergency and urgent numbers
- `src/ai.ts` personal context builder, offline answers, appointment summary, server client
- `src/content.ts` week-by-week, milestones, postpartum guide, country numbers
- `server/index.mjs` zero-dependency AI proxy (system prompt, server-side red-flag check, Anthropic or OpenAI)

## Ship it
- TestFlight / Play internal testing: `npm i -g eas-cli && eas login && eas build --profile preview`
- Host the server anywhere that runs Node (Render, Fly.io, Railway) and set its URL in `EXPO_PUBLIC_MOMA_API_URL`.

Moma supports, never replaces, a midwife or doctor. Content needs clinical review before real users.

## Put it online for free (Vercel)
1. Create a free GitHub account, click **New repository**, name it `moma`, then **uploading an existing file** and drag in everything inside this folder (not node_modules or dist).
2. Go to vercel.com, **Sign up with GitHub**, click **Add New → Project**, pick `moma`, then **Import**.
3. Before deploying, open **Environment Variables** and add `ANTHROPIC_API_KEY` (or `OPENAI_API_KEY`) with your key.
4. Click **Deploy**. In about two minutes you get a link like `https://moma-xyz.vercel.app` that anyone can open. On a phone, use Share → Add to Home Screen and it behaves like an app.

The AI runs at `/api/chat` on the same site, so the key never reaches anyone's phone.

## Making changes
Edit any file on GitHub (pencil icon) or with GitHub Desktop and commit. Vercel rebuilds and updates the live link automatically within a couple of minutes. Every change also gets its own preview link, so you can check it before it goes live.
