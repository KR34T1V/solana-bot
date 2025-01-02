import type { RequestHandler } from "../$types";
import { json } from "@sveltejs/kit";
import { AuthService } from "$lib/services/auth.service";
import { PrismaClient } from "@prisma/client";
import { loginSchema } from "$lib/utils/validation";
import { ValidationError, AuthenticationError } from "$lib/utils/errors";

const prisma = new PrismaClient();
const authService = new AuthService(prisma);

export const POST: RequestHandler = async (event) => {
  try {
    const body = await event.request.json();
    const validatedData = loginSchema.parse(body);
    const result = await authService.login(validatedData);
    return json(result, { status: 200 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return json(
        {
          success: false,
          message: error.message,
          errors: error.errors,
        },
        { status: 400 },
      );
    }

    if (error instanceof AuthenticationError) {
      return json(
        {
          success: false,
          message: error.message,
        },
        { status: 401 },
      );
    }

    console.error("Login error:", error);
    return json(
      {
        success: false,
        message: "Login failed",
      },
      { status: 500 },
    );
  }
};
