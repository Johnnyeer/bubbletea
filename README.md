# Bubble Tea Management System

A comprehensive full-stack web application for managing bubble tea shop operations, featuring customer ordering, staff management, inventory tracking, scheduling, and analytics.

## 🚀 Quick Start

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

## 🏗️ Architecture

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

## ✨ Features

### For Customers
- 🛒 **Menu Browsing** - Browse drinks with customization options
- 🛍️ **Order Placement** - Add items to cart and checkout
- 👤 **Member Registration** - Create account for rewards
- 🎁 **Loyalty Rewards** - Earn free drinks and add-ons
- 📱 **Order Tracking** - Real-time order status updates

### For Staff
- 📋 **Order Management** - View and process customer orders
- 📊 **Live Dashboard** - Real-time queue and order status
- 📅 **Shift Scheduling** - Claim and manage work shifts
- 📈 **Analytics** - Sales metrics and performance data

### For Managers
- 👥 **Staff Management** - Create staff accounts and assign roles  
- 📦 **Inventory Control** - Manage menu items and stock levels
- 📊 **Advanced Analytics** - Detailed sales and staff reports
- ⚙️ **System Administration** - Full system configuration access

### Advanced Features
- 🔄 **Multi-Session Support** - Multiple users can be logged in simultaneously
- 🎯 **Role-Based Access** - Granular permission system (customer/staff/manager)
- 🔒 **Secure Authentication** - JWT-based auth with role validation
- 📱 **Responsive Design** - Works on desktop and mobile devices

## 🛠️ Development

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
- `POST /api/v1/auth/login` - User authentication
- `GET /api/v1/items` - Menu items
- `POST /api/v1/orders` - Create orders
- `GET /api/v1/analytics/summary` - Sales analytics

Full API documentation available in [`docs/API.md`](./docs/API.md)

## 📁 Project Structure

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
├── docs/                   # Documentation
├── docker-compose.yml     # Container orchestration
└── README.md              # This file
```

## 🔧 Configuration

### Environment Variables
- `JWT_SECRET`: Secret key for JWT token signing
- `DATABASE_URL`: Database connection string (default: SQLite)

### Docker Configuration
- **Web Server**: Nginx proxy on port 80
- **API Server**: Flask application on port 8000
- **Database**: SQLite with persistent volume

## 📚 Documentation

- [**API Documentation**](./docs/API.md) - Complete API reference
- [**Multi-Session Guide**](./docs/MULTI_SESSION.md) - Advanced authentication features
- [**Deployment Guide**](./docs/DEPLOYMENT.md) - Production deployment instructions
- [**Development Guide**](./docs/DEVELOPMENT.md) - Development setup and guidelines

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🎯 Production Ready

✅ **Complete API Coverage** - 21 endpoints fully implemented  
✅ **Clean Codebase** - No redundant code or excessive comments  
✅ **Standardized Routes** - Consistent `/api/v1/*` structure  
✅ **Role-Based Security** - JWT authentication with permissions  
✅ **Docker Support** - Full containerization for easy deployment  
✅ **Comprehensive Testing** - API endpoint verification included  

---

**Built with ❤️ for efficient bubble tea shop management**