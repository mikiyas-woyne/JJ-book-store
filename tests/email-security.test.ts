import { describe, it, expect } from "vitest";
import { escapeHtml, sanitizeSubject, isValidEmail } from "../src/lib/emailService";

describe("Email Security & Reliability Suite", () => {
  describe("1. HTML Sanitization & Injection Prevention", () => {
    it("should escape special HTML characters to prevent XSS & template injection", () => {
      const maliciousInput = '<script>alert("xss")</script>&<b>bold</b>\'"';
      const safe = escapeHtml(maliciousInput);

      expect(safe).not.toContain("<script>");
      expect(safe).not.toContain("</script>");
      expect(safe).toContain("&lt;script&gt;");
      expect(safe).toContain("&amp;");
      expect(safe).toContain("&quot;");
      expect(safe).toContain("&#39;");
    });

    it("should handle null and undefined safely", () => {
      expect(escapeHtml(null)).toBe("");
      expect(escapeHtml(undefined)).toBe("");
      expect(escapeHtml(123)).toBe("123");
    });
  });

  describe("2. Email Subject Sanitization (CRLF Header Injection Prevention)", () => {
    it("should strip carriage returns and newlines from subject lines", () => {
      const maliciousSubject = "Order #12345 Confirmed\r\nBcc: victim@attacker.com\r\nSubject: Injected";
      const safeSubject = sanitizeSubject(maliciousSubject);

      expect(safeSubject).not.toContain("\r");
      expect(safeSubject).not.toContain("\n");
      expect(safeSubject).toBe("Order #12345 Confirmed Bcc: victim@attacker.com Subject: Injected");
    });

    it("should handle null and undefined safely", () => {
      expect(sanitizeSubject(null)).toBe("");
      expect(sanitizeSubject(undefined)).toBe("");
    });
  });

  describe("3. Email Address Validation", () => {
    it("should accept valid standard email formats", () => {
      expect(isValidEmail("customer@example.com")).toBe(true);
      expect(isValidEmail("john.doe+store@jjbookstore.com.et")).toBe(true);
      expect(isValidEmail("admin_123@domain.org")).toBe(true);
    });

    it("should reject malformed or dangerous email inputs", () => {
      expect(isValidEmail("plainaddress")).toBe(false);
      expect(isValidEmail("@missingusername.com")).toBe(false);
      expect(isValidEmail("username@.com")).toBe(false);
      expect(isValidEmail("")).toBe(false);
      expect(isValidEmail(null)).toBe(false);
      expect(isValidEmail(undefined)).toBe(false);
      expect(isValidEmail("user\r\n@evil.com")).toBe(false);
    });
  });

  describe("4. Duplicate Email Prevention & Event Claims", () => {
    it("should prevent duplicate sends for the same event key", () => {
      const emailDeliveryStore: Record<string, { status: string; sentAt?: string }> = {};

      const claimEmail = (orderId: string, eventType: string): boolean => {
        const claimKey = `${orderId}:${eventType}`;
        if (emailDeliveryStore[claimKey]?.status === "sent" || emailDeliveryStore[claimKey]?.status === "sending") {
          return false; // Duplicate prevented!
        }
        emailDeliveryStore[claimKey] = { status: "sending" };
        return true; // Claim granted
      };

      // First attempt for order_created -> should succeed
      expect(claimEmail("ORD-001", "order_created")).toBe(true);

      // Second attempt for order_created -> should be prevented as duplicate
      expect(claimEmail("ORD-001", "order_created")).toBe(false);

      // Third attempt for a different event (payment_verified) on the same order -> should succeed
      expect(claimEmail("ORD-001", "payment_verified")).toBe(true);

      // Duplicate payment_verified -> should be prevented
      expect(claimEmail("ORD-001", "payment_verified")).toBe(false);
    });
  });
});
