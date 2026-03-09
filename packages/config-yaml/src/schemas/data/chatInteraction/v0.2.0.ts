import type { AnyZodObject } from "../base.js";
import { chatInteractionEventAllSchema } from "./index.js";

export const chatInteractionEventSchema_0_2_0: AnyZodObject =
  chatInteractionEventAllSchema.pick({
    // base
    timestamp: true,
    userId: true,
    userAgent: true,
    selectedProfileId: true,
    eventName: true,
    schema: true,

    // other
    prompt: true,
    completion: true,
    modelName: true,
    modelTitle: true,
    modelProvider: true,
    sessionId: true,
    tools: true,
    rules: true,
  });

export const chatInteractionEventSchema_0_2_0_noCode: AnyZodObject =
  chatInteractionEventSchema_0_2_0.omit({
    prompt: true,
    completion: true,
  });
