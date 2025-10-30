import { model } from "@medusajs/framework/utils";

const Banner = model.define("banner", {
  id: model.id().primaryKey(),

  // file info
  image_url: model.text().index().nullable(), // public URL served by /static
  file_name: model.text().nullable(),
  file_path: model.text().nullable(), // absolute/relative server path
  mime_type: model.text().nullable(),

  // business fields
  collection_handle: model.text().index(), // required by your widget
  alt: model.text().nullable(),
  priority: model.number().default(0),
  is_active: model.boolean().default(true),

  // optional scheduling
  starts_at: model.dateTime().nullable(),
  ends_at: model.dateTime().nullable(),
});

export default Banner;
