import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import fs from "fs/promises";
import path from "path";
import { BANNERS_MODULE } from "../../../../modules/banners";
import BannersModuleService from "../../../../modules/banners/service";

// PATCH /admin/banners/:id
export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const svc: BannersModuleService = req.scope.resolve(BANNERS_MODULE);
  const { id } = req.params;
  const body = req.body || {};

  const updated = await svc.updateBanners({
    id,
    image_url: body.image_url,
    collection_handle: body.collection_handle,
    alt: body.alt,
    priority: typeof body.priority === "number" ? body.priority : undefined,
    is_active: typeof body.is_active === "boolean" ? body.is_active : undefined,
    starts_at: body.starts_at ? new Date(body.starts_at) : undefined,
    ends_at: body.ends_at ? new Date(body.ends_at) : undefined,
  });

  res.json({ banner: updated });
}

// DELETE /admin/banners/:id
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const svc: BannersModuleService = req.scope.resolve(BANNERS_MODULE);
  const { id } = req.params;

  try {
    const banner = await svc.retrieveBanner(id).catch(() => null);
    if (banner?.file_path) {
      const abs = path.isAbsolute(banner.file_path)
        ? banner.file_path
        : path.join(process.cwd(), banner.file_path);
      await fs.unlink(abs).catch(() => {});
    }
  } catch {}

  await svc.deleteBanners(id).catch(() => {});
  res.status(204).end();
}
