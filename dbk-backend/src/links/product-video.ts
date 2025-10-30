import { defineLink } from "@medusajs/framework/utils";
import VideoModule from "../modules/media";
import ProductModule from "@medusajs/medusa/product";

export default defineLink(
  ProductModule.linkable.product,
  VideoModule.linkable.video
);
