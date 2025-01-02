/**
 * @file API route handler for HTTP endpoints
 * @version 1.0.0
 * @module routes/api/auth/logout/+server
 * @author Development Team
 * @lastModified 2025-01-02
 */

import { json } from "@sveltejs/kit";
import type { RequestEvent } from "@sveltejs/kit";
import type { RequestHandler } from "../$types";
import { authService } from "$lib/services/api";
import { verifyToken } from "$lib/utils/jwt";
import { AuthenticationError } from "$lib/utils/errors";

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
    await verifyToken(token); // Just verify the token is valid

    // Logout user
    await authService.logout(token);

    return json({ success: true, message: "Logout successful" });
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
