from routes.payments import router as payments_router
from routes.drivers import router as drivers_router
from routes.bookings import router as bookings_router
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.admin import router as admin_router

from routes.auth import router as auth_router

app = FastAPI(
    title="GloiGO",
    description="GloiGO application backend",
    version="1.0.0"
)

# Allow local development frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register authentication APIs
app.include_router(auth_router)
app.include_router(bookings_router)
app.include_router(drivers_router)
app.include_router(admin_router)
app.include_router(payments_router)


@app.get("/")
def home():
    return {
        "message": "Welcome to GloiGO backend",
        "status": "running"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }
