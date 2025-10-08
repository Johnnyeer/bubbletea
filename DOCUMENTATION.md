# Technical Architecture Overview

> **Note:** This document contains detailed technical information. For quick start and general information, see [README.md](./README.md)

## System Architecture
- **Backend**: Flask REST API with SQLAlchemy ORM and SQLite database
- **Frontend**: React SPA with Vite build system and Nginx serving
- **Authentication**: JWT tokens with role-based access control (customer/staff/manager)
- **Deployment**: Docker Compose orchestration with persistent data volumes

### Component Diagram

```
+------------------------------+
| Browser (React SPA via Vite) |
+---------------+--------------+
                |
        HTTPS /api/* + JWT
                |
+---------------v--------------+
| Flask App (backend/app)      |
| - create_app() factory       |
| - Blueprints: auth, items,   |
|   orders, schedules, analytics|
+---------------+--------------+
                |
        SQLAlchemy ORM Session
                |
+---------------v--------------+
| SQLite (data/app.db)         |
| - Base.metadata migrations   |
| - Seeded admin + menu stock  |
+------------------------------+
                |
       Docker volume ./data    
```

- Frontend SPA issues fetches against `/api/*`, attaching JWTs when authenticated.
- Flask handles routing, authorization, and inventory logic before persisting through SQLAlchemy.
- SQLite stores shared state; helper routines ensure schema upgrades and default records on startup.

## Docker Compose Runtime Topology

```
+------------------+    depends_on     +------------------+
| web (frontend)   | ----------------> | api (backend)    |
| build: ./frontend|                   | build: ./backend |
| publishes :80    |                   | exposes :8000    |
+------------------+                   +---------+--------+
                                                |
                          bind mount ./data <---+
                                                |
                                    SQLite database file
```

- `web` container serves the compiled React bundle through Nginx at `http://localhost`.
- `api` container runs the Flask app, reading `DATABASE_URL` and `JWT_SECRET` from environment.
- Shared `./data` volume keeps `app.db` persistent across container rebuilds and host restarts.

## Backend Service (Flask API)
### Application startup
- `backend/app/__init__.py` builds the Flask app, wires blueprints, and runs database migrations on launch.
- Bootstrap tasks seed menu items, add missing columns, and ensure a default manager account (`admin` / `admin`).

### Database models
Defined in `backend/app/models.py` using SQLAlchemy.
- `Member`: customer accounts (email + password hash, joined timestamp).
- `Staff`: staff and manager accounts (username, role flag, hire date).
- `MenuItem`: master list of teas, milks, and add-ons with price, stock level, and active flag.
- `OrderItem`: live order queue records with status (`received`, `preparing`, `complete`), total price, and JSON customizations.
- `OrderRecord`: immutable archive written when an order is completed; later powers analytics history.
- `ScheduleShift`: unique staff shift assignments by date and slot (`morning`, `evening`).

### Database access helpers
- `backend/app/db.py` centralizes the SQLAlchemy engine/session factory, enforces SQLite foreign keys, and expands relative paths inside the project.

### Authentication & user management (`backend/app/auth.py`)
- `/api/v1/auth/register`: registers members (email) or staff (username) accounts.
- `/api/v1/auth/login`: verifies credentials and returns a JWT with role claims.
- Frontend caches the returned profile locally; there is no `/api/me` endpoint in the current backend build.
- Helpers include `session_scope()` for session management and `role_required()` for guardrails.

### Menu management (`backend/app/items.py`)
- `/api/v1/items` (GET): lists all menu entries sorted by category/name.
- `/api/v1/items` (POST): manager-only create flow with validation of price, category, and quantity.
- `/api/v1/items/<id>` (DELETE): manager-only item removal.
- `/api/v1/items/<id>/quantity` (PATCH): manager-only stock adjustments by integer delta.

### Order lifecycle (`backend/app/orders.py`)
- Exposes a rich `/api/v1/orders` blueprint for creating, listing, updating, and deleting order items.
- Creation (`POST /api/v1/orders`): validates menu selections, calculates totals, persists cart-line items, and decrements stock for the base drink plus reserved add-ons.
- Listing (`GET /api/v1/orders`): returns either the live queue or completed history, with optional filters (`ids`, `status`, `member_id`).
- Status updates (`PATCH /api/v1/orders/<id>`): staff move orders between states; when marked `complete`, the order row is copied into `OrderRecord` history and removed from the live table.
- Deletion (`DELETE /api/v1/orders/<id>`): restores reserved inventory counts for the base drink and add-ons.
- Helpers in `backend/app/customizations.py` normalize customization payloads, deserialize stored JSON, and translate it into inventory reservation metadata.

### Scheduling (`backend/app/schedules.py`)
- `/api/v1/schedule` (GET): staff-only weekly view of upcoming shifts.
- `/api/v1/schedule` (POST): staff can claim their own shifts; managers/admin may assign any staff member.
- `/api/v1/schedule/<id>` (DELETE): removes a shift (self-service for staff, full control for managers).
- `/api/v1/schedule/staff` (GET): manager-only list of all active staff for assignment.

### Analytics (`backend/app/analytics.py`)
- `/api/v1/analytics/summary`: manager/staff endpoint aggregating `OrderRecord` data to report total sales, pending queue size, and most popular teas, milks, and add-ons.
- `/api/v1/analytics/shifts`: manager/staff endpoint providing weekly shift analytics with staff workload balancing insights.

### Admin & Rewards System
- `/api/v1/admin/accounts` (POST): manager-only endpoint for creating staff/member accounts.
- `/api/v1/rewards` (GET): member reward status and available benefits.
- `/api/v1/rewards/redeem` (POST): member reward redemption for free drinks/add-ons.
- `/api/v1/rewards/code` (POST): apply promotional reward codes for discounts.

### Supporting utilities
- `backend/app/analytics.py` & `customizations.py`: transform completed orders into analytics-friendly counters.
- `backend/app/admin.py` & `rewards.py`: handle account management and loyalty program functionality.

## Frontend Application (React)
### Core layout & routing
- `frontend/src/App.jsx` stores global state (token, cart, order history) and performs manual routing based on `window.history`. Navigation links adapt to the viewer role.
- `SystemLayout.jsx`, `SystemHeader.jsx`, and `NavigationLink.jsx` render the shared frame, title, and nav bar.

### Customer experience
- `OrderPage.jsx`: login form with optional guest checkout.
- `RegisterPage.jsx`: membership sign-up integrated with `/api/v1/auth/register`.
- `MenuSelectionPage.jsx`: fetches `/api/v1/items`, groups teas/milks/add-ons, and lets shoppers assemble drinks with calculated totals.
- `CartPage.jsx`: summarizes cart contents and invokes checkout.
- `OrderSummaryPage.jsx`: shows recently placed orders and polls for status updates.
- `PastOrdersPage.jsx`: authenticated history view calling `/api/v1/orders` and filtering for completed records.
- `RewardPage.jsx`: member loyalty program interface for viewing and redeeming rewards.

### Staff & manager tooling
- `AdminPage.jsx`: dual-purpose page combining login/logout controls, inventory browsing, quantity adjustments, new item creation, and (for managers) staff account creation via `/api/v1/admin/accounts`.
- `CurrentOrdersPage.jsx`: live queue view for staff; supports status transitions and deletions through `/api/v1/orders/<id>`.
- `AnalyticsPage.jsx`: loads `/api/v1/analytics/summary` and `/api/v1/analytics/shifts` presenting sales metrics plus staff scheduling insights.
- `SchedulingPage.jsx`: weekly shift planner backed by `/api/v1/schedule`, allowing claims and assignments with staff management.
- `SessionPanel.jsx`: displays session metadata and switching capabilities.

### State & API interaction patterns
- All fetch calls include JWT headers when available; error messages are surfaced via a shared `statusMessage` banner stored in `App.jsx`.
- `App.jsx` persists the JWT and last known profile to `localStorage` so the session survives refreshes. Clearing the token also clears the cached profile.
- Order submission serializes cart items into the API format expected by `POST /api/v1/orders`, and success responses hydrate the order summary view.

## Order Journey Walkthrough
1. A customer (guest or member) composes drinks in the menu builder; each selection captures base drink, milk option, and add-ons.
2. Checkout bundles the cart into a single `/api/orders` POST. The backend validates item availability, decrements inventory, and returns the newly created queue items.
3. Staff monitor `CurrentOrdersPage` to update statuses. Completing an order moves it from `OrderItem` to `OrderRecord`, freeing queue space while preserving history.
4. Customers watch progress in `OrderSummaryPage` (recent orders) or `PastOrdersPage` (completed orders pulled from the same `/api/orders` endpoint).

## Inventory & Customizations
- Customization payloads include `_inventory_reservations` metadata so add-on ingredients are decremented up-front and restored on deletion.
- Default menu seeds (`backend/app/__init__.py`) ensure the system always has core teas, milks, and add-ons; placeholders like "No Milk" are excluded from active tracking.
- Managers can adjust stock levels or deactivate menu items without deleting them, allowing temporary rotations.

## Scheduling Workflow
- Shift slots are defined as `morning` and `evening` (`SHIFT_NAMES` in `models.py`).
- Staff members can claim future shifts for themselves; managers may assign staff IDs directly or remove others' assignments.
- The frontend consolidates responses into a calendar-style grid (`SchedulingPage.jsx`), highlighting the signed-in user's slots.

## Analytics Data Pipeline
- Only completed orders (records in `OrderRecord`) contribute to analytics so live queue volatility does not skew metrics.
- `analytics_summary` groups sales by menu item and tallies popular customization choices via counters derived from stored JSON customizations.
- The frontend surfaces total drinks sold, pending queue count, tracking start date, and per-category popularity charts.

## Running the System Locally
### With Docker
1. Ensure Docker is running.
2. From the project root run `docker-compose up --build`.
3. Visit `http://localhost` for the frontend; the API is published at `http://localhost:8000` inside the compose network.

### Without Docker
- Backend: `cd backend && pip install -r requirements.txt && flask --app app:create_app run --debug` (ensure `DATABASE_URL` and `JWT_SECRET` env vars are set).
- Frontend: `cd frontend && npm install && npm run dev` (serves on Vite's default port and proxies `/api` calls).

### Default credentials
- Manager bootstrap account: username `admin`, password `admin` (change `JWT_SECRET` and account credentials in production).

## Documentation Structure

This repository follows conventional documentation practices with organized, specialized guides:

### 📖 **Core Documentation**
- **[README.md](./README.md)** - Project overview, quick start, and essential information
- **[CHANGELOG.md](./CHANGELOG.md)** - Version history and release notes
- **[LICENSE](./LICENSE)** - MIT license information

### 📚 **Detailed Guides** (`/docs/`)
- **[API.md](./docs/API.md)** - Complete API reference with examples
- **[DEPLOYMENT.md](./docs/DEPLOYMENT.md)** - Production deployment and configuration  
- **[DEVELOPMENT.md](./docs/DEVELOPMENT.md)** - Development setup and coding standards
- **[MULTI_SESSION.md](./docs/MULTI_SESSION.md)** - Advanced authentication system

### 📋 **Historical Records**
- **[API_IMPROVEMENTS.md](./API_IMPROVEMENTS.md)** - API standardization project history

---

## Quick Reference

### 🚀 **Getting Started**
```bash
git clone https://github.com/Johnnyeer/bubbletea.git
cd bubbletea
docker-compose up -d
```
Access: http://localhost (Frontend) | http://localhost:8000 (API)

### 🔌 **API Overview**  
- **Base URL**: `/api/v1/`
- **Authentication**: JWT Bearer tokens
- **Endpoints**: 21 fully implemented routes
- **Documentation**: [docs/API.md](./docs/API.md)

### 🏗️ **Development**
```bash
# Backend
cd backend && python -m app

# Frontend  
cd frontend && npm run dev
```
See [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md) for complete setup.

### 📦 **Production Deployment**
Full Docker containerization with Nginx proxy and persistent data storage.
See [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) for production configuration.

---

*For detailed technical architecture and implementation details, see the sections below.*


