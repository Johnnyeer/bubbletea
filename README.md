# Bubble Tea Management System

A comprehensive full-stack web application for managing bubble tea shop operations, featuring customer ordering, staff management, inventory tracking, scheduling, and analytics.

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Git

### Running the Application

1. **Clone the repository**
   ```bash
   git clone https://github.com/Johnnyeer/bubbletea.git
   cd bubbletea
   ```

2. **Start with Docker Compose**
   ```bash
   docker-compose up -d
   ```

3. **Access the application**
   - **Frontend**: http://localhost (port 80)
   - **Backend API**: http://localhost:8000
   - **Health Check**: http://localhost:8000/api/v1/health

## Architecture

### Tech Stack
- **Frontend**: React + Vite (SPA)
- **Backend**: Flask + SQLAlchemy
- **Database**: SQLite
- **Authentication**: JWT tokens
- **Deployment**: Docker + Nginx

### System Overview
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React SPA     │───▶│   Flask API      │───▶│   SQLite DB     │
│   (Port 80)     │    │   (Port 8000)    │    │   (data/app.db) │
│   - Customer UI │    │   - REST API     │    │   - Orders      │
│   - Staff Tools │    │   - JWT Auth     │    │   - Inventory   │
│   - Admin Panel │    │   - Role-based   │    │   - Users       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Detailed Architecture

#### Component Flow
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

#### Docker Deployment
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

- Frontend SPA issues fetches against `/api/*`, attaching JWTs when authenticated
- Flask handles routing, authorization, and inventory logic before persisting through SQLAlchemy
- SQLite stores shared state; helper routines ensure schema upgrades and default records on startup
- Shared `./data` volume keeps `app.db` persistent across container rebuilds

## Features

### For Customers
- **Menu Browsing** - Browse drinks with customization options
- **Order Placement** - Add items to cart and checkout
- **Member Registration** - Create account for rewards
- **Loyalty Rewards** - Earn free drinks and add-ons
- **Order Tracking** - Real-time order status updates

### For Staff
- **Order Management** - View and process customer orders
- **Live Dashboard** - Real-time queue and order status
- **Shift Scheduling** - Claim and manage work shifts
- **Analytics** - Sales metrics and performance data

### For Managers
- **Staff Management** - Create staff accounts and assign roles  
- **Inventory Control** - Manage menu items and stock levels
- **Advanced Analytics** - Detailed sales and staff reports
- **System Administration** - Full system configuration access

### Advanced Features
- **Multi-Session Support** - Multiple users can be logged in simultaneously
- **Role-Based Access** - Granular permission system (customer/staff/manager)
- **Secure Authentication** - JWT-based auth with role validation
- **Responsive Design** - Works on desktop and mobile devices

## Technical Details

### Database Models
- **Member**: Customer accounts (email + password hash, joined timestamp)
- **Staff**: Staff and manager accounts (username, role flag, hire date)
- **MenuItem**: Master list of teas, milks, and add-ons with price, stock level, and active flag
- **OrderItem**: Live order queue records with status, total price, and JSON customizations
- **OrderRecord**: Immutable archive written when orders complete; powers analytics history
- **ScheduleShift**: Unique staff shift assignments by date and slot
- **MemberReward**: Loyalty program rewards and promotional codes

### Backend Services
- **Authentication System** (`/api/v1/auth/`) - User registration, JWT-based login with role validation
- **Order Management** (`/api/v1/orders/`) - Complete order lifecycle with real-time status tracking
- **Menu & Inventory** (`/api/v1/items/`) - Dynamic menu management with stock level tracking
- **Rewards System** (`/api/v1/rewards/`) - Milestone-based rewards and promotional codes
- **Staff Scheduling** (`/api/v1/schedule/`) - Weekly shift management with workload balancing
- **Business Analytics** (`/api/v1/analytics/`) - Sales performance and staff utilization metrics
- **Admin Operations** (`/api/v1/admin/`) - Staff account creation and system administration

### Application Startup
- `backend/app/__init__.py` builds the Flask app, wires blueprints, and runs database migrations
- Bootstrap tasks seed menu items, add missing columns, and ensure default manager account
- Database auto-creates and migrates on startup with seeded data

## Development

### Local Development Setup

1. **Backend Development**
   ```bash
   cd backend
   pip install -r requirements.txt
   python -m app
   ```

2. **Frontend Development** 
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

### API Documentation
- **Base URL**: `/api/v1/`
- **Authentication**: Bearer JWT tokens
- **Format**: JSON request/response

#### Key Endpoints
- `POST /api/v1/auth/register` - User registration  
- `POST /api/v1/auth/login` - User authentication
- `GET /api/v1/items` - List menu items
- `POST /api/v1/items` - Create menu items (manager only)
- `GET /api/v1/orders` - List orders
- `POST /api/v1/orders` - Create orders
- `PATCH /api/v1/orders/<id>` - Update order status
- `GET /api/v1/rewards` - List member rewards
- `POST /api/v1/rewards/redeem` - Redeem rewards
- `GET /api/v1/schedules` - List shifts
- `POST /api/v1/schedules` - Create shifts
- `GET /api/v1/analytics/summary` - Sales analytics
- `GET /api/v1/analytics/shifts` - Staff shift analytics

Full API documentation available in [`API.md`](./API.md)

### Frontend-Backend Integration

The React frontend communicates with the Flask API through a well-defined integration layer:

#### **Route Integration Examples**
- **Menu Browsing**: `/menu` page → `GET /api/v1/items` → Display menu with categories
- **Order Placement**: `/cart` checkout → `POST /api/v1/orders` → Create order items  
- **Order Management**: `/orders` staff page → `GET /api/v1/orders` → Live queue display
- **Staff Scheduling**: `/schedule` page → `GET /api/v1/schedule` → Weekly calendar view
- **Analytics Dashboard**: `/analytics` page → `GET /api/v1/analytics/summary` → Business metrics

#### **Authentication Flow**
1. User logs in via frontend forms (`/customer` or `/staff` routes)
2. Credentials sent to `POST /api/v1/auth/login` 
3. JWT token returned and stored in sessionManager
4. All subsequent API calls include `Authorization: Bearer {token}` header
5. Multi-session support allows concurrent user logins

For detailed integration patterns, see [`DEVELOPMENT.md`](./DEVELOPMENT.md)

## Project Structure

```
bubbletea/
├── backend/                 # Flask API server
│   ├── app/                # Application modules
│   │   ├── models.py       # Database models
│   │   ├── auth.py         # Authentication logic
│   │   ├── orders.py       # Order management
│   │   ├── items.py        # Menu/inventory
│   │   ├── analytics.py    # Business analytics
│   │   └── ...
│   ├── requirements.txt    # Python dependencies
│   └── Dockerfile         # Backend container
├── frontend/               # React application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── utils/          # Utility functions
│   │   └── main.jsx       # App entry point
│   ├── package.json       # Node dependencies  
│   └── Dockerfile         # Frontend container
├── data/                   # Database storage
├── docker-compose.yml     # Container orchestration
├── API.md                 # API documentation
├── DEPLOYMENT.md          # Deployment guide
├── DEVELOPMENT.md         # Development guide
├── MULTI_SESSION.md       # Multi-session auth guide
└── README.md              # This file
```

## Configuration

### Environment Variables
- `JWT_SECRET`: Secret key for JWT token signing
- `DATABASE_URL`: Database connection string (default: SQLite)

### Docker Configuration
- **Web Server**: Nginx proxy on port 80
- **API Server**: Flask application on port 8000
- **Database**: SQLite with persistent volume

## Documentation

- [**API Documentation**](./API.md) - Complete API reference
- [**Multi-Session Guide**](./MULTI_SESSION.md) - Advanced authentication features
- [**Deployment Guide**](./DEPLOYMENT.md) - Production deployment instructions
- [**Development Guide**](./DEVELOPMENT.md) - Development setup and guidelines

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Production Ready

- **Complete API Coverage** - Full REST API implementation  
- **Clean Codebase** - No redundant code or excessive comments  
- **Standardized Routes** - Consistent `/api/v1/*` structure  
- **Role-Based Security** - JWT authentication with permissions  
- **Docker Support** - Full containerization for easy deployment  
- **Comprehensive Testing** - API endpoint verification included  

---

**Built for efficient bubble tea shop management**