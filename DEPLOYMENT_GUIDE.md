# SmartLMS Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Database Setup](#database-setup)
4. [Backend Deployment](#backend-deployment)
5. [Frontend Deployment](#frontend-deployment)
6. [Docker Deployment](#docker-deployment)
7. [Cloud Deployment Options](#cloud-deployment-options)
8. [Environment Configuration](#environment-configuration)
9. [SSL/TLS Setup](#ssltls-setup)
10. [Monitoring & Logging](#monitoring--logging)
11. [CI/CD Pipeline](#cicd-pipeline)
12. [Post-Deployment Verification](#post-deployment-verification)
13. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software
- **Python 3.10+** (for backend)
- **Node.js 18.0+** (for frontend build)
- **PostgreSQL 13+** (production database)
- **Git** (version control)
- **Docker & Docker Compose** (optional, for containerized deployment)
- **systemd** or supervisor (for process management on Linux)

### System Requirements
- **Minimum:** 2GB RAM, 2 CPU cores, 20GB storage
- **Recommended:** 4GB RAM, 4 CPU cores, 50GB storage
- **High-traffic:** 8GB+ RAM, 8+ CPU cores, 100GB+ storage (SSD recommended)

### SSL Certificate
- Domain name (for HTTPS)
- SSL certificate from Let's Encrypt (free) or commercial provider

---

## Pre-Deployment Checklist

Before deploying to production:

- [ ] Backend `.env.production` file configured with production secrets
- [ ] Frontend `.env.production` correctly points to production API URL
- [ ] Database migrations tested on production database schema
- [ ] All API endpoints tested in staging environment
- [ ] Frontend build verified (`npm run build` produces dist/ without errors)
- [ ] Backend Python tests pass (`pytest` or similar)
- [ ] MediaPipe/TensorFlow dependencies installed and tested
- [ ] CORS settings configured for production domain
- [ ] Database backups configured
- [ ] Error logging/monitoring setup
- [ ] Rate limiting configured
- [ ] Authentication/JWT token expiration set appropriately
- [ ] Database connection pooling configured
- [ ] Redis cache configured (if using session caching)
- [ ] Email service configured (for notifications/password resets)

---

## Database Setup

### 1. PostgreSQL Installation & Configuration

#### On Linux/macOS:
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib

# macOS (using Homebrew)
brew install postgresql
brew services start postgresql
```

#### On Windows:
- Download PostgreSQL installer from https://www.postgresql.org/download/windows/
- Follow the installation wizard
- Note the password for the `postgres` user

### 2. Create Production Database

```bash
# Connect to PostgreSQL as superuser
sudo -u postgres psql

# Inside psql:
CREATE DATABASE smartlms_prod;
CREATE USER smartlms_user WITH PASSWORD 'secure_password_here';
ALTER ROLE smartlms_user SET client_encoding TO 'utf8';
ALTER ROLE smartlms_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE smartlms_user SET default_transaction_deferrable TO on;
ALTER ROLE smartlms_user SET default_timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE smartlms_prod TO smartlms_user;
ALTER DATABASE smartlms_prod OWNER TO smartlms_user;
\q
```

### 3. Database Migrations

```bash
cd smartlms-backend

# Activate virtual environment
source .venv/bin/activate  # On Windows: .\.venv\Scripts\activate

# Run Alembic migrations
alembic upgrade head

# Verify migration status
alembic current
alembic history
```

### 4. Connection Pooling (for high-traffic)

Edit `smartlms-backend/app/database.py` to configure connection pooling:

```python
# Add to database.py
from sqlalchemy.pool import QueuePool

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    poolclass=QueuePool,
    pool_size=20,           # Number of connections to keep in pool
    max_overflow=40,        # Additional connections beyond pool_size
    pool_pre_ping=True,     # Test connections before using them
    pool_recycle=3600,      # Recycle connections after 1 hour
)
```

### 5. Backup Strategy

```bash
# Automated daily backup script
# File: /home/smartlms/backup_db.sh

#!/bin/bash
BACKUP_DIR="/home/smartlms/db_backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_NAME="smartlms_prod"
DB_USER="smartlms_user"

mkdir -p $BACKUP_DIR

# Backup database
pg_dump -U $DB_USER $DB_NAME | gzip > $BACKUP_DIR/smartlms_backup_$TIMESTAMP.sql.gz

# Keep only last 30 days of backups
find $BACKUP_DIR -name "smartlms_backup_*.sql.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_DIR/smartlms_backup_$TIMESTAMP.sql.gz"

# Add to crontab: 
# 0 2 * * * /home/smartlms/backup_db.sh  # Daily at 2 AM
```

---

## Backend Deployment

### 1. Server Setup (Linux/Ubuntu 22.04)

```bash
# Update system packages
sudo apt-get update && sudo apt-get upgrade -y

# Install dependencies
sudo apt-get install -y python3.10 python3-pip python3-venv git curl wget

# Create application user
sudo useradd -m -s /bin/bash smartlms
sudo su - smartlms

# Clone repository
git clone https://github.com/your-org/smartlms.git
cd smartlms
```

### 2. Python Environment Setup

```bash
# In /home/smartlms/smartlms directory

# Create virtual environment
python3 -m venv .venv

# Activate virtual environment
source .venv/bin/activate

# Upgrade pip
pip install --upgrade pip setuptools wheel

# Install backend dependencies
cd smartlms-backend
pip install -r requirements.txt
pip install gunicorn uvicorn[standard] tensorflow-cpu  # Gunicorn for production

# Create .env.production file
cat > .env.production << EOF
# Database
DATABASE_URL=postgresql+asyncpg://smartlms_user:secure_password@localhost:5432/smartlms_prod

# JWT Configuration
SECRET_KEY=generate_a_random_32_character_string_here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# CORS
ALLOWED_ORIGINS=https://smartlms.example.com,https://www.smartlms.example.com

# Email Service (for notifications)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-specific-password
SMTP_FROM_EMAIL=noreply@smartlms.example.com

# Environment
ENVIRONMENT=production
DEBUG=False
LOG_LEVEL=info

# ML Models
MODEL_PATH=/home/smartlms/smartlms-backend/app/ml/trained_models/
EOF

chmod 600 .env.production
```

### 3. Gunicorn Configuration

Create `smartlms-backend/gunicorn_config.py`:

```python
import multiprocessing
import os

# Worker count: (2 x CPU cores) + 1
CPU_CORES = os.cpu_count() or 4
workers = (2 * CPU_CORES) + 1

# Gunicorn configuration
bind = "0.0.0.0:8000"
worker_class = "uvicorn.workers.UvicornWorker"
timeout = 120
keepalive = 5
max_requests = 1000
max_requests_jitter = 50

# Logging
accesslog = "/home/smartlms/logs/access.log"
errorlog = "/home/smartlms/logs/error.log"
loglevel = "info"

# Process naming
proc_name = "smartlms-backend"
```

### 4. Systemd Service File

Create `/etc/systemd/system/smartlms-backend.service`:

```ini
[Unit]
Description=SmartLMS Backend Service
After=network.target postgresql.service

[Service]
Type=notify
User=smartlms
Group=smartlms
WorkingDirectory=/home/smartlms/smartlms/smartlms-backend

# Environment file
EnvironmentFile=/home/smartlms/smartlms/smartlms-backend/.env.production

# Activate venv and start gunicorn
ExecStart=/home/smartlms/smartlms/.venv/bin/gunicorn \
    --config gunicorn_config.py \
    -m 0007 \
    app.main:app

# Auto-restart on failure
Restart=on-failure
RestartSec=5s

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=smartlms-backend

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable smartlms-backend
sudo systemctl start smartlms-backend

# Check status
sudo systemctl status smartlms-backend
```

### 5. Nginx Reverse Proxy Configuration

Create `/etc/nginx/sites-available/smartlms-backend`:

```nginx
upstream smartlms_backend {
    server 127.0.0.1:8000;
    keepalive 32;
}

server {
    listen 80;
    server_name api.smartlms.example.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.smartlms.example.com;

    # SSL certificates (see Let's Encrypt section)
    ssl_certificate /etc/letsencrypt/live/api.smartlms.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.smartlms.example.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Logging
    access_log /var/log/nginx/smartlms-backend-access.log;
    error_log /var/log/nginx/smartlms-backend-error.log;

    # Request size limits
    client_max_body_size 100M;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req zone=api_limit burst=20 nodelay;

    # Proxy settings
    location / {
        proxy_pass http://smartlms_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint (no rate limit)
    location /api/health {
        proxy_pass http://smartlms_backend;
        limit_req off;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/smartlms-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## Frontend Deployment

### 1. Production Build

```bash
cd smartlms-frontend

# Create .env.production
cat > .env.production << EOF
VITE_API_URL=https://api.smartlms.example.com
VITE_APP_NAME=SmartLMS
VITE_ANALYTICS_ENABLED=true
EOF

# Build frontend
npm run build

# Output will be in: dist/
# Verify build size and no errors
```

### 2. Deploy to CDN/Static Hosting

#### Option A: Nginx Static Server

```nginx
server {
    listen 443 ssl http2;
    server_name smartlms.example.com www.smartlms.example.com;

    ssl_certificate /etc/letsencrypt/live/smartlms.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/smartlms.example.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    root /var/www/smartlms-frontend;
    index index.html;

    # Cache busting for versioned assets
    location ~* ^/assets/(.+)\.[a-f0-9]{8}\.(js|css|png|jpg|jpeg|svg|gif|webp)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Cache HTML files with revalidation
    location ~* \.html?$ {
        expires -1;
        add_header Cache-Control "public, must-revalidate, proxy-revalidate";
    }

    # Default route for SPA
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Deny access to sensitive files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}

server {
    listen 80;
    server_name smartlms.example.com www.smartlms.example.com;
    return 301 https://$server_name$request_uri;
}
```

Deploy files:

```bash
# Copy build output to server
rsync -avz --delete dist/ smartlms@smartlms-server:/var/www/smartlms-frontend/

# Or use SCP
scp -r dist/* smartlms@smartlms-server:/var/www/smartlms-frontend/

# Set permissions
sudo chown -R www-data:www-data /var/www/smartlms-frontend
sudo chmod -R 755 /var/www/smartlms-frontend
```

#### Option B: AWS S3 + CloudFront

```bash
# 1. Create S3 bucket
aws s3 mb s3://smartlms-frontend-prod --region us-east-1

# 2. Enable static website hosting
aws s3 website s3://smartlms-frontend-prod/ \
    --index-document index.html \
    --error-document index.html

# 3. Upload frontend build
aws s3 sync dist/ s3://smartlms-frontend-prod \
    --cache-control "max-age=3600" \
    --exclude "*.html" \
    --exclude "index.html"

# 4. Upload HTML with no cache
aws s3 sync dist/ s3://smartlms-frontend-prod \
    --cache-control "max-age=0, must-revalidate" \
    --exclude "*" \
    --include "*.html"

# 5. Make bucket public (if not using CloudFront distribution)
aws s3api put-bucket-policy --bucket smartlms-frontend-prod \
    --policy file://bucket_policy.json
```

#### Option C: Vercel/Netlify

```bash
# Vercel
vercel deploy --prod

# Netlify
netlify deploy --prod --dir=dist

# Or connect GitHub repo for automatic deployments
```

---

## Docker Deployment

### 1. Backend Dockerfile

Create `smartlms-backend/Dockerfile`:

```dockerfile
FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt gunicorn uvicorn[standard] tensorflow-cpu

# Copy application code
COPY . .

# Create non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health')"

# Start application
CMD ["gunicorn", "--config", "gunicorn_config.py", "app.main:app"]
```

### 2. Frontend Dockerfile

Create `smartlms-frontend/Dockerfile`:

```dockerfile
# Build stage
FROM node:18-alpine as builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
```

### 3. Docker Compose (Local Development Simulation)

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: smartlms-db
    environment:
      POSTGRES_DB: smartlms_prod
      POSTGRES_USER: smartlms_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U smartlms_user -d smartlms_prod"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./smartlms-backend
      dockerfile: Dockerfile
    container_name: smartlms-backend
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql+asyncpg://smartlms_user:${DB_PASSWORD}@postgres:5432/smartlms_prod
      SECRET_KEY: ${SECRET_KEY}
      CORS_ORIGINS: ${CORS_ORIGINS}
      ENVIRONMENT: production
    ports:
      - "8000:8000"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build:
      context: ./smartlms-frontend
      dockerfile: Dockerfile
    container_name: smartlms-frontend
    depends_on:
      - backend
    environment:
      VITE_API_URL: ${VITE_API_URL}
    ports:
      - "80:80"
    restart: unless-stopped

volumes:
  postgres_data:
    driver: local
```

Deploy with Docker Compose:

```bash
# Build images
docker-compose -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop services
docker-compose -f docker-compose.prod.yml down
```

---

## Cloud Deployment Options

### AWS Deployment (ECS + RDS)

**Architecture:** ECS Fargate (backend) + S3 + CloudFront (frontend) + RDS (database)

```bash
# 1. Create RDS PostgreSQL instance
aws rds create-db-instance \
    --db-instance-identifier smartlms-prod \
    --db-instance-class db.t3.micro \
    --engine postgres \
    --engine-version 13.7 \
    --master-username smartlms_user \
    --master-user-password "$(openssl rand -base64 32)" \
    --allocated-storage 100 \
    --storage-type gp2 \
    --multi-az \
    --backup-retention-period 30

# 2. Get RDS endpoint
aws rds describe-db-instances \
    --db-instance-identifier smartlms-prod \
    --query 'DBInstances[0].Endpoint.Address'

# 3. Create ECR repositories
aws ecr create-repository --repository-name smartlms-backend
aws ecr create-repository --repository-name smartlms-frontend

# 4. Push Docker images
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com

docker tag smartlms-backend:latest 123456789.dkr.ecr.us-east-1.amazonaws.com/smartlms-backend:latest
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/smartlms-backend:latest

# 5. Create ECS Cluster, Task Definition, and Service
# (Use AWS Console or AWS CLI with JSON task definitions)

# 6. Setup ALB (Application Load Balancer)
# (Configure target groups and listener rules in AWS Console)
```

### Heroku Deployment

```bash
# 1. Install Heroku CLI
curl https://cli.heroku.com/install.sh | sh

# 2. Login
heroku login

# 3. Create Heroku apps
heroku apps:create smartlms-backend
heroku apps:create smartlms-frontend

# 4. Add PostgreSQL addon
heroku addons:create heroku-postgresql:standard-0 --app smartlms-backend

# 5. Set environment variables
heroku config:set SECRET_KEY="$(openssl rand -base64 32)" --app smartlms-backend
heroku config:set ENVIRONMENT=production --app smartlms-backend

# 6. Run migrations
heroku run "alembic upgrade head" --app smartlms-backend

# 7. Deploy backend
git subtree push --prefix smartlms-backend heroku main

# 8. Deploy frontend
git subtree push --prefix smartlms-frontend heroku-frontend main
```

### DigitalOcean App Platform

```bash
# 1. Create app.yaml
cat > app.yaml << EOF
name: smartlms
services:
  - name: backend
    github:
      branch: main
      repo: your-org/smartlms
    source_dir: smartlms-backend
    http_port: 8000
    jobs:
      - name: db-migrate
        github:
          branch: main
          repo: your-org/smartlms
        source_dir: smartlms-backend
        command: alembic upgrade head

  - name: frontend
    github:
      branch: main
      repo: your-org/smartlms
    source_dir: smartlms-frontend
    build_command: npm run build
    output_dir: dist
    http_port: 80

databases:
  - name: postgres
    engine: PG
    version: "13"
EOF

# 2. Deploy via doctl
doctl apps create --spec app.yaml
```

---

## Environment Configuration

### Backend .env.production Template

```bash
# === Database Configuration ===
DATABASE_URL=postgresql+asyncpg://smartlms_user:PASSWORD@HOST:5432/smartlms_prod
DATABASE_POOL_SIZE=20
DATABASE_MAX_OVERFLOW=40

# === Security ===
SECRET_KEY=generate_secure_random_string_here_min_32_chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# === CORS Configuration ===
ALLOWED_ORIGINS=https://smartlms.example.com,https://www.smartlms.example.com,https://admin.smartlms.example.com

# === Email Configuration ===
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@smartlms.example.com
SMTP_PASSWORD=app_specific_password
SMTP_FROM_EMAIL=noreply@smartlms.example.com

# === Environment ===
ENVIRONMENT=production
DEBUG=False
LOG_LEVEL=info

# === ML Model Configuration ===
MODEL_PATH=/app/app/ml/trained_models/
TENSORFLOW_CPU_THREADS=4

# === Rate Limiting ===
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60  # seconds

# === Logging ===
LOG_FILE=/var/log/smartlms/backend.log
LOG_FILE_SIZE=10485760  # 10MB
LOG_FILE_BACKUP_COUNT=5
```

### Frontend .env.production Template

```bash
VITE_API_URL=https://api.smartlms.example.com
VITE_APP_NAME=SmartLMS
VITE_ANALYTICS_ENABLED=true
```

---

## SSL/TLS Setup

### Let's Encrypt with Certbot

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot certonly --nginx \
    -d smartlms.example.com \
    -d www.smartlms.example.com \
    -d api.smartlms.example.com \
    --email admin@smartlms.example.com \
    --agree-tos

# Auto-renew certificates
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Test renewal
sudo certbot renew --dry-run
```

### Self-Signed Certificate (Testing Only)

```bash
# Generate self-signed certificate
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/ssl/private/smartlms.key \
    -out /etc/ssl/certs/smartlms.crt
```

---

## Monitoring & Logging

### 1. Application Logging

Create `/home/smartlms/logs/config.py`:

```python
import logging
from logging.handlers import RotatingFileHandler
import os

LOG_DIR = "/home/smartlms/logs"
os.makedirs(LOG_DIR, exist_ok=True)

def setup_logging():
    logger = logging.getLogger("smartlms")
    logger.setLevel(logging.INFO)
    
    # File handler
    handler = RotatingFileHandler(
        os.path.join(LOG_DIR, "app.log"),
        maxBytes=10485760,  # 10MB
        backupCount=5
    )
    
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    
    return logger
```

### 2. System Monitoring

```bash
# Install monitoring tools
sudo apt-get install htop iotop nethogs

# Create monitoring script
cat > /home/smartlms/monitor.sh << 'EOF'
#!/bin/bash

THRESHOLD_CPU=80
THRESHOLD_MEM=80
THRESHOLD_DISK=90

# Check CPU usage
CPU=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print int(100 - $1)}')
if [ "$CPU" -gt "$THRESHOLD_CPU" ]; then
    echo "WARNING: High CPU usage: ${CPU}%"
fi

# Check memory usage
MEM=$(free | grep Mem | awk '{print int(($3/$2) * 100)}')
if [ "$MEM" -gt "$THRESHOLD_MEM" ]; then
    echo "WARNING: High memory usage: ${MEM}%"
fi

# Check disk usage
DISK=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK" -gt "$THRESHOLD_DISK" ]; then
    echo "WARNING: High disk usage: ${DISK}%"
fi

# Check backend service
if ! systemctl is-active --quiet smartlms-backend; then
    echo "ERROR: SmartLMS backend service is not running"
fi
EOF

chmod +x /home/smartlms/monitor.sh

# Add to crontab (runs every 5 minutes)
# */5 * * * * /home/smartlms/monitor.sh >> /home/smartlms/logs/monitor.log 2>&1
```

### 3. Error Tracking (Sentry)

```python
# In smartlms-backend/app/main.py

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

if os.getenv("ENVIRONMENT") == "production":
    sentry_sdk.init(
        dsn=os.getenv("SENTRY_DSN"),
        integrations=[
            FastApiIntegration(),
            SqlalchemyIntegration(),
        ],
        traces_sample_rate=0.1,
        environment=os.getenv("ENVIRONMENT"),
    )
```

### 4. Prometheus Metrics

```bash
# Install Prometheus
sudo apt-get install prometheus

# Configure prometheus.yml
cat > /etc/prometheus/prometheus.yml << EOF
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'smartlms-backend'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['localhost:8000']
EOF

# Start Prometheus
sudo systemctl start prometheus
```

---

## CI/CD Pipeline

### GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy SmartLMS

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

jobs:
  test-backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.10'

      - name: Install dependencies
        working-directory: smartlms-backend
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt pytest pytest-cov

      - name: Run tests
        working-directory: smartlms-backend
        run: pytest --cov

  test-frontend:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        working-directory: smartlms-frontend
        run: npm ci

      - name: Lint
        working-directory: smartlms-frontend
        run: npm run lint

      - name: Build
        working-directory: smartlms-frontend
        run: npm run build

  deploy:
    needs: [test-backend, test-frontend]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'

    steps:
      - uses: actions/checkout@v3

      - name: Deploy to production
        env:
          DEPLOY_KEY: ${{ secrets.DEPLOY_KEY }}
          DEPLOY_HOST: ${{ secrets.DEPLOY_HOST }}
          DEPLOY_USER: ${{ secrets.DEPLOY_USER }}
        run: |
          mkdir -p ~/.ssh
          echo "$DEPLOY_KEY" > ~/.ssh/id_rsa
          chmod 600 ~/.ssh/id_rsa
          ssh-keyscan -H $DEPLOY_HOST >> ~/.ssh/known_hosts
          
          # Deploy backend
          ssh $DEPLOY_USER@$DEPLOY_HOST "cd /home/smartlms/smartlms && git pull origin main"
          ssh $DEPLOY_USER@$DEPLOY_HOST "cd /home/smartlms/smartlms/smartlms-backend && source ../.venv/bin/activate && pip install -r requirements.txt"
          ssh $DEPLOY_USER@$DEPLOY_HOST "sudo systemctl restart smartlms-backend"
          
          # Deploy frontend
          ssh $DEPLOY_USER@$DEPLOY_HOST "cd /home/smartlms/smartlms/smartlms-frontend && npm install && npm run build"
          ssh $DEPLOY_USER@$DEPLOY_HOST "rsync -avz --delete /home/smartlms/smartlms/smartlms-frontend/dist/ /var/www/smartlms-frontend/"
          ssh $DEPLOY_USER@$DEPLOY_HOST "sudo systemctl restart nginx"
```

---

## Post-Deployment Verification

### Health Checks

```bash
# Backend health
curl https://api.smartlms.example.com/api/health

# Frontend accessibility
curl -I https://smartlms.example.com

# Database connection
psql -h HOST -U smartlms_user -d smartlms_prod -c "SELECT version();"
```

### Smoke Tests

```bash
#!/bin/bash

echo "Running post-deployment smoke tests..."

# Test backend API
echo "Testing backend API..."
BACKEND_URL="https://api.smartlms.example.com"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $BACKEND_URL/api/health)
if [ "$RESPONSE" != "200" ]; then
    echo "FAIL: Backend health check returned $RESPONSE"
    exit 1
fi
echo "PASS: Backend health check"

# Test authentication
echo "Testing authentication..."
AUTH_RESPONSE=$(curl -s -X POST $BACKEND_URL/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"testpass"}')
if echo "$AUTH_RESPONSE" | grep -q "token"; then
    echo "PASS: Authentication endpoint working"
else
    echo "FAIL: Authentication endpoint error"
    exit 1
fi

# Test frontend
echo "Testing frontend..."
FRONTEND_URL="https://smartlms.example.com"
FRONTEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $FRONTEND_URL)
if [ "$FRONTEND_RESPONSE" == "200" ]; then
    echo "PASS: Frontend accessible"
else
    echo "FAIL: Frontend returned $FRONTEND_RESPONSE"
    exit 1
fi

echo "All smoke tests passed!"
```

---

## Troubleshooting

### Common Issues

**Issue: Database connection timeout**

```bash
# Check PostgreSQL service
sudo systemctl status postgresql

# Check connection
psql -h localhost -U smartlms_user -d smartlms_prod -c "SELECT 1;"

# Check firewall
sudo ufw allow 5432/tcp
```

**Issue: Backend service not starting**

```bash
# Check logs
sudo journalctl -u smartlms-backend -n 50

# Check permissions
ls -la /home/smartlms/smartlms-backend/.env.production

# Test backend startup manually
cd /home/smartlms/smartlms/smartlms-backend
source ../.venv/bin/activate
python -c "from app.main import app; print('OK')"
```

**Issue: Frontend showing blank page**

```bash
# Check browser console for errors
# Check Nginx logs
sudo tail -f /var/log/nginx/smartlms-error.log

# Verify build output
ls -la /var/www/smartlms-frontend/

# Test Nginx config
sudo nginx -t
```

**Issue: SSL certificate error**

```bash
# Check certificate validity
sudo openssl x509 -in /etc/letsencrypt/live/smartlms.example.com/fullchain.pem -text

# Renew certificate
sudo certbot renew --force-renewal

# Restart Nginx
sudo systemctl restart nginx
```

**Issue: High CPU/Memory usage**

```bash
# Check running processes
ps aux | grep smartlms

# Check database connections
psql -U smartlms_user -d smartlms_prod -c "SELECT * FROM pg_stat_activity;"

# Restart service
sudo systemctl restart smartlms-backend

# Check for memory leaks
docker stats smartlms-backend  # if using Docker
```

### Performance Optimization

```bash
# Enable gzip compression in Nginx
sudo sed -i 's/# gzip on;/gzip on;/' /etc/nginx/nginx.conf

# Restart Nginx
sudo systemctl restart nginx

# Monitor performance
ab -n 1000 -c 10 https://api.smartlms.example.com/api/health
```

---

## Security Checklist

- [ ] SSL/TLS certificates installed and valid
- [ ] Firewall configured (only necessary ports open)
- [ ] Fail2ban installed to prevent brute force attacks
- [ ] Regular security updates applied (`sudo apt update && sudo apt upgrade`)
- [ ] Database backups encrypted and stored securely
- [ ] API rate limiting configured
- [ ] CORS headers properly restricted to production domain
- [ ] Database credentials in .env files (not in source control)
- [ ] SSH key-based authentication only (no passwords)
- [ ] Regular log monitoring for suspicious activity
- [ ] HTTPS enforced (redirect HTTP to HTTPS)
- [ ] Database connections use SSL
- [ ] Secrets rotated regularly
- [ ] AWS/cloud provider security groups properly configured
- [ ] API authentication tokens have expiration

---

## Rollback Procedure

```bash
# If deployment fails, rollback to previous version:

# Backend rollback
cd /home/smartlms/smartlms
git revert HEAD  # or git checkout previous-commit-hash
cd smartlms-backend
source ../.venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart smartlms-backend

# Frontend rollback
cd /home/smartlms/smartlms/smartlms-frontend
git revert HEAD
npm install
npm run build
sudo rsync -avz --delete dist/ /var/www/smartlms-frontend/
sudo systemctl restart nginx

# Verify rollback
curl https://api.smartlms.example.com/api/health
curl https://smartlms.example.com
```

---

## Support & Maintenance

### Regular Tasks

- **Daily:** Monitor logs and system health
- **Weekly:** Check backup status and security patches
- **Monthly:** Review performance metrics and database optimization
- **Quarterly:** Security audit and dependency updates
- **Annually:** Disaster recovery drill and capacity planning

### Useful Commands

```bash
# View backend logs
sudo journalctl -u smartlms-backend -f

# View Nginx logs
sudo tail -f /var/log/nginx/smartlms-error.log

# Check disk space
df -h

# List running services
sudo systemctl list-units --state=running --type=service

# Restart all services
sudo systemctl restart smartlms-backend
sudo systemctl restart nginx
```

---

**End of Deployment Guide**

For issues or questions, refer to the SmartLMS documentation or contact the development team.
