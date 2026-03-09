import * as z from "zod";
import { blockItemWrapperSchema } from "../schemas/index.js";

type AnyObjectSchema = z.ZodObject<z.ZodRawShape>;

export const isBlockItemWrapper = (
  block: unknown,
): block is z.infer<
  ReturnType<typeof blockItemWrapperSchema<AnyObjectSchema>>
> => {
  const baseSchema = z.object({});
  const schema = blockItemWrapperSchema(baseSchema);

  return schema.safeParse(block).success;
};
