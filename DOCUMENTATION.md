# Bubble Tea Management System Overview

## High-Level Architecture
- The project is split into a Flask backend (`backend/app`) that exposes a REST-style API and a React single-page frontend (`frontend/src`).
- SQLite is the default datastore; connection settings are managed in `backend/app/db.py` and persisted under `data/app.db`.
- Docker support is provided through `docker-compose.yml`, which builds the API (exposed on port 8000) and serves the compiled frontend through Nginx (port 80).
- JSON Web Tokens (JWT) secure protected endpoints. Authentication and authorization are role-based (`customer`, `staff`, `manager`).

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
- `/api/auth/register`: registers members (email) or staff (username) accounts.
- `/api/auth/login`: verifies credentials and returns a JWT with role claims.
- `/api/me`: returns the current profile payload.
- `/api/dashboard/*`: lightweight role-specific greetings used by the frontend session panel.
- Helpers include `session_scope()` for session management and `role_required()` for guardrails.

### Menu management (`backend/app/items.py`)
- `/api/items` (GET): lists all menu entries sorted by category/name.
- `/api/items` (POST): manager-only create flow with validation of price, category, and quantity.
- `/api/items/<id>` (GET/PUT/DELETE): retrieve, update, and remove items; update routes enforce unique names and category whitelist.
- `/api/items/<id>/quantity` (PATCH): manager-only stock adjustments by integer delta.

### Order lifecycle (`backend/app/orders.py`)
- Exposes a rich `/api/orders` blueprint for creating, listing, updating, and deleting order items.
- Creation (`POST /api/orders`): validates menu selections, calculates totals, persists cart-line items, and decrements stock for the base drink plus reserved add-ons.
- Listing (`GET /api/orders`): returns either the live queue or completed history, with optional filters (`ids`, `status`, `member_id`).
- Status updates (`PATCH /api/orders/<id>`): staff move orders between states; when marked `complete`, the order row is copied into `OrderRecord` history and removed from the live table.
- Deletion (`DELETE /api/orders/<id>`): restores reserved inventory counts for the base drink and add-ons.
- Helpers in `backend/app/customizations.py` normalize customization payloads, deserialize stored JSON, and translate it into inventory reservation metadata.

### Scheduling (`backend/app/schedules.py`)
- `/api/scheduling` (GET): staff-only weekly view of upcoming shifts.
- `/api/scheduling` (POST): staff can claim their own shifts; managers/admin may assign any staff member.
- `/api/scheduling/<id>` (DELETE): removes a shift (self-service for staff, full control for managers).

### Analytics (`backend/app/analytics.py`)
- `/api/analytics/summary`: manager/staff endpoint aggregating `OrderRecord` data to report total sales, pending queue size, and most popular teas, milks, and add-ons.

### Supporting utilities
- `backend/app/time_utils.py`: timezone-aware timestamps and ISO formatting.
- `backend/app/analytics.py` & `customizations.py`: transform completed orders into analytics-friendly counters.

## Frontend Application (React)
### Core layout & routing
- `frontend/src/App.jsx` stores global state (token, cart, order history) and performs manual routing based on `window.history`. Navigation links adapt to the viewer role.
- `SystemLayout.jsx`, `SystemHeader.jsx`, and `NavigationLink.jsx` render the shared frame, title, and nav bar.

### Customer experience
- `OrderPage.jsx`: login form with optional guest checkout.
- `RegisterPage.jsx`: membership sign-up integrated with `/api/auth/register`.
- `MenuSelectionPage.jsx`: fetches `/api/items`, groups teas/milks/add-ons, and lets shoppers assemble drinks with calculated totals.
- `CartPage.jsx`: summarizes cart contents and invokes checkout.
- `OrderSummaryPage.jsx`: shows recently placed orders and polls for status updates.
- `PastOrdersPage.jsx`: authenticated history view calling `/api/orders` and filtering for completed records.

### Staff & manager tooling
- `AdminPage.jsx`: dual-purpose page combining login/logout controls, inventory browsing, quantity adjustments, new item creation, and (for managers) staff account creation.
- `CurrentOrdersPage.jsx`: live queue dashboard for staff; supports status transitions and deletions through `/api/orders/<id>`.
- `AnalyticsPage.jsx`: loads `/api/analytics/summary` and presents sales metrics plus popular options.
- `SchedulingPage.jsx`: weekly shift planner backed by `/api/scheduling`, allowing claims and assignments.
- `SessionPanel.jsx`: displays session metadata and quick links to role dashboards.

### State & API interaction patterns
- All fetch calls include JWT headers when available; error messages are surfaced via a shared `statusMessage` banner stored in `App.jsx`.
- Order submission serializes cart items into the API format expected by `POST /api/orders`, and success responses hydrate the order summary view.

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

## Extending or Integrating
- Add new API routes within their respective blueprints (e.g., analytics enhancements in `backend/app/analytics.py`).
- Keep the data model in sync with migration helpers inside `create_app()` when adding columns so existing SQLite databases are upgraded automatically.
- Frontend pages expect JSON structures documented above; when API responses change, update fetch handling in `App.jsx` and the relevant component.

