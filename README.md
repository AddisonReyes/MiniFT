# MiniFT (Minimalist Finance Tracker)

![Python](https://img.shields.io/badge/Python-3776AB?style=plastic&logo=python&logoColor=white)
![Django](https://img.shields.io/badge/Django-092E20?style=plastic&logo=django&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-38B2AC?style=plastic&logo=tailwindcss&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?style=plastic&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=plastic&logo=docker&logoColor=white)

Minimalist finance tracker app focused on helping you manage your personal finances.

## Features

- User authentication (register, login, logout)
- Track income and expenses with categories
- Filter transactions by type, category, and date range
- Monthly spending summaries
- Category-based spending breakdown
- Set monthly budget limits per category
- User preferences (currency settings)

## Tech Stack

- **Backend**: Python / Django 6.0
- **Database**: SQLite (default) / PostgreSQL (production)
- **Authentication**: Session-based auth
- **Frontend**: Django templates + Tailwind CSS (CDN) with light/dark themes (default: dark)

## Setup

### 1. Clone and navigate to project

```bash
cd MiniFT
```

### 2. Create virtual environment

```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate  # Windows
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Run migrations

```bash
python minift/manage.py migrate
```

### 5. Start development server

```bash
python minift/manage.py runserver
```

Visit `http://localhost:8000` in your browser.

## Project Structure

```cmd
minift/
├── apps/
│   ├── users/        # User models, views, serializers
│   ├── transactions/ # Transaction models, views, serializers
│   └── budgets/     # Budget models, views, serializers
├── config/           # Django settings, URLs
├── templates/       # HTML templates
└── manage.py
```

## API Endpoints

### Auth

| Method | Endpoint              | Description          |
| ------ | --------------------- | -------------------- |
| POST   | `/api/auth/register/` | Register new user    |
| POST   | `/api/auth/login/`    | Login user           |
| POST   | `/api/auth/logout/`   | Logout user          |
| GET    | `/api/auth/me/`       | Get current user     |
| PATCH  | `/api/auth/me/`       | Update user settings |

### Transactions

| Method | Endpoint                                | Description                                                           |
| ------ | --------------------------------------- | --------------------------------------------------------------------- |
| GET    | `/api/transactions/`                    | List transactions (filters: `?type=`, `?category=`, `?from=`, `?to=`) |
| POST   | `/api/transactions/`                    | Create transaction                                                    |
| GET    | `/api/transactions/:id/`                | Get transaction                                                       |
| PATCH  | `/api/transactions/:id/`                | Update transaction                                                    |
| DELETE | `/api/transactions/:id/`                | Delete transaction                                                    |
| GET    | `/api/transactions/summary/month/`      | Monthly totals                                                        |
| GET    | `/api/transactions/summary/categories/` | Spending by category                                                  |

### Budgets

| Method | Endpoint            | Description   |
| ------ | ------------------- | ------------- |
| GET    | `/api/budgets/`     | List budgets  |
| POST   | `/api/budgets/`     | Create budget |
| PATCH  | `/api/budgets/:id/` | Update budget |
| DELETE | `/api/budgets/:id/` | Delete budget |

Note: API endpoints require an authenticated session (login via web or `/api/auth/login/`).

## Web Interface

Access via browser at:

- `/` - Landing page (logged out) / Dashboard (logged in)
- `/auth/register/` - Registration
- `/auth/login/` - Login
- `/auth/logout/` - Logout
- `/auth/me/` - Account settings
- `/transactions/` - Transactions list
- `/transactions/create/` - Add transaction
- `/transactions/<id>/edit/` - Edit transaction
- `/transactions/<id>/delete/` - Delete transaction
- `/budgets/` - Budgets
- `/budgets/create/` - Add budget
- `/budgets/<id>/edit/` - Edit budget
- `/budgets/<id>/delete/` - Delete budget
- `/transactions/summary/month/` - Monthly summary
- `/transactions/summary/categories/` - Category breakdown

UI themes:

- Default theme is dark.
- Use the `Theme` button in the navbar to toggle light/dark (saved in `localStorage`).

## Environment Variables

Local development works with defaults, but for production (Railway/Docker) set:

- `DJANGO_SECRET_KEY`: required in production
- `DJANGO_DEBUG`: `0`/`1`
- `DJANGO_ALLOWED_HOSTS`: comma-separated (e.g. `minift.up.railway.app`)
- `DJANGO_CSRF_TRUSTED_ORIGINS`: comma-separated (e.g. `https://minift.up.railway.app`)
- `DATABASE_URL`: Postgres URL (recommended for production)

## Docker

Build the image:

```bash
docker build -t minift:local .
```

Run the full stack (Django + Postgres):

```bash
docker-compose up -d --build
```

App will be available at `http://localhost:8000`.

Stop:

```bash
docker-compose down
```

Reset DB volume (destructive):

```bash
docker-compose down -v
```

## Database Models

### users

| Field      | Type      | Notes                      |
| ---------- | --------- | -------------------------- |
| id         | UUID      | PK                         |
| email      | string    | unique                     |
| password   | string    | hashed (Django auth field) |
| currency   | string    | default "USD"              |
| created_at | timestamp | default "USD"              |
| created_at | timestamp |                            |
| last_login | timestamp | nullable                   |
| is_active  | bool      | default true               |
| is_staff   | bool      | default false              |

### transactions

| Field      | Type          | Notes                 |
| ---------- | ------------- | --------------------- |
| id         | UUID          | PK                    |
| user_id    | UUID          | FK -> users           |
| amount     | decimal(10,2) | always positive       |
| type       | enum          | "income" or "expense" |
| category   | string        | e.g. "food", "salary" |
| note       | string        | nullable              |
| date       | date          | defaults to today     |
| created_at | timestamp     |                       |

### budgets

| Field    | Type          | Notes                          |
| -------- | ------------- | ------------------------------ |
| id       | UUID          | PK                             |
| user_id  | UUID          | FK -> users                    |
| category | string        | matches transaction categories |
| limit    | decimal(10,2) | monthly spend cap              |
| month    | date          | first day of the month         |

In the web UI, budgets use a month name selector; internally it is stored as the first day of that month.
