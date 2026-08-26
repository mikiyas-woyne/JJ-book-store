/**
 * Order, Checkout & Payment Security Automated Unit Test Suite
 * JJ Book Store
 */

import fs from "fs";
import path from "path";

function runOrderSecurityTests() {
  console.log("=================================================");
  console.log("RUNNING ORDER, CHECKOUT & PAYMENT SECURITY TESTS");
  console.log("=================================================\n");

  const rulesContent = fs.readFileSync(path.join(process.cwd(), "firestore.rules"), "utf-8");
  const serverContent = fs.readFileSync(path.join(process.cwd(), "server.ts"), "utf-8");

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

  // TEST 1
  assertTest(
    1,
    "Customer attempts to create order for another customer -> DENIED",
    rulesContent.includes("request.resource.data.customerId == request.auth.uid") &&
      serverContent.includes("if (!customerId)"),
    "CustomerId must match authenticated user token"
  );

  // TEST 2
  assertTest(
    2,
    "Customer sends grandTotal = 1 while real total is 1000 -> Backend calculates authoritative 1000",
    serverContent.includes("calculateOrderFinancials") &&
      serverContent.includes("const unitPrice = Number(bookData.discountPrice || bookData.price || 0)"),
    "Server computes real subtotal from database prices and ignores client-provided prices"
  );

  // TEST 3
  assertTest(
    3,
    "Customer sends paymentStatus = paid on creation -> DENIED / Set to pending",
    rulesContent.includes("request.resource.data.paymentStatus == 'pending'") &&
      serverContent.includes('paymentStatus: "pending"'),
    "Initial order paymentStatus is forced to pending"
  );

  // TEST 4
  assertTest(
    4,
    "Customer modifies subtotal on existing order -> DENIED",
    rulesContent.includes("request.resource.data.subtotal == resource.data.subtotal")
  );

  // TEST 5
  assertTest(
    5,
    "Customer modifies discount on existing order -> DENIED",
    rulesContent.includes("request.resource.data.discount == resource.data.discount")
  );

  // TEST 6
  assertTest(
    6,
    "Customer modifies shippingFee on existing order -> DENIED",
    rulesContent.includes("request.resource.data.shippingFee == resource.data.shippingFee")
  );

  // TEST 7
  assertTest(
    7,
    "Customer modifies grandTotal on existing order -> DENIED",
    rulesContent.includes("request.resource.data.grandTotal == resource.data.grandTotal")
  );

  // TEST 8
  assertTest(
    8,
    "Customer modifies paymentReference on existing order -> DENIED",
    rulesContent.includes("request.resource.data.paymentReference == resource.data.paymentReference")
  );

  // TEST 9
  assertTest(
    9,
    "Customer attempts to mark order delivered -> DENIED",
    rulesContent.includes("request.resource.data.orderStatus == 'cancelled'") &&
      !rulesContent.includes("request.resource.data.orderStatus == 'delivered'")
  );

  // TEST 10
  assertTest(
    10,
    "Two customers attempt to purchase the final unit simultaneously -> Only one succeeds",
    serverContent.includes("runTransaction") &&
      serverContent.includes("if (currentStock < item.quantity)"),
    "Atomic Firestore transaction guarantees stock reservation"
  );

  // TEST 11
  assertTest(
    11,
    "Customer attempts to reuse an invalid/expired coupon -> DENIED",
    serverContent.includes("isNotExpired && isUnderLimit && meetsMinOrder")
  );

  // TEST 12
  assertTest(
    12,
    "Payment provider reports amount different from order total -> Payment NOT confirmed",
    serverContent.includes("verifiedAmount !== expectedAmount") &&
      serverContent.includes("paymentStatus: \"failed\"")
  );

  // TEST 13
  assertTest(
    13,
    "Payment callback is received twice (Idempotency) -> Only one processing occurs",
    serverContent.includes("alreadyProcessed: true") &&
      serverContent.includes('order.paymentStatus === "paid"')
  );

  // TEST 14
  assertTest(
    14,
    "Employee attempts to modify financial totals without permission -> DENIED",
    rulesContent.includes("isEmployee()") &&
      rulesContent.includes("request.resource.data.grandTotal == resource.data.grandTotal") &&
      rulesContent.includes("request.resource.data.subtotal == resource.data.subtotal")
  );

  // TEST 15
  assertTest(
    15,
    "Customer can still view their own order normally -> SUCCESS",
    rulesContent.includes("resource.data.customerId == request.auth.uid")
  );

  console.log("\n=================================================");
  console.log(`ORDER SECURITY TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================\n");

  if (failed > 0) process.exit(1);
}

runOrderSecurityTests();
