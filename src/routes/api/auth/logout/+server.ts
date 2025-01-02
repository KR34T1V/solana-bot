import { json } from "@sveltejs/kit";
import type { RequestEvent } from "@sveltejs/kit";
import type { RequestHandler } from "../$types";
import { PrismaClient } from "@prisma/client";
import { AuthService } from "$lib/services/auth.service";
import { verifyToken } from "$lib/utils/jwt";
import { AuthenticationError } from "$lib/utils/errors";

const prisma = new PrismaClient();
const authService = new AuthService(prisma);

export const POST: RequestHandler = async (event: RequestEvent) => {
  try {
    const authHeader = event.request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json(
        { success: false, message: "No authorization token provided" },
        { status: 401 },
      );
    }

    const token = authHeader.slice(7);
    const { userId } = await verifyToken(token);

    // Logout user
    const response = await authService.logout(userId);

    return json(response);
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return json({ success: false, message: error.message }, { status: 401 });
    }

    console.error("Logout error:", error);
    return json(
      { success: false, message: "Logout failed. Please try again." },
      { status: 500 },
    );
  }
};
