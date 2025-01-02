/**
 * @file Utility functions and helpers
 * @version 1.0.0
 * @module lib/utils/validation
 * @author Development Team
 * @lastModified 2025-01-02
 */

import { z } from "zod";

const emailSchema = z
  .string()
  .email("Invalid email format")
  .min(1, "Email is required");

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/,
    "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
  );

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const registrationSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export type LoginSchema = z.infer<typeof loginSchema>;
export type RegistrationSchema = z.infer<typeof registrationSchema>;
