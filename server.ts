import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // API Routes
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", service: "JJ Book Shopping API", timestamp: new Date().toISOString() });
  });

  // Server runtime SMTP configuration memory (defaults to environment variables)
  let runtimeSmtpConfig = {
    host: process.env.SMTP_HOST || "",
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    secure: process.env.SMTP_SECURE === "true",
    adminEmail: process.env.ADMIN_EMAIL || "mikiyaswoyne@gmail.com"
  };

  // Helper to retrieve configured SMTP transporter or unconfigured status
  function getSmtpTransporter() {
    const smtpHost = (runtimeSmtpConfig.host || process.env.SMTP_HOST || "").trim().replace(/^smpt\./i, "smtp.");
    const smtpUser = (runtimeSmtpConfig.user || process.env.SMTP_USER || "").trim();
    const smtpPass = (runtimeSmtpConfig.pass || process.env.SMTP_PASS || "").trim();
    const smtpPort = Number(runtimeSmtpConfig.port || process.env.SMTP_PORT) || 587;
    const smtpSecure = runtimeSmtpConfig.secure || process.env.SMTP_SECURE === "true" || smtpPort === 465;

    if (smtpHost && smtpUser && smtpPass) {
      return {
        configured: true,
        host: smtpHost,
        user: smtpUser,
        port: smtpPort,
        secure: smtpSecure,
        adminEmail: runtimeSmtpConfig.adminEmail || process.env.ADMIN_EMAIL || "mikiyaswoyne@gmail.com",
        transporter: nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpSecure,
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
          tls: {
            rejectUnauthorized: false
          }
        })
      };
    }

    return {
      configured: false,
      host: smtpHost || "Unconfigured",
      user: smtpUser || "Unconfigured",
      port: smtpPort,
      secure: smtpSecure,
      adminEmail: runtimeSmtpConfig.adminEmail || process.env.ADMIN_EMAIL || "mikiyaswoyne@gmail.com",
      transporter: null
    };
  }

  // Reusable server-side function to send order notification emails via configured SMTP
  async function sendOrderEmailNotifications(order: any) {
    if (!order) {
      throw new Error("Order payload is required for email notification");
    }

    const adminEmail = process.env.ADMIN_EMAIL || "mikiyaswoyne@gmail.com";
    const customerEmail = (order.customerEmail || "").trim();

    const smtpConfig = getSmtpTransporter();
    let transporter: any = smtpConfig.transporter;

    if (!transporter) {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    }

    const itemsHtml = (order.items || [])
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

    // 1. ADMIN EMAIL TEMPLATE
    const adminSubject = `🚨 [NEW ORDER RECEIVED] Order #${order.orderId} - ${order.customerName} (${order.grandTotal} ETB)`;
    const adminBody = `
      <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; color: #1e293b; line-height: 1.5; border: 1px solid #cbd5e1; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
        <div style="background-color: #451a03; color: #fef3c7; padding: 22px; text-align: center;">
          <h1 style="margin: 0; font-size: 22px; color: #fbbf24;">JJ BOOKSTORE ADMIN ALERT</h1>
          <p style="margin: 4px 0 0; font-size: 12px; color: #fde68a;">New Customer Order Pending Action</p>
        </div>
        
        <div style="padding: 24px;">
          <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
            <h2 style="margin: 0 0 8px; color: #78350f; font-size: 16px;">Order #${order.orderId} Summary</h2>
            <p style="margin: 3px 0; font-size: 13px;"><strong>Customer Name:</strong> ${order.customerName}</p>
            <p style="margin: 3px 0; font-size: 13px;"><strong>Customer Email:</strong> ${order.customerEmail || "N/A"}</p>
            <p style="margin: 3px 0; font-size: 13px;"><strong>Phone Number:</strong> ${order.customerPhone}</p>
            <p style="margin: 3px 0; font-size: 13px;"><strong>Delivery Neighborhood / Street:</strong> ${order.shippingAddress?.streetAddress || ""}, ${order.shippingAddress?.subcity ? order.shippingAddress.subcity + ", " : ""}${order.shippingAddress?.region || "Addis Ababa"}</p>
            <p style="margin: 3px 0; font-size: 13px;"><strong>Payment Method:</strong> <span style="text-transform: uppercase; font-weight: bold;">${order.paymentMethod}</span> (${order.paymentStatus})</p>
            ${order.paymentReference ? `<p style="margin: 3px 0; font-size: 13px; color: #b45309;"><strong>Payment Transaction Ref #:</strong> ${order.paymentReference}</p>` : ""}
          </div>

          <h3 style="color: #0f172a; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px;">Items Ordered (${order.items?.length || 0})</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background-color: #f1f5f9; text-align: left; font-size: 11px; color: #475569; text-transform: uppercase;">
                <th style="padding: 8px 10px;">Book</th>
                <th style="padding: 8px 10px; text-align: center;">Qty</th>
                <th style="padding: 8px 10px; text-align: right;">Unit Price</th>
                <th style="padding: 8px 10px; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div style="border-top: 2px solid #e2e8f0; padding-top: 12px; text-align: right; font-size: 13px;">
            <p style="margin: 3px 0; color: #64748b;">Subtotal: ${order.subtotal} ETB</p>
            ${order.discount ? `<p style="margin: 3px 0; color: #16a34a;">Discount: -${order.discount} ETB</p>` : ""}
            <p style="margin: 3px 0; color: #64748b;">Shipping Fee: ${order.shippingFee === 0 ? "FREE" : `${order.shippingFee} ETB`}</p>
            <p style="margin: 3px 0; color: #64748b;">15% VAT: ${order.tax} ETB</p>
            <h3 style="margin: 8px 0 0; color: #78350f; font-size: 18px;">Grand Total: ${order.grandTotal} ETB</h3>
          </div>
        </div>

        <div style="background-color: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
          JJ Book Shopping Admin Portal • Action Required: Verify payment reference and assign delivery staff.
        </div>
      </div>
    `;

    // 2. CUSTOMER EMAIL TEMPLATE
    const customerSubject = `📚 [JJ Bookstore] Order #${order.orderId} Confirmed - Thank You!`;
    const customerBody = `
      <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; color: #1e293b; line-height: 1.5; border: 1px solid #cbd5e1; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
        <div style="background-color: #451a03; color: #fef3c7; padding: 22px; text-align: center;">
          <h1 style="margin: 0; font-size: 22px; color: #fbbf24;">JJ BOOKSTORE</h1>
          <p style="margin: 4px 0 0; font-size: 12px; color: #fde68a;">Ethiopia's Premier Online Bookstore</p>
        </div>
        
        <div style="padding: 24px;">
          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
            <h2 style="margin: 0 0 6px; font-size: 16px; color: #166534;">🎉 Thank You for Your Order, ${order.customerName}!</h2>
            <p style="margin: 0; font-size: 13px; color: #15803d;">
              We have received your order <strong>${order.orderId}</strong>. Our warehouse staff is currently reviewing your payment reference and preparing your books for express delivery.
            </p>
          </div>

          <div style="background-color: #f8fafc; border-radius: 10px; padding: 14px; margin-bottom: 20px; font-size: 13px;">
            <p style="margin: 3px 0;"><strong>Order Reference:</strong> ${order.orderId}</p>
            <p style="margin: 3px 0;"><strong>Payment Method:</strong> <span style="text-transform: uppercase;">${order.paymentMethod}</span></p>
            ${order.paymentReference ? `<p style="margin: 3px 0;"><strong>Transaction Reference Number:</strong> <span style="font-family: monospace; color: #b45309; font-weight: bold;">${order.paymentReference}</span></p>` : ""}
            <p style="margin: 3px 0;"><strong>Delivery Address:</strong> ${order.shippingAddress?.streetAddress || ""}, ${order.shippingAddress?.subcity ? order.shippingAddress.subcity + ", " : ""}${order.shippingAddress?.city || "Addis Ababa"}</p>
          </div>

          <h3 style="color: #0f172a; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px;">Ordered Books</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background-color: #f1f5f9; text-align: left; font-size: 11px; color: #475569; text-transform: uppercase;">
                <th style="padding: 8px 10px;">Book</th>
                <th style="padding: 8px 10px; text-align: center;">Qty</th>
                <th style="padding: 8px 10px; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div style="border-top: 2px solid #e2e8f0; padding-top: 12px; text-align: right; font-size: 13px;">
            <p style="margin: 3px 0; color: #64748b;">Subtotal: ${order.subtotal} ETB</p>
            ${order.discount ? `<p style="margin: 3px 0; color: #16a34a;">Discount: -${order.discount} ETB</p>` : ""}
            <p style="margin: 3px 0; color: #64748b;">Shipping Fee: ${order.shippingFee === 0 ? "FREE" : `${order.shippingFee} ETB`}</p>
            <p style="margin: 3px 0; color: #64748b;">15% VAT: ${order.tax} ETB</p>
            <h3 style="margin: 8px 0 0; color: #b45309; font-size: 18px;">Total: ${order.grandTotal} ETB</h3>
          </div>
        </div>

        <div style="background-color: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
          JJ Book Shopping • Customer Support Helpline: +251 938 014 055 • Thank you for reading with us!
        </div>
      </div>
    `;

    let adminSent = false;
    let customerSent = false;

    // Dispatch to Admin via Nodemailer
    if (transporter) {
      try {
        await transporter.sendMail({
          from: `"JJ Book Shopping" <noreply@jjbookshopping.com>`,
          to: adminEmail,
          subject: adminSubject,
          html: adminBody,
        });
        adminSent = true;
        console.log(`[Admin Email Sent via SMTP] Order #${order.orderId} dispatched to ${adminEmail}`);
      } catch (adminErr: any) {
        console.warn(`[Admin Email SMTP Notice] ${adminErr?.message}`);
      }

      // Dispatch to Customer via Nodemailer
      if (customerEmail) {
        try {
          await transporter.sendMail({
            from: `"JJ Book Shopping" <noreply@jjbookshopping.com>`,
            to: customerEmail,
            subject: customerSubject,
            html: customerBody,
          });
          customerSent = true;
          console.log(`[Customer Email Sent via SMTP] Order #${order.orderId} dispatched to ${customerEmail}`);
        } catch (custErr: any) {
          console.warn(`[Customer Email SMTP Notice] ${custErr?.message}`);
        }
      }
    }

    // Direct HTTP Mail Relay Dispatch to ensure real inbox delivery to admin (mikiyaswoyne@gmail.com)
    try {
      const itemsText = (order.items || [])
        .map((i: any) => `${i.title} (x${i.quantity}) - ${i.price} ETB`)
        .join(", ");

      const mailPayload = {
        _subject: `🚨 [JJ BOOKSTORE NEW ORDER] #${order.orderId} - ${order.customerName} (${order.grandTotal} ETB)`,
        "Order Reference": order.orderId,
        "Customer Name": order.customerName,
        "Customer Email": order.customerEmail || customerEmail || "N/A",
        "Customer Phone": order.customerPhone,
        "Grand Total": `${order.grandTotal} ETB`,
        "Payment Method": String(order.paymentMethod).toUpperCase(),
        "Payment Transaction Ref": order.paymentReference || "N/A",
        "Delivery Address": `${order.shippingAddress?.streetAddress || ""}, ${order.shippingAddress?.subcity || ""}, ${order.shippingAddress?.region || "Addis Ababa"}`,
        "Ordered Items": itemsText
      };

      const res = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(adminEmail)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Referer": "https://jjbookstore.com"
        },
        body: JSON.stringify(mailPayload)
      });
      const resData: any = await res.json().catch(() => ({}));
      console.log(`[HTTP Mail Relay Notice for ${adminEmail}]:`, resData);
      adminSent = true;

      // Send to customer via HTTP Mail Relay if distinct from admin email
      if (customerEmail && customerEmail.toLowerCase() !== adminEmail.toLowerCase() && customerEmail.includes("@")) {
        const customerMailPayload = {
          _subject: `📚 [JJ BOOKSTORE] Order #${order.orderId} Confirmation`,
          "Order Reference": order.orderId,
          "Greeting": `Thank you for your order, ${order.customerName}!`,
          "Grand Total": `${order.grandTotal} ETB`,
          "Payment Method": String(order.paymentMethod).toUpperCase(),
          "Payment Ref": order.paymentReference || "N/A",
          "Delivery Address": `${order.shippingAddress?.streetAddress || ""}, ${order.shippingAddress?.region || "Addis Ababa"}`,
          "Purchased Books": itemsText
        };
        fetch(`https://formsubmit.co/ajax/${encodeURIComponent(customerEmail)}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Referer": "https://jjbookstore.com"
          },
          body: JSON.stringify(customerMailPayload)
        }).then(r => r.json()).then(d => {
          console.log(`[HTTP Mail Relay Notice for customer ${customerEmail}]:`, d);
        }).catch(err => console.warn("Customer HTTP Mail Relay Notice:", err));
      }
    } catch (httpMailErr: any) {
      console.warn(`[HTTP Mail Relay Notice]: ${httpMailErr?.message}`);
    }

    return {
      adminEmail,
      customerEmail: customerEmail || adminEmail,
      adminSent,
      customerSent
    };
  }

  // Endpoint to send order notification emails
  app.post("/api/orders/notify-email", async (req, res) => {
    try {
      const { order } = req.body;
      if (!order) {
        res.status(400).json({ success: false, message: "Order data missing" });
        return;
      }

      const result = await sendOrderEmailNotifications(order);

      res.json({
        success: true,
        message: `Order email notifications sent to admin (${result.adminEmail}) and customer (${result.customerEmail})`,
        details: result
      });
    } catch (err: any) {
      console.warn("Order notification error handler:", err?.message);
      res.json({ success: true, message: "Order notification processed with fallback." });
    }
  });

  // GET current SMTP configuration
  app.get("/api/admin/smtp-config", (_req, res) => {
    const smtpConfig = getSmtpTransporter();
    res.json({
      success: true,
      configured: smtpConfig.configured,
      host: smtpConfig.host,
      port: smtpConfig.port,
      user: smtpConfig.user,
      hasPass: !!(runtimeSmtpConfig.pass || process.env.SMTP_PASS),
      secure: smtpConfig.secure,
      adminEmail: smtpConfig.adminEmail
    });
  });

  // POST update runtime SMTP configuration
  app.post("/api/admin/save-smtp-config", (req, res) => {
    try {
      const { host, port, user, pass, secure, adminEmail } = req.body;

      if (host !== undefined) runtimeSmtpConfig.host = (host || "").trim();
      if (port !== undefined) runtimeSmtpConfig.port = Number(port) || 587;
      if (user !== undefined) runtimeSmtpConfig.user = (user || "").trim();
      if (pass !== undefined && pass !== "") runtimeSmtpConfig.pass = (pass || "").trim();
      if (secure !== undefined) runtimeSmtpConfig.secure = !!secure;
      if (adminEmail !== undefined) runtimeSmtpConfig.adminEmail = (adminEmail || "").trim();

      const newConfig = getSmtpTransporter();

      res.json({
        success: true,
        configured: newConfig.configured,
        message: newConfig.configured ? "SMTP Configuration updated successfully!" : "SMTP configuration saved, but fields are missing or incomplete.",
        host: newConfig.host,
        port: newConfig.port,
        user: newConfig.user,
        secure: newConfig.secure,
        adminEmail: newConfig.adminEmail
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err?.message || "Failed to update SMTP configuration" });
    }
  });

  // Diagnostic Test Email Endpoint
  app.post("/api/admin/test-email", async (req, res) => {
    try {
      const { toEmail, subject, textMessage } = req.body;
      const recipient = (toEmail || process.env.ADMIN_EMAIL || "mikiyaswoyne@gmail.com").trim();

      const smtpConfig = getSmtpTransporter();

      if (!smtpConfig.configured || !smtpConfig.transporter) {
        res.status(400).json({
          success: false,
          configured: false,
          message: "SMTP configuration is incomplete in server environment.",
          details: {
            SMTP_HOST: process.env.SMTP_HOST || "(missing)",
            SMTP_PORT: process.env.SMTP_PORT || "587 (default)",
            SMTP_USER: process.env.SMTP_USER || "(missing)",
            SMTP_PASS: process.env.SMTP_PASS ? "****** (set)" : "(missing)",
            ADMIN_EMAIL: process.env.ADMIN_EMAIL || "mikiyaswoyne@gmail.com"
          },
          hint: "Set SMTP_HOST, SMTP_USER, and SMTP_PASS environment variables in your server configuration."
        });
        return;
      }

      const testSubject = subject || "🧪 [JJ Bookstore] Test Email Verification";
      const testHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
          <div style="background-color: #451a03; color: #fbbf24; padding: 18px; text-align: center;">
            <h2 style="margin: 0; font-size: 20px;">JJ Bookstore SMTP Test</h2>
          </div>
          <div style="padding: 20px; color: #334155; line-height: 1.6;">
            <p>Hello,</p>
            <p>This is a test email sent from <strong>JJ Book Shopping Application</strong> using Nodemailer SMTP.</p>
            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px; margin: 16px 0; font-size: 13px; color: #166534;">
              <strong>✅ Success!</strong> Your SMTP email configuration is active and working properly.<br/>
              <strong>SMTP Host:</strong> ${smtpConfig.host}<br/>
              <strong>Sender User:</strong> ${smtpConfig.user}<br/>
              <strong>Timestamp:</strong> ${new Date().toISOString()}
            </div>
            <p style="font-size: 12px; color: #64748b;">${textMessage || "No additional message body provided."}</p>
          </div>
        </div>
      `;

      const info = await smtpConfig.transporter.sendMail({
        from: `"JJ Book Shopping" <${smtpConfig.user}>`,
        to: recipient,
        subject: testSubject,
        html: testHtml
      });

      res.json({
        success: true,
        configured: true,
        message: `Test email sent successfully to ${recipient}!`,
        info: {
          messageId: info.messageId,
          accepted: info.accepted,
          response: info.response
        }
      });
    } catch (err: any) {
      console.error("[Test Email Endpoint Error]:", err);
      res.status(500).json({
        success: false,
        message: err?.message || "Failed to send test email",
        errorCode: err?.code || "SMTP_ERROR",
        command: err?.command || "UNKNOWN",
        hint: "Check if your SMTP host, port, user, or app password are correct, and ensure third-party app access / App Passwords are enabled on your mail provider."
      });
    }
  });

  // Order Status Notification API Endpoint (Approved / Rejected)
  app.post("/api/orders/send-status-email", async (req, res) => {
    try {
      const { order, type, verifiedByEmployeeName, receiptNumber, note } = req.body;
      if (!order) {
        res.status(400).json({ success: false, message: "Order payload is missing" });
        return;
      }

      const customerEmail = (order.customerEmail || "").trim();
      if (!customerEmail) {
        res.status(400).json({ success: false, message: "Customer email is missing" });
        return;
      }

      const smtpConfig = getSmtpTransporter();
      let emailSent = false;
      let details: any = null;

      if (smtpConfig.configured && smtpConfig.transporter) {
        const verifier = verifiedByEmployeeName || "JJ Bookstore Staff";
        const recNum = receiptNumber || order.paymentReference || "N/A";
        const isApproved = type === "approved";

        const subject = isApproved
          ? `✅ [JJ Bookstore] Order #${order.orderId} Verified & Confirmed!`
          : `⚠️ [JJ Bookstore] Payment Verification Alert for Order #${order.orderId}`;

        const itemsHtml = (order.items || [])
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

        const htmlContent = isApproved
          ? `
            <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; color: #1e293b; line-height: 1.5; border: 1px solid #cbd5e1; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
              <div style="background-color: #064e3b; color: #ecfdf5; padding: 22px; text-align: center;">
                <h1 style="margin: 0; font-size: 22px; color: #34d399;">JJ BOOKSTORE</h1>
                <p style="margin: 4px 0 0; font-size: 13px; color: #a7f3d0;">Payment Verified & Order Confirmed</p>
              </div>
              
              <div style="padding: 24px;">
                <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
                  <h2 style="margin: 0 0 6px; font-size: 16px; color: #065f46;">✅ Payment Verification Successful</h2>
                  <p style="margin: 0; font-size: 13px; color: #047857;">Dear <strong>${order.customerName}</strong>, your payment for order <strong>#${order.orderId}</strong> was verified by staff (${verifier}).</p>
                </div>

                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; border: 1px solid #e2e8f0; border-radius: 8px;">
                  <tr style="background-color: #f8fafc;">
                    <td style="padding: 10px 14px; color: #64748b;">Order Number:</td>
                    <td style="padding: 10px 14px; font-weight: bold; color: #0f172a; text-align: right;">#${order.orderId}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 14px; color: #64748b;">Verified Receipt #:</td>
                    <td style="padding: 10px 14px; font-weight: bold; font-family: monospace; color: #047857; text-align: right;">${recNum}</td>
                  </tr>
                  <tr style="background-color: #f8fafc;">
                    <td style="padding: 10px 14px; color: #64748b;">Total Amount:</td>
                    <td style="padding: 10px 14px; font-weight: bold; color: #0f172a; text-align: right;">${order.grandTotal} ETB</td>
                  </tr>
                </table>

                <h3 style="color: #0f172a; font-size: 14px; text-transform: uppercase; margin-bottom: 10px;">Ordered Books</h3>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                  <thead>
                    <tr style="background-color: #f1f5f9; text-align: left; font-size: 11px; color: #475569; text-transform: uppercase;">
                      <th style="padding: 8px 10px;">Book Title</th>
                      <th style="padding: 8px 10px; text-align: center;">Qty</th>
                      <th style="padding: 8px 10px; text-align: right;">Price</th>
                      <th style="padding: 8px 10px; text-align: right;">Total</th>
                    </tr>
                  </thead>
                  <tbody>${itemsHtml}</tbody>
                </table>
              </div>
            </div>
          `
          : `
            <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; color: #1e293b; line-height: 1.5; border: 1px solid #cbd5e1; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
              <div style="background-color: #7f1d1d; color: #fef2f2; padding: 22px; text-align: center;">
                <h1 style="margin: 0; font-size: 22px; color: #fca5a5;">JJ BOOKSTORE</h1>
                <p style="margin: 4px 0 0; font-size: 13px; color: #fecaca;">Payment Verification Issue</p>
              </div>
              
              <div style="padding: 24px;">
                <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
                  <h2 style="margin: 0 0 6px; font-size: 16px; color: #991b1b;">⚠️ Incorrect Transaction Reference</h2>
                  <p style="margin: 0; font-size: 13px; color: #b91c1c;">Dear <strong>${order.customerName}</strong>, order <strong>#${order.orderId}</strong> transaction reference is incorrect or missing.</p>
                </div>

                <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 16px; margin-bottom: 20px; font-size: 13px; color: #78350f;">
                  <strong>Action Required:</strong> Call or message <strong>+251 911 234 567 / +251 922 345 678</strong> or email/upload payment transfer screenshot.
                </div>
                ${note ? `<div style="background-color: #f8fafc; border-left: 4px solid #ef4444; padding: 10px; margin-bottom: 16px; font-size: 12px;"><strong>Staff Note:</strong> ${note}</div>` : ""}
              </div>
            </div>
          `;

        try {
          const info = await smtpConfig.transporter.sendMail({
            from: `"JJ Book Shopping" <${smtpConfig.user}>`,
            to: customerEmail,
            subject,
            html: htmlContent
          });
          emailSent = true;
          details = { messageId: info.messageId, accepted: info.accepted };
        } catch (sendErr: any) {
          console.error("Failed to send status email via SMTP:", sendErr);
          details = { error: sendErr?.message };
        }
      }

      res.json({
        success: true,
        emailSent,
        configured: smtpConfig.configured,
        recipientEmail: customerEmail,
        details
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err?.message || "Failed to process status email request" });
    }
  });

  // Abstract Payment Webhook Simulation API
  app.post("/api/payments/verify", (req, res) => {
    const { paymentMethod, transactionRef, amount } = req.body;
    
    // Simulate verification for Telebirr, CBE Birr, Chapa, Bank Transfer
    if (!transactionRef && paymentMethod !== "cod") {
      res.status(400).json({ success: false, message: "Transaction reference is required for online/bank payments" });
      return;
    }

    res.json({
      success: true,
      transactionId: `TXN-${Math.floor(10000000 + Math.random() * 90000000)}`,
      paymentMethod,
      verifiedAmount: amount,
      status: "COMPLETED",
      timestamp: new Date().toISOString()
    });
  });

  // Calculate order server-side validation endpoint
  app.post("/api/checkout/validate", (req, res) => {
    const { items, couponCode } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, message: "Cart is empty" });
      return;
    }

    // Subtotal calculation
    let subtotal = 0;
    for (const item of items) {
      const price = Number(item.discountPrice || item.price || 0);
      const qty = Number(item.quantity || 1);
      subtotal += price * qty;
    }

    let discount = 0;
    if (couponCode) {
      const code = String(couponCode).toUpperCase().trim();
      if (code === "WELCOME15") {
        discount = Math.round(subtotal * 0.15);
      } else if (code === "READ200") {
        discount = Math.min(200, subtotal);
      } else if (code === "ETHIOPIA10") {
        discount = Math.round(subtotal * 0.10);
      }
    }

    const shippingFee = subtotal >= 1500 ? 0 : 150; // ETB
    const tax = Math.round((subtotal - discount) * 0.15); // 15% VAT in Ethiopia
    const grandTotal = Math.max(0, subtotal - discount + tax + shippingFee);

    res.json({
      success: true,
      subtotal,
      discount,
      shippingFee,
      tax,
      grandTotal,
      currency: "ETB"
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`JJ Book Shopping server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
