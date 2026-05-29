# Login Flow Analysis

Prepared on: 2026-05-29  
Source app: `../Vibrant-Life-mobile-app`  
Target app: `Nivaana-Ecom-Web`

## 1. Overview

The mobile app uses mobile-number OTP authentication. There is no email/password login in the customer mobile flow.

Main flow:

```text
Login Screen
  -> Phone Number Screen
    -> Request OTP
      -> OTP Verification Screen
        -> Store tokens and user data
          -> Navigate to main app or previous protected flow
```

Source files:

```text
src/screens/auth/LoginScreen.tsx
src/screens/auth/PhoneLoginScreen.tsx
src/screens/auth/OtpLoginScreen.tsx
src/api/authService.ts
src/contexts/AuthContext.tsx
src/api/config.ts
src/api/endpoints.ts
```

## 2. Entry Point

The app decides the first screen from auth state.

```text
If authenticated -> Main
If not authenticated -> Login
```

Mobile source:

```text
src/navigation/AppNavigator.tsx
```

Logic:

```ts
initialRouteName={isAuthenticated ? "Main" : "Login"}
```

For web, this maps to:

```text
Authenticated user -> home/account/cart based on route
Unauthenticated user -> public browsing allowed, protected routes redirect to /login
```

Recommended web behavior:

- Public routes should not force login.
- Protected routes should redirect to `/login`.
- Checkout should save the intended route and return after OTP verification.

## 3. Screen 1: Login Landing

Mobile screen:

```text
LoginScreen.tsx
```

User actions:

| Action | Mobile Behavior | Web Behavior |
| --- | --- | --- |
| Login | Navigate to phone-number entry | Navigate to `/login` or show phone input |
| Continue as Guest | Navigate to main app | Allow browsing without auth |

Important note:

In mobile, `Continue as Guest` only navigates to the main app. It does not immediately create a guest user. Guest user creation exists separately for checkout through `POST /users/guest`.

For web:

- Users should be able to browse products without logging in.
- Cart can be local for guest users.
- Login should be required before checkout/payment, wishlist, profile, and orders.

## 4. Screen 2: Phone Number Entry

Mobile screen:

```text
PhoneLoginScreen.tsx
```

User enters:

```text
10-digit Indian mobile number
```

Validation rules:

```text
Must be 10 digits
Must start with 6, 7, 8, or 9
Country code is fixed as +91
Only numeric input is allowed
```

Validation function:

```text
isValidMobileNumber()
```

Regex:

```ts
/^[6-9]\d{9}$/
```

After validation, app calls the OTP request API.

## 5. Request OTP API

Endpoint:

```http
POST /mobile-auth/request-otp
```

Base URL:

```text
Production: https://nivaana-715569764663.asia-south1.run.app/v1
```

Request payload:

```json
{
  "usermobilenumber": 9876543210
}
```

Expected response:

```json
{
  "success": true,
  "data": {
    "mobileNumber": 9876543210,
    "otpSent": true,
    "isNewUser": false,
    "expiresIn": 300,
    "canResendAfter": 60
  },
  "message": "OTP sent successfully"
}
```

Mobile timeout:

```text
30 seconds
```

Error handling:

| Status | Meaning | User Message |
| --- | --- | --- |
| 400 | Invalid mobile number | Invalid mobile number. Please check and try again. |
| 429 | Too many OTP requests | Too many OTP requests. Please wait and try again. |
| Other | General failure | Failed to send OTP. Please try again. |
| Network | Connection issue | Network error. Please check your connection. |

After success:

```text
Navigate to OTP screen with mobileNumber and isNewUser
```

Web route recommendation:

```text
/login/otp?mobile=9876543210
```

Better web implementation:

Store `mobileNumber` and `isNewUser` in temporary route state or session storage rather than exposing full state in query params.

## 6. Screen 3: OTP Verification

Mobile screen:

```text
OtpLoginScreen.tsx
```

User enters:

```text
4-digit OTP
```

Timers:

| Timer | Duration | Purpose |
| --- | --- | --- |
| Resend cooldown | 60 seconds by default | Prevent immediate resend |
| OTP expiry | 300 seconds by default | Show expiry countdown |

If backend provides `canResendAfter` or `expiresIn`, mobile uses backend values.

## 7. Verify OTP API

Endpoint:

```http
POST /mobile-auth/verify-otp
```

Request payload:

```json
{
  "usermobilenumber": 9876543210,
  "otp": 1234
}
```

Expected response:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "useremail": "",
      "usermobilenumber": 9876543210,
      "firstname": "",
      "lastname": "",
      "gender": "",
      "gstnumber": "",
      "isbusinessuser": false,
      "isguest": false,
      "createddate": 1710000000,
      "modifieddate": 1710000000,
      "fcmid": null
    },
    "token": "jwt-access-token",
    "refreshToken": "jwt-refresh-token",
    "expiresIn": 3600,
    "isNewUser": false
  },
  "message": "OTP verified successfully"
}
```

Mobile stores:

```text
ACCESS_TOKEN
REFRESH_TOKEN
USER_DATA
```

Then it calls:

```text
AuthContext.login(userData)
```

## 8. Verify OTP Error Handling

| Status | Meaning | User Message |
| --- | --- | --- |
| 400 | Invalid OTP format or bad request | Invalid OTP. Please check and try again. |
| 401 | OTP rejected | Invalid OTP. Please try again. |
| 410 | OTP expired | OTP expired. Please request a new one. |
| Other | General failure | Failed to verify OTP. Please try again. |
| Network | Connection issue | Network error. Please check your connection. |

## 9. Auth State Mapping

Mobile API user:

```ts
{
  id: number;
  useremail: string;
  usermobilenumber: number;
  firstname: string;
  lastname: string;
  gender: string;
  gstnumber: string;
  isbusinessuser: boolean;
  isguest?: boolean;
}
```

Mobile app user:

```ts
{
  id: string;
  name: string;
  phoneNumber: string;
  email?: string;
  gender?: string;
  isBusinessUser: boolean;
  gstNumber?: string;
}
```

Name mapping:

```text
firstname + lastname -> name
```

Empty email, gender, and GST values become `undefined` in app state.

For web, use a similar normalized user object.

## 10. Token Refresh and 401 Handling

Mobile API client automatically attaches:

```http
Authorization: Bearer {ACCESS_TOKEN}
```

On 401:

```text
If refresh token exists:
  POST /auth/refresh
  Store new access token and refresh token
  Retry original request

If refresh fails or no refresh token:
  Clear auth storage
  Reset user to unauthenticated
```

Refresh endpoint:

```http
POST /auth/refresh
```

Payload:

```json
{
  "refreshToken": "jwt-refresh-token"
}
```

For web, implement this in the API client interceptor.

## 11. Post-Login Redirect

Mobile supports a `postLoginRedirect` in `AuthContext`.

Used when checkout requires login:

```text
User is in checkout
  -> auth required
  -> save redirect target
  -> login with OTP
  -> return to checkout
```

Special mobile handling:

```text
If redirect target is Checkout:
  replace Main
  navigate to CartTab -> Checkout
```

For web:

Use query param or route state:

```text
/login?redirect=/checkout/address
```

After OTP verification:

```text
redirect exists -> navigate to redirect
no redirect -> navigate to /
```

## 12. Guest Mode

Mobile has guest support in `AuthContext`, but there are two different ideas:

1. Continue as guest from login screen:

```text
Navigate to Main without creating guest user
```

2. Guest user creation for checkout:

```http
POST /users/guest
```

Payload:

```json
{
  "firstname": "Guest Name",
  "useremail": "guest@example.com",
  "usermobilenumber": 9876543210
}
```

For current web login implementation, prioritize normal OTP login.

Guest checkout can be added later if required.

## 13. Recommended Web Login Flow

### Route Flow

```text
/login
  User enters mobile number
  Validate number
  POST /mobile-auth/request-otp
  Navigate to /login/otp

/login/otp
  User enters 4-digit OTP
  POST /mobile-auth/verify-otp
  Store token, refresh token, user data
  Fetch latest user profile if needed
  Redirect to saved route or home
```

### UI States

Phone number screen:

```text
Idle
Invalid number
Sending OTP
OTP sent
Request failed
```

OTP screen:

```text
Idle
Invalid OTP
Verifying OTP
Verified
Verification failed
Resending OTP
OTP expired
```

### Required Client State

```ts
type AuthState = {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AppUser | null;
  accessToken: string | null;
  refreshToken: string | null;
};
```

### Required Auth Actions

```ts
requestOtp(mobileNumber)
verifyOtp(mobileNumber, otp)
login(userData, token, refreshToken)
logout()
refreshUserData()
setPostLoginRedirect(path)
clearPostLoginRedirect()
```

## 14. Web Implementation Checklist

- Create `/login` page with mobile number input.
- Validate Indian mobile number before API call.
- Call `POST /mobile-auth/request-otp`.
- Create `/login/otp` page with 4-digit OTP input.
- Add resend OTP countdown.
- Add OTP expiry countdown.
- Call `POST /mobile-auth/verify-otp`.
- Store access token, refresh token, and user data.
- Normalize API user into app user.
- Add API interceptor for bearer token.
- Add refresh-token retry on 401.
- Add auth guard for checkout/account routes.
- Add post-login redirect.
- Add logout action.
- Clear auth state on invalid/expired session.

## 15. Suggested Web Pseudocode

### Request OTP

```ts
async function requestOtp(mobileNumber: string) {
  const cleaned = mobileNumber.replace(/\D/g, "");

  if (!/^[6-9]\d{9}$/.test(cleaned)) {
    throw new Error("Please enter a valid 10-digit mobile number");
  }

  return api.post("/mobile-auth/request-otp", {
    usermobilenumber: Number(cleaned),
  });
}
```

### Verify OTP

```ts
async function verifyOtp(mobileNumber: string, otp: string) {
  if (!/^\d{4}$/.test(otp)) {
    throw new Error("Please enter a valid 4-digit OTP");
  }

  const response = await api.post("/mobile-auth/verify-otp", {
    usermobilenumber: Number(mobileNumber),
    otp: Number(otp),
  });

  const { user, token, refreshToken } = response.data.data;

  authStore.login({
    user,
    token,
    refreshToken,
  });

  return response.data;
}
```

## 16. Final Notes

For the first web milestone, keep login simple:

```text
Mobile number -> OTP -> authenticated session
```

Do not add email/password login unless the backend/customer requirement explicitly needs it. The customer mobile app is OTP-first, and the web app should match that behavior for consistency.

