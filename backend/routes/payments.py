
import logging
import os
from decimal import Decimal, ROUND_HALF_UP
from uuid import UUID

import razorpay
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from security import get_current_user

load_dotenv()

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/payments",
    tags=["Payments"]
)


class PaymentVerificationRequest(BaseModel):
    booking_id: UUID
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


def get_user_supabase(current_user):
    client = getattr(current_user, "_gloigo_supabase", None)

    if client is None:
        raise HTTPException(
            status_code=500,
            detail="User database connection unavailable"
        )

    return client


def verify_customer(client):
    try:
        result = client.rpc("is_customer", {}).execute()

        if result.data is not True:
            raise HTTPException(
                status_code=403,
                detail="Only customers can make payments"
            )

    except HTTPException:
        raise
    except Exception:
        logger.exception("PAYMENT CUSTOMER VERIFICATION ERROR")
        raise HTTPException(
            status_code=500,
            detail="Unable to verify customer"
        )


def get_razorpay_client():
    key_id = os.getenv("RAZORPAY_KEY_ID")
    key_secret = os.getenv("RAZORPAY_KEY_SECRET")

    if not key_id or not key_secret:
        raise HTTPException(
            status_code=503,
            detail="Payment gateway is not configured"
        )

    return razorpay.Client(
        auth=(key_id, key_secret)
    )


def get_customer_booking(client, booking_id, customer_id):
    result = (
        client.table("bookings")
        .select("*")
        .eq("id", str(booking_id))
        .eq("customer_id", str(customer_id))
        .maybe_single()
        .execute()
    )

    booking = result.data

    if not booking:
        raise HTTPException(
            status_code=404,
            detail="Booking not found"
        )

    return booking


# =====================================
# SELECT CASH ON DELIVERY
# =====================================

@router.post("/{booking_id}/cod")
def select_cod(
    booking_id: UUID,
    current_user=Depends(get_current_user)
):
    client = get_user_supabase(current_user)
    verify_customer(client)

    booking = get_customer_booking(
        client,
        booking_id,
        current_user.id
    )

    if booking["status"] not in ("accepted", "arriving"):
        raise HTTPException(
            status_code=409,
            detail="Payment can be selected after driver acceptance"
        )

    if booking.get("total_amount") is None:
        raise HTTPException(
            status_code=409,
            detail="Final fare is not available yet"
        )

    if booking.get("payment_status") == "paid":
        raise HTTPException(
            status_code=409,
            detail="This booking is already paid"
        )

    if booking.get("razorpay_order_id"):
        raise HTTPException(
            status_code=409,
            detail="An online payment order already exists"
        )

    result = (
        client.table("bookings")
        .update({
            "payment_method": "cod",
            "payment_status": "pending"
        })
        .eq("id", str(booking_id))
        .eq("customer_id", str(current_user.id))
        .execute()
    )

    return {
        "message": "Cash on Delivery selected",
        "payment_method": "cod",
        "payment_status": "pending",
        "booking": result.data[0] if result.data else None
    }



# =====================================
# CREATE / REUSE RAZORPAY ORDER
# =====================================

@router.post("/{booking_id}/create-order")
def create_payment_order(
    booking_id: UUID,
    current_user=Depends(get_current_user)
):
    client = get_user_supabase(current_user)
    verify_customer(client)

    booking = get_customer_booking(
        client,
        booking_id,
        current_user.id
    )

    if booking["status"] not in ("accepted", "arriving"):
        raise HTTPException(
            status_code=409,
            detail="Driver must accept the booking first"
        )

    if booking.get("payment_status") == "paid":
        raise HTTPException(
            status_code=409,
            detail="Booking is already paid"
        )

    if booking.get("total_amount") is None:
        raise HTTPException(
            status_code=409,
            detail="Final fare is not available yet"
        )

    if booking.get("payment_method") == "cod":
        raise HTTPException(
            status_code=409,
            detail="Cash on Delivery is already selected"
        )

    amount = int(
        (Decimal(str(booking["total_amount"])) * 100)
        .quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    )

    if amount <= 0:
        raise HTTPException(
            status_code=400,
            detail="Invalid booking amount"
        )

    gateway = get_razorpay_client()

    try:
        existing_order_id = booking.get("razorpay_order_id")

        # REUSE EXISTING PENDING ORDER
        if existing_order_id:
            if booking.get("payment_method") != "online":
                raise HTTPException(
                    status_code=409,
                    detail="Invalid payment method for existing order"
                )

            order = gateway.order.fetch(existing_order_id)

            if (
                int(order.get("amount", 0)) != amount
                or order.get("currency") != "INR"
            ):
                raise HTTPException(
                    status_code=409,
                    detail="Existing payment order does not match booking fare"
                )

            if order.get("status") == "paid":
                raise HTTPException(
                    status_code=409,
                    detail="Order is already paid. Payment verification is required."
                )

            if order.get("status") not in ("created", "attempted"):
                raise HTTPException(
                    status_code=409,
                    detail="Existing payment order is not available"
                )

            return {
                "message": "Existing payment order reused",
                "key_id": os.getenv("RAZORPAY_KEY_ID"),
                "order_id": existing_order_id,
                "amount": amount,
                "currency": "INR"
            }

        # CREATE NEW ORDER
        order = gateway.order.create({
            "amount": amount,
            "currency": "INR",
            "receipt": str(booking_id),
            "notes": {
                "booking_id": str(booking_id)
            }
        })

        saved = (
            client.table("bookings")
            .update({
                "payment_method": "online",
                "payment_status": "pending",
                "razorpay_order_id": order["id"]
            })
            .eq("id", str(booking_id))
            .eq("customer_id", str(current_user.id))
            .is_("razorpay_order_id", "null")
            .execute()
        )

        if not saved.data:
            logger.error(
                "RAZORPAY ORDER CREATED BUT BOOKING UPDATE FAILED"
            )
            raise HTTPException(
                status_code=409,
                detail="Order was created but booking update failed. Please contact support."
            )

        return {
            "message": "Payment order created",
            "key_id": os.getenv("RAZORPAY_KEY_ID"),
            "order_id": order["id"],
            "amount": amount,
            "currency": "INR"
        }

    except HTTPException:
        raise

    except Exception:
        logger.exception("RAZORPAY ORDER CREATION ERROR")
        raise HTTPException(
            status_code=502,
            detail="Unable to create or retrieve payment order"
        )


# =====================================
# VERIFY RAZORPAY PAYMENT
# =====================================

@router.post("/verify")
def verify_payment(
    data: PaymentVerificationRequest,
    current_user=Depends(get_current_user)
):
    client = get_user_supabase(current_user)
    verify_customer(client)

    booking = get_customer_booking(
        client,
        data.booking_id,
        current_user.id
    )

    if booking.get("payment_status") == "paid":
        return {
            "message": "Payment already verified",
            "payment_status": "paid"
        }

    if booking.get("razorpay_order_id") != data.razorpay_order_id:
        raise HTTPException(
            status_code=400,
            detail="Payment order does not match this booking"
        )

    if booking.get("payment_method") != "online":
        raise HTTPException(
            status_code=400,
            detail="Online payment was not selected"
        )

    gateway = get_razorpay_client()

    try:
        gateway.utility.verify_payment_signature({
            "razorpay_order_id": data.razorpay_order_id,
            "razorpay_payment_id": data.razorpay_payment_id,
            "razorpay_signature": data.razorpay_signature
        })

        payment = gateway.payment.fetch(
            data.razorpay_payment_id
        )

        if payment.get("order_id") != data.razorpay_order_id:
            raise HTTPException(
                status_code=400,
                detail="Payment order verification failed"
            )

        if payment.get("status") != "captured":
            raise HTTPException(
                status_code=409,
                detail="Payment is not captured yet"
            ) 

        if payment.get("currency") != "INR":
            raise HTTPException(
                status_code=400,
                detail="Payment currency does not match"
            )


        expected_amount = int(
            (Decimal(str(booking["total_amount"])) * 100)
            .quantize(Decimal("1"), rounding=ROUND_HALF_UP)
        )

        if int(payment.get("amount", 0)) != expected_amount:
            raise HTTPException(
                status_code=400,
                detail="Payment amount does not match booking fare"
            )

        result = (
            client.table("bookings")
            .update({
                "payment_status": "paid",
                "razorpay_payment_id": data.razorpay_payment_id
            })
            .eq("id", str(data.booking_id))
            .eq("customer_id", str(current_user.id))
            .eq("razorpay_order_id", data.razorpay_order_id)
            .eq("payment_status", "pending")
            .is_("razorpay_payment_id", "null")
            .execute()
        )   

        if not result.data:
            raise HTTPException(
                status_code=409,
                detail="Payment status could not be updated"
            )

        return {
            "message": "Payment verified successfully",
            "payment_status": "paid",
            "booking_id": str(data.booking_id)
        }

    except HTTPException:
        raise
    except Exception:
        logger.exception("RAZORPAY PAYMENT VERIFICATION ERROR")
        raise HTTPException(
            status_code=400,
            detail="Payment verification failed"
        )
