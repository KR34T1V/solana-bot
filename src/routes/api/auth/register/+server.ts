import { json } from "@sveltejs/kit";
import type { RequestEvent } from "@sveltejs/kit";
import type { RequestHandler } from "../$types";
import { PrismaClient } from "@prisma/client";
import { AuthService } from "$lib/services/auth.service";
import { ValidationError } from "$lib/utils/errors";
import { registrationSchema } from "$lib/utils/validation";
import { ZodError } from "zod";

const prisma = new PrismaClient();
const authService = new AuthService(prisma);

export const POST: RequestHandler = async (event: RequestEvent) => {
  try {
    const data = await event.request.json();

    // Validate request data
    const validatedData = registrationSchema.parse(data);

    // Register user
    const response = await authService.register(validatedData);

    return json(response, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return json(
        {
          success: false,
          message: "Validation failed",
          errors: error.errors.reduce(
            (acc, err) => {
              const path = err.path[0];
              if (!acc[path]) acc[path] = [];
              acc[path].push(err.message);
              return acc;
            },
            {} as Record<string, string[]>,
          ),
        },
        { status: 400 },
      );
    }

    if (error instanceof ValidationError) {
      return json(
        { success: false, message: error.message, errors: error.errors },
        { status: 400 },
      );
    }

    console.error("Registration error:", error);
    return json(
      { success: false, message: "Registration failed. Please try again." },
      { status: 500 },
    );
  }
};
