import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import nodemailer from "nodemailer";

if (!admin.getApps().length) {
  admin.initializeApp();
}

/**
 * Escapes HTML characters in dynamic user inputs to prevent XSS and template injection.
 */
function escapeHtml(str: any): string {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Sanitizes subject line strings by stripping newline and control characters to prevent header injection.
 */
function sanitizeSubject(str: any): string {
  if (str === null || str === undefined) return "";
  return String(str).replace(/[\r\n\x00-\x1F\x7F]+/g, " ").trim();
}

/**
 * Validates email format safely.
 */
function isValidEmail(email: any): boolean {
  if (!email || typeof email !== "string") return false;
  const clean = email.trim();
  if (clean.length > 254 || clean.length < 5) return false;
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(clean);
}

/**
 * Safe structured logger that never prints credentials or tokens.
 */
function logEmailEvent(event: string, details: Record<string, any>) {
  const safeDetails: Record<string, any> = { ...details };
  delete safeDetails.pass;
  delete safeDetails.password;
  delete safeDetails.SMTP_PASS;
  delete safeDetails.token;
  delete safeDetails.authorization;
  console.log(JSON.stringify({ event, timestamp: new Date().toISOString(), ...safeDetails }));
}

/**
 * Helper to construct Nodemailer transporter using validated environment SMTP settings
 * Enforces standard TLS certificate verification without insecure overrides.
 */
function createTransporter(): nodemailer.Transporter | null {
  const host = (process.env.SMTP_HOST || "").trim();
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = (process.env.SMTP_USER || "").trim();
  const pass = (process.env.SMTP_PASS || "").trim();
  const secure = process.env.SMTP_SECURE === "true" || port === 465;

  if (!host || !user || !pass) {
    logEmailEvent("email.configuration.invalid", {
      reason: "Missing required SMTP environment variables",
      missing: [
        !host ? "SMTP_HOST" : null,
        !user ? "SMTP_USER" : null,
        !pass ? "SMTP_PASS" : null,
      ].filter(Boolean)
    });
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass }
  });
}

/**
 * Helper to build escaped items HTML table rows
 */
function buildItemsHtml(items: any[] = []): string {
  return items
    .map(
      (item: any) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px;">
          <strong>${escapeHtml(item.title)}</strong><br>
          <span style="color: #64748b; font-size: 11px;">Author: ${escapeHtml(item.authorName || "Ethiopian Literature")}</span>
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center; font-size: 13px;">${escapeHtml(item.quantity)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-size: 13px;">${escapeHtml(item.price)} ETB</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold; font-size: 13px;">${escapeHtml(item.total || (Number(item.price) || 0) * (Number(item.quantity) || 1))} ETB</td>
      </tr>
    `
    )
    .join("");
}

/**
 * 1. Firebase Cloud Function triggered automatically when a new document is added
 * to the 'orders' collection in Firestore. Sends new order notification to admin and customer.
 * Includes atomic duplicate prevention and safe HTML escaping.
 */
export const onOrderCreated = onDocumentCreated("orders/{orderId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) {
    return;
  }

  const order = snapshot.data();
  if (!order) return;

  const orderId = order.orderId || event.params.orderId;
  const adminEmail = (process.env.ADMIN_EMAIL || "").trim();
  const customerEmail = (order.customerEmail || "").trim();
  const fromEmail = (process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || "noreply@jjbookstore.com").trim();
  const fromName = process.env.SMTP_FROM_NAME || "JJ Book Store";

  // IDEMPOTENCY GUARD: Check if order creation email was already sent or claimed
  const existingDelivery = order.emailDelivery?.orderCreated;
  if (order.emailNotificationSent || existingDelivery?.status === "sent" || existingDelivery?.status === "sending") {
    logEmailEvent("email.duplicate.prevented", {
      type: "order_created",
      orderId,
      existingStatus: existingDelivery?.status || "sent"
    });
    return;
  }

  const transporter = createTransporter();
  if (!transporter) {
    logEmailEvent("email.send.unavailable", {
      type: "order_created",
      orderId,
      reason: "SMTP not configured"
    });
    return;
  }

  // Atomic claim to prevent concurrent executions from double sending
  const now = new Date().toISOString();
  try {
    await snapshot.ref.update({
      "emailDelivery.orderCreated": {
        status: "sending",
        startedAt: now
      }
    });
  } catch (claimErr) {
    console.warn("Could not claim email delivery lock:", claimErr);
  }

  logEmailEvent("email.send.started", { type: "order_created", orderId });

  const safeCustomerName = escapeHtml(order.customerName);
  const safePhone = escapeHtml(order.customerPhone);
  const safePaymentMethod = escapeHtml(order.paymentMethod);
  const safePaymentRef = escapeHtml(order.paymentReference);
  const safeGrandTotal = escapeHtml(order.grandTotal);
  const safeSubtotal = escapeHtml(order.subtotal);
  const safeTax = escapeHtml(order.tax);
  const itemsListHtml = buildItemsHtml(order.items);

  // Admin Notification Template
  const adminSubject = sanitizeSubject(`🚨 [NEW ORDER] Order #${orderId} - ${order.customerName} (${order.grandTotal} ETB)`);
  const adminHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; color: #1e293b; line-height: 1.5; border: 1px solid #cbd5e1; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: #451a03; color: #fef3c7; padding: 22px; text-align: center;">
        <h1 style="margin: 0; font-size: 22px; color: #fbbf24;">JJ BOOKSTORE ADMIN ALERT</h1>
        <p style="margin: 4px 0 0; font-size: 12px; color: #fde68a;">New Customer Order Placed</p>
      </div>
      
      <div style="padding: 24px;">
        <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
          <h2 style="margin: 0 0 8px; color: #78350f; font-size: 16px;">Order #${escapeHtml(orderId)} Details</h2>
          <p style="margin: 3px 0; font-size: 13px;"><strong>Customer Name:</strong> ${safeCustomerName}</p>
          <p style="margin: 3px 0; font-size: 13px;"><strong>Customer Email:</strong> ${escapeHtml(customerEmail || "N/A")}</p>
          <p style="margin: 3px 0; font-size: 13px;"><strong>Phone Number:</strong> ${safePhone}</p>
          <p style="margin: 3px 0; font-size: 13px;"><strong>Payment Method:</strong> <span style="text-transform: uppercase; font-weight: bold;">${safePaymentMethod}</span></p>
          ${safePaymentRef ? `<p style="margin: 3px 0; font-size: 13px; color: #b45309;"><strong>Payment Ref #:</strong> ${safePaymentRef}</p>` : ""}
        </div>

        <h3 style="color: #0f172a; font-size: 14px; text-transform: uppercase; margin-bottom: 10px;">Ordered Items</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #f1f5f9; text-align: left; font-size: 11px; color: #475569; text-transform: uppercase;">
              <th style="padding: 8px 10px;">Book</th>
              <th style="padding: 8px 10px; text-align: center;">Qty</th>
              <th style="padding: 8px 10px; text-align: right;">Price</th>
              <th style="padding: 8px 10px; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsListHtml}
          </tbody>
        </table>

        <div style="border-top: 2px solid #e2e8f0; padding-top: 12px; text-align: right; font-size: 13px;">
          <p style="margin: 3px 0; color: #64748b;">Subtotal: ${safeSubtotal} ETB</p>
          <p style="margin: 3px 0; color: #64748b;">15% VAT: ${safeTax} ETB</p>
          <h3 style="margin: 8px 0 0; color: #78350f; font-size: 18px;">Grand Total: ${safeGrandTotal} ETB</h3>
        </div>
      </div>
    </div>
  `;

  // Customer Confirmation Template
  const customerSubject = sanitizeSubject(`📚 [JJ Bookstore] Order #${orderId} Confirmation`);
  const customerHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; color: #1e293b; line-height: 1.5; border: 1px solid #cbd5e1; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: #451a03; color: #fef3c7; padding: 22px; text-align: center;">
        <h1 style="margin: 0; font-size: 22px; color: #fbbf24;">JJ BOOKSTORE</h1>
        <p style="margin: 4px 0 0; font-size: 12px; color: #fde68a;">Thank You For Your Order!</p>
      </div>
      
      <div style="padding: 24px;">
        <p style="font-size: 14px; margin-bottom: 16px;">Dear <strong>${safeCustomerName}</strong>,</p>
        <p style="font-size: 13px; color: #334155;">We have successfully received your order <strong>#${escapeHtml(orderId)}</strong>. Our team is processing your payment and preparing your books for dispatch.</p>

        <table style="width: 100%; border-collapse: collapse; margin-top: 20px; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #f1f5f9; text-align: left; font-size: 11px; color: #475569; text-transform: uppercase;">
              <th style="padding: 8px 10px;">Book Title</th>
              <th style="padding: 8px 10px; text-align: center;">Qty</th>
              <th style="padding: 8px 10px; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsListHtml}
          </tbody>
        </table>

        <div style="border-top: 2px solid #e2e8f0; padding-top: 12px; text-align: right; font-size: 13px;">
          <h3 style="margin: 4px 0; color: #b45309; font-size: 18px;">Total Payable: ${safeGrandTotal} ETB</h3>
        </div>
      </div>
    </div>
  `;

  let adminSent = false;
  let customerSent = false;

  try {
    // Send to Admin
    if (isValidEmail(adminEmail)) {
      await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: adminEmail,
        subject: adminSubject,
        html: adminHtml,
      });
      adminSent = true;
    }

    // Send to Customer
    if (isValidEmail(customerEmail) && customerEmail.toLowerCase() !== adminEmail.toLowerCase()) {
      await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: customerEmail,
        subject: customerSubject,
        html: customerHtml,
      });
      customerSent = true;
    }

    const sentTimestamp = new Date().toISOString();
    await snapshot.ref.update({
      emailNotificationSent: true,
      emailNotifiedAt: sentTimestamp,
      "emailDelivery.orderCreated": {
        status: "sent",
        adminSent,
        customerSent,
        sentAt: sentTimestamp
      }
    });

    logEmailEvent("email.send.success", {
      type: "order_created",
      orderId,
      adminSent,
      customerSent
    });
  } catch (error: any) {
    logEmailEvent("email.send.failed", {
      type: "order_created",
      orderId,
      error: error?.message || "Failed to dispatch order created email"
    });

    try {
      await snapshot.ref.update({
        "emailDelivery.orderCreated": {
          status: "failed",
          failedAt: new Date().toISOString(),
          error: error?.message || "Send failed"
        }
      });
    } catch (e) {}
  }
});

/**
 * 2. Firebase Cloud Function triggered automatically when an order document is updated
 * in the 'orders' collection. Dispatches payment verification or rejection alerts.
 * Includes atomic duplicate prevention and safe HTML escaping.
 */
export const onOrderStatusUpdated = onDocumentUpdated("orders/{orderId}", async (event) => {
  const change = event.data;
  if (!change) {
    return;
  }

  const before = change.before.data();
  const after = change.after.data();

  if (!before || !after) return;

  const prevStatus = (before.orderStatus || "").toLowerCase();
  const currStatus = (after.orderStatus || "").toLowerCase();
  const prevVerified = !!before.isReceiptVerified;
  const currVerified = !!after.isReceiptVerified;

  const isNewlyVerified =
    (currStatus === "confirmed" || currStatus === "verified" || currVerified) &&
    !(prevStatus === "confirmed" || prevStatus === "verified" || prevVerified);

  const isNewlyRejected =
    (currStatus === "cancelled" || currStatus === "rejected") &&
    !(prevStatus === "cancelled" || prevStatus === "rejected");

  if (!isNewlyVerified && !isNewlyRejected) {
    return;
  }

  const customerEmail = (after.customerEmail || "").trim();
  if (!isValidEmail(customerEmail)) {
    logEmailEvent("email.send.skipped", {
      reason: "Invalid recipient customer email",
      orderId: after.orderId || event.params.orderId
    });
    return;
  }

  const eventType = isNewlyVerified ? "payment_verified" : "payment_rejected";
  const existingStatus = isNewlyVerified
    ? (after.verifiedEmailSent || after.emailDelivery?.paymentVerified?.status === "sent")
    : (after.rejectedEmailSent || after.emailDelivery?.paymentRejected?.status === "sent");

  if (existingStatus) {
    logEmailEvent("email.duplicate.prevented", {
      type: eventType,
      orderId: after.orderId || event.params.orderId
    });
    return;
  }

  const transporter = createTransporter();
  if (!transporter) {
    logEmailEvent("email.send.unavailable", {
      type: eventType,
      orderId: after.orderId || event.params.orderId,
      reason: "SMTP not configured"
    });
    return;
  }

  const fromEmail = (process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || "noreply@jjbookstore.com").trim();
  const fromName = process.env.SMTP_FROM_NAME || "JJ Book Store";
  const orderId = after.orderId || event.params.orderId;
  const verifierName = after.verifiedByEmployeeName || after.lastActionByEmployeeName || "Store Verification Staff";
  const receiptNum = after.verifiedReceiptNumber || after.paymentReference || "N/A";
  const itemsListHtml = buildItemsHtml(after.items);

  logEmailEvent("email.send.started", { type: eventType, orderId });

  if (isNewlyVerified) {
    const verifiedSubject = sanitizeSubject(`✅ [JJ Bookstore] Order #${orderId} Payment Verified & Order Confirmed!`);
    const verifiedHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; color: #1e293b; line-height: 1.5; border: 1px solid #cbd5e1; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
        <div style="background-color: #064e3b; color: #ecfdf5; padding: 22px; text-align: center;">
          <h1 style="margin: 0; font-size: 22px; color: #34d399;">JJ BOOKSTORE</h1>
          <p style="margin: 4px 0 0; font-size: 13px; color: #a7f3d0;">Payment Verified & Order Confirmed</p>
        </div>
        
        <div style="padding: 24px;">
          <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
            <h2 style="margin: 0 0 6px; font-size: 16px; color: #065f46;">
              ✅ Payment Verification Successful
            </h2>
            <p style="margin: 0; font-size: 13px; color: #047857; line-height: 1.5;">
              Dear <strong>${escapeHtml(after.customerName)}</strong>, your payment for order <strong>#${escapeHtml(orderId)}</strong> has been successfully verified by our staff (<strong>${escapeHtml(verifierName)}</strong>).
            </p>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <tr style="background-color: #f8fafc;">
              <td style="padding: 10px 14px; color: #64748b;">Order Number:</td>
              <td style="padding: 10px 14px; font-weight: bold; color: #0f172a; text-align: right;">#${escapeHtml(orderId)}</td>
            </tr>
            <tr>
              <td style="padding: 10px 14px; color: #64748b;">Transaction Reference #:</td>
              <td style="padding: 10px 14px; font-weight: bold; font-family: monospace; color: #047857; text-align: right;">${escapeHtml(receiptNum)}</td>
            </tr>
            <tr style="background-color: #f8fafc;">
              <td style="padding: 10px 14px; color: #64748b;">Payment Status:</td>
              <td style="padding: 10px 14px; font-weight: bold; color: #059669; text-align: right;">VERIFIED & PAID</td>
            </tr>
            <tr>
              <td style="padding: 10px 14px; color: #64748b;">Total Amount:</td>
              <td style="padding: 10px 14px; font-weight: bold; color: #0f172a; text-align: right;">${escapeHtml(after.grandTotal)} ETB</td>
            </tr>
          </table>

          <h3 style="color: #0f172a; font-size: 14px; text-transform: uppercase; margin-bottom: 10px;">Ordered Books</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background-color: #f1f5f9; text-align: left; font-size: 11px; color: #475569; text-transform: uppercase;">
                <th style="padding: 8px 10px;">Book Title</th>
                <th style="padding: 8px 10px; text-align: center;">Qty</th>
                <th style="padding: 8px 10px; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsListHtml}
            </tbody>
          </table>

          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px; font-size: 13px; color: #166534;">
            <strong>Next Step:</strong> Our warehouse staff is now packaging your books. You will receive delivery updates as your package is dispatched!
          </div>
        </div>
      </div>
    `;

    try {
      await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: customerEmail,
        subject: verifiedSubject,
        html: verifiedHtml,
      });

      const sentTime = new Date().toISOString();
      await change.after.ref.update({
        verifiedEmailSent: true,
        verifiedEmailSentAt: sentTime,
        "emailDelivery.paymentVerified": {
          status: "sent",
          sentAt: sentTime
        }
      });

      logEmailEvent("email.send.success", { type: "payment_verified", orderId });
    } catch (err: any) {
      logEmailEvent("email.send.failed", { type: "payment_verified", orderId, error: err?.message });
    }
  } else if (isNewlyRejected) {
    const rejectionReason = after.notes || after.verificationIssue || "Incorrect or missing transaction reference code.";
    const rejectedSubject = sanitizeSubject(`⚠️ [JJ Bookstore] Payment Verification Alert for Order #${orderId}`);
    const rejectedHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; color: #1e293b; line-height: 1.5; border: 1px solid #cbd5e1; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
        <div style="background-color: #7f1d1d; color: #fef2f2; padding: 22px; text-align: center;">
          <h1 style="margin: 0; font-size: 22px; color: #fca5a5;">JJ BOOKSTORE</h1>
          <p style="margin: 4px 0 0; font-size: 13px; color: #fecaca;">Payment Verification Issue</p>
        </div>
        
        <div style="padding: 24px;">
          <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
            <h2 style="margin: 0 0 6px; font-size: 16px; color: #991b1b; font-weight: bold;">
              ⚠️ Incorrect or Missing Transaction Reference
            </h2>
            <p style="margin: 0; font-size: 13px; color: #b91c1c; line-height: 1.5;">
              Dear <strong>${escapeHtml(after.customerName)}</strong>, our staff (${escapeHtml(verifierName)}) checked your order <strong>#${escapeHtml(orderId)}</strong> and found that the transaction reference provided is incorrect or does not match bank logs.
            </p>
          </div>

          <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 16px; margin-bottom: 20px; font-size: 13px; color: #78350f; line-height: 1.6;">
            <p style="margin: 0 0 8px; font-weight: bold; font-size: 14px; color: #92400e;">
              📞 Action Required to Confirm Your Order:
            </p>
            <p style="margin: 0 0 8px;">
              Please contact our customer support team directly by calling or messaging:
            </p>
            <p style="margin: 4px 0 8px; font-size: 15px; font-weight: bold; color: #b45309; font-family: monospace;">
              📱 +251 911 234 567 / +251 922 345 678
            </p>
            <p style="margin: 0;">
              Or reply with the official payment transfer <strong>screenshot from Telebirr, CBE Birr, or Bank App</strong> to confirm your payment.
            </p>
          </div>

          <div style="background-color: #f8fafc; border-left: 4px solid #ef4444; border-radius: 4px; padding: 14px; margin-bottom: 20px; font-size: 13px;">
            <strong style="color: #0f172a; display: block; margin-bottom: 4px;">Staff Note:</strong>
            <span style="color: #475569; font-style: italic;">"${escapeHtml(rejectionReason)}"</span>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <tr style="background-color: #f8fafc;">
              <td style="padding: 10px 14px; color: #64748b;">Order Number:</td>
              <td style="padding: 10px 14px; font-weight: bold; color: #0f172a; text-align: right;">#${escapeHtml(orderId)}</td>
            </tr>
            <tr>
              <td style="padding: 10px 14px; color: #64748b;">Order Status:</td>
              <td style="padding: 10px 14px; font-weight: bold; color: #dc2626; text-align: right;">ACTION REQUIRED / UNVERIFIED</td>
            </tr>
            <tr style="background-color: #f8fafc;">
              <td style="padding: 10px 14px; color: #64748b;">Total Amount:</td>
              <td style="padding: 10px 14px; font-weight: bold; color: #0f172a; text-align: right;">${escapeHtml(after.grandTotal)} ETB</td>
            </tr>
          </table>
        </div>
      </div>
    `;

    try {
      await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: customerEmail,
        subject: rejectedSubject,
        html: rejectedHtml,
      });

      const sentTime = new Date().toISOString();
      await change.after.ref.update({
        rejectedEmailSent: true,
        rejectedEmailSentAt: sentTime,
        "emailDelivery.paymentRejected": {
          status: "sent",
          sentAt: sentTime
        }
      });

      logEmailEvent("email.send.success", { type: "payment_rejected", orderId });
    } catch (err: any) {
      logEmailEvent("email.send.failed", { type: "payment_rejected", orderId, error: err?.message });
    }
  }
});
