# 🚐 GloiGO – Driver App

**Smart Mobility. Seamless Transportation.**

GloiGO Driver App is a mobile application built using React Native and Expo, designed to help drivers manage their transportation operations, handle booking requests and stay connected with the GloiGO mobility platform.

## ✨ Key Features

- Driver registration and login
- Driver profile management
- Driver application and verification
- Availability management
- Booking request management
- Trip and booking status management
- Location updates
- Integration with GloiGO backend APIs

## 🛠️ Technology Stack

| Technology | Purpose |
|---|---|
| React Native | Mobile application development |
| Expo | App development and testing |
| JavaScript | Application logic |
| FastAPI | Backend API integration |
| Supabase | Authentication and database |
| AsyncStorage | Local data storage, if configured |

## 📂 Project Structure

```text
GloiGO-Driver-App/
│
├── src/
│
├── App.js
├── app.json
├── package.json
├── package-lock.json
├── .env.example
├── .gitignore
└── README.md
```

## ⚙️ Installation & Setup

### 1. Clone the Repository

```bash
git clone YOUR_REPOSITORY_URL
cd YOUR_REPOSITORY_NAME
```

### 2. Install Dependencies

```bash
npm install
npx expo install --fix
```

### 3. Configure Environment Variables

Copy `.env.example` to `.env` and configure the backend URL.

```env
EXPO_PUBLIC_API_BASE_URL=http://YOUR_BACKEND_IP:8000
```

Use the appropriate backend address:

- Physical Android device: Computer's LAN IP address.
- Android Emulator: `http://10.0.2.2:8000`.
- Deployed backend: HTTPS backend URL.

Do not use `localhost` on a physical Android device.

### 4. Start the Backend

Ensure the GloiGO FastAPI backend is running and accessible.

### 5. Run the Driver App

```bash
npx expo-doctor
npx expo start -c
```

Scan the QR code using Expo Go.

If LAN connectivity fails:

```bash
npx expo start --tunnel
```

## 🔗 Backend Integration

The driver application is designed to communicate with the GloiGO backend for:

- Driver authentication
- Driver registration and application
- Driver profile management
- Availability updates
- Booking request management
- Driver location updates
- Administrative verification

Refer to the backend Swagger documentation at `/docs` for the available API endpoints and request formats.

## 🔐 Security

- Backend-managed authentication
- Protected API access
- Secure environment variable configuration
- Bearer token authentication where required
- No privileged database credentials in the mobile application

Never upload your actual `.env` file or secret credentials to GitHub.

## 🚀 Future Enhancements

- Real-time trip tracking
- Push notifications for booking requests
- Navigation integration
- Driver performance analytics
- Enhanced trip management
- Improved earnings dashboard

## 📌 Project Information

**Project:** GloiGO – Driver Mobile Application

**Platform:** Android / Expo Go

**Backend:** GloiGO FastAPI Backend

---

<p align="center">

**GloiGO**

*Smart Mobility. Seamless Transportation.*

</p>