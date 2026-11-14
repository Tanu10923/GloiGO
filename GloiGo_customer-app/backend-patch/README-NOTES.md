GloiGO optional booking notes backend patch

1. Supabase SQL Editor:
   ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS notes TEXT;
   The user has already run this query successfully; do not run it again unless setting up another database.

2. Replace your backend's routes/bookings.py with backend-patch/routes/bookings.py, or manually merge the BookingRequest.notes field and booking_data['notes'] assignment.

3. Restart FastAPI. The Expo app sends notes as a nullable string in POST /bookings/ and displays returned notes in My Bookings.

No Supabase service-role key or backend .env secrets are included in this patch.
