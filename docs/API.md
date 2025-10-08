# API Documentation

## Base URL
All API endpoints are prefixed with `/api/v1/`

## Authentication
The API uses JWT (JSON Web Token) for authentication. Include the token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## User Roles
- **customer**: Can place orders and view their history
- **staff**: Can manage orders and view schedules  
- **manager**: Full access including inventory and analytics

---

## Authentication Endpoints

### POST `/api/v1/auth/register`
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",     // For members
  "username": "staffuser",         // For staff (optional)
  "password": "password123",
  "account_type": "member"         // "member" or "staff"
}
```

**Response:**
```json
{
  "message": "Registration successful",
  "user": {
    "id": 1,
    "email": "user@example.com", 
    "role": "customer"
  }
}
```

### POST `/api/v1/auth/login`
Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",    // Or username for staff
  "password": "password123"
}
```

**Response:**
```json
{
  "access_token": "jwt_token_here",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "customer"
  }
}
```

---

## Menu & Inventory Endpoints

### GET `/api/v1/items`
Retrieve all menu items.

**Response:**
```json
{
  "items": [
    {
      "id": 1,
      "name": "Bubble Tea",
      "category": "tea",
      "price": 4.50,
      "quantity": 100,
      "available": true
    }
  ]
}
```

### POST `/api/v1/items`
Create new menu item. **Requires: manager role**

**Request Body:**
```json
{
  "name": "New Tea",
  "category": "tea",
  "price": 5.00,
  "quantity": 50
}
```

### PATCH `/api/v1/items/{item_id}/quantity`
Update item inventory. **Requires: manager role**

**Request Body:**
```json
{
  "delta": -5  // Decrease by 5, or positive to increase
}
```

### DELETE `/api/v1/items/{item_id}`
Remove menu item. **Requires: manager role**

---

## Order Management Endpoints

### GET `/api/v1/orders`
Retrieve orders based on role and filters.

**Query Parameters:**
- `status`: Filter by order status
- `member_id`: Filter by member (staff/manager only)
- `completed`: Show completed orders (true/false)

**Response:**
```json
{
  "orders": [
    {
      "id": 1,
      "item_id": 1,
      "item_name": "Bubble Tea",
      "qty": 2,
      "total": 9.00,
      "status": "received",
      "created_at": "2025-10-08T10:00:00Z",
      "customizations": {
        "tea": "Green Tea",
        "milk": "Oat Milk",
        "addons": ["Boba", "Extra Sweet"]
      }
    }
  ]
}
```

### POST `/api/v1/orders`
Create new order.

**Request Body:**
```json
{
  "items": [
    {
      "item_id": 1,
      "qty": 2,
      "customizations": {
        "tea": "Green Tea",
        "milk": "Oat Milk", 
        "addons": ["Boba"]
      }
    }
  ],
  "applied_rewards": ["free_drink_1"]  // Optional reward IDs
}
```

### PATCH `/api/v1/orders/{order_id}`
Update order status. **Requires: staff role**

**Request Body:**
```json
{
  "status": "preparing"  // "received", "preparing", "complete"
}
```

### DELETE `/api/v1/orders/{order_id}`
Cancel order and restore inventory. **Requires: staff role**

---

## Rewards System Endpoints

### GET `/api/v1/rewards`
Get member's reward status. **Requires: member authentication**

**Response:**
```json
{
  "drink_count": 12,
  "available_rewards": {
    "free_drink": 1,
    "free_addon": 2
  },
  "earned_rewards": {
    "free_drink": 1,
    "free_addon": 2
  },
  "used_rewards": {
    "free_drink": 0,
    "free_addon": 0
  }
}
```

### POST `/api/v1/rewards/redeem`
Redeem a member reward. **Requires: member authentication**

**Request Body:**
```json
{
  "type": "free_drink"  // "free_drink" or "free_addon"
}
```

### POST `/api/v1/rewards/code`
Apply promotional reward code. **Requires: authentication**

**Request Body:**
```json
{
  "code": "WELCOME10"  // Available: WELCOME10, STUDENT15, LOYALTY20, FREESHIP
}
```

---

## Scheduling Endpoints

### GET `/api/v1/schedule`
Get weekly shift schedule. **Requires: staff role**

**Query Parameters:**
- `start_date`: Week start date (YYYY-MM-DD format)

**Response:**
```json
{
  "shifts": [
    {
      "id": 1,
      "staff_id": 2,
      "staff_name": "John Doe",
      "shift_date": "2025-10-08",
      "shift_name": "morning",
      "start_time": "08:00",
      "end_time": "16:00"
    }
  ],
  "start_date": "2025-10-07",
  "end_date": "2025-10-13"
}
```

### POST `/api/v1/schedule`
Create or claim a shift. **Requires: staff role**

**Request Body:**
```json
{
  "staff_id": 2,        // Manager can assign to anyone, staff can only assign to self
  "shift_date": "2025-10-08",
  "shift_name": "morning"  // "morning", "afternoon", "evening"
}
```

### GET `/api/v1/schedule/staff`
List all active staff for assignment. **Requires: manager role**

**Response:**
```json
{
  "staff": [
    {
      "id": 2,
      "username": "john_doe",
      "full_name": "John Doe",
      "role": "staff",
      "is_active": true
    }
  ]
}
```

### DELETE `/api/v1/schedule/{shift_id}`
Remove a shift. **Requires: staff role (own shifts) or manager role (any shift)**

---

## Analytics Endpoints

### GET `/api/v1/analytics/summary`
Get sales and inventory analytics. **Requires: staff role**

**Response:**
```json
{
  "summary": {
    "total_items_sold": 150,
    "pending_order_items": 5,
    "tracking_since": "2025-09-01T00:00:00Z"
  },
  "items_sold": [
    {
      "item_id": 1,
      "item_key": "menu:1",
      "name": "Bubble Tea",
      "category": "tea", 
      "quantity_sold": 45
    }
  ],
  "popular": {
    "tea": {"label": "Green Tea", "count": 32},
    "milk": {"label": "Oat Milk", "count": 28},
    "addon": {"label": "Boba", "count": 67}
  }
}
```

### GET `/api/v1/analytics/shifts`
Get weekly staff scheduling analytics. **Requires: staff role**

**Query Parameters:**
- `week_start`: Week start date (YYYY-MM-DD format)

**Response:**
```json
{
  "week": {
    "start_date": "2025-10-07",
    "end_date": "2025-10-13",
    "week_number": 41,
    "year": 2025,
    "days": [
      {"date": "2025-10-07", "day": "Mon"},
      {"date": "2025-10-08", "day": "Tue"}
    ]
  },
  "overview": {
    "total_people": 3,
    "total_shifts": 15,
    "total_hours": 15.0,
    "average_hours": 5.0,
    "shift_length_hours": 1,
    "recommended_max_hours": 35
  },
  "staff": [
    {
      "staff_id": 2,
      "full_name": "John Doe",
      "role": "staff",
      "total_shifts": 6,
      "total_hours": 6.0,
      "status": "balanced",
      "shifts": [
        {
          "date": "2025-10-08",
          "day": "Tue", 
          "shift_name": "morning"
        }
      ]
    }
  ]
}
```

---

## Admin Endpoints

### POST `/api/v1/admin/accounts`
Create staff or member account. **Requires: manager role**

**Request Body:**
```json
{
  "account_type": "staff",        // "staff" or "member"
  "username": "new_staff",        // For staff accounts
  "email": "staff@example.com",   // For member accounts
  "password": "secure_password",
  "full_name": "New Staff Member" // For staff accounts
}
```

---

## Health Check

### GET `/api/v1/health`
Check API health status.

**Response:**
```json
{
  "status": "ok"
}
```

---

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "Error message description",
  "code": "ERROR_CODE"  // Optional error code
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

---

## Rate Limiting

Currently no rate limiting is implemented, but consider implementing in production:
- Authentication endpoints: 5 requests per minute
- Order creation: 10 requests per minute  
- Other endpoints: 100 requests per minute