# SupportDesk — Full-Stack Ticket Management

SupportDesk is a full-stack customer support ticketing application based on the supplied internship report and presentation. It includes a React dashboard, an Express REST API, PostgreSQL persistence, JWT authentication, role-aware access, ticket lifecycle management, comments, audit history, search/filtering/pagination, Socket.IO change notifications, and admin analytics.

## Features

- **Authentication:** customer registration and email/password login; passwords hashed with bcrypt; signed JWT access tokens.
- **Roles:** customer (create and track their own tickets), agent (view unassigned/their assigned tickets and update ticket details), admin (manage tickets and view analytics).
- **Ticket workflow:** Open → In Progress → Resolved → Closed; priority Low/Medium/High/Urgent; assignment to agents/admins.
- **Collaboration:** ticket comments and an activity/audit timeline.
- **Discovery:** server-side search, status/priority filters, pagination, indexed PostgreSQL queries.
- **Live updates:** Socket.IO connection authenticated using the JWT; UI refreshes ticket/dashboard views when tickets change.
- **Analytics:** ticket counts, status chart, priority chart, agent workload and recent activity.
- Responsive interface with demo seed data.

## Run locally (recommended)

Requirements: Node.js 20+, npm, and Docker Desktop (for PostgreSQL).

1. Start the database:
   ```bash
   docker compose up -d db
   ```
2. Start the API in a terminal:
   ```bash
   cd server
   cp .env.example .env
   npm install
   npm run seed
   npm run dev
   ```
3. Start the web app in another terminal:
   ```bash
   cd client
   npm install
   npm run dev
   ```
4. Open **http://localhost:5173**.

The API creates the database tables automatically at startup. `npm run seed` creates demo accounts and sample tickets.

### Demo accounts

All seeded demo accounts use `Support123!`:

| Role | Email |
|---|---|
| Admin | `admin@supportdesk.local` |
| Agent | `agent@supportdesk.local` |
| Customer | `customer@supportdesk.local` |

These are for local development only. Do not use them in a public deployment.

## API overview

Base URL: `http://localhost:4000/api`

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/health` | Public | Health check |
| POST | `/auth/register` | Public | Create customer account |
| POST | `/auth/login` | Public | Sign in |
| GET | `/auth/me` | Authenticated | Current user |
| GET | `/tickets` | Authenticated | List visible tickets with `q`, `status`, `priority`, `page`, `limit` |
| POST | `/tickets` | Customer/admin | Create ticket |
| GET | `/tickets/agents` | Agent/admin | List assignable staff |
| GET | `/tickets/:id` | Authorized user | Ticket, comments, history |
| PATCH | `/tickets/:id` | Agent/admin | Update status, priority, assignment |
| POST | `/tickets/:id/comments` | Authorized user | Add comment |
| GET | `/dashboard` | Admin | Analytics summary and charts data |

Authenticated requests use `Authorization: Bearer <token>`.

## Environment variables

Server: `PORT`, `DATABASE_URL`, `JWT_SECRET`, `CLIENT_URL` (see `server/.env.example`).
Client: `VITE_API_URL`, `VITE_SOCKET_URL` (see `client/.env.example`).

Before deployment, set a long random `JWT_SECRET`, use a managed PostgreSQL instance, configure allowed origins, and use HTTPS. Never commit `.env` files or real credentials.

## Docker option

To run the database, API, and production-built frontend together, use `docker compose up --build`. Open **http://localhost:8080** for the frontend and **http://localhost:4000/api/health** for the API health check. The quick-start steps above are useful for development with hot reload. For a public deployment, configure the frontend API/socket URLs and server CORS origin for your actual HTTPS domains.

## Current implementation notes

This repository is a runnable implementation of the main SupportDesk workflows described in the provided materials. The report mentions email notifications, file attachments, refresh-token rotation, a 24-endpoint contract, automated tests/coverage, and a staging CI/CD pipeline. Those are **not represented as completed here**: email delivery, attachment upload, refresh-token rotation, exhaustive OpenAPI coverage, automated test suite, and deployment secrets/pipeline need additional configuration/implementation before claiming them. Socket.IO broadcasts ticket-change events to connected clients; production deployments should additionally scope events to authorized users/tickets and add rate limiting, password reset, token revocation, CSRF strategy as applicable, and formal security testing.

## GitHub push

From the project root:

```bash
git init
git add .
git commit -m "Build SupportDesk ticket management app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/supportdesk.git
git push -u origin main
```

## License

Add a license file if you intend to distribute or reuse this project publicly.
