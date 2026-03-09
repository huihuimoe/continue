import type { AnyZodObject } from "../base.js";
import { tokensGeneratedEventAllSchema } from "./index.js";

export const tokensGeneratedEventSchema_0_1_0: AnyZodObject =
  tokensGeneratedEventAllSchema.pick({
    model: true,
    provider: true,
    promptTokens: true,
    generatedTokens: true,
  });

export const tokensGeneratedEventSchema_0_1_0_noCode: AnyZodObject =
  tokensGeneratedEventSchema_0_1_0;
