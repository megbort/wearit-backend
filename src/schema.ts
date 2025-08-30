import { gql } from 'apollo-server';

export const typeDefs = gql`
  type User {
    id: ID!
    firstName: String!
    lastName: String!
    email: String!
    createdAt: String!
    updatedAt: String!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type Query {
    me: User
    users: [User!]!
    user(id: ID!): User
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
  }
`;
