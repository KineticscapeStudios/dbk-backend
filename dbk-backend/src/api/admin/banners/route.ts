import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import formidable from "formidable";
import fs from "fs/promises";
import path from "path";
import { BANNERS_MODULE } from "../../../modules/banners";
import BannersModuleService from "../../../modules/banners/service";

const STATIC_DIR = path.join(process.cwd(), "static");

function toPublicUrl(absDiskPath: string) {
  const rel = path.relative(STATIC_DIR, absDiskPath).replace(/\\/g, "/");
  return `/static/${rel}`;
}
async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

async function readFileFromRequest(req: MedusaRequest): Promise<{
  buffer: Buffer;
  filename: string;
  mimetype: string | null;
} | null> {
  const anyReq = req as any;

  // Try Web FormData first
  if (typeof anyReq.formData === "function") {
    try {
      const fd = await anyReq.formData();
      const f = fd?.get("file") as File | null;
      if (f) {
        const ab = await f.arrayBuffer();
        const name = (f as any).name || "upload.bin";
        const type = (f as any).type || null;
        return { buffer: Buffer.from(ab), filename: name, mimetype: type };
      }
    } catch {}
  }

  // Fallback: formidable (both file & fields parse will happen below again)
  const form = formidable({ multiples: false, keepExtensions: true });
  const { files } = await new Promise<{ files: formidable.Files }>(
    (resolve, reject) => {
      form.parse(req as any, (err, _fields, files) =>
        err ? reject(err) : resolve({ files })
      );
    }
  );

  let f: any = (files as any).file ?? (files as any).image;
  if (Array.isArray(f)) f = f[0];
  if (!f || !f.filepath) return null;

  const buf = await fs.readFile(f.filepath);
  const name = f.originalFilename || path.basename(f.filepath);
  const type = f.mimetype || null;
  return { buffer: buf, filename: name, mimetype: type };
}

// GET /admin/banners?collection_handle=&only_active=true
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc: BannersModuleService = req.scope.resolve(BANNERS_MODULE);

  const { collection_handle, only_active } = req.query as Record<string, any>;

  const filters: any = {};
  if (collection_handle) filters.collection_handle = String(collection_handle);
  if (only_active === "true") filters.is_active = true;

  const banners = await svc.listBanners(filters, {
    order: { priority: "ASC", created_at: "DESC" },
  });

  res.json({ banners });
}

// POST /admin/banners  (multipart; 'file' + 'collection_handle' + optional fields)
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc: BannersModuleService = req.scope.resolve(BANNERS_MODULE);

  // 1) parse multipart once
  const form = formidable({ multiples: false, keepExtensions: true });
  let parsed: { fields: formidable.Fields; files: formidable.Files };
  try {
    parsed = await new Promise((resolve, reject) => {
      form.parse(req as any, (err, fields, files) =>
        err ? reject(err) : resolve({ fields, files })
      );
    });
  } catch (e: any) {
    return res
      .status(400)
      .json({ message: e?.message || "Invalid multipart upload" });
  }

  const { fields, files } = parsed;

  // 2) extract the file
  let f: any = (files as any).file ?? (files as any).image;
  if (Array.isArray(f)) f = f[0];
  if (!f?.filepath) {
    return res
      .status(400)
      .json({ message: "file is required (field name: file)" });
  }

  const buffer = await fs.readFile(f.filepath);
  const filename = f.originalFilename || path.basename(f.filepath);
  const mimetype = f.mimetype || null;

  // 3) required field: collection_handle
  const collection_handle = String(fields.collection_handle ?? "").trim();
  if (!collection_handle) {
    return res.status(400).json({ message: "collection_handle is required" });
  }

  // 4) optional fields
  const alt =
    (fields.alt !== undefined ? String(fields.alt) : "").trim() || null;
  const priority = Number(fields.priority ?? 0) || 0;
  const is_active = String(fields.is_active ?? "true") !== "false";

  // 5) write to disk
  const uploadRoot = path.join(STATIC_DIR, "uploads", "banners");
  await ensureDir(uploadRoot);

  const ext = path.extname(filename || "");
  const base = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const finalName = `${base}${ext || ""}`;
  const dest = path.join(uploadRoot, finalName);

  await fs.writeFile(dest, buffer);
  const publicUrl = toPublicUrl(dest);

  // 6) create DB row
  const banner = await svc.createBanners({
    image_url: publicUrl,
    file_name: filename || finalName,
    file_path: dest,
    mime_type: mimetype || null,
    collection_handle,
    alt,
    priority,
    is_active,
  });

  return res.status(201).json({ banner });
}
