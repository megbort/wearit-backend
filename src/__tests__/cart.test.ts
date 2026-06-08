import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { cartMutations } from '../resolvers/cart';
import { userMutations } from '../resolvers/user';
import { productMutations } from '../resolvers/product';
import { User } from '../models/User';
import { Product } from '../models/Product';
import { Context } from '../types';

let mongod: MongoMemoryServer;
let authHeader: string;
let userId: string;
let productId: string;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  const { token, user } = await userMutations.register(null, {
    firstName: 'Cart',
    lastName: 'Tester',
    email: 'cart@example.com',
    password: 'password123',
  });
  authHeader = `Bearer ${token}`;
  userId = String(user._id);

  const product = await productMutations.createProduct(
    null,
    {
      sku: 'CART-001',
      name: 'Cart Test Tee',
      price: 29.99,
      images: [],
      colors: ['black'],
      sizes: ['M'],
      details: [],
      featured: false,
      sale: false,
      category: 'tees',
    },
    { req: { headers: { authorization: authHeader } } }
  );
  productId = String(product._id);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  await User.findByIdAndUpdate(userId, { cart: [] });
});

const makeContext = (header?: string): Context => ({
  req: { headers: { authorization: header } },
});

describe('Mutation.addToCart', () => {
  it('adds a new item to the cart', async () => {
    const cart = await cartMutations.addToCart(
      null,
      { productId, size: 'M', color: 'black', quantity: 1 },
      makeContext(authHeader)
    );
    expect(cart).toHaveLength(1);
    expect(cart[0].size).toBe('M');
    expect(cart[0].color).toBe('black');
    expect(cart[0].quantity).toBe(1);
  });

  it('increments quantity when the same item is added again', async () => {
    await cartMutations.addToCart(
      null,
      { productId, size: 'M', color: 'black', quantity: 1 },
      makeContext(authHeader)
    );
    const cart = await cartMutations.addToCart(
      null,
      { productId, size: 'M', color: 'black', quantity: 2 },
      makeContext(authHeader)
    );
    expect(cart).toHaveLength(1);
    expect(cart[0].quantity).toBe(3);
  });

  it('treats different size/color combos as separate items', async () => {
    await cartMutations.addToCart(
      null,
      { productId, size: 'M', color: 'black', quantity: 1 },
      makeContext(authHeader)
    );
    const cart = await cartMutations.addToCart(
      null,
      { productId, size: 'L', color: 'black', quantity: 1 },
      makeContext(authHeader)
    );
    expect(cart).toHaveLength(2);
  });

  it('defaults quantity to 1 when not provided', async () => {
    const cart = await cartMutations.addToCart(
      null,
      { productId, size: 'M', color: 'black' },
      makeContext(authHeader)
    );
    expect(cart[0].quantity).toBe(1);
  });

  it('throws AuthenticationError when not logged in', async () => {
    await expect(
      cartMutations.addToCart(
        null,
        { productId, size: 'M', color: 'black' },
        makeContext()
      )
    ).rejects.toThrow('You must be logged in');
  });
});

describe('Mutation.updateCartItem', () => {
  it('updates the quantity of an existing item', async () => {
    await cartMutations.addToCart(
      null,
      { productId, size: 'M', color: 'black', quantity: 1 },
      makeContext(authHeader)
    );
    const cart = await cartMutations.updateCartItem(
      null,
      { productId, size: 'M', color: 'black', quantity: 5 },
      makeContext(authHeader)
    );
    expect(cart[0].quantity).toBe(5);
  });

  it('throws if the item is not in the cart', async () => {
    await expect(
      cartMutations.updateCartItem(
        null,
        { productId, size: 'XL', color: 'red', quantity: 2 },
        makeContext(authHeader)
      )
    ).rejects.toThrow('Item not found in cart');
  });

  it('throws AuthenticationError when not logged in', async () => {
    await expect(
      cartMutations.updateCartItem(
        null,
        { productId, size: 'M', color: 'black', quantity: 1 },
        makeContext()
      )
    ).rejects.toThrow('You must be logged in');
  });
});

describe('Mutation.removeFromCart', () => {
  it('removes the matching item from the cart', async () => {
    await cartMutations.addToCart(
      null,
      { productId, size: 'M', color: 'black', quantity: 1 },
      makeContext(authHeader)
    );
    const cart = await cartMutations.removeFromCart(
      null,
      { productId, size: 'M', color: 'black' },
      makeContext(authHeader)
    );
    expect(cart).toHaveLength(0);
  });

  it('only removes the matched item, leaving others intact', async () => {
    await cartMutations.addToCart(
      null,
      { productId, size: 'M', color: 'black', quantity: 1 },
      makeContext(authHeader)
    );
    await cartMutations.addToCart(
      null,
      { productId, size: 'L', color: 'black', quantity: 1 },
      makeContext(authHeader)
    );
    const cart = await cartMutations.removeFromCart(
      null,
      { productId, size: 'M', color: 'black' },
      makeContext(authHeader)
    );
    expect(cart).toHaveLength(1);
    expect(cart[0].size).toBe('L');
  });

  it('throws AuthenticationError when not logged in', async () => {
    await expect(
      cartMutations.removeFromCart(
        null,
        { productId, size: 'M', color: 'black' },
        makeContext()
      )
    ).rejects.toThrow('You must be logged in');
  });
});

describe('Mutation.clearCart', () => {
  it('empties the cart and returns true', async () => {
    await cartMutations.addToCart(
      null,
      { productId, size: 'M', color: 'black', quantity: 2 },
      makeContext(authHeader)
    );
    const result = await cartMutations.clearCart(null, null, makeContext(authHeader));
    expect(result).toBe(true);
    const user = await User.findById(userId);
    expect(user?.cart).toHaveLength(0);
  });

  it('throws AuthenticationError when not logged in', async () => {
    await expect(
      cartMutations.clearCart(null, null, makeContext())
    ).rejects.toThrow('You must be logged in');
  });
});
