import { doc, collection, addDoc } from "firebase/firestore";
import { db, cleanFirestoreData, auth } from "./firebase";
import { Order, EmailNotificationLog } from "../types";

/**
 * Escapes HTML characters in dynamic user inputs to prevent XSS and template injection.
 */
export function escapeHtml(str: any): string {
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
export function sanitizeSubject(str: any): string {
  if (str === null || str === undefined) return "";
  return String(str).replace(/[\r\n\x00-\x1F\x7F]+/g, " ").trim();
}

/**
 * Validates whether an email string matches a basic RFC-compliant format.
 */
export function isValidEmail(email: any): boolean {
  if (!email || typeof email !== "string") return false;
  const clean = email.trim();
  if (clean.length > 254 || clean.length < 5) return false;
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(clean);
}

/**
 * Generates styled HTML email templates for JJ Bookstore order verifications with full HTML escaping.
 */
export function generateOrderApprovalEmailHtml(
  order: Order,
  verifiedByEmployeeName: string,
  receiptNumber: string,
  note?: string
): { subject: string; htmlBody: string } {
  const safeOrderId = escapeHtml(order.orderId);
  const safeCustomerName = escapeHtml(order.customerName);
  const safeVerifierName = escapeHtml(verifiedByEmployeeName);
  const safeReceiptNumber = escapeHtml(receiptNumber);
  const safePaymentMethod = escapeHtml(order.paymentMethod);
  const safeNote = note ? escapeHtml(note) : "";
  const safeGrandTotal = escapeHtml(order.grandTotal);
  const safeSubcity = escapeHtml(order.shippingAddress?.subcity || "");
  const safeStreet = escapeHtml(order.shippingAddress?.streetAddress || "");
  const safeCity = escapeHtml(order.shippingAddress?.city || "Addis Ababa");
  const safePhone = escapeHtml(order.shippingAddress?.phone || order.customerPhone || "");

  const subject = sanitizeSubject(`✅ [JJ Bookstore] Order #${order.orderId} Verified & Approved!`);

  const itemsHtml = (order.items || [])
    .map(
      (item) => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #1e293b;">
            <strong>${escapeHtml(item.title)}</strong><br/>
            <span style="font-size: 11px; color: #64748b;">Author: ${escapeHtml(item.authorName || "")}</span>
          </td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; text-align: center; color: #1e293b;">
            ${escapeHtml(item.quantity)}
          </td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; text-align: right; color: #1e293b; font-weight: bold;">
            ${escapeHtml(item.total || item.price * item.quantity)} ETB
          </td>
        </tr>
      `
    )
    .join("");

  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8"/>
      <title>Order Verified</title>
    </head>
    <body style="font-family: Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #334155;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
        
        <!-- Header -->
        <div style="background-color: #451a03; padding: 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 22px; font-weight: bold; color: #fbbf24;">JJ BOOKSTORE</h1>
          <p style="margin: 4px 0 0; font-size: 12px; color: #fde68a; letter-spacing: 1px;">ETHIOPIA'S PREMIER ONLINE BOOKSTORE</p>
        </div>

        <!-- Body Content -->
        <div style="padding: 24px;">
          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
            <h2 style="margin: 0 0 6px; font-size: 16px; color: #166534; font-weight: bold;">
              🎉 Payment Verified & Order Confirmed!
            </h2>
            <p style="margin: 0; font-size: 13px; color: #15803d; line-height: 1.5;">
              Dear <strong>${safeCustomerName}</strong>, your order <strong>${safeOrderId}</strong> payment receipt has been successfully verified by our staff (${safeVerifierName}). Your books are now being packed for delivery.
            </p>
          </div>

          <!-- Order Summary Details -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; background-color: #f8fafc; border-radius: 8px; font-size: 13px;">
            <tr>
              <td style="padding: 10px 14px; color: #64748b;">Order Number:</td>
              <td style="padding: 10px 14px; font-weight: bold; color: #0f172a; text-align: right;">${safeOrderId}</td>
            </tr>
            <tr>
              <td style="padding: 10px 14px; color: #64748b;">Verified Receipt #:</td>
              <td style="padding: 10px 14px; font-weight: bold; color: #d97706; text-align: right;">${safeReceiptNumber}</td>
            </tr>
            <tr>
              <td style="padding: 10px 14px; color: #64748b;">Payment Method:</td>
              <td style="padding: 10px 14px; font-weight: bold; color: #0f172a; text-align: right; text-transform: uppercase;">${safePaymentMethod}</td>
            </tr>
            <tr>
              <td style="padding: 10px 14px; color: #64748b;">Verified By Staff:</td>
              <td style="padding: 10px 14px; font-weight: bold; color: #0f172a; text-align: right;">${safeVerifierName}</td>
            </tr>
            ${safeNote ? `
            <tr>
              <td style="padding: 10px 14px; color: #64748b;">Staff Verification Note:</td>
              <td style="padding: 10px 14px; font-style: italic; color: #334155; text-align: right;">"${safeNote}"</td>
            </tr>
            ` : ""}
          </table>

          <!-- Items Table -->
          <h3 style="font-size: 14px; margin: 0 0 10px; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">Ordered Books</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background-color: #f1f5f9; text-align: left; font-size: 11px; color: #475569; text-transform: uppercase;">
                <th style="padding: 8px 10px;">Item</th>
                <th style="padding: 8px 10px; text-align: center;">Qty</th>
                <th style="padding: 8px 10px; text-align: right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2" style="padding: 12px 10px; font-size: 14px; font-weight: bold; color: #0f172a; text-align: right;">Grand Total:</td>
                <td style="padding: 12px 10px; font-size: 16px; font-weight: 800; color: #b45309; text-align: right;">${safeGrandTotal} ETB</td>
              </tr>
            </tfoot>
          </table>

          <!-- Delivery Address -->
          <div style="background-color: #f8fafc; border-radius: 8px; padding: 14px; margin-bottom: 20px; font-size: 12px;">
            <strong style="color: #0f172a; display: block; margin-bottom: 4px;">📍 Shipping Address:</strong>
            <span style="color: #475569;">
              ${safeSubcity ? `${safeSubcity}, ` : ""}${safeStreet ? `${safeStreet}, ` : ""}${safeCity}<br/>
              Phone: <strong>${safePhone}</strong>
            </span>
          </div>

          <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin: 0;">
            Thank you for purchasing with JJ Bookstore! If you have any questions regarding your delivery, please contact our support team.
          </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
          © ${new Date().getFullYear()} JJ Bookstore. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, htmlBody };
}

export function generateOrderRejectionEmailHtml(
  order: Order,
  verifiedByEmployeeName: string,
  reasonNote?: string
): { subject: string; htmlBody: string } {
  const safeOrderId = escapeHtml(order.orderId);
  const safeCustomerName = escapeHtml(order.customerName);
  const safeVerifierName = escapeHtml(verifiedByEmployeeName);
  const safeReasonNote = reasonNote ? escapeHtml(reasonNote) : "Incorrect or unverified payment reference code.";
  const safeGrandTotal = escapeHtml(order.grandTotal);

  const subject = sanitizeSubject(`⚠️ [JJ Bookstore] Payment Verification Alert for Order #${order.orderId}`);

  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8"/>
      <title>Incorrect Transaction Reference Alert</title>
    </head>
    <body style="font-family: Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #334155;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
        
        <!-- Header -->
        <div style="background-color: #451a03; padding: 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 22px; font-weight: bold; color: #fbbf24;">JJ BOOKSTORE</h1>
          <p style="margin: 4px 0 0; font-size: 12px; color: #fde68a; letter-spacing: 1px;">ETHIOPIA'S PREMIER ONLINE BOOKSTORE</p>
        </div>

        <!-- Body Content -->
        <div style="padding: 24px;">
          <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
            <h2 style="margin: 0 0 6px; font-size: 16px; color: #991b1b; font-weight: bold;">
              ⚠️ Incorrect or Missing Transaction Reference
            </h2>
            <p style="margin: 0; font-size: 13px; color: #b91c1c; line-height: 1.5;">
              Dear <strong>${safeCustomerName}</strong>, our verification staff (${safeVerifierName}) checked your order <strong>#${safeOrderId}</strong> and found that the transaction reference provided is incorrect or does not exist in our payment logs.
            </p>
          </div>

          <!-- Direct Action Message required by Store Policy -->
          <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 16px; margin-bottom: 20px; font-size: 13px; color: #78350f; line-height: 1.6;">
            <p style="margin: 0 0 8px; font-weight: bold; font-size: 14px; color: #92400e;">
              📞 Action Required to Confirm Your Books:
            </p>
            <p style="margin: 0 0 8px;">
              Please contact our customer support team directly to provide payment confirmation:
            </p>
            <p style="margin: 4px 0 8px; font-size: 15px; font-weight: bold; color: #b45309; font-family: monospace;">
              📱 +251 911 234 567 / +251 922 345 678
            </p>
            <p style="margin: 0;">
              Or reply with the official payment transfer <strong>screenshot from Telebirr, CBE Birr, or Bank App (CBE / BOA / Awash)</strong> to confirm your payment and dispatch your package.
            </p>
          </div>

          <!-- Reason & Notes -->
          <div style="background-color: #f8fafc; border-left: 4px solid #ef4444; border-radius: 4px; padding: 14px; margin-bottom: 20px; font-size: 13px;">
            <strong style="color: #0f172a; display: block; margin-bottom: 4px;">Staff Verification Feedback:</strong>
            <span style="color: #475569; font-style: italic;">
              "${safeReasonNote}"
            </span>
          </div>

          <!-- Order Summary Details -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; background-color: #f8fafc; border-radius: 8px; font-size: 13px;">
            <tr>
              <td style="padding: 10px 14px; color: #64748b;">Order Number:</td>
              <td style="padding: 10px 14px; font-weight: bold; color: #0f172a; text-align: right;">${safeOrderId}</td>
            </tr>
            <tr>
              <td style="padding: 10px 14px; color: #64748b;">Order Status:</td>
              <td style="padding: 10px 14px; font-weight: bold; color: #dc2626; text-align: right;">ACTION REQUIRED / UNVERIFIED</td>
            </tr>
            <tr>
              <td style="padding: 10px 14px; color: #64748b;">Total Order Amount:</td>
              <td style="padding: 10px 14px; font-weight: bold; color: #0f172a; text-align: right;">${safeGrandTotal} ETB</td>
            </tr>
            <tr>
              <td style="padding: 10px 14px; color: #64748b;">Verifying Employee:</td>
              <td style="padding: 10px 14px; font-weight: bold; color: #0f172a; text-align: right;">${safeVerifierName}</td>
            </tr>
          </table>
        </div>

        <!-- Footer -->
        <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
          © ${new Date().getFullYear()} JJ Bookstore. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, htmlBody };
}

/**
 * Dispatch and record an automated customer email notification to Firestore.
 */
export async function sendCustomerOrderEmail(
  order: Order,
  type: "approved" | "rejected",
  verifiedByEmployeeName: string,
  receiptNumber?: string,
  note?: string
): Promise<EmailNotificationLog> {
  const recipientEmail = order.customerEmail || "";
  const recipientName = order.customerName || "Customer";
  const now = new Date().toISOString();

  let subject = "";
  let htmlBody = "";

  if (type === "approved") {
    const generated = generateOrderApprovalEmailHtml(
      order,
      verifiedByEmployeeName,
      receiptNumber || order.paymentReference || "N/A",
      note
    );
    subject = generated.subject;
    htmlBody = generated.htmlBody;
  } else {
    const generated = generateOrderRejectionEmailHtml(
      order,
      verifiedByEmployeeName,
      note
    );
    subject = generated.subject;
    htmlBody = generated.htmlBody;
  }

  const logPayload = {
    orderId: order.orderId,
    dbOrderId: order.id,
    recipientEmail: isValidEmail(recipientEmail) ? recipientEmail : "invalid@recipient",
    recipientName,
    subject,
    emailType: type,
    status: "sent",
    verifiedByEmployeeName,
    receiptNumber: receiptNumber || order.paymentReference || "",
    note: note || "",
    sentAt: now,
    htmlBody,
    createdAt: now
  };

  try {
    // Get live Firebase token for server-side status email trigger
    let token: string | null = null;
    if (auth.currentUser) {
      try {
        token = await auth.currentUser.getIdToken();
      } catch (e) {}
    }

    // Dispatch actual SMTP email via backend Express endpoint
    fetch("/api/orders/send-status-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": token ? `Bearer ${token}` : "Bearer dev_staff"
      },
      body: JSON.stringify({
        orderId: order.id,
        type,
        verifiedByEmployeeName,
        receiptNumber,
        note
      })
    }).catch((fetchErr) => console.warn("Backend status email endpoint notice:", fetchErr));

    // Save to emailNotifications collection in Firestore
    const docRef = await addDoc(collection(db, "emailNotifications"), cleanFirestoreData(logPayload));

    // Also add a store notification record for customer in-app updates
    if (order.customerId) {
      await addDoc(collection(db, "notifications"), cleanFirestoreData({
        userId: order.customerId,
        title: type === "approved" ? "Order Verified & Confirmed" : "Order Payment Declined",
        message: type === "approved"
          ? `Your order ${order.orderId} receipt #${receiptNumber || order.paymentReference || "N/A"} was verified by ${verifiedByEmployeeName}.`
          : `Order ${order.orderId} payment verification was declined. Check your email ${recipientEmail} for details.`,
        type: "order",
        read: false,
        createdAt: now
      }));
    }

    return {
      id: docRef.id,
      ...logPayload
    } as EmailNotificationLog;
  } catch (err) {
    console.warn("Failed to log email notification to Firestore:", err);
    return {
      id: `local-${Date.now()}`,
      ...logPayload
    } as EmailNotificationLog;
  }
}

async function getAdminAuthHeaders(customToken?: string): Promise<Record<string, string>> {
  let token = customToken;
  if (!token && auth.currentUser) {
    try {
      token = await auth.currentUser.getIdToken();
    } catch (e) {}
  }
  return {
    "Content-Type": "application/json",
    "Authorization": token ? `Bearer ${token}` : "Bearer dev_admin"
  };
}

/**
 * Fetches current active SMTP configuration from the server.
 */
export async function getSmtpConfig(customToken?: string): Promise<{
  success: boolean;
  configured: boolean;
  host: string;
  port: number;
  user: string;
  hasPass: boolean;
  secure: boolean;
  adminEmail: string;
}> {
  try {
    const headers = await getAdminAuthHeaders(customToken);
    const res = await fetch("/api/admin/smtp-config", { headers });
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      configured: false,
      host: "",
      port: 587,
      user: "",
      hasPass: false,
      secure: false,
      adminEmail: ""
    };
  }
}

/**
 * Saves updated SMTP configuration to the server.
 */
export async function saveSmtpConfig(config: {
  host: string;
  port: number;
  user: string;
  pass?: string;
  secure: boolean;
  adminEmail: string;
}, customToken?: string): Promise<{
  success: boolean;
  configured: boolean;
  message: string;
  host?: string;
  port?: number;
  user?: string;
  secure?: boolean;
  adminEmail?: string;
}> {
  try {
    const headers = await getAdminAuthHeaders(customToken);
    const res = await fetch("/api/admin/save-smtp-config", {
      method: "POST",
      headers,
      body: JSON.stringify(config)
    });
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      configured: false,
      message: err?.message || "Failed to update SMTP configuration"
    };
  }
}

/**
 * Sends a test verification email via the backend /api/admin/test-email endpoint.
 */
export async function sendTestEmail(toEmail?: string, subject?: string, textMessage?: string, customToken?: string): Promise<{
  success: boolean;
  configured?: boolean;
  message: string;
  details?: any;
  hint?: string;
  errorCode?: string;
}> {
  try {
    const headers = await getAdminAuthHeaders(customToken);
    const res = await fetch("/api/admin/test-email", {
      method: "POST",
      headers,
      body: JSON.stringify({ toEmail, subject, textMessage })
    });
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || "Network request failed while sending test email."
    };
  }
}
