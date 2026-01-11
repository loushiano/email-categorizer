# Vigelon Backend

NestJS REST API backend for the Vigelon enterprise management system.

## Prerequisites

Before running the application, ensure you have the following installed:

- **Node.js** v20 or higher
- **npm** v9 or higher
- **MySQL** v8.0 or higher
- **Redis** - For caching and session management
- **RabbitMQ** - For async task processing and message queues

## Installation

1. **Clone the repository**

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Set up environment variables**:

   ```bash
   cp .env.template .env
   ```

   Edit `.env` and configure the required values (see [Environment Variables](#environment-variables) below).

4. **Set up the database**:

   Create a MySQL database matching your `DB_NAME` in `.env`, then run migrations:

   ```bash
   npm run migration:run
   ```

## Environment Variables

Copy `.env.template` to `.env` and configure the following:

### Required

| Variable                         | Description                            |
| -------------------------------- | -------------------------------------- |
| `DB_HOST`                        | MySQL host (e.g., `localhost`)         |
| `DB_PORT`                        | MySQL port (e.g., `3306`)              |
| `DB_USER`                        | MySQL username                         |
| `DB_PASSWORD`                    | MySQL password                         |
| `DB_NAME`                        | MySQL database name                    |
| `GOOGLE_CLIENT_ID`               | Google OAuth client ID                 |
| `GOOGLE_CLIENT_SECRET`           | Google OAuth client secret             |
| `GOOGLE_REDIRECT`                | Google OAuth redirect URL              |
| `GOOGLE_QUEUE_TOPIC`             | Google Cloud Pub/Sub topic             |
| `GOOGLE_QUEUE_SUB`               | Google Cloud Pub/Sub subscription      |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to Google service account JSON    |
| `ANTHROPIC_API_KEY`              | Anthropic API key for AI features      |
| `ENCRYPTION_KEY`                 | 32-character key for encrypting tokens |
| `RABBITMQ_URL`                   | RabbitMQ connection URL (e.g., `amqp://localhost:5672`) |
| `REDIS_HOST`                     | Redis host (e.g., `localhost`)         |
| `REDIS_PORT`                     | Redis port (e.g., `6379`)              |

### Optional

| Variable         | Description                  |
| ---------------- | ---------------------------- |
| `NODE_ENV`       | `development`, `production`  |
| `JWT_SECRET`     | JWT signing secret           |
| `REDIS_PASSWORD` | Redis password (if required) |

## Running the Application

```bash
# Development (watch mode)
npm run start:dev

# Production
npm run build
npm run start:prod

# Debug mode
npm run start:debug
```

The API will be available at `http://localhost:3000` by default.

## Database Migrations

```bash
# Run pending migrations (ALWAYS run before starting dev server)
npm run migration:run

# Generate a new migration after entity changes
NAME=MigrationName npm run migration:generate
```

## Testing

```bash
# Unit tests
npm run test

# Watch mode
npm run test:watch

# Coverage report
npm run test:cov

# E2E tests
npm run test:e2e
```

## Code Quality

```bash
# Lint and auto-fix
npm run lint

# Format code
npm run format
```

## Docker

Build and run using Docker:

```bash
docker build -t vigelon-backend .
docker run -p 3000:3000 --env-file .env vigelon-backend
```

## License

UNLICENSED - Proprietary software.
