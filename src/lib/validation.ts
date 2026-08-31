import { z } from "zod";

export const mealTypeSchema = z.enum(["LUNCH", "DINNER"]);

export const toggleMealSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  mealType: mealTypeSchema,
  userId: z.string().min(1),
  /** null resets the meal back to "Not updated yet". */
  ate: z.boolean().nullable(),
});

export const setGuestMealSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  mealType: mealTypeSchema,
  count: z.coerce.number().int().min(0).max(200),
  note: z.string().max(280).optional().nullable(),
});

export const expenseInputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  amount: z.coerce.number().positive("Amount must be greater than 0").max(10_000_000),
  categoryId: z.string().min(1, "Category is required"),
  description: z.string().max(280).optional().nullable(),
  paidById: z.string().min(1, "Paid by is required"),
  countsTowardMealCost: z.coerce.boolean(),
  note: z.string().max(1000).optional().nullable(),
});

export const updateExpenseSchema = expenseInputSchema.extend({
  id: z.string().min(1),
});

export const createUserSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["ADMIN", "USER"]),
});

export const updateUserSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(120),
  email: z.string().email("Enter a valid email"),
  role: z.enum(["ADMIN", "USER"]),
  active: z.coerce.boolean(),
  password: z.string().min(8).optional().or(z.literal("")),
});

export const changeOwnPasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

/** Small resized avatar images only — data: URI capped well under Postgres TEXT/network limits. */
export const updateAvatarSchema = z.object({
  avatarDataUrl: z
    .string()
    .regex(/^data:image\/(png|jpeg|webp);base64,/, "Unsupported image format")
    .max(700_000, "Image is too large"),
});

export const categoryInputSchema = z.object({
  name: z.string().min(1, "Name is required").max(60),
});

export const monthStatusSchema = z.object({
  monthId: z.string().min(1),
  status: z.enum(["OPEN", "CLOSED"]),
});
