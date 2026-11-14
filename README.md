# 🚐 GloiGO – Smart Mobility & Transportation Platform

<p align="center">

**Smart Mobility. Seamless Transportation.**

An integrated digital transportation platform connecting customers, drivers and administrators through a unified mobility management system.

</p>

---

## 🌟 About GloiGO

GloiGO is a smart mobility and transportation management platform designed to simplify vehicle booking, streamline driver operations and improve transportation management through technology.

The platform provides a connected ecosystem consisting of a Customer Mobile Application, Driver Mobile Application, Admin Dashboard and a centralized Backend API.

GloiGO aims to make transportation services more accessible, organized and efficient through digital booking, driver management, operational monitoring and integrated payment infrastructure.

## 🎯 Project Objectives

- Simplify the vehicle booking process.
- Connect customers with transportation services.
- Digitize driver registration and management.
- Centralize transportation operations.
- Improve booking and fleet management.
- Provide administrators with operational insights.
- Support secure digital payment integration.

## ✨ Key Features

### 👤 Customer Application
- Customer registration and login.
- Secure user authentication.
- Vehicle booking functionality.
- Pickup and location details.
- Booking history management.
- Customer profile management.
- Backend-powered booking records.

### 🚗 Driver Application
- Driver registration and login.
- Driver profile management.
- Driver application and verification.
- Availability management.
- Booking request management.
- Trip and location updates.

### 🖥️ Admin Dashboard
- Centralized administrative interface.
- Driver management and verification.
- Customer booking management.
- Vehicle and van management.
- Operational statistics.
- Transportation activity monitoring.

### ⚙️ Backend System
- RESTful API architecture.
- FastAPI-based backend.
- Supabase database integration.
- Authentication and authorization.
- Booking management.
- Driver management.
- Payment API integration.
- Administrative API services.

## 🏗️ System Architecture

GloiGO follows a multi-application architecture in which mobile applications and the web dashboard communicate with a centralized backend.

```text
              GloiGO PLATFORM
                     |
       +-------------+-------------+
       |             |             |
   Customer       Driver         Admin
     App            App        Dashboard
       |             |             |
       +-------------+-------------+
                     |
               FastAPI Backend
                     |
          +----------+----------+
          |          |          |
       Supabase   Security   Payment
       Database   Services   Gateway
          |
       Booking & User Data
```

## 🛠️ Technology Stack

| Component | Technologies |
|---|---|
| Customer App | React Native, Expo |
| Driver App | React Native, Expo |
| Admin Dashboard | React, Vite, JavaScript |
| Backend | Python, FastAPI |
| Database | Supabase |
| Authentication | Supabase Authentication |
| Payment Integration | Razorpay |
| API Communication | REST APIs |
| Development Tools | VS Code, Git, GitHub |

## 📂 Project Structure

```text
GloiGO/
│
├── customer-app/
│   ├── assets/
│   ├── src/
│   ├── App.js
│   ├── app.json
│   ├── package.json
│   └── README.md
│
├── driver-app/
│   ├── assets/
│   ├── src/
│   ├── App.js
│   ├── app.json
│   ├── package.json
│   └── README.md
│
├── admin-dashboard/
│   ├── public/
│   ├── src/
│   ├── package.json
│   ├── vite.config.js
│   └── README.md
│
├── backend/
│   ├── routes/
│   ├── main.py
│   ├── database.py
│   ├── security.py
│   ├── requirements.txt
│   └── README.md
│
└── README.md
```

## ⚙️ Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Tanu10923/GloiGO.git
cd GloiGO
```

### 2. Backend Setup

Navigate to the backend directory:

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv .venv
```

Activate the environment on Windows:

```bash
.venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Configure your backend `.env` file using `.env`.

Start the backend:

```bash
uvicorn main:app --reload
```

Backend API documentation:

- Swagger UI: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`

### 3. Customer App Setup

Open a new terminal:

```bash
cd customer-app
npm install
```

Configure the backend URL in `.env`:

```env
EXPO_PUBLIC_API_BASE_URL=http://YOUR_BACKEND_IP:8000
```

Start the application:

```bash
npx expo start
```

### 4. Driver App Setup

```bash
cd driver-app
npm install
npx expo start
```

Configure the backend URL using the driver's app environment configuration.

### 5. Admin Dashboard Setup

```bash
cd admin-dashboard
npm install
```

Configure the backend URL if required:

```env
VITE_API_BASE_URL=http://localhost:8000
```

Start the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

## 🔗 Backend Integration

The applications communicate with the centralized FastAPI backend through REST APIs.

Major API modules include:

| Module | Responsibility |
|---|---|
| Authentication | Customer and driver authentication |
| Bookings | Booking creation and history |
| Drivers | Driver profiles and availability |
| Administration | Driver approvals and operational management |
| Payments | Payment order and verification operations |

The customer application uses backend endpoints such as:

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `POST /bookings/`
- `GET /bookings/my`

Refer to the backend Swagger documentation for complete API routes and request specifications.

## 🔐 Security & Data Management

- Authentication managed through Supabase.
- Protected backend API endpoints.
- Environment-based configuration.
- Sensitive credentials maintained on the backend.
- Bearer token authentication for protected requests.
- Booking records managed through the backend and Supabase.
- Payment credentials are not exposed in mobile applications.

**Important:** Never upload `.env` files, database passwords, Supabase secret keys or Razorpay secrets to GitHub.

## 📊 Platform Advantages

- Unified customer, driver and administrative ecosystem.
- Centralized backend architecture.
- Digital booking management.
- Structured driver operations.
- Scalable application architecture.
- Integrated database and authentication services.
- Modular development approach.

## 🚧 Current Development Status

GloiGO is being developed as an integrated mobility platform.

Some advanced capabilities are still under development or require further integration.

Current prototype limitations include:

- Explore map uses illustrative information rather than verified facility listings.
- Live driver tracking is not fully integrated into the customer application.
- Driver dispatch requires further integration.
- Razorpay checkout is not yet connected to the customer application.

## 🔮 Future Scope

- Real-time vehicle tracking.
- Intelligent driver allocation.
- Advanced route optimization.
- Integrated digital payments.
- Push notifications.
- Advanced fleet analytics.
- Operational cost optimization.
- Enhanced customer experience.

## 👩‍💻 Development & Contribution

GloiGO is developed using a modular architecture to support independent development and maintenance of its applications.

For development:

1. Clone the repository.
2. Configure the required environment variables.
3. Install application dependencies.
4. Start the backend services.
5. Run the required frontend application.
6. Test API integrations before deployment.

## 📄 License

This project is developed as a software project. Licensing and redistribution permissions should be defined by the project owners before public reuse.

---

<p align="center">

# 🚐 GloiGO

**Smart Mobility. Seamless Transportation.**

*Connecting People, Drivers and Transportation Services Through Technology.*

</p>
