# Minift ( Minimalist Finance Tracker )

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=plastic&logo=typescript&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=plastic&logo=python&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=plastic&logo=react&logoColor=black)
![Django](https://img.shields.io/badge/Django-092E20?style=plastic&logo=django&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?style=plastic&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=plastic&logo=docker&logoColor=white)

Minimalist finance tracker app focused on helping you with your personal finances.

## Docker (local)

Run everything (PostgreSQL + Django API + React UI):

```bash
docker-compose up --build
```

- Frontend: http://localhost:5173
- Backend: http://localhost:8000

Notes:

- Backend env for Docker is in `backend/.env.docker` (includes `DATABASE_URL` pointing to the `db` service).
- Optional: override ports with `FRONTEND_PORT` and/or `BACKEND_PORT` (example: `FRONTEND_PORT=5174 docker-compose up --build`).

License: MIT (see `LICENSE`).
