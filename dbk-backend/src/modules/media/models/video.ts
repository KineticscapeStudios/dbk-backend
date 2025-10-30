import { model } from "@medusajs/framework/utils";

const Video = model.define("video", {
  id: model.id().primaryKey(),
  // Public URL that your storefront will use
  url: model.text().index().nullable(),
  // Original file name (nice to have)
  file_name: model.text().nullable(),
  // Server-side absolute or relative disk path (for maintenance)
  file_path: model.text().nullable(),
  // MIME type and size are often useful
  mime_type: model.text().nullable(),
});

export default Video;
