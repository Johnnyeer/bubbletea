# Bubble Tea Frontend

React-based frontend for the Bubble Tea Management System.

## Tech Stack
- **React 18** with hooks
- **Vite** for fast development and building
- **CSS-in-JS** styling approach
- **Multi-session authentication** system

## Development

### Quick Start
```bash
npm install
npm run dev
```

### Available Scripts
```bash
npm run dev      # Start Vite dev server (localhost:5173)
npm run build    # Build for production
npm run preview  # Preview production build
npm run format   # Format code
```

### Key Features
- **Multi-Session Auth**: Support for concurrent user sessions
- **Role-Based UI**: Different interfaces for customers, staff, and managers  
- **Real-time Updates**: Live order status and queue management
- **Responsive Design**: Works on desktop and mobile devices

### API Integration
The frontend communicates with the Flask backend API:
- **Base URL**: `/api/v1/`
- **Proxy Config**: Vite dev server proxies API calls to `localhost:8000`
- **Authentication**: JWT tokens managed by sessionManager utility

### Component Architecture
```
src/
├── components/           # React components
│   ├── App.jsx          # Main app with routing
│   ├── AdminPage.jsx    # Manager interface
│   ├── OrderPage.jsx    # Customer ordering
│   ├── SchedulingPage.jsx # Staff scheduling
│   └── ...
├── utils/
│   └── sessionManager.js # Multi-session authentication
├── themes.js            # UI theming
└── main.jsx            # Entry point
```

### Styling
Uses CSS-in-JS with shared style objects in `components/styles.js`:
- Consistent design system
- Theme support
- Responsive breakpoints

For detailed development information, see [../docs/DEVELOPMENT.md](../docs/DEVELOPMENT.md)
