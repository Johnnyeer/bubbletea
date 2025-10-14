# Development Guide

## Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- Git
- Docker (optional)

### Quick Setup

1. **Clone Repository**
   ```bash
   git clone https://github.com/Johnnyeer/bubbletea.git
   cd bubbletea
   ```

2. **Backend Setup**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   ```

4. **Start Development Servers**
   ```bash
   # Terminal 1: Backend
   cd backend
   python -m app

   # Terminal 2: Frontend  
   cd frontend
   npm run dev
   ```

5. **Access Application**
   - Frontend: http://localhost:5173 (Vite dev server)
   - Backend API: http://localhost:8000
   - API Docs: See [docs/API.md](./API.md)

## Project Structure

```
bubbletea/
├── backend/                    # Flask API
│   ├── app/
│   │   ├── __init__.py        # App factory
│   │   ├── models.py          # Database models
│   │   ├── auth.py            # Authentication & JWT
│   │   ├── orders.py          # Order management
│   │   ├── items.py           # Menu & inventory
│   │   ├── rewards.py         # Loyalty system
│   │   ├── schedules.py       # Staff scheduling
│   │   ├── analytics.py       # Business analytics
│   │   ├── admin.py           # Admin operations
│   │   ├── db.py              # Database connection
│   │   ├── bootstrap.py       # Database initialization
│   │   ├── customizations.py  # Order customization logic
│   │   └── time_utils.py      # Date/time utilities
│   ├── tests/                 # Test files
│   ├── requirements.txt       # Python dependencies
│   └── test_routes.py         # API endpoint verification
├── frontend/                   # React SPA
│   ├── src/
│   │   ├── components/        # React components
│   │   │   ├── App.jsx        # Main app component
│   │   │   ├── AdminPage.jsx  # Admin interface
│   │   │   ├── OrderPage.jsx  # Customer ordering
│   │   │   ├── MenuSelectionPage.jsx
│   │   │   ├── CurrentOrdersPage.jsx
│   │   │   ├── AnalyticsPage.jsx
│   │   │   ├── SchedulingPage.jsx
│   │   │   ├── RewardPage.jsx
│   │   │   └── ...
│   │   ├── utils/
│   │   │   └── sessionManager.js  # Multi-session auth
│   │   ├── themes.js          # UI themes
│   │   └── main.jsx           # App entry point
│   ├── public/                # Static assets
│   ├── package.json           # Node dependencies
│   └── vite.config.js         # Vite configuration
├── docs/                      # Documentation
├── data/                      # Database files (SQLite)
└── docker-compose.yml         # Container orchestration
```

## Backend Development

### Architecture

The backend follows a modular Flask blueprint architecture:

- **Flask App Factory** (`app/__init__.py`): Creates and configures the Flask application
- **Blueprints**: Organized by feature (auth, orders, items, etc.)
- **SQLAlchemy ORM**: Database abstraction with automatic migrations
- **JWT Authentication**: Token-based auth with role validation

### Database Models

Located in `app/models.py`:

```python
# Key Models
- Member: Customer accounts (email-based)
- Staff: Employee accounts (username-based) 
- MenuItem: Menu items and inventory
- OrderItem: Active orders (live queue)
- OrderRecord: Completed order history
- ScheduleShift: Staff scheduling
- MemberReward: Loyalty program rewards
```

### API Development

#### Adding New Endpoints

1. **Create Blueprint** (or use existing):
   ```python
   # app/new_feature.py
   from flask import Blueprint
   
   bp = Blueprint("new_feature", __name__, url_prefix="/api/v1/new_feature")
   
   @bp.get("")
   def list_items():
       return jsonify({"items": []})
   ```

2. **Register Blueprint**:
   ```python
   # app/__init__.py
   from .new_feature import bp as new_feature_bp
   
   def create_app():
       # ...
       app.register_blueprint(new_feature_bp)
   ```

3. **Add Route Verification**:
   ```python
   # test_routes.py
   expected_routes = [
       # ... existing routes
       '/api/v1/new_feature',
   ]
   ```

#### Authentication & Authorization

```python
from .auth import role_required, session_scope, _get_identity

@bp.get("/protected")
@role_required("staff", "manager")  # Require staff or manager role
def protected_endpoint():
    account_type, account_id, user_data = _get_identity()
    # ... endpoint logic
```

#### Database Operations

```python
from .auth import session_scope
from .models import MenuItem

@bp.get("/items")
def get_items():
    with session_scope() as session:
        items = session.execute(select(MenuItem)).scalars().all()
        return jsonify({"items": [item.serialize() for item in items]})
```

### Testing

```bash
# Run API route verification
cd backend
python test_routes.py

# Run unit tests
python -m pytest tests/

# Test specific functionality
python -c "
from app.auth import session_scope
from app.models import Member
with session_scope() as session:
    members = session.execute(select(Member)).scalars().all()
    print(f'Found {len(members)} members')
"
```

### Database Management

```bash
# The database auto-creates and migrates on startup
# Location: ./data/app.db

# Reset database (development only)
rm ./data/app.db
# Restart backend to recreate with seed data

# Backup database
cp ./data/app.db ./data/backup_$(date +%Y%m%d).db
```

## Frontend-API Integration

### Route-to-Endpoint Mapping

The frontend uses React routing with manual navigation handling in `App.jsx`. Here's how frontend routes map to backend API endpoints:

#### **Customer/Member Routes**
- **`/customer`** (OrderPage) → Login form calls `POST /api/v1/auth/login`
- **`/register`** (RegisterPage) → Registration form calls `POST /api/v1/auth/register`
- **`/menu`** (MenuSelectionPage) → Menu display calls `GET /api/v1/items`
- **`/cart`** (CartPage) → Checkout calls `POST /api/v1/orders`
- **`/order-summary`** (OrderSummaryPage) → Order status calls `GET /api/v1/orders`
- **`/past-orders`** (PastOrdersPage) → Order history calls `GET /api/v1/orders?completed=true`
- **`/rewards`** (RewardPage) → Rewards display calls `GET /api/v1/rewards`

#### **Staff/Manager Routes**
- **`/`** (Home/AdminPage) → Dashboard calls `GET /api/v1/items` (inventory view)
- **`/orders`** (CurrentOrdersPage) → Live queue calls `GET /api/v1/orders`
  - Order status updates: `PATCH /api/v1/orders/{id}`
  - Order deletion: `DELETE /api/v1/orders/{id}`
- **`/analytics`** (AnalyticsPage) → Reports call:
  - `GET /api/v1/analytics/summary`
  - `GET /api/v1/analytics/shifts`
- **`/inventory`** (AdminPage) → Inventory management calls:
  - `GET /api/v1/items` (view items)
  - `POST /api/v1/items` (create items)
  - `PATCH /api/v1/items/{id}/quantity` (adjust stock)
  - `DELETE /api/v1/items/{id}` (remove items)
- **`/schedule`** (SchedulingPage) → Staff scheduling calls:
  - `GET /api/v1/schedule` (view shifts)
  - `GET /api/v1/schedule/staff` (list staff)
  - `POST /api/v1/schedule` (create shifts)
  - `DELETE /api/v1/schedule/{id}` (remove shifts)

#### **Admin Functions**
- **Account Creation** → `POST /api/v1/admin/accounts`
- **Reward Codes** → `POST /api/v1/rewards/code`

### Authentication Flow

1. **User Login**: Frontend form (`/customer` or `/staff`) submits credentials to `POST /api/v1/auth/login`
2. **Token Storage**: JWT token stored in sessionManager with user profile data
3. **API Requests**: All authenticated requests include `Authorization: Bearer {token}` header
4. **Multi-Session**: sessionManager handles multiple concurrent user sessions

### State Management

```javascript
// Session management (utils/sessionManager.js)
sessionManager.createSession(user, token)  // Store session
sessionManager.getActiveToken()            // Get current JWT
sessionManager.switchSession(sessionId)    // Change active user

// API call pattern
const token = sessionManager.getActiveToken();
const headers = token ? { Authorization: `Bearer ${token}` } : {};
fetch('/api/v1/endpoint', { headers })
```

### Error Handling

- **Authentication Errors (401)**: Redirect to login page
- **Permission Errors (403)**: Show access denied message
- **Network Errors**: Display user-friendly error messages
- **API Errors**: Parse JSON error responses and display to user

## Frontend Development

### Architecture

The frontend is a React SPA using:

- **React 18** with modern hooks
- **Vite** for fast development and building
- **Vanilla CSS** with CSS modules
- **Manual Routing** via App.jsx state management
- **Multi-Session Auth** via sessionManager utility

### Key Components

#### App.jsx (Main App)
- Global state management
- Manual routing logic  
- API communication
- Session management integration

#### Component Development

```jsx
// Example component structure
import { useState, useEffect } from 'react';
import { primaryButtonStyle, cardStyle } from './styles.js';

export default function NewComponent({ currentUser, onAction }) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const token = sessionManager.getActiveToken();
            const response = await fetch('/api/v1/endpoint', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const result = await response.json();
            setData(result.data);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={cardStyle}>
            {loading ? (
                <div>Loading...</div>
            ) : (
                <div>
                    {/* Component content */}
                    <button 
                        style={primaryButtonStyle}
                        onClick={onAction}
                    >
                        Action
                    </button>
                </div>
            )}
        </div>
    );
}
```

#### Multi-Session Integration

```jsx
import sessionManager from '../utils/sessionManager.js';

// Get active session info
const activeSession = sessionManager.getActiveSession();
const token = sessionManager.getActiveToken();

// Check for multiple sessions
const allSessions = sessionManager.getAllSessions();
const hasMultipleSessions = allSessions.length > 1;

// Session-aware API calls
const headers = token ? { Authorization: `Bearer ${token}` } : {};
```

### Styling

Using CSS-in-JS approach with shared style objects:

```javascript
// components/styles.js
export const primaryButtonStyle = {
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '5px',
    cursor: 'pointer',
    // ...
};

export const cardStyle = {
    backgroundColor: 'white',
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '20px',
    margin: '10px 0',
    // ...
};
```

### State Management

The app uses local component state and props for data flow:

```jsx
// App.jsx manages global state
const [currentUser, setCurrentUser] = useState(null);
const [cart, setCart] = useState([]);
const [statusMessage, setStatusMessage] = useState('');

// Pass to components as needed
<OrderPage 
    currentUser={currentUser}
    cart={cart}
    setCart={setCart}
    onStatusUpdate={setStatusMessage}
/>
```

## Code Standards

### Backend (Python)

```python
# Import organization
"""Module docstring."""
import standard_library
import third_party
from .local_modules import something

# Function documentation
def example_function(param1: str, param2: int | None = None) -> dict:
    """Brief description of function.
    
    Args:
        param1: Description of parameter
        param2: Optional parameter description
        
    Returns:
        Description of return value
    """
    return {"result": "value"}

# Error handling
try:
    result = risky_operation()
    return jsonify(result)
except ValueError as e:
    return _json_error(str(e), 400)
except Exception:
    return _json_error("Internal server error", 500)
```

### Frontend (JavaScript/JSX)

```jsx
// Component naming: PascalCase
export default function ComponentName() { }

// Variables: camelCase  
const userName = 'example';
const isLoading = true;

// Functions: camelCase
const handleSubmit = () => { };
const fetchUserData = async () => { };

// Constants: UPPER_CASE
const API_BASE_URL = '/api/v1';
const MAX_RETRY_COUNT = 3;

// Async/await preferred over .then()
const fetchData = async () => {
    try {
        const response = await fetch('/api/v1/endpoint');
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
};
```

### API Design Standards

```python
# Endpoint naming: RESTful conventions
GET    /api/v1/items          # List items
POST   /api/v1/items          # Create item  
GET    /api/v1/items/{id}     # Get specific item
PUT    /api/v1/items/{id}     # Update item
DELETE /api/v1/items/{id}     # Delete item

# Response format: Consistent JSON structure
{
    "success": true,
    "data": { /* response data */ },
    "message": "Optional success message"
}

# Error format: Standard error response  
{
    "error": "Human readable error message",
    "code": "ERROR_CODE",  // Optional
    "details": { /* Additional error details */ }  // Optional
}
```

## Common Development Tasks

### Adding New Menu Categories

1. **Update Backend Model**:
   ```python
   # app/models.py - Update ITEM_CATEGORIES
   ITEM_CATEGORIES = ["tea", "milk", "addon", "new_category"]
   ```

2. **Update Frontend Logic**:
   ```jsx
   // components/MenuSelectionPage.jsx
   const categoryOrder = ["tea", "milk", "addon", "new_category"];
   ```

### Adding New User Roles

1. **Backend Role Configuration**:
   ```python
   # app/auth.py - Update role validation
   @role_required("staff", "manager", "new_role")
   def protected_endpoint():
       # ...
   ```

2. **Frontend Role Handling**:
   ```jsx
   // Check role in components
   if (currentUser?.role === 'new_role') {
       // Role-specific UI
   }
   ```

### Adding New Analytics

1. **Backend Analytics Endpoint**:
   ```python
   # app/analytics.py
   @bp.get("/new_metric")
   @role_required("manager")
   def new_analytics_metric():
       with SessionLocal() as session:
           # Analytics calculation
           return jsonify({"metric": result})
   ```

2. **Frontend Analytics Display**:
   ```jsx
   // components/AnalyticsPage.jsx
   const [newMetric, setNewMetric] = useState(null);
   
   const fetchNewMetric = async () => {
       const response = await fetch('/api/v1/analytics/new_metric', {headers});
       const data = await response.json();
       setNewMetric(data.metric);
   };
   ```

## Debugging

### Backend Debugging

```python
# Enable debug mode
export FLASK_ENV=development
export FLASK_DEBUG=1
python -m app

# Database debugging
from app.db import SessionLocal
from app.models import *
with SessionLocal() as session:
    # Debug queries
    items = session.execute(select(MenuItem)).scalars().all()
    print(f"Found {len(items)} items")
```

### Frontend Debugging

```javascript
// Session debugging
console.log('Active session:', sessionManager.getActiveSession());
console.log('All sessions:', sessionManager.getAllSessions());

// API debugging
const response = await fetch('/api/v1/endpoint', {
    headers: { Authorization: `Bearer ${token}` }
});
console.log('Response status:', response.status);
console.log('Response data:', await response.json());
```

### Network Debugging

```bash
# Check API connectivity
curl -v http://localhost:8000/api/v1/health

# Check with authentication
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/v1/orders

# Check frontend proxy
curl -v http://localhost:5173/api/v1/health
```

## Performance Tips

### Backend Optimization

- Use `session_scope()` context manager for database operations
- Implement proper SQL query optimization
- Cache frequently accessed data
- Use background tasks for heavy operations

### Frontend Optimization

- Implement component memoization with `useMemo`/`useCallback`
- Optimize re-renders with proper dependency arrays
- Lazy load large components
- Debounce user input for search/filter operations
