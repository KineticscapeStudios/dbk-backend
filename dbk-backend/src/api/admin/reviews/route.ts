import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { createFindParams } from "@medusajs/medusa/api/utils/validators";
import { z } from "zod";

/** extend default list params with product_id (optional) */
export const GetAdminReviewsSchema = createFindParams().merge(
  z.object({
    product_id: z.string().optional(),
  })
);

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const query = req.scope.resolve("query");

  const product_id = (req.query as any)?.product_id as string | undefined;

  const {
    data: reviews,
    metadata: { count, take, skip } = { count: 0, take: 50, skip: 0 },
  } = await query.graph({
    entity: "review",
    // use the transformed query config for fields/pagination/order,
    // then add our filter for product_id if present
    ...req.queryConfig,
    filters: {
      ...(req.queryConfig?.filters ?? {}),
      ...(product_id ? { product_id } : {}),
    },
  });

  res.json({ reviews, count, limit: take, offset: skip });
};
