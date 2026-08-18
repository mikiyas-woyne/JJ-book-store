import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import nodemailer from "nodemailer";

if (!admin.getApps().length) {
  admin.initializeApp();
}

/**
 * Helper to construct Nodemailer transporter using environment SMTP settings
 */
function createTransporter() {
  const adminEmail = process.env.ADMIN_EMAIL || "mikiyaswoyne@gmail.com";
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true" || Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER || adminEmail,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false
    }
  });
}

/**
 * Helper to build items HTML table rows
 */
function buildItemsHtml(items: any[] = []): string {
  return items
    .map(
      (item: any) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px;">
          <strong>${item.title}</strong><br>
          <span style="color: #64748b; font-size: 11px;">Author: ${item.authorName || "Ethiopian Literature"}</span>
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center; font-size: 13px;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-size: 13px;">${item.price} ETB</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold; font-size: 13px;">${item.total || item.price * item.quantity} ETB</td>
      </tr>
    `
    )
    .join("");
}

/**
 * 1. Firebase Cloud Function triggered automatically when a new document is added
 * to the 'orders' collection in Firestore. Sends new order notification to admin and customer.
 */
export const onOrderCreated = onDocumentCreated("orders/{orderId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) {
    console.log("No order snapshot found");
    return;
  }

  const order = snapshot.data();
  if (!order) return;

  const adminEmail = process.env.ADMIN_EMAIL || "mikiyaswoyne@gmail.com";
  const customerEmail = (order.customerEmail || "").trim();
  const transporter = createTransporter();
  const itemsListHtml = buildItemsHtml(order.items);

  // Admin Notification Template
  const adminSubject = `🚨 [NEW ORDER] Order #${order.orderId || event.params.orderId} - ${order.customerName} (${order.grandTotal} ETB)`;
  const adminHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; color: #1e293b; line-height: 1.5; border: 1px solid #cbd5e1; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: #451a03; color: #fef3c7; padding: 22px; text-align: center;">
        <h1 style="margin: 0; font-size: 22px; color: #fbbf24;">JJ BOOKSTORE ADMIN ALERT</h1>
        <p style="margin: 4px 0 0; font-size: 12px; color: #fde68a;">New Customer Order Placed in Firestore</p>
      </div>
      
      <div style="padding: 24px;">
        <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
          <h2 style="margin: 0 0 8px; color: #78350f; font-size: 16px;">Order #${order.orderId || event.params.orderId} Details</h2>
          <p style="margin: 3px 0; font-size: 13px;"><strong>Customer Name:</strong> ${order.customerName}</p>
          <p style="margin: 3px 0; font-size: 13px;"><strong>Customer Email:</strong> ${customerEmail || "N/A"}</p>
          <p style="margin: 3px 0; font-size: 13px;"><strong>Phone Number:</strong> ${order.customerPhone}</p>
          <p style="margin: 3px 0; font-size: 13px;"><strong>Payment Method:</strong> <span style="text-transform: uppercase; font-weight: bold;">${order.paymentMethod}</span></p>
          ${order.paymentReference ? `<p style="margin: 3px 0; font-size: 13px; color: #b45309;"><strong>Payment Ref #:</strong> ${order.paymentReference}</p>` : ""}
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
          <p style="margin: 3px 0; color: #64748b;">Subtotal: ${order.subtotal} ETB</p>
          <p style="margin: 3px 0; color: #64748b;">15% VAT: ${order.tax} ETB</p>
          <h3 style="margin: 8px 0 0; color: #78350f; font-size: 18px;">Grand Total: ${order.grandTotal} ETB</h3>
        </div>
      </div>
    </div>
  `;

  // Customer Confirmation Template
  const customerSubject = `📚 [JJ Bookstore] Order #${order.orderId || event.params.orderId} Confirmation`;
  const customerHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; color: #1e293b; line-height: 1.5; border: 1px solid #cbd5e1; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: #451a03; color: #fef3c7; padding: 22px; text-align: center;">
        <h1 style="margin: 0; font-size: 22px; color: #fbbf24;">JJ BOOKSTORE</h1>
        <p style="margin: 4px 0 0; font-size: 12px; color: #fde68a;">Thank You For Your Order!</p>
      </div>
      
      <div style="padding: 24px;">
        <p style="font-size: 14px; margin-bottom: 16px;">Dear <strong>${order.customerName}</strong>,</p>
        <p style="font-size: 13px; color: #334155;">We have successfully received your order <strong>#${order.orderId || event.params.orderId}</strong>. Our team is processing your payment and preparing your books for dispatch.</p>

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
          <h3 style="margin: 4px 0; color: #b45309; font-size: 18px;">Total Paid / Payable: ${order.grandTotal} ETB</h3>
        </div>
      </div>
    </div>
  `;

  try {
    // Send to Admin
    await transporter.sendMail({
      from: `"JJ Book Shopping" <noreply@jjbookshopping.com>`,
      to: adminEmail,
      subject: adminSubject,
      html: adminHtml,
    });
    console.log(`[Cloud Function] Admin email sent to ${adminEmail} for order ${event.params.orderId}`);

    // Send to Customer
    if (customerEmail && customerEmail.toLowerCase() !== adminEmail.toLowerCase()) {
      await transporter.sendMail({
        from: `"JJ Book Shopping" <noreply@jjbookshopping.com>`,
        to: customerEmail,
        subject: customerSubject,
        html: customerHtml,
      });
      console.log(`[Cloud Function] Customer email sent to ${customerEmail} for order ${event.params.orderId}`);
    }

    await snapshot.ref.update({
      emailNotificationSent: true,
      emailNotifiedAt: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("[Cloud Function Error] Failed to send onOrderCreated emails:", error);
  }
});

/**
 * 2. Firebase Cloud Function triggered automatically when an order document is updated
 * in the 'orders' collection. Using Nodemailer, it checks if an order's status changes
 * to 'Verified' ('confirmed') or 'Rejected' ('cancelled'), and dispatches the corresponding
 * confirmation or rejection email to the customer's email address.
 */
export const onOrderStatusUpdated = onDocumentUpdated("orders/{orderId}", async (event) => {
  const change = event.data;
  if (!change) {
    console.log("No document change snapshot found");
    return;
  }

  const before = change.before.data();
  const after = change.after.data();

  if (!before || !after) return;

  const prevStatus = (before.orderStatus || "").toLowerCase();
  const currStatus = (after.orderStatus || "").toLowerCase();

  const prevVerified = !!before.isReceiptVerified;
  const currVerified = !!after.isReceiptVerified;

  // Determine if status transition matches Verified or Rejected
  const isNewlyVerified =
    (currStatus === "confirmed" || currStatus === "verified" || currVerified) &&
    !(prevStatus === "confirmed" || prevStatus === "verified" || prevVerified);

  const isNewlyRejected =
    (currStatus === "cancelled" || currStatus === "rejected") &&
    !(prevStatus === "cancelled" || prevStatus === "rejected");

  if (!isNewlyVerified && !isNewlyRejected) {
    console.log(`[Cloud Function] No status transition to Verified or Rejected for order ${event.params.orderId}. (Before: ${prevStatus}, After: ${currStatus})`);
    return;
  }

  const customerEmail = (after.customerEmail || "").trim();
  if (!customerEmail) {
    console.log(`[Cloud Function] No customer email provided for order ${event.params.orderId}`);
    return;
  }

  const transporter = createTransporter();
  const orderId = after.orderId || event.params.orderId;
  const verifierName = after.verifiedByEmployeeName || after.lastActionByEmployeeName || "Store Verification Staff";
  const receiptNum = after.verifiedReceiptNumber || after.paymentReference || "N/A";
  const itemsListHtml = buildItemsHtml(after.items);

  if (isNewlyVerified) {
    // Verified / Confirmed Email Template
    const verifiedSubject = `✅ [JJ Bookstore] Order #${orderId} Payment Verified & Order Confirmed!`;
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
              Dear <strong>${after.customerName}</strong>, your payment for order <strong>#${orderId}</strong> has been successfully verified by our staff (<strong>${verifierName}</strong>).
            </p>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <tr style="background-color: #f8fafc;">
              <td style="padding: 10px 14px; color: #64748b;">Order Number:</td>
              <td style="padding: 10px 14px; font-weight: bold; color: #0f172a; text-align: right;">#${orderId}</td>
            </tr>
            <tr>
              <td style="padding: 10px 14px; color: #64748b;">Transaction Reference #:</td>
              <td style="padding: 10px 14px; font-weight: bold; font-family: monospace; color: #047857; text-align: right;">${receiptNum}</td>
            </tr>
            <tr style="background-color: #f8fafc;">
              <td style="padding: 10px 14px; color: #64748b;">Payment Status:</td>
              <td style="padding: 10px 14px; font-weight: bold; color: #059669; text-align: right;">VERIFIED & PAID</td>
            </tr>
            <tr>
              <td style="padding: 10px 14px; color: #64748b;">Total Amount:</td>
              <td style="padding: 10px 14px; font-weight: bold; color: #0f172a; text-align: right;">${after.grandTotal} ETB</td>
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
        from: `"JJ Book Shopping" <noreply@jjbookshopping.com>`,
        to: customerEmail,
        subject: verifiedSubject,
        html: verifiedHtml,
      });
      console.log(`[Cloud Function] Verification confirmation email sent to ${customerEmail} for order ${orderId}`);

      await change.after.ref.update({
        verifiedEmailSent: true,
        verifiedEmailSentAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("[Cloud Function Error] Failed to send verified email:", err);
    }
  } else if (isNewlyRejected) {
    // Rejected Email Template
    const rejectionReason = after.notes || after.verificationIssue || "Incorrect or missing transaction reference code.";
    const rejectedSubject = `⚠️ [JJ Bookstore] Payment Verification Alert for Order #${orderId}`;
    const rejectedHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; color: #1e293b; line-height: 1.5; border: 1px solid #cbd5e1; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
        <div style="background-color: #7f1d1d; color: #fef2f2; padding: 22px; text-align: center;">
          <h1 style="margin: 0; font-size: 22px; color: #fca5a5;">JJ BOOKSTORE</h1>
          <p style="margin: 4px 0 0; font-size: 13px; color: #fecaca;">Payment Verification Issue</p>
        </div>
        
        <div style="padding: 24px;">
          <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
            <h2 style="margin: 0 0 6px; font-size: 16px; color: #991b1b; font-weight: bold;">
              ⚠️ Incorrect or Unverified Transaction Reference
            </h2>
            <p style="margin: 0; font-size: 13px; color: #b91c1c; line-height: 1.5;">
              Dear <strong>${after.customerName}</strong>, our staff (${verifierName}) checked your order <strong>#${orderId}</strong> and found that the transaction reference provided is incorrect or does not match bank logs.
            </p>
          </div>

          <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 16px; margin-bottom: 20px; font-size: 13px; color: #78350f; line-height: 1.6;">
            <p style="margin: 0 0 8px; font-weight: bold; font-size: 14px; color: #92400e;">
              📞 Action Required to Confirm Your Order:
            </p>
            <p style="margin: 0 0 8px;">
              Please contact our customer support directly by calling or messaging:
            </p>
            <p style="margin: 4px 0 8px; font-size: 15px; font-weight: bold; color: #b45309; font-family: monospace;">
              📱 +251 911 234 567 / +251 922 345 678
            </p>
            <p style="margin: 0;">
              Or upload / email the official payment transfer <strong>screenshot from Telebirr or Bank App (CBE / BOA / Awash)</strong> to confirm your payment and dispatch your books.
            </p>
          </div>

          <div style="background-color: #f8fafc; border-left: 4px solid #ef4444; border-radius: 4px; padding: 14px; margin-bottom: 20px; font-size: 13px;">
            <strong style="color: #0f172a; display: block; margin-bottom: 4px;">Staff Note:</strong>
            <span style="color: #475569; font-style: italic;">"${rejectionReason}"</span>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <tr style="background-color: #f8fafc;">
              <td style="padding: 10px 14px; color: #64748b;">Order Number:</td>
              <td style="padding: 10px 14px; font-weight: bold; color: #0f172a; text-align: right;">#${orderId}</td>
            </tr>
            <tr>
              <td style="padding: 10px 14px; color: #64748b;">Order Status:</td>
              <td style="padding: 10px 14px; font-weight: bold; color: #dc2626; text-align: right;">ACTION REQUIRED / UNVERIFIED</td>
            </tr>
            <tr style="background-color: #f8fafc;">
              <td style="padding: 10px 14px; color: #64748b;">Total Amount:</td>
              <td style="padding: 10px 14px; font-weight: bold; color: #0f172a; text-align: right;">${after.grandTotal} ETB</td>
            </tr>
          </table>
        </div>
      </div>
    `;

    try {
      await transporter.sendMail({
        from: `"JJ Book Shopping" <noreply@jjbookshopping.com>`,
        to: customerEmail,
        subject: rejectedSubject,
        html: rejectedHtml,
      });
      console.log(`[Cloud Function] Rejection alert email sent to ${customerEmail} for order ${orderId}`);

      await change.after.ref.update({
        rejectedEmailSent: true,
        rejectedEmailSentAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("[Cloud Function Error] Failed to send rejection email:", err);
    }
  }
});
