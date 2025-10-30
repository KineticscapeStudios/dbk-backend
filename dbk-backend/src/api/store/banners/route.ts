import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import BannersModuleService from "../../../modules/banners/service";
import { BANNERS_MODULE } from "../../../modules/banners";

// GET /store/banners?collection_handle=...&limit=...&offset=...
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  console.log("calling get");
  const svc: BannersModuleService = req.scope.resolve(BANNERS_MODULE);
  console.log("calling get");
  const q = req.query as Record<string, any>;

  const filters: any = { is_active: true };
  if (q.collection_handle)
    filters.collection_handle = String(q.collection_handle);

  const limit = Math.min(Number(q.limit ?? 20) || 20, 50);
  const offset = Number(q.offset ?? 0) || 0;

  const banners = await svc.listBanners(filters, {
    take: limit,
    skip: offset,
    order: { priority: "ASC", created_at: "DESC" },
  });

  // Optionally shape what you expose to the storefront
  const data = banners.map((b) => ({
    id: b.id,
    image_url: b.image_url,
    alt: b.alt,
    collection_handle: b.collection_handle,
  }));

  res.json({ banners: data, count: data.length, limit, offset });
}
