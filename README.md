# Dhyanee LMS

> AI-Powered Learning Management System with real-time attention monitoring, strict video controls, and anti-cheating features.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- Cloudinary account (optional, for snapshots)

### 1. Backend Setup

```bash
cd server
npm install
# Edit .env with your MongoDB URI and Cloudinary credentials
npm run dev
```

**First-time admin creation:**
```bash
curl -X POST http://localhost:5000/api/auth/seed-admin
# Creates: admin@dhyanee.com / Admin@1234
```

### 2. Frontend Setup

```bash
cd client
npm install
# .env.local is pre-configured for localhost
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🏗️ Architecture

```
dhyanee/
├── server/                 # Node.js + Express backend
│   ├── src/
│   │   ├── config/db.js   # MongoDB connection
│   │   ├── models/        # Mongoose schemas
│   │   ├── routes/        # REST API routes
│   │   ├── middleware/    # JWT auth, upload
│   │   ├── socket/        # Socket.io handlers
│   │   └── services/      # Cloudinary
│   └── .env               # Environment variables
│
└── client/                 # Next.js 14 frontend
    ├── app/
    │   ├── login/          # Auth pages
    │   ├── signup/
    │   ├── admin/          # Admin panel
    │   │   ├── dashboard/
    │   │   ├── courses/
    │   │   ├── students/
    │   │   └── monitoring/ # Real-time monitoring
    │   └── student/        # Student panel
    │       ├── dashboard/
    │       ├── courses/
    │       ├── lecture/    # Lecture player
    │       └── profile/
    ├── components/
    │   └── AttentionMonitor.tsx  # AI face detection
    ├── lib/
    │   ├── api.ts          # Axios client
    │   └── socket.ts       # Socket.io client
    └── store/
        └── authStore.ts    # Zustand auth
```

---

## ⚙️ Environment Variables

### Server (`server/.env`)
| Variable | Description |
|---|---|
| `PORT` | Server port (default: 5000) |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret key for JWT signing |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `CLIENT_URL` | Frontend URL for CORS |

### Client (`client/.env.local`)
| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API URL |
| `NEXT_PUBLIC_SOCKET_URL` | Backend socket URL |

---

## 🔑 Key Features

### Video Restriction System
- Students **cannot skip ahead** beyond their maximum watched timestamp
- Progress auto-saved every 5 seconds
- Automatic resume from last position
- Playback speed capped at 1.25x

### Anti-Cheat
- Right-click disabled
- Keyboard shortcuts blocked
- Tab switch detected → video pauses
- DevTools detection
- Speed abuse prevention

### AI Attention Monitoring
- Real-time face detection via face-api.js
- Eye direction tracking
- 20-second distraction threshold → alert + snapshot
- Focus score (0–100) based on face detection rate
- All events logged to database

### Real-time Admin Monitoring
- Live student cards via Socket.io
- Focus score rings per student
- Distraction alert feed with snapshots
- Watch progress per student

---

## 📦 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Animations | Framer Motion |
| State | Zustand |
| Backend | Node.js, Express.js |
| Database | MongoDB (Mongoose) |
| Auth | JWT |
| Realtime | Socket.io |
| AI | face-api.js |
| Storage | Cloudinary |
| Charts | Chart.js, react-chartjs-2 |
