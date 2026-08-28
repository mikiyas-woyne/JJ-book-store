import { doc, collection, addDoc } from "firebase/firestore";
import { db, cleanFirestoreData } from "./firebase";
import { Order, EmailNotificationLog } from "../types";

/**
 * Generates styled HTML email templates for JJ Bookstore order verifications.
 */
export function generateOrderApprovalEmailHtml(
  order: Order,
  verifiedByEmployeeName: string,
  receiptNumber: string,
  note?: string
): { subject: string; htmlBody: string } {
  const subject = `✅ [JJ Bookstore] Order #${order.orderId} Verified & Approved!`;
  
  const itemsHtml = order.items
    .map(
      (item) => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #1e293b;">
            <strong>${item.title}</strong><br/>
            <span style="font-size: 11px; color: #64748b;">Author: ${item.authorName}</span>
          </td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; text-align: center; color: #1e293b;">
            ${item.quantity}
          </td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; text-align: right; color: #1e293b; font-weight: bold;">
            ${item.total || item.price * item.quantity} ETB
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
              Dear <strong>${order.customerName}</strong>, your order <strong>${order.orderId}</strong> payment receipt has been successfully verified by our staff (${verifiedByEmployeeName}). Your books are now being packed for delivery.
            </p>
          </div>

          <!-- Order Summary Details -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; background-color: #f8fafc; border-radius: 8px; font-size: 13px;">
            <tr>
              <td style="padding: 10px 14px; color: #64748b;">Order Number:</td>
              <td style="padding: 10px 14px; font-weight: bold; color: #0f172a; text-align: right;">${order.orderId}</td>
            </tr>
            <tr>
              <td style="padding: 10px 14px; color: #64748b;">Verified Receipt #:</td>
              <td style="padding: 10px 14px; font-weight: bold; color: #d97706; text-align: right;">${receiptNumber}</td>
            </tr>
            <tr>
              <td style="padding: 10px 14px; color: #64748b;">Payment Method:</td>
              <td style="padding: 10px 14px; font-weight: bold; color: #0f172a; text-align: right; text-transform: uppercase;">${order.paymentMethod}</td>
            </tr>
            <tr>
              <td style="padding: 10px 14px; color: #64748b;">Verified By Staff:</td>
              <td style="padding: 10px 14px; font-weight: bold; color: #0f172a; text-align: right;">${verifiedByEmployeeName}</td>
            </tr>
            ${note ? `
            <tr>
              <td style="padding: 10px 14px; color: #64748b;">Staff Verification Note:</td>
              <td style="padding: 10px 14px; font-style: italic; color: #334155; text-align: right;">"${note}"</td>
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
                <td style="padding: 12px 10px; font-size: 16px; font-weight: font-extrabold; color: #b45309; text-align: right;">${order.grandTotal} ETB</td>
              </tr>
            </tfoot>
          </table>

          <!-- Delivery Address -->
          <div style="background-color: #f8fafc; border-radius: 8px; padding: 14px; margin-bottom: 20px; font-size: 12px;">
            <strong style="color: #0f172a; display: block; margin-bottom: 4px;">📍 Shipping Address:</strong>
            <span style="color: #475569;">
              ${order.shippingAddress.subcity || ""}, ${order.shippingAddress.streetAddress || ""}, ${order.shippingAddress.city || "Addis Ababa"}<br/>
              Phone: <strong>${order.shippingAddress.phone || order.customerPhone}</strong>
            </span>

          </div>

          <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin: 0;">
            Thank you for buying from JJ Bookstore! If you have any questions, contact support at <strong>orders@jjbookshopping.com</strong> or call <strong>+251 911 234 567</strong>.
          </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
          © ${new Date().getFullYear()} JJ Bookstore Ethiopia. All rights reserved.
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
  const subject = `⚠️ [JJ Bookstore] Payment Verification Alert for Order #${order.orderId}`;

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
              Dear <strong>${order.customerName}</strong>, our verification staff (${verifiedByEmployeeName}) checked your order <strong>#${order.orderId}</strong> and found that the transaction reference provided is incorrect or does not exist in our payment logs.
            </p>
          </div>

          <!-- Direct Action Message required by Store Policy -->
          <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 16px; margin-bottom: 20px; font-size: 13px; color: #78350f; line-height: 1.6;">
            <p style="margin: 0 0 8px; font-weight: bold; font-size: 14px; color: #92400e;">
              📞 Action Required to Confirm Your Books:
            </p>
            <p style="margin: 0 0 8px;">
              <strong>Incorrect transaction number!</strong> Please contact our support team directly by calling or messaging:
            </p>
            <p style="margin: 4px 0 8px; font-size: 15px; font-weight: bold; color: #b45309; font-family: monospace;">
              📱 +251 911 234 567 / +251 922 345 678
            </p>
            <p style="margin: 0;">
              Or upload / email the official payment transfer <strong>screenshot from Telebirr or Bank App (CBE / BOA / Awash)</strong> to confirm your payment and dispatch your books.
            </p>
          </div>

          <!-- Reason & Notes -->
          <div style="background-color: #f8fafc; border-left: 4px solid #ef4444; border-radius: 4px; padding: 14px; margin-bottom: 20px; font-size: 13px;">
            <strong style="color: #0f172a; display: block; margin-bottom: 4px;">Staff Verification Feedback:</strong>
            <span style="color: #475569; font-style: italic;">
              "${reasonNote || "Incorrect transaction number. Please contact us at +251 911 234 567 or upload the screenshot from Telebirr/Bank."}"
            </span>
          </div>

          <!-- Order Summary Details -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; background-color: #f8fafc; border-radius: 8px; font-size: 13px;">
            <tr>
              <td style="padding: 10px 14px; color: #64748b;">Order Number:</td>
              <td style="padding: 10px 14px; font-weight: bold; color: #0f172a; text-align: right;">${order.orderId}</td>
            </tr>
            <tr>
              <td style="padding: 10px 14px; color: #64748b;">Order Status:</td>
              <td style="padding: 10px 14px; font-weight: bold; color: #dc2626; text-align: right;">ACTION REQUIRED / UNVERIFIED</td>
            </tr>
            <tr>
              <td style="padding: 10px 14px; color: #64748b;">Total Order Amount:</td>
              <td style="padding: 10px 14px; font-weight: bold; color: #0f172a; text-align: right;">${order.grandTotal} ETB</td>
            </tr>
            <tr>
              <td style="padding: 10px 14px; color: #64748b;">Verifying Employee:</td>
              <td style="padding: 10px 14px; font-weight: bold; color: #0f172a; text-align: right;">${verifiedByEmployeeName}</td>
            </tr>
          </table>
        </div>

        <!-- Footer -->
        <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
          © ${new Date().getFullYear()} JJ Bookstore Ethiopia. All rights reserved.
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
  const recipientEmail = order.customerEmail || "customer@example.com";
  const recipientName = order.customerName || "Valued Customer";
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
    recipientEmail,
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
    // Dispatch actual SMTP email via backend Express endpoint
    fetch("/api/orders/send-status-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order,
        type,
        verifiedByEmployeeName,
        receiptNumber,
        note
      })
    }).catch((fetchErr) => console.warn("Backend status email endpoint notice:", fetchErr));

    // Save to emailNotifications collection in Firestore
    const docRef = await addDoc(collection(db, "emailNotifications"), cleanFirestoreData(logPayload));

    // Also add a store notification record for customer in-app updates
    await addDoc(collection(db, "notifications"), cleanFirestoreData({
      userId: order.customerId || "guest",
      title: type === "approved" ? "Order Verified & Confirmed" : "Order Payment Declined",
      message: type === "approved"
        ? `Your order ${order.orderId} receipt #${receiptNumber || order.paymentReference} was verified by ${verifiedByEmployeeName}. Email notification dispatched to ${recipientEmail}.`
        : `Order ${order.orderId} payment verification was declined. Check your email ${recipientEmail} for details.`,
      type: "order",
      read: false,
      createdAt: now
    }));

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

/**
 * Fetches current active SMTP configuration from the server.
 */
export async function getSmtpConfig(): Promise<{
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
    const res = await fetch("/api/admin/smtp-config");
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
      adminEmail: "mikiyaswoyne@gmail.com"
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
}): Promise<{
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
    const res = await fetch("/api/admin/save-smtp-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
export async function sendTestEmail(toEmail?: string, subject?: string, textMessage?: string): Promise<{
  success: boolean;
  configured?: boolean;
  message: string;
  details?: any;
  hint?: string;
  errorCode?: string;
}> {
  try {
    const res = await fetch("/api/admin/test-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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


