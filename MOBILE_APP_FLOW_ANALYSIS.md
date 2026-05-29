# Mobile App Flow Analysis for Nivaana Web App

Prepared on: 2026-05-29  
Source app: `../Vibrant-Life-mobile-app`  
Target app: `Nivaana-Ecom-Web`

## 1. Purpose

This document analyzes the existing Nivaana mobile app flows so the ecommerce web app can be built with the same business behavior, API contracts, stock rules, and checkout logic.

Primary areas covered:

- Login and authentication flow
- Product catalog and product detail flow
- Cart and checkout flow
- Payment and order completion flow
- Product management implications for the web app
- Web app screen and API requirements

## 2. Mobile App Architecture Summary

The mobile app is a React Native / Expo ecommerce app.

Main boot flow:

```text
App.tsx
  ThemeProvider
  AuthProvider
  PersistentCartProvider
  PersistentWishlistProvider
  WishlistProvider
  OrderProvider
  Navigation
```

Key files:

- `App.tsx`
- `src/navigation/AppNavigator.tsx`
- `src/navigation/MainTabNavigator.tsx`
- `src/contexts/AuthContext.tsx`
- `src/contexts/PersistentCartContext.tsx`
- `src/api/config.ts`

Main navigation tabs:

| Tab | Purpose |
| --- | --- |
| Home | Landing/discovery page |
| Categories | Category browsing and wishlist access |
| Deals | Promotion and offer discovery |
| Cart | Cart, checkout, address, payment |
| Profile | Orders, account, settings, addresses |

The app starts at:

```text
Authenticated user -> Main
Unauthenticated user -> Login
```

The web app should support public browsing, but checkout and account actions must require authentication.

## 3. Login and Authentication Flow

### 3.1 Current Mobile Flow

Mobile login is OTP-based using an Indian mobile number.

Flow:

```text
LoginScreen
  -> PhoneLoginScreen
    -> request OTP
      -> OtpLoginScreen
        -> verify OTP
          -> store access token, refresh token, user data
          -> enter Main app
```

Files:

- `src/screens/auth/LoginScreen.tsx`
- `src/screens/auth/PhoneLoginScreen.tsx`
- `src/screens/auth/OtpLoginScreen.tsx`
- `src/api/authService.ts`
- `src/contexts/AuthContext.tsx`

### 3.2 OTP Request

Endpoint:

```http
POST /mobile-auth/request-otp
```

Payload:

```json
{
  "usermobilenumber": 9876543210
}
```

Expected response includes:

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

Mobile validation:

- Number must be 10 digits.
- Number must start with 6, 7, 8, or 9.
- Country code is fixed as `+91` in UI.

### 3.3 OTP Verification

Endpoint:

```http
POST /mobile-auth/verify-otp
```

Payload:

```json
{
  "usermobilenumber": 9876543210,
  "otp": 1234
}
```

Expected response includes:

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
      "isguest": false
    },
    "token": "access-token",
    "refreshToken": "refresh-token",
    "expiresIn": 3600,
    "isNewUser": false
  }
}
```

Mobile stores:

- `ACCESS_TOKEN`
- `REFRESH_TOKEN`
- `USER_DATA`
- `GUEST_MODE`, only for guest user sessions

### 3.4 Auth Context Behavior

The mobile app loads auth state from local storage on startup.

Important behavior:

- If `USER_DATA` exists, the app treats the user as authenticated.
- If the user is not guest, it silently refreshes user profile from `GET /users/{id}`.
- A 401 response clears auth data and resets the user to unauthenticated state.
- Post-login redirects are supported, especially for checkout.

### 3.5 Web App Requirements

The web app should implement:

- Mobile number login screen.
- OTP verification screen.
- Token storage, preferably secure cookie if backend supports it. Otherwise use local storage carefully.
- Refresh token handling via `POST /auth/refresh`.
- 401 interceptor that clears auth and redirects to login.
- Post-login redirect, especially from checkout and wishlist.
- New user support without separate signup form. Profile details are completed later in Edit Profile.

Recommended web route structure:

```text
/login
/login/otp
/account/profile
/account/addresses
/account/orders
```

## 4. Product Catalog Flow

### 4.1 Product API Strategy

The mobile app uses platform-specific product APIs instead of generic product APIs for main ecommerce browsing.

Current platform:

```text
nivapp
```

Primary endpoints:

```http
GET /products/platform/nivapp
GET /products/{productId}/platform/nivapp
```

Files:

- `src/api/services/platformProductService.ts`
- `src/api/services/productService.ts`
- `src/screens/products/ProductListScreen.tsx`
- `src/screens/products/ProductDetailScreen.tsx`

### 4.2 Product Listing Flow

Flow:

```text
ProductListScreen
  -> fetch platform products
  -> fetch category picklist
  -> apply route category/subcategory filters
  -> render grid/list cards
  -> support search, filter, sort
  -> add to cart / wishlist
```

Initial API call:

```http
GET /products/platform/nivapp?page=1&limit=100
```

Filter examples:

```http
GET /products/platform/nivapp?search=candle&page=1&limit=100
GET /products/platform/nivapp?category=home_fragrance&page=1&limit=100
GET /products/platform/nivapp?category=home_fragrance&subcategory=candles&page=1&limit=100
GET /products/platform/nivapp?minPrice=100&maxPrice=500&page=1&limit=100
GET /products/platform/nivapp?stockStatus=in_stock&page=1&limit=100
GET /products/platform/nivapp?sortBy=price&sortOrder=asc&page=1&limit=100
```

Category data:

```http
GET /picklists/?fieldname=category
GET /picklists/?fieldname=subcategory&parent={category}
```

### 4.3 Product Card Behavior

Each product card supports:

- Product image
- Name
- Price
- Discount
- Rating
- Stock status
- Wishlist toggle
- Add to cart
- Navigate to PDP

Add-to-cart behavior:

```text
If out of stock -> show alert
If already in cart -> navigate to cart
Otherwise -> add product to cart
```

### 4.4 Product Detail Flow

Flow:

```text
ProductDetailScreen
  -> GET /products/{id}/platform/nivapp
  -> GET ratings for product
  -> GET related products by category
  -> render carousel, product info, accordions, reviews, recommendations
  -> add to cart / wishlist / buy now
```

PDP endpoint:

```http
GET /products/{productId}/platform/nivapp
```

Related products:

```http
GET /products/platform/nivapp?category={category}&page=1&limit=10
```

Ratings:

```http
GET /ratings/
```

The exact product rating filter is implemented inside `ratingService`.

### 4.5 Stock Logic

The mobile app uses platform stock data.

Important fields:

```text
platformStock.availableqty
platformStock.lockqty
platformStock.platformstatus
```

Current frontend logic treats `availableqty` as the actual available stock. It does not subtract `lockqty` again because the backend already reduces available quantity during payment initiation.

Stock status:

```text
availableqty > 5       -> in_stock
availableqty 1 to 5    -> low_stock
availableqty <= 0      -> out_of_stock
```

### 4.6 Combo Product Logic

Combo products are available only if all components have enough stock.

Formula:

```text
comboAvailableQty = min(component.availableqty / component.requiredqty)
```

For web, preserve this logic exactly for:

- Product cards
- PDP
- Cart quantity validation
- Checkout validation

### 4.7 Product Management Clarification

The mobile app does not appear to include admin product management screens such as:

- Create product
- Edit product
- Delete product
- Manage stock
- Publish/unpublish products

It only manages products from the customer ecommerce perspective:

- Browse products
- Search products
- Filter products
- View product details
- Add product to cart
- Add product to wishlist
- Buy now

If the web app needs admin product management, that flow should be taken from the backend/admin system, not from the mobile app.

## 5. Cart Flow

### 5.1 Current Cart Architecture

Cart state is handled by:

```text
src/contexts/PersistentCartContext.tsx
```

The cart supports:

- Local cart for unauthenticated users
- Server cart for authenticated users
- Offline fallback
- Login-time cart sync
- Optimistic quantity updates
- Promotion evaluation data
- Cart totals
- Shipping fee
- Discount amount

### 5.2 Cart Storage Behavior

Unauthenticated:

```text
Store cart in local storage
```

Authenticated:

```text
Use server cart APIs
Fallback to local cart if server fails
```

On login:

```text
Read local cart
Fetch server cart
Add only local items not already present on server
Reload server cart
Clear local cart
```

Important detail:

The current sync does not merge quantities for duplicate products. It skips duplicate products already present on the server cart.

### 5.3 Cart APIs

```http
GET /carts/user/{userId}
GET /carts/wishlist/{userId}
POST /carts/
POST /carts/upsert
PUT /carts/{cartItemId}
DELETE /carts/{cartItemId}
DELETE /carts/user/{userId}/clear
```

Add to cart uses:

```json
{
  "productid": 10,
  "userid": 5,
  "quantity": 1,
  "iscart": true,
  "iswishlist": false
}
```

Wishlist uses:

```json
{
  "productid": 10,
  "userid": 5,
  "quantity": 1,
  "iscart": false,
  "iswishlist": true
}
```

### 5.4 Cart Item Product Enrichment

The cart API returns cart records. The app then fetches full platform product details for each cart item.

Flow:

```text
GET /carts/user/{userId}
  -> for each cart item
    -> GET /products/{productId}/platform/nivapp
```

This matters for web because cart UI needs platform stock, images, price, discount, category, combo components, and product status.

### 5.5 Optimistic Quantity Updates

The mobile app has an instant UI update function:

```text
updateQuantityOptimistic(productId, quantity)
```

Behavior:

- Updates UI immediately.
- Tracks pending changes in a map.
- If quantity is less than 1, removes item from UI and tracks quantity `0`.
- Backend sync happens later using `syncPendingChanges`.

Before checkout, pending quantity changes must be synced.

If sync fails:

- Clear pending changes.
- Refresh cart from server.
- Show stock or sync error.

### 5.6 Cart Total Calculation

Cart totals are calculated from:

```text
subtotal = original item prices * quantity
itemLevelDiscounts = item discounts * quantity
discountedSubtotal = discounted item prices * quantity
cartLevelDiscount = promotion discount
shippingFee = context shipping fee
tax = inclusive tax calculation
total = discountedSubtotal + shippingFee - cartLevelDiscount
```

Default shipping fee:

```text
API_CONFIG.SHIPPING_FEE = 100
PersistentCartContext initial shippingFee = 50
```

This mismatch should be cleaned up in the web app. Use one source of truth for shipping.

## 6. Checkout Flow

### 6.1 Current Mobile Checkout Steps

The cart screen itself manages a three-step checkout:

```text
Step 0: Cart review
Step 1: Address selection
Step 2: Payment
```

Files:

- `src/screens/cart/CartScreen.tsx`
- `src/screens/cart/steps/CartReviewStep.tsx`
- `src/screens/cart/steps/AddressSelectionStep.tsx`
- `src/screens/cart/steps/PaymentStep.tsx`

There is also a `CheckoutScreen.tsx` and `StepperScreen.tsx`, but the main rich flow is inside `CartScreen.tsx`.

### 6.2 Step 0: Cart Review Validation

Before moving to address step:

1. Cart must not be empty.
2. Pending optimistic quantity changes are synced.
3. Cart is refreshed with latest platform stock.
4. Out-of-stock items are blocked.
5. Quantities greater than available stock are blocked.
6. User must be authenticated.
7. Automatic promotions are evaluated.

If unauthenticated:

```text
Show auth modal
User logs in
Return to cart/checkout
```

### 6.3 Step 1: Address Selection

Address API:

```http
GET /addresses/?userid={userId}
POST /addresses/
PUT /addresses/{addressId}
DELETE /addresses/{addressId}
```

Address fields:

```json
{
  "userid": 5,
  "name": "Customer Name",
  "mobilenumber": 9876543210,
  "pincode": 600001,
  "doornumber": "12A",
  "address": "Street address",
  "landmark": "Near landmark",
  "state": "Tamil Nadu",
  "city": "Chennai",
  "isdefaultaddress": true
}
```

Mobile behavior:

- Load addresses when entering address step.
- Auto-select default address if available.
- If no default exists, show address selection modal.
- User can add new address.
- User may set selected address as default.

### 6.4 Step 2: Promotions and Payment

Promotion APIs:

```http
GET /promotions?channel=mobile_app&geo=IN
GET /promotions/active?channel=mobile_app&geo=IN&scope=banner
POST /promotions/evaluate
POST /promotions/evaluate/automatic
POST /promotions/evaluate/remove
POST /promotions/offers
POST /promotions/redeem
GET /promotions/evaluations?user_id={userId}
```

Mobile cart tracks:

- `evaluationIds`
- `userEvaluationIds`
- `automaticEvaluationIds`
- `appliedPromotion`
- `automaticPromotions`
- `discountAmount`
- `shippingFee`

Important behavior:

- Automatic promotions are evaluated when the user proceeds from cart review to address/payment flow.
- Manual coupon can be applied by code or promotion id.
- Existing evaluations are refreshed when cart contents change.
- Stale evaluations are cleared when cart contents change.

### 6.5 Payment Payload

The app creates order items like:

```json
{
  "productid": 10,
  "productname": "Product Name",
  "productcategory": "category",
  "userid": "5",
  "addressid": 20,
  "productamount": 500,
  "discountamount": 50,
  "orderamount": 450,
  "quantity": 1,
  "cartId": 99
}
```

Payment payload:

```json
{
  "transaction": {
    "name": "Customer Name",
    "amount": 550,
    "mobilenumber": "9876543210",
    "userId": "5",
    "productid": [10, 11],
    "transactionfor": "product"
  },
  "order": [],
  "mode": "phonepe",
  "evaluation_ids": ["evaluation-id"],
  "shippingCost": 100
}
```

`evaluation_ids` is included only if promotions are applied.

`shippingCost` is included only if shipping is not free.

## 7. Payment Flow

### 7.1 Current Mobile PhonePe Flow

Endpoint:

```http
POST /phonepe/initiate
```

File:

```text
src/api/services/paymentService.ts
```

Flow:

```text
handlePlaceOrder
  -> build payment payload
  -> paymentService.initiatePhonePePayment
  -> POST /phonepe/initiate
  -> receive redirectUrl and merchantTransactionId
  -> open redirectUrl in WebView
  -> detect success/failure URL or deep link
  -> cleanup pending order
  -> clear cart
  -> poll backend for order creation
  -> redirect to My Orders
```

Expected response:

```json
{
  "success": true,
  "data": {
    "merchantTransactionId": "txn-id",
    "redirectUrl": "https://...",
    "amount": 550,
    "status": "PENDING",
    "paymentMode": "phonepe"
  }
}
```

### 7.2 Payment Success Behavior

On success:

- Mobile closes WebView.
- Clears local pending order.
- Clears cart.
- Polls orders/orderlines for recent order creation.
- Shows success message.
- Navigates to `ProfileTab -> MyOrders`.

Order creation is expected to be handled by backend after payment confirmation.

### 7.3 Web Payment Recommendation

For web:

```text
POST /phonepe/initiate
  -> receive redirectUrl
  -> window.location.href = redirectUrl
  -> PhonePe returns to web callback URL
  -> web calls GET /phonepe/status/{merchantTransactionId}
  -> show success, failed, or pending page
  -> redirect/link to orders
```

Suggested web routes:

```text
/checkout
/checkout/payment
/payment/status
/payment/success
/payment/failed
/account/orders
```

Avoid WebView on web. Use normal browser redirect.

## 8. Wishlist Flow

Wishlist uses the same cart table/service with `iswishlist = true`.

APIs:

```http
GET /carts/wishlist/{userId}
POST /carts/upsert
DELETE /carts/{cartItemId}
```

Wishlist product details are enriched using:

```http
GET /products/{productId}/platform/nivapp
```

Web wishlist should support:

- View wishlist
- Remove item
- Move to cart
- Check stock before moving to cart
- If item already in cart, route to cart

## 9. Orders and Profile Flow

Key APIs:

```http
GET /orders?userid={userId}
GET /orders/user/{userId}/details
GET /orders/{orderId}
GET /orderlines?uniqueordderid={orderId}
GET /orderlines/?userid={userId}
PATCH /orderlines/{orderLineId}/cancel
POST /orders/{orderId}/cancel
```

Profile features in mobile:

- My Orders
- Order Detail
- Track Order
- Address Book
- Edit Profile
- Review My Purchases
- Feedback
- Settings
- Help and Support
- Policies

Web should implement at minimum:

```text
/account
/account/profile
/account/orders
/account/orders/:id
/account/addresses
/account/wishlist
```

## 10. API Base URLs

Mobile production API:

```text
https://nivaana-715569764663.asia-south1.run.app/v1
```

Mobile development API currently points to:

```text
http://192.168.1.8:5600/v1
```

Upload/rating server:

```text
https://nivfiles-715569764663.asia-south1.run.app
```

Web should use `.env` values and avoid hardcoding development LAN IPs.

Recommended web environment variables:

```text
VITE_API_BASE_URL=https://nivaana-715569764663.asia-south1.run.app/v1
VITE_UPLOAD_RATING_URL=https://nivfiles-715569764663.asia-south1.run.app
VITE_PRODUCT_PLATFORM=nivapp
VITE_PROMOTION_CHANNEL=mobile_app
VITE_PROMOTION_GEO=IN
```

Long term, consider dedicated web values:

```text
VITE_PRODUCT_PLATFORM=web
VITE_PROMOTION_CHANNEL=web
```

Only use these after backend confirms stock and promotions are configured for web.

## 11. Recommended Web App Screen Map

### Public Screens

| Route | Purpose |
| --- | --- |
| `/` | Home and discovery |
| `/products` | Product listing |
| `/products/:id` | Product detail |
| `/categories` | Category browsing |
| `/deals` | Promotions and deals |
| `/search` | Product search |

### Auth Screens

| Route | Purpose |
| --- | --- |
| `/login` | Mobile number entry |
| `/login/otp` | OTP verification |

### Cart and Checkout Screens

| Route | Purpose |
| --- | --- |
| `/cart` | Cart review |
| `/checkout/address` | Address selection |
| `/checkout/payment` | Promotions and payment |
| `/payment/status` | Payment callback/status |
| `/payment/success` | Success result |
| `/payment/failed` | Failed result |

### Account Screens

| Route | Purpose |
| --- | --- |
| `/account` | Account dashboard |
| `/account/profile` | Edit profile |
| `/account/addresses` | Address book |
| `/account/orders` | My orders |
| `/account/orders/:id` | Order detail |
| `/account/wishlist` | Wishlist |
| `/account/reviews` | Review purchases |

## 12. Web Implementation Priorities

### Phase 1: Foundation

- API client with auth interceptor
- Token storage and refresh handling
- Auth context/store
- Cart context/store
- Product API services
- Route structure

### Phase 2: Catalog

- Home page
- Product listing
- Filters and sorting
- Product detail
- Platform stock handling
- Combo product stock handling

### Phase 3: Cart and Wishlist

- Local guest cart
- Server cart
- Login-time cart sync
- Optimistic quantity updates
- Wishlist
- Cart badge

### Phase 4: Checkout

- Cart validation
- Address selection
- Add/edit address
- Promotion evaluation
- Payment summary
- PhonePe redirect
- Payment result page

### Phase 5: Account

- Profile
- Orders
- Order detail
- Address book
- Reviews
- Logout

## 13. Risks and Important Notes

1. Platform mismatch risk  
   Mobile uses `nivapp`. If web uses the same platform, stock is shared with the mobile app. If the business wants separate stock visibility for web, backend must support a `web` platform.

2. Promotion channel mismatch risk  
   Mobile uses `channel=mobile_app`. Web can reuse it initially, but dedicated web promotions need backend support for `channel=web`.

3. Cart duplicate behavior  
   Mobile login sync skips duplicate products rather than merging quantities. Confirm if the web app should preserve this behavior.

4. Shipping fee mismatch  
   Mobile has `API_CONFIG.SHIPPING_FEE = 100`, while cart context initializes shipping at `50`. Web should standardize this.

5. Payment callback design  
   Mobile uses WebView and deep links. Web needs proper browser callback routes and status checking.

6. Product admin not present in mobile  
   Customer product browsing exists in mobile. Admin product create/edit/delete flow is not present and must be derived from backend/admin requirements.

7. Auth startup behavior  
   Mobile marks authenticated if user data exists. Web should additionally validate access token or use refresh token flow.

## 14. Minimum API Service List for Web

Create web service modules equivalent to:

```text
authService
userService
platformProductService
productService
cartService
cartWishlistService
promotionService
evaluationService
paymentService
addressService
orderService
ratingService
picklistService
```

## 15. Final Web Build Recommendation

Build the web app as a customer ecommerce site first, not an admin product management portal.

Core customer journey:

```text
Home
  -> Product Listing
    -> Product Detail
      -> Add to Cart / Buy Now
        -> Login if needed
          -> Address
            -> Promotions
              -> PhonePe Payment
                -> Order Confirmation
                  -> My Orders
```

The mobile app already contains the important business rules. The web app should reuse those rules, but adapt navigation, payment handling, and layout for browser behavior.

