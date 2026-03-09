import type { AnyZodObject } from "../base.js";
import { nextEditOutcomeEventAllSchema } from "./index.js";

export const nextEditOutcomeEventSchema_0_2_0: AnyZodObject =
  nextEditOutcomeEventAllSchema.pick({
    // base
    timestamp: true,
    userId: true,
    userAgent: true,
    selectedProfileId: true,
    eventName: true,
    schema: true,

    // nextEditOutcome-specific
    elapsed: true,
    completionOptions: true,
    completionId: true,
    requestId: true,
    gitRepo: true,
    uniqueId: true,
    // timestamp: z.number(),
    fileUri: true,
    workspaceDirUri: true,
    prompt: true,
    userEdits: true,
    userExcerpts: true,
    originalEditableRange: true,
    completion: true,
    cursorPosition: true,
    accepted: true,
    aborted: true,
    modelProvider: true,
    modelName: true,
  });

export const nextEditOutcomeEventSchema_0_2_0_noCode: AnyZodObject =
  nextEditOutcomeEventSchema_0_2_0.omit({
    fileUri: true,
    workspaceDirUri: true,
    prompt: true,
    userEdits: true,
    userExcerpts: true,
    originalEditableRange: true,
    completion: true,
  });
