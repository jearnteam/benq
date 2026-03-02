# BenQ (Competitive JLPT Quiz Platform)

BenQ is a real-time competitive Japanese language quiz platform  
designed to combine learning and ranking-based competition.

This project was developed as a graduation project and focuses on:

- Real-time multiplayer quiz battles
- ELO-based rating system
- Fair winner judgment (score + speed tiebreaker)
- Rank progression from N5 to N1
- Daily practice tracking system

---

## Tech Stack

### Frontend
- Next.js 14 (App Router)
- React
- TypeScript
- Tailwind CSS
- NextAuth.js

### Backend
- Node.js
- WebSocket (ws)
- MongoDB
- Mongoose

### Realtime
- Dedicated WebSocket server for:
  - Matchmaking
  - Countdown synchronization
  - Live score updates
  - Answer submission
  - Timer handling

---

## Features

### 1. Real-Time Match System
- Queue-based matchmaking per JLPT level (N5–N1)
- 3-second synchronized countdown
- 30-second per question timer
- Automatic match ending
- Reconnection handling

### 2. Fair Winner Determination
Winner is determined by:
1. Higher score
2. If tied → Faster completion time
3. If both score 0 → Draw

### 3. ELO Rating System
- Dynamic rating calculation
- Win / Loss / Draw tracking
- Separate rating per JLPT level

### 4. Daily Practice Mode
- Normal quiz mode
- Attempts stored per day
- Monthly heatmap visualization

### 5. Rank Leaderboard
- Top 50 ranking per level
- Dynamic rating sorting

---

# 🏗️ Project Structure

## ⚙️ Installation

### 1. Clone Repository

```bash
git clone https://github.com/jearnteam/benq.git
cd benq
```
### 2. Install Dependencies
```bash
npm install
```
### 3. Setup Environment Variables
- Create .env
```bash
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
MONGODB_URI=
NEXT_PUBLIC_WS_URL=ws://localhost:5000/realtime
```
### 4. Start Development Server
```bash
npm run dev
```
### 5. Start WebSocket Server
```bash
node realtime-server/index.js
```

## System Design Highlights

- Queue locking system prevents duplicate matchmaking.
- Active connection map ensures newest tab controls the session.
- Countdown synchronization handled server-side.
- Speed-based tiebreaker ensures competitive fairness.
- Server authoritative model prevents client cheating.

## Future Improvements

- Spectator mode / Private room
- Match history UI
- AI opponent

## References

- Next.js Official Website: https://nextjs.org/
- MongoDB Official Website: https://www.mongodb.com/
- Mongoose Documentation: https://mongoosejs.com/
- NextAuth.js Official Website: https://next-auth.js.org/
- MDN Web Docs: https://developer.mozilla.org/

## Author

Aung Kaung Myat
- Graduation Project – Japanese Language Competitive Learning Platform