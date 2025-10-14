# Deployment Guide

## Docker Deployment (Recommended)

### Prerequisites
- Docker Engine 20.10+
- Docker Compose 2.0+

### Quick Deployment

1. **Clone Repository**
   ```bash
   git clone https://github.com/Johnnyeer/bubbletea.git
   cd bubbletea
   ```

2. **Environment Configuration**
   ```bash
   # Create environment file (optional)
   cp .env.example .env
   
   # Edit configuration
   JWT_SECRET=your-secret-key-here
   DATABASE_URL=sqlite:////data/app.db
   ```

3. **Start Services**
   ```bash
   docker-compose up -d
   ```

4. **Verify Deployment**
   ```bash
   # Check service status
   docker-compose ps
   
   # View logs
   docker-compose logs
   
   # Test API health
   curl http://localhost:8000/api/v1/health
   ```

### Service Configuration

#### Frontend Service (web)
- **Container**: Nginx serving React SPA
- **Port**: 80 (HTTP)
- **Build Context**: `./frontend`
- **Features**:
  - Static asset serving
  - API proxy to backend
  - React Router support

#### Backend Service (api)  
- **Container**: Flask application with Gunicorn
- **Port**: 8000 (Internal)
- **Build Context**: `./backend`
- **Features**:
  - REST API server
  - JWT authentication
  - SQLite database
  - Automatic migrations

#### Database Storage
- **Type**: SQLite with persistent volume
- **Location**: `./data/app.db`
- **Backup**: Volume mounted to `./data/`

### Docker Compose Configuration

```yaml
services:
  web:
    build: ./frontend
    depends_on: [api]
    ports:
      - "80:80"

  api:
    build: ./backend
    environment:
      DATABASE_URL: sqlite:////data/app.db
      JWT_SECRET: change-me-in-production
    volumes:
      - ./data:/data
    ports:
      - "8000:8000"
```

### Health Checks

```bash
# API Health
curl http://localhost:8000/api/v1/health
# Expected: {"status":"ok"}

# Frontend Access
curl http://localhost
# Expected: React app HTML

# Database Connectivity
docker exec -it capstone-api-1 python -c "
from app.db import SessionLocal
with SessionLocal() as session:
    print('Database connection successful')
"
```

## Production Deployment

### Security Configuration

1. **Environment Variables**
   ```bash
   # Strong JWT secret (minimum 32 characters)
   JWT_SECRET=your-secure-random-string-min-32-chars
   
   # Database security
   DATABASE_URL=sqlite:////data/app.db
   
   # Optional: External database
   DATABASE_URL=postgresql://user:pass@host:5432/db
   ```

2. **SSL/HTTPS Setup**
   ```nginx
   # Add to nginx.conf for HTTPS
   server {
       listen 443 ssl;
       ssl_certificate /path/to/cert.pem;
       ssl_certificate_key /path/to/key.pem;
       
       location /api/ {
           proxy_pass http://api:8000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

3. **Firewall Rules**
   ```bash
   # Allow only necessary ports
   ufw allow 80/tcp   # HTTP
   ufw allow 443/tcp  # HTTPS
   ufw deny 8000/tcp  # Block direct API access
   ```

### Database Backup

```bash
# Automated backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
cp ./data/app.db ./backups/app_${DATE}.db
find ./backups -name "app_*.db" -mtime +7 -delete
```

### Monitoring & Logs

```bash
# Container logs
docker-compose logs -f web
docker-compose logs -f api

# System monitoring
docker stats

# Disk usage monitoring
du -sh ./data/
```

### Performance Tuning

1. **Nginx Configuration**
   ```nginx
   # Add to nginx.conf
   gzip on;
   gzip_types text/css application/javascript application/json;
   
   # Browser caching
   location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
       expires 1y;
       add_header Cache-Control "public, immutable";
   }
   ```

2. **Database Optimization**
   ```sql
   -- SQLite performance settings
   PRAGMA journal_mode=WAL;
   PRAGMA synchronous=NORMAL;
   PRAGMA cache_size=10000;
   ```

## Development Deployment

### Local Development Setup

1. **Backend Development**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   
   # Start development server
   export FLASK_ENV=development
   python -m app
   ```

2. **Frontend Development**
   ```bash
   cd frontend  
   npm install
   npm run dev  # Starts Vite dev server with hot reload
   ```

3. **Database Setup**
   ```bash
   # Database is created automatically on first run
   # Located at: ./data/app.db
   
   # Reset database (development only)
   rm ./data/app.db
   # Restart backend to recreate with seed data
   ```

### Development Tools

```bash
# API route testing
cd backend
python test_routes.py

# Frontend build testing  
cd frontend
npm run build
npm run preview

# Code formatting
cd backend
black app/
cd ../frontend
npm run format
```

## Cloud Deployment

### Docker Hub Deployment

1. **Build and Push Images**
   ```bash
   # Build images
   docker build -t myorg/bubbletea-frontend ./frontend
   docker build -t myorg/bubbletea-backend ./backend
   
   # Push to registry
   docker push myorg/bubbletea-frontend
   docker push myorg/bubbletea-backend
   ```

2. **Production Docker Compose**
   ```yaml
   services:
     web:
       image: myorg/bubbletea-frontend:latest
       ports:
         - "80:80"
         - "443:443"
       volumes:
         - ./ssl:/etc/ssl
     
     api:
       image: myorg/bubbletea-backend:latest
       environment:
         JWT_SECRET: ${JWT_SECRET}
         DATABASE_URL: ${DATABASE_URL}
       volumes:
         - ./data:/data
   ```

### AWS/GCP/Azure Deployment

1. **Container Service Deployment**
   - AWS ECS/Fargate
   - Google Cloud Run  
   - Azure Container Instances

2. **Database Options**
   - AWS RDS (PostgreSQL)
   - Google Cloud SQL
   - Azure Database

3. **Load Balancer Setup**
   - AWS Application Load Balancer
   - Google Cloud Load Balancing
   - Azure Load Balancer

## Troubleshooting

### Common Issues

1. **API Connection Errors**
   ```bash
   # Check service status
   docker-compose ps
   
   # Check API health
   curl http://localhost:8000/api/v1/health
   
   # View API logs
   docker-compose logs api
   ```

2. **Database Issues**
   ```bash
   # Check database file permissions
   ls -la ./data/app.db
   
   # Verify database connectivity
   docker exec -it capstone-api-1 python -c "
   from app.bootstrap import bootstrap_database
   bootstrap_database()
   print('Database bootstrap successful')
   "
   ```

3. **Frontend Issues**
   ```bash
   # Check nginx configuration
   docker exec -it capstone-web-1 nginx -t
   
   # View frontend logs
   docker-compose logs web
   
   # Test direct frontend access
   curl -I http://localhost
   ```

### Performance Issues

1. **High Memory Usage**
   ```bash
   # Monitor container resources
   docker stats
   
   # Optimize images
   docker system prune -a
   ```

2. **Slow API Responses**
   ```bash
   # Check database file size
   ls -lh ./data/app.db
   
   # Monitor API response times
   curl -w "@curl-format.txt" http://localhost:8000/api/v1/health
   ```

3. **Database Lock Issues**
   ```bash
   # Check for database locks (SQLite)
   docker exec -it capstone-api-1 python -c "
   import sqlite3
   conn = sqlite3.connect('/data/app.db')
   print('Database accessible')
   conn.close()
   "
   ```

## Maintenance

### Regular Tasks

1. **Weekly Maintenance**
   ```bash
   # Update containers
   docker-compose pull
   docker-compose up -d
   
   # Backup database
   cp ./data/app.db ./backups/weekly_$(date +%Y%m%d).db
   
   # Clean old images
   docker image prune -a
   ```

2. **Monthly Tasks**
   ```bash
   # Check disk usage
   df -h
   du -sh ./data ./backups
   
   # Rotate logs
   docker-compose logs --no-color > logs/app_$(date +%Y%m).log
   
   # Security updates
   docker-compose pull
   docker-compose build --no-cache
   ```

### Monitoring Setup

```bash
# Simple monitoring script
#!/bin/bash
# monitor.sh

API_STATUS=$(curl -s http://localhost:8000/api/v1/health | jq -r '.status')
WEB_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost)

if [ "$API_STATUS" != "ok" ] || [ "$WEB_STATUS" != "200" ]; then
    echo "Service health check failed" | mail -s "Alert" admin@example.com
fi
```

---

**For production deployment, ensure proper security configuration and regular backups!**