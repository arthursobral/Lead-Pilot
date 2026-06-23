# Development Guide

How to get LeadPilot running on a fresh Windows machine.

---

## Part 1 — Install required tools

### 1.1 Node.js 20 LTS

1. Go to https://nodejs.org
2. Download **Node.js 20 LTS** (the "Recommended For Most Users" button)
3. Run the installer with all defaults
4. Close and reopen PowerShell after installing
5. Verify:

```powershell
node --version   # should print v20.x.x or higher
npm --version    # should print 9.x or higher
```

> **Windows PATH note:** If `npm run dev` later reports the wrong Node version despite having the correct one installed, see the Troubleshooting section at the bottom.

---

### 1.2 Docker Desktop

Docker is used to run PostgreSQL (database) and Redis (queue) locally without installing them directly on your machine.

1. Go to https://www.docker.com/products/docker-desktop/
2. Click **Download for Windows**
3. Run `Docker Desktop Installer.exe`
4. When asked, keep **"Use WSL 2 instead of Hyper-V"** checked
5. Restart your computer when prompted
6. After restarting, open **Docker Desktop** from the Start menu and wait for the whale icon in the taskbar to turn green (takes 1–2 minutes on first launch)
7. Verify in a new PowerShell:

```powershell
docker --version   # should print Docker version 24.x or higher
```

---

### 1.3 Git

1. Go to https://git-scm.com/download/win
2. Download and run the installer with all defaults
3. Verify:

```powershell
git --version   # should print git version 2.x
```

---

## Part 2 — Get the project

```powershell
git clone <repo-url>
cd "Team Lead App"
```

---

## Part 3 — Install dependencies

Run this from the **monorepo root** (not inside apps/backend or apps/frontend):

```powershell
npm install
```

This installs all dependencies for the backend, frontend, and shared packages in one command.

---

## Part 4 — Set up environment files

### Backend

```powershell
Copy-Item .env.example apps\backend\.env
```

Open `apps\backend\.env` in any text editor and set a JWT secret — it must be at least 32 characters:

```
JWT_SECRET=escolha-uma-frase-longa-aqui-minimo-32-chars
```

Everything else can stay as the default values for local development.

### Frontend

```powershell
echo NEXT_PUBLIC_API_URL=http://localhost:3001/api > apps\frontend\.env.local
```

---

## Part 5 — Start the database and cache

Open PowerShell and run both commands:

```powershell
# PostgreSQL — the main database
docker run -d `
  --name leadpilot-postgres `
  -e POSTGRES_USER=leadpilot `
  -e POSTGRES_PASSWORD=leadpilot `
  -e POSTGRES_DB=leadpilot `
  -p 5432:5432 `
  postgres:16

# Redis — used by the job queue (BullMQ)
docker run -d `
  --name leadpilot-redis `
  -p 6379:6379 `
  redis:7
```

Verify both are running:

```powershell
docker ps
# Should show two containers: leadpilot-postgres and leadpilot-redis
```

---

## Part 6 — Set up the database

This creates all the tables from the Prisma schema. Run it once (and again after any schema change):

```powershell
cd apps\backend
npx prisma generate
npx prisma migrate dev --name init
cd ..\..
```

---

## Part 7 — Run the backend

```powershell
cd apps\backend
npm run dev
```

You should see:

```
[Bootstrap] LeadPilot API running on http://localhost:3001/api
```

Verify it is healthy:

```powershell
curl http://localhost:3001/api/health
# Expected: { "status": "ok", "postgres": true, "redis": true }
```

---

## Part 8 — Run the frontend

Open a **second PowerShell window** (keep the backend running in the first one):

```powershell
cd "Team Lead App\apps\frontend"
npm run dev
```

Open http://localhost:3000 in your browser.

---

## Daily workflow

After the first setup, each day you only need to do:

```powershell
# 1. Start Docker containers (if not already running)
docker start leadpilot-postgres leadpilot-redis

# 2. Terminal 1 — backend
cd apps\backend
npm run dev

# 3. Terminal 2 — frontend
cd apps\frontend
npm run dev
```

---

## Stopping everything

```powershell
# Stop Docker containers
docker stop leadpilot-postgres leadpilot-redis
```

Close the two terminal windows running the backend and frontend.

---

## Useful commands

```powershell
# Backend
npm run build              # Compile TypeScript
npm test                   # Run unit tests
npx prisma studio          # Browse the database in a visual UI
npx prisma migrate dev     # Apply new database migrations

# Frontend
npm run build              # Production build
npm run lint               # Check for lint errors

# Docker
docker ps                  # See running containers
docker start leadpilot-postgres leadpilot-redis   # Start containers
docker stop leadpilot-postgres leadpilot-redis    # Stop containers
docker logs leadpilot-postgres                    # See Postgres logs
```

---

## Troubleshooting

**`npm run dev` reports wrong Node version (e.g. "Node.js 17.7.2")**

This is a Windows PATH issue. Delete any Node shims from the global user node_modules:

```powershell
Remove-Item "C:\Users\$env:USERNAME\node_modules\.bin\node" -ErrorAction SilentlyContinue
Remove-Item "C:\Users\$env:USERNAME\node_modules\.bin\node.cmd" -ErrorAction SilentlyContinue
Remove-Item "C:\Users\$env:USERNAME\node_modules\.bin\node.ps1" -ErrorAction SilentlyContinue
```

Then retry `npm run dev`.

---

**`@prisma/client` errors during build**

Run `npx prisma generate` inside `apps/backend` first. Required after every schema change.

---

**`npm install` fails with "Invalid Version"**

Delete all node_modules and reinstall from the root:

```powershell
Remove-Item -Recurse -Force node_modules
Remove-Item -Recurse -Force apps\backend\node_modules
Remove-Item -Recurse -Force apps\frontend\node_modules
Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue
npm install
```

---

**Port already in use**

Backend uses port 3001, frontend uses port 3000. To change the backend port, set `API_PORT` in `apps\backend\.env`.

---

**Docker containers won't start**

Make sure Docker Desktop is running (whale icon in taskbar). Then:

```powershell
docker start leadpilot-postgres leadpilot-redis
```

If they were never created, go back to Part 5 and run the `docker run` commands.
