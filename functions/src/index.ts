import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import nodemailer from "nodemailer";

if (!admin.getApps().length) {
  admin.initializeApp();
}

/**
 * Firebase Cloud Function triggered automatically whenever a new document
 * is added to the Firestore 'orders' collection.
 * Uses Nodemailer to send order confirmation emails to both customer and admin (mikiyaswoyne@gmail.com).
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

  // Create Nodemailer Transporter using environment SMTP settings or standard Gmail SMTP
  const transporter = nodemailer.createTransport({
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

  const itemsListHtml = (order.items || [])
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

  // 1. Admin Email Notification Template
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

  // 2. Customer Confirmation Email Template
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

    // Send to Customer if customer email is provided
    if (customerEmail && customerEmail.toLowerCase() !== adminEmail.toLowerCase()) {
      await transporter.sendMail({
        from: `"JJ Book Shopping" <noreply@jjbookshopping.com>`,
        to: customerEmail,
        subject: customerSubject,
        html: customerHtml,
      });
      console.log(`[Cloud Function] Customer email sent to ${customerEmail} for order ${event.params.orderId}`);
    }

    // Mark email as sent on the order document in Firestore
    await snapshot.ref.update({
      emailNotificationSent: true,
      emailNotifiedAt: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("[Cloud Function Error] Failed to send Nodemailer emails:", error);
  }
});
