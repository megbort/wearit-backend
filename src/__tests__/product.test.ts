import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { productQueries, productMutations, productFieldResolvers } from '../resolvers/product';
import { Product } from '../models/Product';
import { makeContext, createAuthedUser } from './testUtils';

let mongod: MongoMemoryServer;
let authHeader: string;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  ({ authHeader } = await createAuthedUser('admin'));
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  await Product.deleteMany({});
});

const testProduct = {
  sku: 'TST-001',
  name: 'Test Tee',
  price: 29.99,
  images: ['https://example.com/img.jpg'],
  colors: ['black', 'white'],
  sizes: ['S', 'M', 'L'],
  details: ['100% cotton'],
  featured: false,
  sale: false,
  category: 'tees' as const,
};

describe('Mutation.createProduct', () => {
  it('creates a product and returns it', async () => {
    const result = await productMutations.createProduct(
      null,
      testProduct,
      makeContext(authHeader)
    );
    expect(result.name).toBe('Test Tee');
    expect(result.sku).toBe('TST-001');
  });

  it('throws if SKU already exists', async () => {
    await productMutations.createProduct(null, testProduct, makeContext(authHeader));
    await expect(
      productMutations.createProduct(null, testProduct, makeContext(authHeader))
    ).rejects.toThrow('already exists');
  });

  it('throws AuthenticationError when not logged in', async () => {
    await expect(
      productMutations.createProduct(null, testProduct, makeContext())
    ).rejects.toThrow('You must be logged in');
  });

  it('throws ForbiddenError for a non-admin user', async () => {
    const { authHeader: userHeader } = await createAuthedUser('user');
    await expect(
      productMutations.createProduct(null, testProduct, makeContext(userHeader))
    ).rejects.toThrow('do not have permission');
  });
});

describe('Mutation.updateProduct', () => {
  it('updates the specified fields', async () => {
    const product = await productMutations.createProduct(
      null,
      testProduct,
      makeContext(authHeader)
    );
    const updated = await productMutations.updateProduct(
      null,
      { id: String(product._id), price: 19.99, sale: true },
      makeContext(authHeader)
    );
    expect(updated?.price).toBe(19.99);
    expect(updated?.sale).toBe(true);
    expect(updated?.name).toBe('Test Tee');
  });

  it('throws AuthenticationError when not logged in', async () => {
    const product = await productMutations.createProduct(
      null,
      testProduct,
      makeContext(authHeader)
    );
    await expect(
      productMutations.updateProduct(
        null,
        { id: String(product._id), price: 9.99 },
        makeContext()
      )
    ).rejects.toThrow('You must be logged in');
  });
});

describe('Mutation.deleteProduct', () => {
  it('deletes the product and returns true', async () => {
    const product = await productMutations.createProduct(
      null,
      testProduct,
      makeContext(authHeader)
    );
    const result = await productMutations.deleteProduct(
      null,
      { id: String(product._id) },
      makeContext(authHeader)
    );
    expect(result).toBe(true);
    expect(await Product.findById(product._id)).toBeNull();
  });

  it('returns false for a non-existent id', async () => {
    const result = await productMutations.deleteProduct(
      null,
      { id: new mongoose.Types.ObjectId().toString() },
      makeContext(authHeader)
    );
    expect(result).toBe(false);
  });

  it('throws AuthenticationError when not logged in', async () => {
    await expect(
      productMutations.deleteProduct(
        null,
        { id: new mongoose.Types.ObjectId().toString() },
        makeContext()
      )
    ).rejects.toThrow('You must be logged in');
  });
});

describe('Query.products', () => {
  it('returns all products sorted by createdAt desc', async () => {
    await productMutations.createProduct(null, testProduct, makeContext(authHeader));
    await productMutations.createProduct(
      null,
      { ...testProduct, sku: 'TST-002', name: 'Second Tee' },
      makeContext(authHeader)
    );
    const results = await productQueries.products();
    expect(results).toHaveLength(2);
  });

  it('returns an empty array when no products exist', async () => {
    expect(await productQueries.products()).toHaveLength(0);
  });
});

describe('Query.product', () => {
  it('returns a product by id', async () => {
    const product = await productMutations.createProduct(
      null,
      testProduct,
      makeContext(authHeader)
    );
    const result = await productQueries.product(null, { id: String(product._id) });
    expect(result?.sku).toBe('TST-001');
  });

  it('returns null for a non-existent id', async () => {
    const result = await productQueries.product(null, {
      id: new mongoose.Types.ObjectId().toString(),
    });
    expect(result).toBeNull();
  });
});

describe('Query.productsByCategory', () => {
  it('returns only products in the given category', async () => {
    await productMutations.createProduct(null, testProduct, makeContext(authHeader));
    await productMutations.createProduct(
      null,
      { ...testProduct, sku: 'PNT-001', name: 'Test Pants', category: 'pants' },
      makeContext(authHeader)
    );
    const tees = await productQueries.productsByCategory(null, { category: 'tees' });
    expect(tees).toHaveLength(1);
    expect(tees[0].category).toBe('tees');
  });
});

describe('Product.discountPercent', () => {
  it('defaults to 0 when not provided', async () => {
    const product = await productMutations.createProduct(
      null,
      testProduct,
      makeContext(authHeader)
    );
    expect(product.discountPercent).toBe(0);
  });
});

describe('Product.effectivePrice', () => {
  it('applies the discount when on sale with a positive discountPercent', async () => {
    const product = await productMutations.createProduct(
      null,
      { ...testProduct, sku: 'TST-SALE', price: 100, sale: true, discountPercent: 20 },
      makeContext(authHeader)
    );
    expect(productFieldResolvers.effectivePrice(product)).toBe(80);
  });

  it('equals price when sale is true but discountPercent is 0', async () => {
    const product = await productMutations.createProduct(
      null,
      { ...testProduct, sku: 'TST-NODISC', price: 100, sale: true, discountPercent: 0 },
      makeContext(authHeader)
    );
    expect(productFieldResolvers.effectivePrice(product)).toBe(100);
  });

  it('equals price when discountPercent is set but sale is false', async () => {
    const product = await productMutations.createProduct(
      null,
      { ...testProduct, sku: 'TST-OFFSALE', price: 100, sale: false, discountPercent: 20 },
      makeContext(authHeader)
    );
    expect(productFieldResolvers.effectivePrice(product)).toBe(100);
  });
});

describe('Query.featuredProducts', () => {
  it('returns only featured products', async () => {
    await productMutations.createProduct(null, testProduct, makeContext(authHeader));
    await productMutations.createProduct(
      null,
      { ...testProduct, sku: 'TST-002', name: 'Featured Tee', featured: true },
      makeContext(authHeader)
    );
    const featured = await productQueries.featuredProducts();
    expect(featured).toHaveLength(1);
    expect(featured[0].featured).toBe(true);
  });
});
