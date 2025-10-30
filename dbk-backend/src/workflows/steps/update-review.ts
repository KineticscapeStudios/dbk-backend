import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { REVIEW_MODULE } from "../../modules/review";
import ProductReviewModuleService from "../../modules/review/service";

export type UpdateReviewsStepInput = {
  id: string;
  status: "pending" | "approved" | "rejected";
}[];

export const updateReviewsStep = createStep(
  "update-reviews-step",
  async (input: UpdateReviewsStepInput, { container }) => {
    const svc: ProductReviewModuleService = container.resolve(REVIEW_MODULE);

    const originals = await svc.listReviews({ id: input.map((r) => r.id) });
    const updated = await svc.updateReviews(input);

    return new StepResponse(updated, originals);
  },
  async (originals, { container }) => {
    if (!originals?.length) return;
    const svc: ProductReviewModuleService = container.resolve(REVIEW_MODULE);
    await svc.updateReviews(
      originals.map((r: any) => ({ id: r.id, status: r.status }))
    );
  }
);
