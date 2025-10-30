import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { REVIEW_MODULE } from "../../modules/review";
import ProductReviewModuleService from "../../modules/review/service";

export type CreateReviewStepInput = {
  title?: string;
  content: string;
  rating: number;
  product_id: string;
  customer_id?: string;
  first_name: string;
  last_name: string;
  status?: "pending" | "approved" | "rejected";
};

export const createReviewStep = createStep(
  "create-review",
  async (input: CreateReviewStepInput, { container }) => {
    const svc: ProductReviewModuleService = container.resolve(REVIEW_MODULE);
    const review = await svc.createReviews(input);
    return new StepResponse(review, review.id);
  },
  async (reviewId, { container }) => {
    if (!reviewId) return;
    const svc: ProductReviewModuleService = container.resolve(REVIEW_MODULE);
    await svc.deleteReviews(reviewId);
  }
);
