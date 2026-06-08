import { gql } from 'apollo-server';

export const typeDefs = gql`
  type CartItem {
    productId: ID!
    size: String!
    color: String!
    quantity: Int!
  }

  type User {
    id: ID!
    firstName: String!
    lastName: String!
    email: String!
    cart: [CartItem!]!
    createdAt: String!
    updatedAt: String!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  enum CategoryType {
    pants
    tees
    sweaters
    shorts
    jackets
  }

  type Product {
    id: ID!
    sku: String!
    name: String!
    price: Float!
    images: [String!]!
    colors: [String!]!
    sizes: [String!]!
    details: [String!]!
    featured: Boolean!
    sale: Boolean!
    category: CategoryType!
    createdAt: String!
    updatedAt: String!
  }

  type Query {
    me: User
    users: [User!]!
    user(id: ID!): User
    products: [Product!]!
    product(id: ID!): Product
    productsByCategory(category: CategoryType!): [Product!]!
    featuredProducts: [Product!]!
  }

  type Mutation {
    register(
      firstName: String!
      lastName: String!
      email: String!
      password: String!
    ): AuthPayload!
    login(email: String!, password: String!): AuthPayload!
    updateUser(
      id: ID!
      firstName: String
      lastName: String
      email: String
    ): User
    deleteUser(id: ID!): Boolean!
    createProduct(
      sku: String!
      name: String!
      price: Float!
      images: [String!]!
      colors: [String!]!
      sizes: [String!]!
      details: [String!]!
      featured: Boolean
      sale: Boolean
      category: CategoryType!
    ): Product!
    updateProduct(
      id: ID!
      name: String
      price: Float
      images: [String!]
      colors: [String!]
      sizes: [String!]
      details: [String!]
      featured: Boolean
      sale: Boolean
      category: CategoryType
    ): Product!
    deleteProduct(id: ID!): Boolean!
    addToCart(productId: ID!, size: String!, color: String!, quantity: Int): [CartItem!]!
    updateCartItem(productId: ID!, size: String!, color: String!, quantity: Int!): [CartItem!]!
    removeFromCart(productId: ID!, size: String!, color: String!): [CartItem!]!
    clearCart: Boolean!
  }
`;
