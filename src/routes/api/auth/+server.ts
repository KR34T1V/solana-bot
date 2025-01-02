/**
 * @file API route handler for HTTP endpoints
 * @version 1.0.0
 * @module routes/api/auth/+server
 * @author Development Team
 * @lastModified 2025-01-02
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "@sveltejs/kit";
import { authService } from "$lib/services/api";
import { AuthenticationError } from "$lib/utils/errors";

export const POST: RequestHandler = async ({ request }) => {
  const { email, password, confirmPassword, action } = await request.json();

  try {
    if (action === "register") {
      const result = await authService.register({
        email,
        password,
        confirmPassword: confirmPassword || password, // Default to password if not provided
      });
      return json(result);
    } else {
      const result = await authService.login({ email, password });
      return json(result);
    }
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return json({ error: error.message }, { status: 401 });
    }
    return json({ error: "An unexpected error occurred" }, { status: 500 });
  }
};

export const DELETE: RequestHandler = async ({ request }) => {
  const { token } = await request.json();

  try {
    await authService.logout(token);
    return json({ success: true });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return json({ error: error.message }, { status: 401 });
    }
    return json({ error: "An unexpected error occurred" }, { status: 500 });
  }
};
