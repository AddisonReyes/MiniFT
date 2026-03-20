# MiniFT (Minimalist Finance Tracker)

![Python](https://img.shields.io/badge/Python-3776AB?style=plastic&logo=python&logoColor=white)
![Django](https://img.shields.io/badge/Django-092E20?style=plastic&logo=django&logoColor=white)
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
cd minift
python manage.py migrate
```

### 5. Start development server

```bash
python manage.py runserver
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

| Method | Endpoint          | Description          |
| ------ | ----------------- | -------------------- |
| POST   | `/api/auth/register/` | Register new user    |
| POST   | `/api/auth/login/`    | Login user           |
| POST   | `/api/auth/logout/`   | Logout user          |
| GET    | `/api/auth/me/`       | Get current user     |
| PATCH  | `/api/auth/me/`       | Update user settings |

### Transactions

| Method | Endpoint                            | Description                                                           |
| ------ | ----------------------------------- | --------------------------------------------------------------------- |
| GET    | `/api/transactions/`                    | List transactions (filters: `?type=`, `?category=`, `?from=`, `?to=`) |
| POST   | `/api/transactions/`                    | Create transaction                                                    |
| GET    | `/api/transactions/:id/`                | Get transaction                                                       |
| PATCH  | `/api/transactions/:id/`                | Update transaction                                                    |
| DELETE | `/api/transactions/:id/`                | Delete transaction                                                    |
| GET    | `/api/transactions/summary/month/`      | Monthly totals                                                        |
| GET    | `/api/transactions/summary/categories/` | Spending by category                                                  |

### Budgets

| Method | Endpoint        | Description   |
| ------ | --------------- | ------------- |
| GET    | `/api/budgets/`     | List budgets  |
| POST   | `/api/budgets/`     | Create budget |
| PATCH  | `/api/budgets/:id/` | Update budget |
| DELETE | `/api/budgets/:id/` | Delete budget |

## Web Interface

Access via browser at:

- `/` - Dashboard (transactions)
- `/auth/register/` - Registration
- `/auth/login/` - Login
- `/transactions/create/` - Add transaction
- `/budgets/` - Budgets
- `/budgets/create/` - Add budget
- `/transactions/summary/month/` - Monthly summary
- `/transactions/summary/categories/` - Category breakdown
- `/auth/me/` - Account settings

## Database Models

### users

| Field         | Type      | Notes         |
| ------------- | --------- | ------------- |
| id            | UUID      | PK            |
| email         | string    | unique        |
| password_hash | string    |               |
| currency      | string    | default "USD" |
| created_at    | timestamp |               |

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
