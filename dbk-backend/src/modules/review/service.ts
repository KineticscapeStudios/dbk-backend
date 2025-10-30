import {
  InjectManager,
  MedusaContext,
  MedusaService,
} from "@medusajs/framework/utils";
import type { Context } from "@medusajs/framework/types";
import type { EntityManager } from "@mikro-orm/knex";
import Review from "./models/review";

class ProductReviewModuleService extends MedusaService({ Review }) {
  @InjectManager()
  async getAverageRating(
    productId: string,
    @MedusaContext() shared?: Context<EntityManager>
  ): Promise<number> {
    const result = await shared?.manager?.execute(
      `SELECT AVG(rating) as average
       FROM review
       WHERE product_id = ? AND status = 'approved'`,
      [productId]
    );
    const avg = parseFloat(result?.[0]?.average ?? 0);
    return Number.isFinite(avg) ? parseFloat(avg.toFixed(2)) : 0;
  }
}

export default ProductReviewModuleService;
