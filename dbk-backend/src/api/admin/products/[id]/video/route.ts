import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import formidable from "formidable";
import fs from "fs/promises";
import path from "path";
import { VIDEO_MODULE } from "../../../../../modules/media";
import MediaModuleService from "../../../../../modules/media/service";
import { Modules } from "@medusajs/framework/utils";
const STATIC_DIR = path.join(process.cwd(), "static");
function toPublicUrl(absDiskPath: string) {
  // Builds a URL like /static/uploads/videos/filename.ext
  const rel = path.relative(STATIC_DIR, absDiskPath).replace(/\\/g, "/");
  return `/static/${rel}`;
}

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

async function createLink(scope: any, productId: string, videoId: string) {
  try {
    const link = scope.resolve(Modules.LINK);
    await link.create([
      {
        [Modules.PRODUCT]: { product_id: productId },
        [VIDEO_MODULE]: { video_id: videoId },
      },
    ]);
  } catch {
    // best-effort
  }
}

async function dismissLink(scope: any, videoId: string) {
  try {
    const link = scope.resolve(Modules.LINK);
    await link.dismiss({ [VIDEO_MODULE]: { video_id: videoId } });
  } catch {
    // best-effort
  }
}

async function readFileFromRequest(req: MedusaRequest): Promise<{
  buffer: Buffer;
  filename: string;
  mimetype: string | null;
}> {
  const anyReq = req as any;

  // Prefer Web FormData API if available
  if (typeof anyReq.formData === "function") {
    try {
      const formData = await anyReq.formData();
      const f = formData?.get("file") as File | null;
      if (f) {
        const ab = await f.arrayBuffer();
        const name = (f as any).name || "upload.bin";
        const type = (f as any).type || null;
        return { buffer: Buffer.from(ab), filename: name, mimetype: type };
      }
    } catch {
      // fall through
    }
  }

  // Fallback: formidable
  const form = formidable({ multiples: false, keepExtensions: true });
  const { files } = await new Promise<{ files: formidable.Files }>(
    (resolve, reject) => {
      form.parse(req as any, (err, _fields, files) =>
        err ? reject(err) : resolve({ files })
      );
    }
  );

  let f: any = (files as any).file ?? (files as any).video;
  if (Array.isArray(f)) f = f[0];
  if (!f) throw new Error("No file field 'file' found");
  if (!f.filepath) throw new Error("Parsed file has no temp path");

  const buf = await fs.readFile(f.filepath);
  const name = f.originalFilename || path.basename(f.filepath);
  const type = f.mimetype || null;
  return { buffer: buf, filename: name, mimetype: type };
}

function inferExt(mt?: string | null) {
  if (!mt) return "";
  if (mt === "video/mp4") return ".mp4";
  if (mt === "video/webm") return ".webm";
  if (mt === "video/ogg") return ".ogv";
  return "";
}

// Fetch product WITHOUT relations (works across versions)
async function getProduct(scope: any, productId: string) {
  const productService = scope.resolve(Modules.PRODUCT) as any;

  if (typeof productService.retrieveProduct === "function") {
    return await productService.retrieveProduct(productId);
  }

  const [products] = await productService.listProducts?.({ id: productId });
  return products?.[0];
}

// POST /admin/products/:id/video
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const productId = req.params.id;

  // 1) read file
  let file;
  try {
    file = await readFileFromRequest(req);
  } catch (e: any) {
    return res
      .status(400)
      .json({ message: e?.message || "Invalid multipart upload" });
  }

  // 2) write to disk
  const uploadRoot = path.join(STATIC_DIR, "uploads", "videos");
  await ensureDir(uploadRoot);

  const ext =
    path.extname(file.filename || "") ||
    inferExt(file.mimetype) ||
    path.extname("." + (file.filename?.split(".").pop() || ""));
  const base = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const fileName = `${base}${ext || ""}`;
  const dest = path.join(uploadRoot, fileName);

  await fs.writeFile(dest, file.buffer);
  const publicUrl = toPublicUrl(dest);

  // 3) load product (no relations)
  const product = await getProduct(req.scope, productId);
  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  // 4) cleanup old via metadata.video_id (no ORM relation)
  const videoService: MediaModuleService = req.scope.resolve(VIDEO_MODULE);

  const oldVideoId: string | undefined = product.metadata?.video_id;
  if (oldVideoId) {
    try {
      const old = await videoService
        .retrieveVideo(oldVideoId)
        .catch(() => null);
      if (old?.file_path) {
        const abs = path.isAbsolute(old.file_path)
          ? old.file_path
          : path.join(process.cwd(), old.file_path);
        await fs.unlink(abs).catch(() => {});
      }
      await videoService.deleteVideos(oldVideoId).catch(() => {});
      await dismissLink(req.scope, oldVideoId);
    } catch {
      // ignore
    }
  }

  // 5) create new video row
  const video = await videoService.createVideos({
    url: publicUrl,
    file_name: file.filename || fileName,
    file_path: dest,
    mime_type: file.mimetype || null,
  });

  // 6) link product <-> video (best-effort)
  await createLink(req.scope, productId, video.id);

  // 7) mirror into product metadata (store BOTH url and id)
  const productService = req.scope.resolve(Modules.PRODUCT) as any;
  await productService.upsertProducts(
    [
      {
        id: productId,
        metadata: {
          ...(product?.metadata ?? {}),
          video_url: publicUrl,
          video_id: video.id,
        },
      },
    ],
    {}
  );

  return res.json({ video_url: publicUrl, video_id: video.id, video });
}

// DELETE /admin/products/:id/video
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const productId = req.params.id;
  const productService = req.scope.resolve(Modules.PRODUCT) as any;
  const videoService: MediaModuleService = req.scope.resolve(VIDEO_MODULE);

  // load product (no relations)
  const product = await getProduct(req.scope, productId);
  if (!product) return res.status(404).json({ message: "Product not found" });

  const vId: string | null | undefined = product.metadata?.video_id;
  if (!vId) {
    // ensure we clear url if it exists
    await productService.upsertProducts(
      [
        {
          id: productId,
          metadata: {
            ...(product.metadata ?? {}),
            video_url: null,
            video_id: null,
          },
        },
      ],
      {}
    );
    return res.status(204).end();
  }

  // unlink link (best-effort)
  await dismissLink(req.scope, vId);

  // delete file + row
  try {
    const v = await videoService.retrieveVideo(vId).catch(() => null);
    if (v?.file_path) {
      const abs = path.isAbsolute(v.file_path)
        ? v.file_path
        : path.join(process.cwd(), v.file_path);
      await fs.unlink(abs).catch(() => {});
    }
  } catch {}
  await videoService.deleteVideos(vId).catch(() => {});

  // clear metadata
  await productService.upsertProducts(
    [
      {
        id: productId,
        metadata: {
          ...(product.metadata ?? {}),
          video_url: null,
          video_id: null,
        },
      },
    ],
    {}
  );

  return res.status(204).end();
}
