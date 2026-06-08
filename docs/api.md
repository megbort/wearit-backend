# API Documentation

GraphQL endpoint: `http://localhost:4000/graphql`

An interactive schema explorer (Apollo Sandbox) is available at that URL when the server is running locally.

---

## Authentication

Authenticated mutations and queries require a JWT passed as a Bearer token in the `Authorization` header:

```
Authorization: Bearer <token>
```

Tokens are returned by `register` and `login`. They are stateless and expire after **7 days**.

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
Returns all users.

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
Returns a single user by ID.

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
Creates a new user account and returns a token.

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
Authenticates an existing user and returns a token.

```graphql
mutation {
  login(email: "jane@example.com", password: "secret123") {
    token
    user { id email }
  }
}
```

#### `updateUser`
Updates user fields by ID. Does not currently require auth.

```graphql
mutation {
  updateUser(id: "abc123", firstName: "Janet") {
    id
    firstName
  }
}
```

#### `deleteUser`
Deletes a user by ID. Returns `true` on success. Does not currently require auth.

```graphql
mutation {
  deleteUser(id: "abc123")
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

All product mutations require auth.

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
