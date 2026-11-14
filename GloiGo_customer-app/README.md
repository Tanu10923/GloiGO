# 🚐 GloiGO Customer App

**Smart Mobility. Seamless Transportation.**

GloiGO is a React Native application built with Expo Go that connects customers to the GloiGO transportation platform through an existing FastAPI backend.

## ✨ Key Features

- Customer registration and login
- Secure authentication using Supabase
- Vehicle booking functionality
- Backend-powered booking history
- Customer profile management
- Pickup address and location details
- Booking item and quantity selection
- Appearance preferences

## 🛠️ Technology Stack

| Technology | Purpose |
|---|---|
| React Native | Mobile application development |
| Expo Go | App development and testing |
| JavaScript | Application logic |
| FastAPI | Backend API integration |
| Supabase | Authentication and database |
| AsyncStorage | Local token and preference storage |

## 📂 Project Structure

```text
GloiGO-Customer-App/
│
├── assets/
├── backend-patch/
├── src/
│
├── App.js
├── app.json
├── babel.config.js
├── package.json
├── package-lock.json
├── .env
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

Copy `.env.example` to `.env` and configure:

```env
EXPO_PUBLIC_API_BASE_URL=http://YOUR_BACKEND_IP:8000
```

**Backend URL Configuration:**

- Physical Android device: Use your computer's LAN IP address.
- Android Emulator: Use `http://10.0.2.2:8000`.
- Deployed backend: Use your HTTPS backend URL.

Do not use `localhost` or `127.0.0.1` on a physical Android device.

### 4. Start the Backend

Ensure that your FastAPI backend is running and its `/health` endpoint returns:

```json
{
  "status": "healthy"
}
```

### 5. Run the Customer App

```bash
npx expo-doctor
npx expo start -c
```

Scan the QR code using Expo Go on your Android device.

If LAN connectivity fails, use:

```bash
npx expo start --tunnel
```

## 🔗 Backend API Integration

The application communicates with the GloiGO FastAPI backend through the following endpoints:

| Method | Endpoint | Functionality |
|---|---|---|
| POST | `/auth/register` | Customer registration |
| POST | `/auth/login` | Customer login |
| GET | `/auth/me` | Retrieve customer profile |
| POST | `/bookings/` | Create a new booking |
| GET | `/bookings/my` | Retrieve booking history |

## 🗄️ Booking Data Management

GloiGO uses backend-based booking management.

- Booking records are stored in Supabase through the FastAPI backend.
- New bookings are submitted using `POST /bookings/`.
- Booking history is retrieved using `GET /bookings/my`.
- Booking history is not stored locally in AsyncStorage.
- The application stores only the authentication access token and appearance preference locally.

## 📋 Backend Integration Requirements

The customer booking form follows the existing backend request model.

Supported booking fields:

- Pickup address
- Mobile number
- Optional pickup coordinates
- Optional paired destination coordinates
- Pads requested
- Pads quantity
- Hygiene items

Additional booking notes are not currently supported by the supplied backend API.

Customer registration currently supports:

- Full name
- Email
- Password
- Role

Phone number is not included in the registration request model. The profile API may return an existing phone number from the profiles table.

## 🔐 Security

- Secure authentication through Supabase.
- Bearer token authentication for protected booking APIs.
- Backend-managed database operations.
- Sensitive credentials are maintained on the backend.
- No Supabase service-role keys, database passwords or Razorpay secrets are exposed in the mobile application.

**Important:** Never commit your actual `.env` file to GitHub.

## 🚧 Current Prototype Limitations

- Explore map currently displays illustrative information rather than verified facility listings.
- Driver dispatch is not integrated into the customer app.
- Live vehicle tracking is not yet connected.
- Razorpay checkout is not yet integrated into the customer app.

## 🔮 Future Enhancements

- Real-time vehicle tracking
- Integrated driver dispatch
- Online payment integration
- Verified facility discovery
- Push notifications
- Enhanced booking management

## 👩‍💻 Project

**GloiGO – Customer Mobile Application**

Part of the GloiGO Smart Mobility & Transportation Management Platform.

---

<p align="center">

**GloiGO**

*Smart Mobility. Seamless Transportation.*

</p>