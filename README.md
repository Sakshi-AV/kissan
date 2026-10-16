# 🌾 Kissan Cart – Smart Farmer-to-Consumer Digital Marketplace

> **"From Our Farms to Your Homes" (ನಮ್ಮ ಜಮೀನಿನಿಂದ ನಿಮ್ಮ ಮನೆ ಬಾಗಿಲಿಗೆ / हमारे खेतों से सीधे आपके घर तक)**

**Kissan Cart** is a full-stack digital agricultural marketplace that directly bridges the gap between rural farmers and conscious urban households. By eliminating unnecessary intermediaries and middlemen, farmers retain up to 40% higher returns for their labor, while families receive peak-fresh, nutrient-dense, pesticide-free produce at fair prices.



---

## 🚀 Key Features

### 1. 🧑‍🌾 Farmer Control Center
- **Farmer Profile & Identity:** Farm name, location, years of experience, crop specialization, and bio.
- **Product Catalog Management:** Full CRUD operations for farm listings (vegetables, fruits, millets, spices, dairy, agro-tools).
- **Automated Stock Sync:** Real-time inventory tracking with automated low-stock warnings when inventory drops below 5 units.
- **Order Fulfillment Pipeline:** Live workflow actions to **Accept**, **Reject**, dispatch as **Out for Delivery**, and mark **Delivered**.
- **Earnings & Sales Analytics:** Visual monthly revenue trends powered by Chart.js.
- **Farmer Verification (KYC):** Apply for the official "Verified Farmer" badge by submitting land RTC records, Kisan Credit Card, or identity documentation.

### 2. 🛒 Conscious Consumer Marketplace
- **Direct Farm Sourcing:** Filter by category, price range, 100% organic certification, stock availability, or farm location.
- **Detailed Crop Pages:** High-resolution product imagery, harvest dates, stock indicators, and unit pricing.
- **Interactive Farm Geolocation:** Leaflet + OpenStreetMap displaying GPS-pinned coordinates of the seller's farm.
- **Cart & Checkout:** Real-time subtotal calculation, inventory validation, free delivery thresholds (above ₹500), and Cash on Delivery (COD).
- **Live Order Journey:** Graphical 5-step tracking timeline (Pending ➔ Accepted ➔ Harvested & Packed ➔ Out for Delivery ➔ Delivered).
- **Verified Buyer Reviews:** Customers can submit 1–5 star reviews and written feedback after placing orders.
- **Wishlist & Saved Delivery Addresses:** Quick ordering and profile management.

### 3. 🛡️ Administrator Command & Governance
- **Platform Analytics:** Real-time KPI counters: total users, verified farmers, consumers, listed products, orders, and gross platform volume.
- **Farmer Verification Approvals:** Inspect pending verification documents and grant/reject Verified Farmer badges.
- **Listing Moderation:** Audit listings platform-wide; toggle Active, Hidden, or Flagged states; remove fraudulent items.
- **User Account Management:** Filter by role and toggle Active or Restricted/Suspended states.
- **Grievance Resolution:** Review and resolve buyer reports regarding misleading pricing or quality issues.
- **Security Audit Trail:** Immutable log of authentication, registrations, and administrative interventions with timestamps and IP addresses.

### 4. 🌐 Multilingual Accessibility
- Full native translation across:
  1. **English**
  2. **Kannada (ಕನ್ನಡ)**
  3. **Hindi (हिन्दी)**
- Centralized dictionary in `frontend/js/translations.js` with instant client-side switching, `localStorage` persistence, and Unicode support.

---

## 🛠️ Technology Stack

| Layer | Technologies Used |
|---|---|
| **Frontend** | Vanilla HTML5, CSS3 (Custom Design Tokens, Light & Dark themes), JavaScript (ES6+), Leaflet.js, Chart.js, Font Awesome 6 |
| **Backend** | Node.js (v20+), Express.js (RESTful MVC Architecture) |
| **Database** | MongoDB with Mongoose ODM |
| **Authentication** | JWT (JSON Web Tokens), bcryptjs password hashing |
| **Media Handling** | Multer local storage with optional Cloudinary cloud fallback |
| **Security** | Express Rate Limiting, Input Sanitization, Strict RBAC Middleware, CORS |

---

## 📂 Project Architecture

```
kissan/
├── backend/
│   ├── config/
│   │   └── db.js                 # MongoDB connection
│   ├── middleware/
│   │   ├── auth.js               # JWT verification & role-based access control
│   │   └── errorHandler.js       # Centralized error handler
│   ├── models/
│   │   ├── User.js               # Customer, Farmer, and Admin schemas
│   │   ├── Category.js           # 10 agricultural product categories
│   │   ├── Product.js            # Agricultural crop listings with geo-coordinates
│   │   ├── Order.js              # Order items, snapshots, addresses, and statuses
│   │   ├── Cart.js               # User shopping cart persistence
│   │   ├── Review.js             # Verified buyer reviews & rating aggregations
│   │   ├── Wishlist.js           # Customer saved harvests
│   │   ├── Notification.js       # Real-time in-app alerts
│   │   ├── FarmerVerification.js # Farmer KYC applications
│   │   ├── ActivityLog.js        # Audit trail logs
│   │   └── Report.js             # Listing complaints & grievances
│   ├── routes/
│   │   ├── auth.routes.js        # Register, login, profile endpoints
│   │   ├── category.routes.js    # Category listing & counts
│   │   ├── product.routes.js     # Search, filter, CRUD, reviews, reports
│   │   ├── cart.routes.js        # Shopping cart sync
│   │   ├── order.routes.js       # Stock-validated order placement & cancellation
│   │   ├── farmer.routes.js      # Farmer dashboard, sales analytics, fulfillment
│   │   ├── customer.routes.js    # Customer dashboard, orders, wishlist
│   │   ├── admin.routes.js       # Admin statistics, KYC approval, moderation, audit
│   │   ├── notification.routes.js# In-app notification center
│   │   └── upload.routes.js      # Multer image upload & Cloudinary fallback
│   ├── scripts/
│   │   └── seed.js               # Comprehensive sample data seed script
│   └── server.js                 # Express server configuration
├── frontend/
│   ├── index.html                # Landing page with hero, live metrics & showcase
│   ├── shop.html                 # Marketplace with search, filters & pagination
│   ├── product-details.html      # Detail view with Leaflet map, reviews & buy flow
│   ├── cart.html                 # Shopping cart with inventory checks
│   ├── checkout.html             # Delivery address, COD checkout, order confirmation
│   ├── login.html                # Sign-in with quick evaluation demo buttons
│   ├── register.html             # Customer and Farmer registration
│   ├── farmer-dashboard.html     # Dedicated Farmer management console
│   ├── customer-dashboard.html   # Customer order tracking & wishlist portal
│   ├── admin-dashboard.html      # Platform root governance & audit dashboard
│   ├── css/
│   │   ├── styles.css            # Base styles, variables, light & dark mode themes
│   │   ├── components.css        # Buttons, cards, badges, forms, modals, toasts
│   │   ├── dashboards.css        # Sidebar layout, KPI cards, tables, timelines
│   │   └── responsive.css        # Mobile drawer navigation & breakpoints
│   └── js/
│       ├── translations.js       # Multilingual dictionary (EN, KN, HI)
│       ├── api.js                # Fetch wrapper, JWT token attachment, toast alerts
│       ├── auth.js               # Authentication state & navbar sync
│       ├── cart.js               # Cart operations & badge counter
│       ├── main.js               # Theme toggle, language switch, notifications
│       ├── shop.js               # Marketplace filters, search & pagination logic
│       ├── product-details.js    # Product details, Leaflet map, review modal
│       ├── checkout.js           # Order placement & address handling
│       ├── farmer-dashboard.js   # Farmer analytics & order fulfillment
│       ├── customer-dashboard.js # Customer orders & tracking timeline
│       └── admin-dashboard.js    # Admin KYC approvals, user moderation, audit logs
├── uploads/                      # Local uploaded images
├── .env.example                  # Environment template
├── .gitignore
├── package.json
└── README.md
```

---

## ⚡ Quick Start & Local Setup

### 1. Prerequisites
- **Node.js:** v18.x, v20.x, or v22.x
- **MongoDB:** Local MongoDB instance running on `mongodb://127.0.0.1:27017` (or a MongoDB Atlas connection URI)

### 2. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/kissan-cart.git
cd kissan-cart
npm install
```

### 3. Environment Configuration
Copy the template `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure your `.env` contains:
```env
PORT=5050
MONGODB_URI=mongodb://127.0.0.1:27017/kissan_cart
JWT_SECRET=kissan_cart_super_secret_jwt_key_2026_agro_market
NODE_ENV=development
```

*(Optional) If using Cloudinary for image storage, supply `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`. Otherwise, Kissan Cart automatically uses its built-in local disk storage fallback.*

### 4. Seed the Database
Populate the database with 10 agricultural categories, 13 realistic products, verified farmers, sample orders, reviews, and notifications:
```bash
npm run seed
```

### 5. Launch the Application
```bash
npm start
```
The server will start on: **`http://localhost:5050`**

Open your web browser and navigate to `http://localhost:5050/index.html`.

---

## 🔑 Demo Evaluation Accounts

Use the following accounts for local demonstration. Fast-fill login buttons are also built directly into `login.html`:

| Role | Email Address | Password | Description |
|---|---|---|---|
| **Platform Admin** | `admin@kissancart.com` | `admin123` | Full administrative moderation, verification approvals, and audit trail logs. |
| **Verified Farmer** | `ramesh.farmer@kissancart.com` | `farmer123` | Ramesh Patel (Green Valley Farm, Mandya). Has active listings and incoming orders. |
| **Verified Farmer** | `suresh.farmer@kissancart.com` | `farmer123` | Suresh Gowda (Sahyadri Orchard, Shivamogga). Orchard fruits, Malabar spices, and Gir cow dairy. |
| **Pending Farmer** | `anita.farmer@kissancart.com` | `farmer123` | Anita Devi (Kaveri Agro Fields, Mysuru). Pending verification application for admin review. |
| **Consumer Buyer** | `priya.customer@kissancart.com` | `customer123` | Priya Sharma (Indiranagar, Bengaluru). Has order history, reviews, and wishlist. |
| **Consumer Buyer** | `rahul.customer@kissancart.com` | `customer123` | Rahul Verma (Koramangala, Bengaluru). Order tracking and review author. |

---

## 🔒 Security Best Practices Implemented

1. **Password Hashing:** All passwords salted and hashed via `bcryptjs` (salt rounds: 10).
2. **JWT Authentication:** Strict authorization tokens passed via HTTP `Authorization: Bearer <token>` headers.
3. **Role-Based Authorization (RBAC):** Route protection middleware verifies whether a user holds `customer`, `farmer`, or `admin` permissions on the backend.
4. **No Direct Admin Creation:** Registration endpoint enforces roles strictly as either `customer` or `farmer`; admin privilege cannot be obtained via client request payloads.
5. **Rate Limiting:** Protects `/api/auth/login` and `/api/auth/register` endpoints against brute-force attacks.
6. **Data Privacy Safeguards:** Sensitive farmer document identification numbers are masked (e.g., `XXXX-XXXX-8921`) before storage and display.
7. **Inventory Integrity:** Inventory availability is checked before order confirmation, immediately decremented upon order placement, and restored upon cancellation.

---

## 🌟 Future Roadmap
- Integration with Razorpay / UPI automated webhook callbacks.
- Direct SMS and WhatsApp notifications for rural farmers via Twilio / MSG91.
- AI-driven crop disease diagnosis using computer vision leaf scans.
- Cold-storage aggregation and logistics routing optimizer for cooperative farmers.

---

## 📜 License & Acknowledgements
Developed with pride for India's hardworking farmers. Dedicated to promoting fair-trade, sustainable, and pesticide-free agricultural commerce.
Licensed under the ISC License.
