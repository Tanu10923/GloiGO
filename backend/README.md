
# 🚐 GloiGO – Backend API

<p align="center">
  <b>Smart Mobility. Seamless Transportation.</b>
</p>

<p align="center">
  A backend system powering GloiGO's transportation,
  driver management, booking and payment operations.
</p>

---

## 📌 About the Project

GloiGO is a transportation and mobility platform designed
to connect customers, drivers and administrators through
a unified digital system.

This repository contains the backend application responsible
for API services, authentication, booking operations,
driver management, administrative controls and payments.

## ✨ Key Features

- User registration and login
- Secure authentication using Supabase
- Customer booking management
- Driver registration and verification
- Driver availability and location updates
- Booking acceptance and trip management
- Fare calculation
- Admin dashboard APIs
- Driver approval and rejection
- Van management
- Online payments through Razorpay
- Cash on Delivery support

## 🛠️ Technology Stack

| Technology | Purpose |
|---|---|
| Python | Backend programming |
| FastAPI | REST API framework |
| Supabase | Database and authentication |
| Pydantic | Request validation |
| Razorpay | Payment integration |
| Uvicorn | ASGI server |

## 📂 Project Structure

```text
backend/
│
├── routes/
│   ├── admin.py
│   ├── auth.py
│   ├── bookings.py
│   ├── drivers.py
│   └── payments.py
│
├── main.py
├── database.py
├── security.py
├── requirements.txt
├── .env
├── .gitignore
└── README.md
```

## ⚙️ Installation & Setup

### 1. Clone the Repository

```bash
git clone YOUR_REPOSITORY_URL
cd YOUR_REPOSITORY_NAME/backend
```

### 2. Create a Virtual Environment

Windows:

```bash
python -m venv .venv
.venv\Scripts\activate
```

macOS / Linux:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables

Create a `.env` file in the backend directory.

Add the following variables:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
SUPABASE_SECRET_KEY=your_supabase_secret_key

RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

Never upload your actual `.env` file or secret credentials
to a public repository.

### 5. Run the Backend

```bash
uvicorn main:app --reload
```

The development server will start at:

http://127.0.0.1:8000

## 📖 API Documentation

FastAPI automatically generates interactive API documentation.

| Documentation | URL |
|---|---|
| Swagger UI | /docs |
| ReDoc | /redoc |
| Health Check | /health |

## 🔗 API Modules

### Authentication
- POST /register
- POST /login
- POST /forgot-password
- POST /reset-password
- GET /me

### Bookings
- POST /
- GET /my
- PATCH /{booking_id}/cancel
- GET /{booking_id}/driver-location

### Driver Management
- POST /apply
- GET /me
- PATCH /availability
- GET /bookings
- PUT /location

### Administration
- GET /drivers/pending
- GET /drivers/approved
- PATCH /drivers/{user_id}/review
- GET /bookings/all
- GET /vans
- POST /vans
- GET /dashboard/stats

### Payments
- POST /{booking_id}/cod
- POST /{booking_id}/create-order
- POST /verify

Note: The routes above are relative to their respective
FastAPI router prefixes. Refer to `/docs` for complete
request parameters and response schemas.

## 🔐 Security

- Environment-based secret management
- Bearer token authentication
- Supabase access-token verification
- Protected administrative operations
- Payment signature verification

## 🚀 Future Scope

- Enhanced real-time vehicle tracking
- Advanced operational analytics
- Improved notification management
- Scalable transportation infrastructure

## 👩‍💻 Development

Contributions and improvements are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Implement your changes.
4. Test the APIs.
5. Submit a pull request.

## 📄 License

Specify the applicable project license before distributing
or reusing this software.

---

<p align="center">
  <b>GloiGO</b><br>
  Smart Mobility. Seamless Transportation.
</p>
