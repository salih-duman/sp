# dev-duman-api

Production-style Node.js API for `dev.duman.dev`.

## Runtime

- Node.js 24+
- Express
- PostgreSQL
- JWT authentication
- bcrypt password hashing
- dotenv configuration
- PM2 process management
- Nginx reverse proxy with HTTPS

The Node process binds to `127.0.0.1:3000` by default. Do not expose port `3000` publicly; external traffic should terminate at Nginx on ports `80` and `443`.

## Local Setup

```bash
nvm use
cp .env.example .env
npm install
npm test
```

Set `DATABASE_URL` and `JWT_SECRET` in `.env` before starting the app.

```bash
npm run db:migrate
npm run dev
```

## Docker Development

The Docker setup runs the API, worker, PostgreSQL, Redis, and RabbitMQ locally.

```bash
docker compose --profile tools run --rm migrate
docker compose up --build
```

Useful local URLs:

```text
API: http://localhost:3000
RabbitMQ Management: http://localhost:15672
RabbitMQ user/password: app_user / app_password
PostgreSQL: localhost:5432, app_db, app_user / app_password
Redis: localhost:6379
```

The worker consumes `user.registered` events from RabbitMQ. Registering a user through the API publishes that event:

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"local@example.com","password":"very-secure-password","name":"Local User"}'
```

Redis backs auth rate limiting for `POST /auth/register` and `POST /auth/login`.
If Redis is unavailable, the API falls back to an in-memory limiter so auth stays protected without failing closed.

```text
RATE_LIMIT_ENABLED=true
AUTH_RATE_LIMIT_MAX_REQUESTS=10
AUTH_RATE_LIMIT_WINDOW_SECONDS=900
```

## API

```text
GET  /health
GET  /ready
POST /auth/register
POST /auth/login
GET  /auth/me
```

`/auth/me` expects:

```http
Authorization: Bearer <token>
```

## Server Deployment

Create a PostgreSQL database and user on the VM:

```sql
CREATE USER app_user WITH PASSWORD 'change-this-password';
CREATE DATABASE app_db OWNER app_user;
```

Deploy the repo under `/var/www/api`:

```bash
cd /var/www
git clone <repo-url> api
cd /var/www/api

cp .env.example .env
nano .env

npm ci --omit=dev
npm run db:migrate
pm2 start ecosystem.config.cjs --env production
pm2 save
```

For later deployments:

```bash
cd /var/www/api
git pull
npm ci --omit=dev
npm run db:migrate
pm2 reload ecosystem.config.cjs --env production
pm2 save
```

## Nginx

Use `deploy/nginx-app.conf` as the `/etc/nginx/sites-available/app` template.

```bash
sudo cp deploy/nginx-app.conf /etc/nginx/sites-available/app
sudo ln -sf /etc/nginx/sites-available/app /etc/nginx/sites-enabled/app
sudo nginx -t
sudo systemctl reload nginx
```

The Nginx config redirects HTTP to HTTPS and proxies only to `http://127.0.0.1:3000`.

## PM2

```bash
pm2 list
pm2 logs app
pm2 reload ecosystem.config.cjs --env production
pm2 save
```

## Verification

```bash
curl -I https://dev.duman.dev/health
curl https://dev.duman.dev/ready
```
