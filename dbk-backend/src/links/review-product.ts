import { defineLink } from "@medusajs/framework/utils";
import ReviewModule from "../modules/review";
import ProductModule from "@medusajs/medusa/product";

export default defineLink(
  {
    linkable: ReviewModule.linkable.review,
    field: "product_id",
    isList: false,
  },
  ProductModule.linkable.product,
  { readOnly: true }
);
