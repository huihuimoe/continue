import type { AnyZodObject } from "../base.js";
import { chatFeedbackEventAllSchema } from "./index.js";

export const chatFeedbackEventSchema_0_1_0: AnyZodObject =
  chatFeedbackEventAllSchema.pick({
    modelName: true,
    completionOptions: true,
    prompt: true,
    completion: true,
    feedback: true,
    sessionId: true,
  });

export const chatFeedbackEventSchema_0_1_0_noCode: AnyZodObject =
  chatFeedbackEventSchema_0_1_0.omit({
    prompt: true,
    completion: true,
  });
