import { describe, it, expect } from "vitest";
import { loginSchema, registrationSchema } from "$lib/utils/validation";
import {
  validLoginCredentials,
  validRegistrationData,
  invalidRegistrationData,
} from "../fixtures/auth";

describe("Validation Schemas", () => {
  describe("loginSchema", () => {
    it("should validate correct login credentials", () => {
      const result = loginSchema.safeParse(validLoginCredentials);
      expect(result.success).toBe(true);
    });

    it("should fail with invalid email", () => {
      const result = loginSchema.safeParse({
        email: "invalid-email",
        password: "TestPassword123",
      });
      expect(result.success).toBe(false);
    });

    it("should fail with empty password", () => {
      const result = loginSchema.safeParse({
        email: "test@example.com",
        password: "",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("registrationSchema", () => {
    it("should validate correct registration data", () => {
      const result = registrationSchema.safeParse(validRegistrationData);
      expect(result.success).toBe(true);
    });

    it("should fail with invalid data", () => {
      invalidRegistrationData.forEach((data) => {
        const result = registrationSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });

    it("should fail when passwords do not match", () => {
      const result = registrationSchema.safeParse({
        ...validRegistrationData,
        confirmPassword: "DifferentPassword123",
      });
      expect(result.success).toBe(false);
    });
  });
});
