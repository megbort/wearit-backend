# API Documentation

GraphQL endpoint: `http://localhost:4000/graphql`

The server runs on Apollo Server 5 via the Express integration (`@as-integrations/express5`), mounted at `/graphql` only. Apollo Sandbox is served at `http://localhost:4000/graphql` when the server is running locally.

> **CORS:** only origins listed in `FRONTEND_URL` (default `http://localhost:3000`) are allowed, with `credentials: true` so the refresh cookie can travel. Requests from other origins are blocked by the browser. `FRONTEND_URL` accepts a comma-separated list — e.g. `https://wearit.app,http://localhost:3000` — so a local frontend can run against the deployed API without running the API locally. Outside production the Apollo Studio sandbox origins are allowed too.

---

## Authentication

Auth uses two tokens:

- **Access token** — a stateless JWT returned in the `token` field of `AuthPayload` by `register`, `login`, and `refreshToken`. Expires after **15 minutes**. Send it on authenticated operations as a Bearer header:

  ```
  Authorization: Bearer <token>
  ```

- **Refresh token** — an opaque single-use token set by the server as an **httpOnly cookie** (`refresh_token`, scoped to `/graphql`). It never appears in a GraphQL response and JavaScript cannot read it. It lives **7 days** and is stored server-side as a SHA-256 hash, so it can be revoked (logout) and can't be replayed from a database leak.

**Flow:** when a request fails with `UNAUTHENTICATED` (access token expired), call the `refreshToken` mutation — the browser sends the cookie automatically (use `credentials: 'include'`). The server **rotates** the refresh token on every use: the old one is consumed and a new cookie is set, so a replayed old token is rejected. `logout` deletes the server-side session and clears the cookie.

### Roles

Each user has a `role` of `user` (default) or `admin`, carried as a claim in the access-token JWT. Operations marked **admin-only** below require an admin token and return `FORBIDDEN` otherwise. Emails listed in the `ADMIN_EMAILS` env var are promoted to `admin` when they register. The role is read from the token, so a newly promoted user must log in again to obtain an admin token.

---

## Errors

Errors carry a machine-readable code at `errors[0].extensions.code`. Prefer matching on the code rather than the message text, since messages may be reworded.

| Code | Meaning |
|------|---------|
| `UNAUTHENTICATED` | No token, or an invalid/expired one, on a resolver that requires auth |
| `BAD_USER_INPUT` | Request reached the server but the input was rejected (duplicate email, bad credentials, missing fields) |
| `FORBIDDEN` | Authenticated, but the user's role is not allowed to perform this operation (admin-only) |
| `INTERNAL_SERVER_ERROR` | Unexpected server-side failure |

```json
{
  "errors": [
    {
      "message": "You must be logged in",
      "extensions": { "code": "UNAUTHENTICATED" }
    }
  ]
}
```

---

## Users

### Queries

#### `me`
Returns the currently authenticated user. Requires auth.

```graphql
query {
  me {
    id
    firstName
    lastName
    email
    cart {
      productId
      size
      color
      quantity
    }
  }
}
```

#### `users`
Returns all users. **Admin-only.**

```graphql
query {
  users {
    id
    firstName
    lastName
    email
  }
}
```

#### `user(id)`
Returns a single user by ID. **Admin-only.**

```graphql
query {
  user(id: "abc123") {
    id
    firstName
    email
  }
}
```

### Mutations

#### `register`
Creates a new user account, returns an access token, and sets the refresh cookie.

```graphql
mutation {
  register(
    firstName: "Jane"
    lastName: "Doe"
    email: "jane@example.com"
    password: "secret123"
  ) {
    token
    user { id email }
  }
}
```

#### `login`
Authenticates an existing user, returns an access token, and sets the refresh cookie.

```graphql
mutation {
  login(email: "jane@example.com", password: "secret123") {
    token
    user { id email }
  }
}
```

#### `refreshToken`
Exchanges the refresh cookie for a fresh access token (and a rotated refresh cookie). Takes no arguments — the browser sends the cookie automatically when the client uses `credentials: 'include'`. Fails with `UNAUTHENTICATED` if the cookie is missing, expired, or already used.

```graphql
mutation {
  refreshToken {
    token
    user { id email }
  }
}
```

#### `logout`
Deletes the server-side refresh session and clears the cookie. Always returns `true`; safe to call when not logged in.

```graphql
mutation {
  logout
}
```

#### `updateUser`
Updates the **authenticated** user's own fields. Requires auth; there is no `id` argument — the target is always the caller.

```graphql
mutation {
  updateUser(firstName: "Janet") {
    id
    firstName
  }
}
```

#### `deleteUser`
Deletes the **authenticated** user's own account (and their refresh sessions). Requires auth. Returns `true` on success.

```graphql
mutation {
  deleteUser
}
```

---

## Products

### Categories

Valid values for `CategoryType`: `pants`, `tees`, `sweaters`, `shorts`, `jackets`

### Queries

#### `products`
Returns all products sorted by newest first.

#### `product(id)`
Returns a single product by ID.

#### `productsByCategory(category)`
Returns all products in a given category.

```graphql
query {
  productsByCategory(category: tees) {
    id
    name
    price
  }
}
```

#### `featuredProducts`
Returns all products with `featured: true`.

### Mutations

All product mutations are **admin-only**.

#### `createProduct`

```graphql
mutation {
  createProduct(
    sku: "TEE-001"
    name: "Classic Tee"
    price: 29.99
    images: ["https://..."]
    colors: ["black", "white"]
    sizes: ["S", "M", "L", "XL"]
    details: ["100% cotton", "Machine wash cold"]
    featured: false
    sale: false
    category: tees
  ) {
    id
    sku
    name
  }
}
```

SKUs are stored uppercase and must be unique.

#### `updateProduct`
Updates any product field by ID. `sku` cannot be changed after creation.

```graphql
mutation {
  updateProduct(id: "abc123", price: 24.99, sale: true) {
    id
    price
    sale
  }
}
```

#### `deleteProduct`
Deletes a product by ID. Returns `true` on success.

---

## Cart

Cart is stored per user in the database. Each item is identified by the combination of `productId + size + color` — adding the same combination increments quantity rather than creating a duplicate entry.

All cart mutations require auth.

### Mutations

#### `addToCart`
Adds an item to the cart. If the same `productId + size + color` already exists, `quantity` is incremented by the supplied amount.

```graphql
mutation {
  addToCart(productId: "abc123", size: "M", color: "black", quantity: 1) {
    productId
    size
    color
    quantity
  }
}
```

`quantity` defaults to `1` if omitted.

#### `updateCartItem`
Sets the quantity of a specific cart item. Identified by `productId + size + color`.

```graphql
mutation {
  updateCartItem(productId: "abc123", size: "M", color: "black", quantity: 3) {
    productId
    quantity
  }
}
```

Throws if the item is not found in the cart.

#### `removeFromCart`
Removes a specific item from the cart by `productId + size + color`.

```graphql
mutation {
  removeFromCart(productId: "abc123", size: "M", color: "black") {
    productId
    size
    color
    quantity
  }
}
```

#### `clearCart`
Empties the entire cart. Returns `true` on success. Useful after checkout.

```graphql
mutation {
  clearCart
}
```
