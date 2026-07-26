import { z } from "zod";

export const Sha256DigestSchema = z.string().regex(/^sha256:[a-f0-9]{64}$/, "invalid sha256 digest");
export const Md5DigestSchema = z.string().regex(/^md5:[a-f0-9]{32}$/, "invalid md5 digest");
export const AndroidUserIdSchema = z.number().int().nonnegative().max(2_147_483_647);
export const NullableStringSchema = z.string().min(1).nullable();
export const SizeSchema = z.tuple([z.number().int().positive(), z.number().int().positive()]);
