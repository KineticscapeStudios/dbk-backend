import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { createFindParams } from "@medusajs/medusa/api/utils/validators";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { REVIEW_MODULE } from "../../../../../modules/review";
import ProductReviewModuleService from "../../../../../modules/review/service";

export const GetStoreReviewsSchema = createFindParams();

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params;

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const svc: ProductReviewModuleService = req.scope.resolve(REVIEW_MODULE);

  const {
    data: reviews,
    metadata: { count, take, skip } = { count: 0, take: 10, skip: 0 },
  } = await query.graph({
    entity: "review",
    filters: { product_id: id, status: "approved" },
    ...req.queryConfig,
  });

  res.json({
    reviews,
    count,
    limit: take,
    offset: skip,
    average_rating: await svc.getAverageRating(id),
  });
};
