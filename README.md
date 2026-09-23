# Dadi Industries Backend

Node.js + Express + MongoDB API for accounts, carts, checkout, orders, payments (PhonePe) and transactional email (Resend).

## Setup

1. Install MongoDB locally or create a MongoDB Atlas database.
2. Copy `.env.example` to `.env` and fill in:
   - `MONGODB_URI` — your database connection string.
   - `JWT_SECRET` — any long random string (used to sign login sessions).
   - `PHONEPE_MERCHANT_ID` / `PHONEPE_SALT_KEY` — from your PhonePe Business dashboard. Without these, online payments are disabled but Cash on Delivery still works.
   - `RESEND_API_KEY` / `RESEND_FROM_EMAIL` — from https://resend.com. Without this, order emails are skipped (logged to the console instead) so local dev still works.
3. Install and run:

```bash
npm install
npm run seed
npm run dev
```

For production, build the TypeScript source to JavaScript and start the emitted server:

```bash
npm run build
npm start
```

The API runs at `http://localhost:4000`.

## Auth

Sessions are stateless JWTs. The frontend stores the token in `localStorage` and sends it as `Authorization: Bearer <token>` on every request that needs a signed-in user.

- `POST /api/auth/register` — `{ name, email, password, phone, address?, city?, state?, pincode? }` → `202 { verificationRequired, email }`. Sends a 6-digit OTP by email; the user is not created until the OTP is verified.
- `POST /api/auth/register/verify` — `{ email, otp }` → `{ token, user }`. Creates the verified MongoDB user and signs them in.
- `POST /api/auth/register/resend` — `{ email }` → confirmation message. Sends a new 10-minute OTP for a pending registration.
- `POST /api/auth/login` — `{ email, password }` → `{ token, user }`.
- `POST /api/auth/password-reset/request` — `{ email }` → confirmation message. Sends a 10-minute reset OTP when the account exists.
- `POST /api/auth/password-reset/confirm` — `{ email, otp, password }` → confirmation message. Replaces the bcrypt password hash.
- `GET /api/auth/me` — requires `Authorization` header → `{ user }`. Used to restore a session on page load.
- `PUT /api/auth/me` — requires `Authorization` header → update profile fields.

**Checkout requires login.** `POST /api/orders` is protected by the same JWT middleware — the request is rejected with `401` if no valid token is attached, regardless of what the frontend does. The order's `userId` is taken from the token, never from the request body.

## Payments — PhonePe

Only PhonePe is integrated (no Razorpay). For `upi`, `card`, or `netbanking` checkout, `POST /api/orders` calls PhonePe's Pay API server-side and returns `payment.redirectUrl`; the frontend redirects the browser there. PhonePe redirects back to `FRONTEND_URL/payment/callback` and also calls the server-to-server webhook at `API_PUBLIC_URL/api/payments/callback`. Order `paymentStatus` is only ever flipped to `paid` after the backend independently confirms the status with PhonePe (`GET /pg/v1/status/...`) — the browser can never mark itself as paid.

`cod` orders skip PhonePe entirely and are confirmed immediately.

## Email — Resend

`src/email.ts` wraps the Resend SDK. Two emails are sent automatically:
- **Verification email** — on registration; the 6-digit code expires after 10 minutes.
- **Welcome email** — after successful email verification.
- **Order confirmation email** — for Cash on Delivery orders, immediately on creation; for online payments, the moment PhonePe confirms `paymentStatus: paid` (in the callback/webhook/status-poll handlers), so a customer is never emailed a "confirmed" order that hasn't actually been paid for.

If `RESEND_API_KEY` isn't set, these calls no-op with a console warning instead of throwing, so local development doesn't require a Resend account.

## API

- `GET /api/health`
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `PUT /api/auth/me`
- `GET /api/products`
- `GET /api/cart` and `PUT /api/cart` with `x-cart-id` for guests, or `Authorization: Bearer <jwt>` for a persistent user cart.
- `GET /api/wishlist` and `PUT /api/wishlist` **(requires auth)** — stores the signed-in user's product IDs in MongoDB.
- `POST /api/orders` **(requires `Authorization: Bearer <token>`)**
- `GET /api/orders/mine` **(requires auth)** — the signed-in user's own orders
- `GET /api/orders/:orderId`
- `GET /api/payments/:orderId` — poll PhonePe status
- `GET/POST /api/payments/callback` — PhonePe redirect + webhook

Checkout payload:

```json
{
  "items": [{ "productId": "amla-aachar-400gm", "weight": "400gm", "quantity": 1 }],
  "customer": {
    "customerName": "Rohit Chauhan",
    "email": "rohit@example.com",
    "phone": "+918630000405",
    "address": "House 1, Rajpur Road",
    "city": "Dehradun",
    "state": "Uttarakhand",
    "pincode": "248001"
  },
  "paymentMethod": "upi"
}
```

Send this with header `Authorization: Bearer <jwt from login/register>`. For `upi`, `card`, or `netbanking`, the response includes `payment.redirectUrl` — send the browser there to complete payment on PhonePe's hosted page.
