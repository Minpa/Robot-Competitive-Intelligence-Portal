import { eq } from 'drizzle-orm';
import { db, productSpecs, products } from '../db/index.js';
import type { ProductSpec, CreateProductSpecDto, UpdateProductSpecDto } from '../types/index.js';

export class ProductSpecService {
  async create(data: CreateProductSpecDto): Promise<ProductSpec> {
    // Validate product exists
    const [product] = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, data.productId))
      .limit(1);

    if (!product) {
      throw new Error(`Product with id ${data.productId} not found`);
    }

    // Check if spec already exists
    const [existing] = await db
      .select({ id: productSpecs.id })
      .from(productSpecs)
      .where(eq(productSpecs.productId, data.productId))
      .limit(1);

    if (existing) {
      throw new Error(`ProductSpec already exists for product ${data.productId}`);
    }

    const [spec] = await db
      .insert(productSpecs)
      .values({
        productId: data.productId,
        dof: data.dof,
        payloadKg: data.payloadKg?.toString(),
        speedMps: data.speedMps?.toString(),
        batteryMinutes: data.batteryMinutes,
        sensors: data.sensors,
        controlArchitecture: data.controlArchitecture,
        os: data.os,
        sdk: data.sdk,
        priceMin: data.priceMin?.toString(),
        priceMax: data.priceMax?.toString(),
        priceCurrency: data.priceCurrency || 'USD',
      })
      .returning();

    return spec as ProductSpec;
  }

  async getByProductId(productId: string): Promise<ProductSpec | null> {
    const [spec] = await db
      .select()
      .from(productSpecs)
      .where(eq(productSpecs.productId, productId))
      .limit(1);

    return (spec as ProductSpec) || null;
  }

  async update(productId: string, data: UpdateProductSpecDto): Promise<ProductSpec | null> {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (data.dof !== undefined) updateData.dof = data.dof;
    if (data.payloadKg !== undefined) updateData.payloadKg = data.payloadKg?.toString();
    if (data.speedMps !== undefined) updateData.speedMps = data.speedMps?.toString();
    if (data.batteryMinutes !== undefined) updateData.batteryMinutes = data.batteryMinutes;
    if (data.sensors !== undefined) updateData.sensors = data.sensors;
    if (data.controlArchitecture !== undefined) updateData.controlArchitecture = data.controlArchitecture;
    if (data.os !== undefined) updateData.os = data.os;
    if (data.sdk !== undefined) updateData.sdk = data.sdk;
    if (data.priceMin !== undefined) updateData.priceMin = data.priceMin?.toString();
    if (data.priceMax !== undefined) updateData.priceMax = data.priceMax?.toString();
    if (data.priceCurrency !== undefined) updateData.priceCurrency = data.priceCurrency;

    const [spec] = await db
      .update(productSpecs)
      .set(updateData)
      .where(eq(productSpecs.productId, productId))
      .returning();

    return (spec as ProductSpec) || null;
  }

  async upsert(productId: string, data: Omit<CreateProductSpecDto, 'productId'>): Promise<ProductSpec> {
    const existing = await this.getByProductId(productId);

    if (existing) {
      const updated = await this.update(productId, data);
      return updated!;
    }

    return this.create({ ...data, productId });
  }

  async delete(productId: string): Promise<boolean> {
    const result = await db
      .delete(productSpecs)
      .where(eq(productSpecs.productId, productId))
      .returning({ id: productSpecs.id });

    return result.length > 0;
  }
}

export const productSpecService = new ProductSpecService();
