# AptitudeArena

Practice Faster. Score Better. Crack Placements.

## Local development

1. Copy `.env.example` to `.env` and replace `SECRET_KEY`.
2. Start PostgreSQL: `docker compose up -d postgres`.
3. In `backend`, create a virtual environment, install with `pip install -e ".[dev]"`, then run `uvicorn app.main:app --reload`.
4. In `frontend`, run `npm install` then `npm run dev`.

The API health endpoint is available at `GET http://localhost:8000/api/v1/health`.

## Structure

- `frontend/` — Next.js student and admin web application
- `backend/` — FastAPI REST API, database models, migrations, and services
- `docker-compose.yml` — local PostgreSQL service

## Checks

- Backend: `pytest` from `backend/`
- Frontend: `npm run lint && npm run build` from `frontend/`
