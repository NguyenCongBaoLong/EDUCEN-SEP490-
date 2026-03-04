# 🐳 Docker Setup Guide

## Prerequisites
- Docker Desktop installed ([Download here](https://www.docker.com/products/docker-desktop/))
- Docker Desktop running

## Development with Docker

### Option 1: Using Docker (Recommended for Team)

```bash
# Navigate to frontend directory
cd frontend

# Start development server
docker-compose up

# App will be available at: http://localhost:5173
```

**What happens:**
- ✅ Docker installs all dependencies inside container
- ✅ Docker runs `npm run dev` automatically
- ✅ Hot reload works (code changes auto-refresh)
- ✅ Everyone uses same Node.js v20 environment

**To stop:**
```bash
# Press Ctrl+C in terminal
# OR in another terminal:
docker-compose down
```

### Option 2: Local Development (Without Docker)

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

## Useful Docker Commands

```bash
# View running containers
docker ps

# View logs
docker-compose logs -f

# Rebuild after changing dependencies
docker-compose up --build

# Remove containers and volumes
docker-compose down -v

# Run commands inside container
docker-compose exec frontend npm install <package-name>
```

## Troubleshooting

### Port 5173 already in use
```bash
# Stop local npm dev server first
# OR change port in docker-compose.yml to "5174:5173"
```

### Changes not reflecting
```bash
# Rebuild container
docker-compose up --build
```

### Permission issues (Linux/Mac)
```bash
# Add user to docker group
sudo usermod -aG docker $USER
# Logout and login again
```

## Environment Consistency

**Without Docker:**
- Dev 1: Node v20.10.0 ✅
- Dev 2: Node v18.16.0 ❌ (might cause bugs)

**With Docker:**
- Everyone: Node v20-alpine ✅✅✅

## Notes
- `node_modules` in container is separate from local
- Volume mounting allows hot reload
- Changes to `package.json` require `docker-compose up --build`
