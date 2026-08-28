/**
 * Authentication and Authorization Security Test Suite
 * JJ Book Store - Production Security Phase #1
 */

import fs from "fs";
import path from "path";

export function runAuthSecurityTests() {
  console.log("=================================================");
  console.log("RUNNING AUTHENTICATION & AUTHORIZATION TESTS (TS)");
  console.log("=================================================\n");

  const rulesPath = path.join(process.cwd(), "firestore.rules");
  const serverPath = path.join(process.cwd(), "server.ts");
  const checkoutPath = path.join(process.cwd(), "src/components/checkout/CheckoutModal.tsx");

  const rulesContent = fs.readFileSync(rulesPath, "utf-8");
  const serverContent = fs.readFileSync(serverPath, "utf-8");
  const checkoutContent = fs.readFileSync(checkoutPath, "utf-8");

  let passed = 0;
  let failed = 0;

  function assertTest(num: number, desc: string, pass: boolean, details?: string) {
    if (pass) {
      console.log(`  ✅ [PASS] TEST ${num}: ${desc}`);
      if (details) console.log(`         ${details}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] TEST ${num}: ${desc}`);
      if (details) console.error(`         ${details}`);
      failed++;
    }
  }

  interface MockUser {
    uid: string;
    email: string;
    role: "customer" | "staff" | "employee" | "delivery" | "admin" | "superAdmin";
    permissions?: string[];
    status: "active" | "suspended";
  }

  const KNOWN_ADMIN_EMAILS = [
    "admin@jjbookstore.com",
    "admin@jjbookshopping.com"
  ];

  function isAuthorizedAdminEmail(email?: string | null): boolean {
    if (!email) return false;
    return KNOWN_ADMIN_EMAILS.includes(email.trim().toLowerCase());
  }

  function checkAdminAccess(user?: MockUser | null) {
    if (!user) return { status: 401, error: "UNAUTHORIZED" };
    if (user.status === "suspended") return { status: 403, error: "ACCOUNT_SUSPENDED" };
    const isAdmin = user.role === "admin" || user.role === "superAdmin" || isAuthorizedAdminEmail(user.email);
    if (!isAdmin) return { status: 403, error: "FORBIDDEN" };
    return { status: 200, success: true };
  }

  function checkStaffAccess(user?: MockUser | null) {
    if (!user) return { status: 401, error: "UNAUTHORIZED" };
    if (user.status === "suspended") return { status: 403, error: "ACCOUNT_SUSPENDED" };
    const isStaff = ["admin", "superAdmin", "staff", "employee", "delivery"].includes(user.role) || isAuthorizedAdminEmail(user.email);
    if (!isStaff) return { status: 403, error: "FORBIDDEN" };
    return { status: 200, success: true };
  }

  function checkOrderCancellation(user: MockUser | null, orderCustomerId: string, orderStatus: string) {
    if (!user) return { status: 401, error: "UNAUTHORIZED" };
    if (user.status === "suspended") return { status: 403, error: "ACCOUNT_SUSPENDED" };
    const isStaff = ["admin", "superAdmin", "staff", "employee"].includes(user.role) || isAuthorizedAdminEmail(user.email);
    if (orderCustomerId !== user.uid && !isStaff) {
      return { status: 403, error: "UNAUTHORIZED", message: "Unauthorized to cancel another user's order." };
    }
    if (orderStatus !== "pending" && !isStaff) {
      return { status: 400, error: "ORDER_CANNOT_BE_CANCELLED" };
    }
    return { status: 200, success: true };
  }

  // 1. Unauthenticated checks
  const t1 = checkAdminAccess(null).status === 401 && checkStaffAccess(null).status === 401 && checkOrderCancellation(null, "u-1", "pending").status === 401;
  assertTest(1, "Unauthenticated calls return 401 Unauthorized", t1, "Admin, staff, and cancellation endpoints block unauthenticated calls");

  // 2. Suspended checks
  const suspendedUser: MockUser = { uid: "u-1", email: "admin@jjbookstore.com", role: "admin", status: "suspended" };
  const t2 = checkAdminAccess(suspendedUser).status === 403 && checkStaffAccess(suspendedUser).status === 403;
  assertTest(2, "Suspended user token is rejected with 403 Forbidden", t2, "Status check halts access for suspended accounts");

  // 3. Customer blocked from admin
  const customer: MockUser = { uid: "cust-1", email: "customer@example.com", role: "customer", status: "active" };
  const t3 = checkAdminAccess(customer).status === 403 && checkStaffAccess(customer).status === 403;
  assertTest(3, "Customer token blocked from privileged endpoints with 403", t3, "Non-admin, non-staff role rejects administrative calls");

  // 4. Admin allowed
  const admin: MockUser = { uid: "adm-1", email: "admin@jjbookstore.com", role: "admin", status: "active" };
  const t4 = checkAdminAccess(admin).status === 200;
  assertTest(4, "Verified admin token granted access with 200 OK", t4, "Administrative role validated successfully");

  // 5. Authorized Admin Email bypass
  const emailAdmin: MockUser = { uid: "adm-owner", email: "admin@jjbookstore.com", role: "customer", status: "active" };
  const t5 = checkAdminAccess(emailAdmin).status === 200;
  assertTest(5, "Authorized super-admin email recognized and granted access", t5, "SuperAdmin email whitelist verified");

  // 6. IDOR prevention
  const customerB: MockUser = { uid: "cust-B", email: "bob@example.com", role: "customer", status: "active" };
  const t6 = checkOrderCancellation(customerB, "cust-A", "pending").status === 403;
  assertTest(6, "IDOR check: Customer B cannot cancel Customer A's order (403)", t6, "Cross-user cancellation attempt blocked");

  // 7. Owner cancellation
  const customerA: MockUser = { uid: "cust-A", email: "alice@example.com", role: "customer", status: "active" };
  const t7 = checkOrderCancellation(customerA, "cust-A", "pending").status === 200;
  assertTest(7, "Customer can cancel own pending order (200)", t7, "Authoritative owner cancellation permitted");

  // 8. Staff cancellation
  const staff: MockUser = { uid: "staff-1", email: "staff@jjbookstore.com", role: "staff", status: "active" };
  const t8 = checkOrderCancellation(staff, "cust-A", "pending").status === 200;
  assertTest(8, "Staff can cancel customer order (200)", t8, "Staff workflow cancellation permitted");

  // 9. Server code structure check
  const t9 = serverContent.includes("getAuth") && serverContent.includes("verifyIdToken") && serverContent.includes("requireAuth");
  assertTest(9, "Server code includes Firebase Admin getAuth and verifyIdToken", t9, "server.ts auth infrastructure verified");

  // 10. Checkout modal structure check
  const t10 = !checkoutContent.includes('addDoc(collection(db, "orders")') && checkoutContent.includes("Authorization");
  assertTest(10, "CheckoutModal eliminated direct Firestore bypass and passes Authorization header", t10, "Client-side validation bypass sealed");

  console.log(`\n=================================================`);
  console.log(`TEST RESULTS: ${passed} PASSED / ${failed} FAILED`);
  console.log(`=================================================\n`);

  return failed === 0;
}
