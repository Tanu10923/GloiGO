# 🚀 GloiGO – Admin Dashboard

**Smart Mobility. Seamless Transportation.**

GloiGO Admin Dashboard is a web-based management interface designed to provide centralized control over transportation operations, customer bookings, driver activities and platform administration.

## ✨ Key Features

- Centralized administrative dashboard
- Driver management and verification
- Customer booking management
- Vehicle and van management
- Operational statistics and monitoring
- Booking status management
- Transportation operations overview
- Backend API integration

## 🛠️ Technology Stack

| Technology | Purpose |
|---|---|
| React | Frontend development |
| Vite | Development and build tool |
| JavaScript | Application logic |
| CSS | Interface styling |
| FastAPI | Backend API integration |
| Supabase | Database services |

## 📂 Project Structure

```text
GloiGO-Admin-Dashboard/
│
├── public/
├── src/
│
├── .gitignore
├── eslint.config.js
├── index.html
├── package.json
├── package-lock.json
├── ParticleWave.jsx
├── vite.config.js
└── README.md
```

## ⚙️ Installation & Setup

### 1. Clone Repository

```bash
git clone YOUR_REPOSITORY_URL
cd YOUR_REPOSITORY_NAME
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file if required by the application.

Example:

```env
VITE_API_BASE_URL=http://localhost:8000
```

Use your deployed backend HTTPS URL when deploying the dashboard.

Never expose secret keys or privileged database credentials through frontend environment variables.

### 4. Start Development Server

```bash
npm run dev
```

### 5. Build for Production

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## 🔗 Backend Integration

The dashboard connects with the GloiGO FastAPI backend to support administrative operations, including:

- Driver verification
- Customer booking management
- Vehicle management
- Operational data retrieval
- Dashboard statistics

## 🔐 Security

- Backend-controlled administrative operations
- Secure API communication
- Environment-based configuration
- Protected administrative access

## 🚀 Future Enhancements

- Advanced operational analytics
- Real-time fleet monitoring
- Detailed revenue reports
- Driver performance insights
- Enhanced booking analytics

## 📌 Project Information

**Project:** GloiGO Admin Dashboard

**Platform:** Web Application

**Frontend:** React + Vite

**Backend:** GloiGO FastAPI

---

<p align="center">

**GloiGO**

*Smart Mobility. Seamless Transportation.*

</p>