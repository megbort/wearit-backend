# WearIt Backend

Welcome to the WearIt Backend! The GraphQL API powering the wearit front-end project built with Next.js.

This backend service provides a robust GraphQL API using Apollo Server and TypeScript, designed to support the modern WearIt shopping experience. As part of the second iteration of this project, we're implementing scalable architecture patterns and modern development practices.

This API handles the product catalog, user management, and shopping cart functionality, with token-based authentication for the WearIt platform. Expect continuous improvements and feature additions as we build out the complete e-commerce experience! 🛍️

— Megan Krenbrink

<br>

## Getting Started

### Prerequisites

- **Node.js 20+** (required by Apollo Server 5)
- npm
- A **MongoDB** database (local or hosted, e.g. MongoDB Atlas)

### Installation

```bash
# Install dependencies
npm install

# Copy the example env file and fill in your values
cp .env.example .env

# Start development server (hot reload via nodemon)
npm run dev

# Build for production
npm run build

# Start production server (after building)
npm start

# Run the test suite
npm test
```

### Environment Variables

Configured in `.env` (see `.env.example`):

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `PORT` | Server port (defaults to `4000`) |
| `NODE_ENV` | `development` or `production` (affects CORS and cookie security) |
| `FRONTEND_URL` | Frontend origin allowed by CORS (cookies require an exact origin, not `*`) |
| `JWT_SECRET` | Secret used to sign access-token JWTs |
| `ADMIN_EMAILS` | Comma-separated emails auto-promoted to `admin` on register |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Cloudinary image credentials |

### Apollo Sandbox

Once the server is running, visit `http://localhost:4000/graphql` to explore the API with Apollo Sandbox. The GraphQL endpoint is mounted at `/graphql` only.

## Authentication

Auth uses a short-lived access-token JWT (sent as a `Bearer` header) plus a
single-use, httpOnly refresh cookie that is rotated on every use. Users have a
`role` (`user` or `admin`); admin-only operations (product mutations, listing
users) are guarded server-side, and the first admin is bootstrapped via the
`ADMIN_EMAILS` env variable. See [`docs/api.md`](docs/api.md) for the full API
reference, auth flow, and error codes.

## Tech Stack

- **Node.js** with **TypeScript**
- **Apollo Server 5** (via the **Express** integration) for the GraphQL API
- **GraphQL** for flexible data querying
- **MongoDB** with **Mongoose** for data modeling
- **JWT** + **bcrypt** and httpOnly refresh cookies for authentication
- **Cloudinary** for image storage
- **Jest** for testing
- **Hot reload** development with nodemon

## Project Structure

```
src/
├── index.ts          # Apollo Server + Express setup and entry point
├── database.ts       # MongoDB connection
├── schema.ts         # GraphQL type definitions
├── resolvers/        # GraphQL resolvers (user, product, cart)
├── models/           # Mongoose models (User, Product, RefreshToken)
├── utils/            # Auth helpers, error factories, etc.
├── types/            # Shared TypeScript types
└── __tests__/        # Jest test suites

docs/api.md           # GraphQL API reference
```

## Frontend Integration

This backend is designed to work seamlessly with the WearIt Next.js frontend. The GraphQL API provides all the data and functionality needed for the modern shopping experience.
