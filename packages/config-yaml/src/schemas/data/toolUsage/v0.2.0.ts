import type { AnyZodObject } from "../base.js";
import { toolUsageEventAllSchema } from "./index.js";

export const toolUsageEventSchema_0_2_0: AnyZodObject =
  toolUsageEventAllSchema.pick({
    // base
    timestamp: true,
    userId: true,
    userAgent: true,
    selectedProfileId: true,
    eventName: true,
    schema: true,

    // tool-usage-specific
    toolCallId: true,
    functionName: true,
    functionParams: true,
    toolCallArgs: true,
    accepted: true,
    succeeded: true,
    output: true,
  });

export const toolUsageEventSchema_0_2_0_noCode: AnyZodObject =
  toolUsageEventSchema_0_2_0.omit({
    functionParams: true,
    toolCallArgs: true,
    output: true,
  });
