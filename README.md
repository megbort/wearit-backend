# WearIt Backend

Welcome to the WearIt Backend! The GraphQL API powering the wearit front-end project built with Next.js.

This backend service provides a robust GraphQL API using Apollo Server and TypeScript, designed to support the modern WearIt shopping experience. As part of the second iteration of this project, we're implementing scalable architecture patterns and modern development practices.

This API will handle product catalogs, user management, shopping cart functionality, and order processing for the WearIt platform. Expect continuous improvements and feature additions as we build out the complete e-commerce experience! 🛍️

— Megan Krenbrink

<br>

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### GraphQL Playground

Once the server is running, visit `http://localhost:4000/graphql` to explore the API with GraphQL Playground.

## 🛠️ Tech Stack

- **Node.js** with **TypeScript**
- **Apollo Server** for GraphQL API
- **GraphQL** for flexible data querying
- **Hot reload** development with nodemon

## 📁 Project Structure

```
src/
├── index.ts          # Apollo Server setup and entry point
├── schema.ts         # GraphQL type definitions
└── resolvers.ts      # GraphQL resolvers implementation
```

## 🔗 Frontend Integration

This backend is designed to work seamlessly with the WearIt Next.js frontend. The GraphQL API provides all the data and functionality needed for the modern shopping experience.
