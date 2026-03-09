import { z, type ZodObject, type ZodRawShape } from "zod";

export type AnyZodObject = ZodObject<ZodRawShape>;

export const baseDevDataAllSchema = z.object({
  eventName: z.string(),
  schema: z.string(),
  timestamp: z.string().datetime(),
  userId: z.string(),
  userAgent: z.string(),
  selectedProfileId: z.string(),
  // gitCommitHash: z.string(),
});
