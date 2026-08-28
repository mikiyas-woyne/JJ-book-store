import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { INITIAL_BOOKS, INITIAL_COUPONS } from "./src/lib/sampleData";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin SDK safely
if (!getApps().length) {
  try {
    initializeApp();
  } catch (e: any) {
    console.warn("Firebase Admin initialized in local mode:", e?.message);
  }
}

const firestoreAdmin = getApps().length ? getFirestore() : null;
const authAdmin = getApps().length ? getAuth() : null;

// In-memory fallback database for local preview/development when Admin credentials are not attached
const localMemoryStore = {
  books: new Map<string, any>(INITIAL_BOOKS.map((b) => [b.id, { ...b }])),
  coupons: new Map<string, any>(INITIAL_COUPONS.map((c) => [c.code.toUpperCase(), { ...c }])),
  orders: new Map<string, any>(),
  inventoryTransactions: [] as any[],
  activityLogs: [] as any[]
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // ==============================================================================
  // AUTHENTICATION & AUTHORIZATION MIDDLEWARE (FIREBASE ADMIN TOKEN VERIFICATION)
  // ==============================================================================
  const KNOWN_ADMIN_EMAILS = [
    (process.env.ADMIN_EMAIL || "").trim().toLowerCase(),
    ...(process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(",").map((e) => e.trim().toLowerCase()) : [])
  ].filter(Boolean);

  function isAuthorizedAdminEmail(email?: string | null): boolean {
    if (!email) return false;
    const normalized = email.trim().toLowerCase();
    return KNOWN_ADMIN_EMAILS.includes(normalized);
  }

  interface AuthenticatedUser {
    uid: string;
    email?: string;
    displayName?: string;
    role: "customer" | "staff" | "employee" | "delivery" | "admin" | "superAdmin";
    permissions: string[];
    assignedRoles?: string[];
    status: "active" | "suspended";
    emailVerified?: boolean;
  }

  async function authenticateRequest(req: express.Request, res: express.Response, next: express.NextFunction) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next();
    }

    const token = authHeader.split("Bearer ")[1]?.trim();
    if (!token) {
      return next();
    }

    try {
      if (authAdmin) {
        const decoded = await authAdmin.verifyIdToken(token);
        let role: string = (decoded.role as string) || (isAuthorizedAdminEmail(decoded.email) ? "admin" : "customer");
        let permissions: string[] = [];
        let assignedRoles: string[] = [];
        let status = "active";
        let fullName = decoded.name || "";

        if (firestoreAdmin) {
          try {
            const userSnap = await firestoreAdmin.collection("users").doc(decoded.uid).get();
            if (userSnap.exists) {
              const uData = userSnap.data() || {};
              if (uData.role) role = uData.role;
              if (isAuthorizedAdminEmail(decoded.email)) role = "admin";
              if (uData.permissions) permissions = uData.permissions;
              if (uData.assignedRoles) assignedRoles = uData.assignedRoles;
              if (uData.status) status = uData.status;
              if (uData.fullName) fullName = uData.fullName;
            }
          } catch (e) {
            console.warn("Firestore user profile lookup notice:", e);
          }
        }

        (req as any).user = {
          uid: decoded.uid,
          email: decoded.email,
          displayName: fullName,
          role: role as any,
          permissions,
          assignedRoles,
          status: status as any,
          emailVerified: decoded.email_verified
        } as AuthenticatedUser;
      } else {
        // Local preview / test environment token parsing
        if (token.startsWith("test_") || token.startsWith("mock_") || token.startsWith("dev_")) {
          const isTestAdmin = token.includes("admin");
          const isTestStaff = token.includes("staff") || token.includes("employee");
          const uid = token.replace(/^(test_|mock_|dev_)/, "").split("_")[0] || "test-user-01";
          const role = isTestAdmin ? "admin" : isTestStaff ? "staff" : "customer";

          (req as any).user = {
            uid,
            email: isTestAdmin ? "admin@jjbookstore.com" : isTestStaff ? "employee@jjbookstore.com" : "customer@example.com",
            displayName: isTestAdmin ? "Store Administrator" : isTestStaff ? "Store Staff" : "Test Customer",
            role: role as any,
            permissions: isTestStaff ? ["view_orders", "confirm_orders", "process_orders", "manage_inventory", "inventory.restock", "inventory.adjust"] : [],
            assignedRoles: isTestStaff ? ["order_processor", "inventory_staff"] : [],
            status: "active",
            emailVerified: true
          } as AuthenticatedUser;
        } else {
          return res.status(401).json({ success: false, code: "INVALID_TOKEN", message: "Invalid or expired Firebase ID token." });
        }
      }
    } catch (err: any) {
      console.warn("Firebase ID token verification failed:", err?.message);
      return res.status(401).json({ success: false, code: "INVALID_TOKEN", message: "Authentication failed. Invalid or expired token." });
    }
    next();
  }

  function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
    const user = (req as any).user as AuthenticatedUser | undefined;
    if (!user) {
      res.status(401).json({ success: false, code: "UNAUTHORIZED", message: "Authentication required. Please sign in with your account." });
      return;
    }
    if (user.status === "suspended") {
      res.status(403).json({ success: false, code: "ACCOUNT_SUSPENDED", message: "This account has been suspended." });
      return;
    }
    next();
  }

  function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
    const user = (req as any).user as AuthenticatedUser | undefined;
    if (!user) {
      res.status(401).json({ success: false, code: "UNAUTHORIZED", message: "Authentication required. Please sign in with an administrator account." });
      return;
    }
    const isAdmin = user.role === "admin" || user.role === "superAdmin" || isAuthorizedAdminEmail(user.email);
    if (!isAdmin) {
      res.status(403).json({ success: false, code: "FORBIDDEN", message: "Access forbidden: administrative privileges required." });
      return;
    }
    next();
  }

  function requireEmployee(req: express.Request, res: express.Response, next: express.NextFunction) {
    const user = (req as any).user as AuthenticatedUser | undefined;
    if (!user) {
      res.status(401).json({ success: false, code: "UNAUTHORIZED", message: "Authentication required. Please sign in with a staff account." });
      return;
    }
    const isStaff = ["admin", "superAdmin", "staff", "employee", "delivery"].includes(user.role) || isAuthorizedAdminEmail(user.email);
    if (!isStaff) {
      res.status(403).json({ success: false, code: "FORBIDDEN", message: "Access forbidden: staff privileges required." });
      return;
    }
    next();
  }

  function requirePermission(perm: string) {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const user = (req as any).user as AuthenticatedUser | undefined;
      if (!user) {
        res.status(401).json({ success: false, code: "UNAUTHORIZED", message: "Authentication required." });
        return;
      }
      const isAdm = user.role === "admin" || user.role === "superAdmin" || isAuthorizedAdminEmail(user.email);
      const hasPerm = isAdm || user.permissions?.includes(perm) || user.permissions?.includes("manage_inventory");
      if (!hasPerm) {
        res.status(403).json({ success: false, code: "FORBIDDEN", message: `Access forbidden: missing '${perm}' permission.` });
        return;
      }
      next();
    };
  }

  app.use(authenticateRequest);

  // API Routes
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", service: "JJ Book Shopping API", timestamp: new Date().toISOString() });
  });

  // ==============================================================================
  // EMAIL SANITIZATION, VALIDATION & STRUCTURED LOGGING UTILITIES
  // ==============================================================================
  function escapeHtml(str: any): string {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function sanitizeSubject(str: any): string {
    if (str === null || str === undefined) return "";
    return String(str).replace(/[\r\n\x00-\x1F\x7F]+/g, " ").trim();
  }

  function isValidEmail(email: any): boolean {
    if (!email || typeof email !== "string") return false;
    const clean = email.trim();
    if (clean.length > 254 || clean.length < 5) return false;
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    return emailRegex.test(clean);
  }

  function logEmailEvent(event: string, details: Record<string, any>) {
    const safeDetails: Record<string, any> = { ...details };
    delete safeDetails.pass;
    delete safeDetails.password;
    delete safeDetails.SMTP_PASS;
    delete safeDetails.token;
    delete safeDetails.authorization;
    console.log(JSON.stringify({ event, timestamp: new Date().toISOString(), ...safeDetails }));
  }

  // Server runtime SMTP configuration state (strictly server-side)
  let runtimeSmtpConfig = {
    host: (process.env.SMTP_HOST || "").trim(),
    port: Number(process.env.SMTP_PORT) || 587,
    user: (process.env.SMTP_USER || "").trim(),
    pass: (process.env.SMTP_PASS || "").trim(),
    secure: process.env.SMTP_SECURE === "true",
    adminEmail: (process.env.ADMIN_EMAIL || "").trim(),
    fromEmail: (process.env.SMTP_FROM_EMAIL || "").trim(),
    fromName: (process.env.SMTP_FROM_NAME || "JJ Book Store").trim()
  };

  function getSmtpTransporter() {
    const smtpHost = (runtimeSmtpConfig.host || process.env.SMTP_HOST || "").trim();
    const smtpUser = (runtimeSmtpConfig.user || process.env.SMTP_USER || "").trim();
    const smtpPass = (runtimeSmtpConfig.pass || process.env.SMTP_PASS || "").trim();
    const smtpPort = Number(runtimeSmtpConfig.port || process.env.SMTP_PORT) || 587;
    const smtpSecure = runtimeSmtpConfig.secure || process.env.SMTP_SECURE === "true" || smtpPort === 465;
    const adminEmail = (runtimeSmtpConfig.adminEmail || process.env.ADMIN_EMAIL || "").trim();
    const fromEmail = (runtimeSmtpConfig.fromEmail || process.env.SMTP_FROM_EMAIL || smtpUser || "noreply@jjbookstore.com").trim();
    const fromName = runtimeSmtpConfig.fromName || process.env.SMTP_FROM_NAME || "JJ Book Store";

    if (smtpHost && smtpUser && smtpPass) {
      return {
        configured: true,
        host: smtpHost,
        user: smtpUser,
        port: smtpPort,
        secure: smtpSecure,
        adminEmail,
        fromEmail,
        fromName,
        transporter: nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpSecure,
          auth: { user: smtpUser, pass: smtpPass }
          // Standard TLS certificate verification enforced without insecure overrides
        })
      };
    }

    return {
      configured: false,
      host: smtpHost || "Unconfigured",
      user: smtpUser || "Unconfigured",
      port: smtpPort,
      secure: smtpSecure,
      adminEmail,
      fromEmail,
      fromName,
      transporter: null
    };
  }

  // Reusable server-side function to send order notification emails via configured SMTP
  // Resilient: failures never block or rollback the order; idempotent: prevents duplicate emails
  async function sendOrderEmailNotifications(order: any) {
    if (!order) return;

    const orderId = order.orderId || order.id || "N/A";
    const smtpConfig = getSmtpTransporter();
    const adminEmail = smtpConfig.adminEmail;
    const customerEmail = (order.customerEmail || "").trim();

    // IDEMPOTENCY GUARD: Check if order creation email was already sent
    const existingDelivery = order.emailDelivery?.orderCreated;
    if (order.emailNotificationSent || existingDelivery?.status === "sent" || existingDelivery?.status === "sending") {
      logEmailEvent("email.duplicate.prevented", {
        type: "order_created",
        orderId,
        existingStatus: existingDelivery?.status || "sent"
      });
      return;
    }

    if (!smtpConfig.configured || !smtpConfig.transporter) {
      logEmailEvent("email.send.unavailable", {
        type: "order_created",
        orderId,
        reason: "SMTP not configured on server"
      });
      return;
    }

    const transporter = smtpConfig.transporter;
    const fromAddress = `"${smtpConfig.fromName}" <${smtpConfig.fromEmail}>`;
    const now = new Date().toISOString();

    // Mark status as sending in memory to claim atomic lock
    if (!order.emailDelivery) order.emailDelivery = {};
    order.emailDelivery.orderCreated = { status: "sending", startedAt: now };

    logEmailEvent("email.send.started", { type: "order_created", orderId });

    // Escaped dynamic values
    const safeCustomerName = escapeHtml(order.customerName);
    const safePhone = escapeHtml(order.customerPhone);
    const safePaymentMethod = escapeHtml(order.paymentMethod);
    const safePaymentRef = escapeHtml(order.paymentReference);
    const safeGrandTotal = escapeHtml(order.grandTotal);
    const safeSubtotal = escapeHtml(order.subtotal);
    const safeTax = escapeHtml(order.tax);
    const safeShipping = order.shippingFee === 0 ? "FREE" : `${escapeHtml(order.shippingFee)} ETB`;
    const safeDiscount = order.discount ? `${escapeHtml(order.discount)} ETB` : null;

    const itemsHtml = (order.items || [])
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

    const adminSubject = sanitizeSubject(`🚨 [NEW ORDER RECEIVED] Order #${orderId} - ${order.customerName} (${order.grandTotal} ETB)`);
    const adminBody = `
      <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; color: #1e293b; line-height: 1.5; border: 1px solid #cbd5e1; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
        <div style="background-color: #0f172a; color: #f8fafc; padding: 22px; text-align: center;">
          <h1 style="margin: 0; font-size: 22px; color: #fbbf24;">JJ BOOKSTORE ADMIN ALERT</h1>
          <p style="margin: 4px 0 0; font-size: 12px; color: #fde68a;">New Customer Order Pending Staff Review</p>
        </div>
        <div style="padding: 24px;">
          <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
            <h2 style="margin: 0 0 8px; color: #78350f; font-size: 16px;">Order #${escapeHtml(orderId)} Summary</h2>
            <p style="margin: 3px 0; font-size: 13px;"><strong>Customer:</strong> ${safeCustomerName}</p>
            <p style="margin: 3px 0; font-size: 13px;"><strong>Email:</strong> ${escapeHtml(customerEmail || "N/A")}</p>
            <p style="margin: 3px 0; font-size: 13px;"><strong>Phone:</strong> ${safePhone}</p>
            <p style="margin: 3px 0; font-size: 13px;"><strong>Delivery Address:</strong> ${escapeHtml(order.shippingAddress?.streetAddress || "")}, ${escapeHtml(order.shippingAddress?.subcity || "")}, ${escapeHtml(order.shippingAddress?.region || "Addis Ababa")}</p>
            <p style="margin: 3px 0; font-size: 13px;"><strong>Payment Method:</strong> <span style="text-transform: uppercase; font-weight: bold;">${safePaymentMethod}</span> (${escapeHtml(order.paymentStatus)})</p>
            ${safePaymentRef ? `<p style="margin: 3px 0; font-size: 13px; color: #b45309;"><strong>Payment Reference #:</strong> ${safePaymentRef}</p>` : ""}
          </div>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background-color: #f1f5f9; text-align: left; font-size: 11px; color: #475569; text-transform: uppercase;">
                <th style="padding: 8px 10px;">Book</th>
                <th style="padding: 8px 10px; text-align: center;">Qty</th>
                <th style="padding: 8px 10px; text-align: right;">Unit Price</th>
                <th style="padding: 8px 10px; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          <div style="border-top: 2px solid #e2e8f0; padding-top: 12px; text-align: right; font-size: 13px;">
            <p style="margin: 3px 0; color: #64748b;">Subtotal: ${safeSubtotal} ETB</p>
            ${safeDiscount ? `<p style="margin: 3px 0; color: #16a34a;">Discount: -${safeDiscount}</p>` : ""}
            <p style="margin: 3px 0; color: #64748b;">Shipping Fee: ${safeShipping}</p>
            <p style="margin: 3px 0; color: #64748b;">15% VAT: ${safeTax} ETB</p>
            <h3 style="margin: 8px 0 0; color: #78350f; font-size: 18px;">Grand Total: ${safeGrandTotal} ETB</h3>
          </div>
        </div>
      </div>
    `;

    const customerSubject = sanitizeSubject(`📚 [JJ Bookstore] Order #${orderId} Confirmed - Thank You!`);
    const customerBody = `
      <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; color: #1e293b; line-height: 1.5; border: 1px solid #cbd5e1; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
        <div style="background-color: #0f172a; color: #f8fafc; padding: 22px; text-align: center;">
          <h1 style="margin: 0; font-size: 22px; color: #fbbf24;">JJ BOOKSTORE</h1>
          <p style="margin: 4px 0 0; font-size: 12px; color: #fde68a;">Ethiopia's Premier Online Bookstore</p>
        </div>
        <div style="padding: 24px;">
          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
            <h2 style="margin: 0 0 6px; font-size: 16px; color: #166534;">🎉 Thank You for Your Order, ${safeCustomerName}!</h2>
            <p style="margin: 0; font-size: 13px; color: #15803d;">
              We have received your order <strong>${escapeHtml(orderId)}</strong>. Our warehouse staff is currently reviewing your order for dispatch.
            </p>
          </div>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background-color: #f1f5f9; text-align: left; font-size: 11px; color: #475569; text-transform: uppercase;">
                <th style="padding: 8px 10px;">Book</th>
                <th style="padding: 8px 10px; text-align: center;">Qty</th>
                <th style="padding: 8px 10px; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          <div style="border-top: 2px solid #e2e8f0; padding-top: 12px; text-align: right; font-size: 13px;">
            <h3 style="margin: 8px 0 0; color: #b45309; font-size: 18px;">Total: ${safeGrandTotal} ETB</h3>
          </div>
        </div>
      </div>
    `;

    let adminSent = false;
    let customerSent = false;

    try {
      if (isValidEmail(adminEmail)) {
        await transporter.sendMail({
          from: fromAddress,
          to: adminEmail,
          subject: adminSubject,
          html: adminBody
        });
        adminSent = true;
      }

      if (isValidEmail(customerEmail) && customerEmail.toLowerCase() !== adminEmail.toLowerCase()) {
        await transporter.sendMail({
          from: fromAddress,
          to: customerEmail,
          subject: customerSubject,
          html: customerBody
        });
        customerSent = true;
      }

      const sentTime = new Date().toISOString();
      order.emailNotificationSent = true;
      order.emailNotifiedAt = sentTime;
      order.emailDelivery.orderCreated = {
        status: "sent",
        adminSent,
        customerSent,
        sentAt: sentTime
      };

      if (firestoreAdmin && order.id) {
        try {
          await firestoreAdmin.collection("orders").doc(order.id).update({
            emailNotificationSent: true,
            emailNotifiedAt: sentTime,
            "emailDelivery.orderCreated": {
              status: "sent",
              adminSent,
              customerSent,
              sentAt: sentTime
            }
          });
        } catch (fsErr) {}
      }

      logEmailEvent("email.send.success", { type: "order_created", orderId, adminSent, customerSent });
    } catch (err: any) {
      logEmailEvent("email.send.failed", { type: "order_created", orderId, error: err?.message });
      order.emailDelivery.orderCreated = {
        status: "failed",
        failedAt: new Date().toISOString(),
        error: err?.message || "Send failed"
      };
    }
  }

  // ==============================================================================
  // AUTHORITATIVE SERVER-SIDE FINANCIAL & INVENTORY CALCULATION ENGINE
  // ==============================================================================
  async function calculateOrderFinancials(
    rawItems: { bookId: string; quantity: number }[],
    rawCouponCode?: string
  ) {
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      throw new Error("Shopping cart is empty.");
    }

    const validatedItems: any[] = [];
    let subtotal = 0;

    for (const rawItem of rawItems) {
      const bookId = String(rawItem.bookId || "").trim();
      const quantity = Math.max(1, Math.floor(Number(rawItem.quantity) || 1));

      if (!bookId) {
        throw new Error("Invalid book identifier in order items.");
      }

      // Fetch live book from Firestore or fallback memory
      let bookData: any = null;
      if (firestoreAdmin) {
        try {
          const docSnap = await firestoreAdmin.collection("books").doc(bookId).get();
          if (docSnap.exists) {
            bookData = { id: docSnap.id, ...docSnap.data() };
          }
        } catch (e) {
          console.warn("Firestore book fetch fallback to local:", e);
        }
      }

      if (!bookData) {
        bookData = localMemoryStore.books.get(bookId);
      }

      if (!bookData) {
        throw new Error(`Book "${bookId}" was not found in bookstore catalog.`);
      }

      if (bookData.active === false) {
        throw new Error(`"${bookData.title}" is currently unavailable.`);
      }

      const availableStock = typeof bookData.stock === "number" ? bookData.stock : 10;
      if (availableStock < quantity) {
        throw new Error(
          `Insufficient inventory stock for "${bookData.title}". Requested: ${quantity}, Available: ${availableStock}.`
        );
      }

      // Authoritative Price: ignore any client-provided price!
      const unitPrice = Number(bookData.discountPrice || bookData.price || 0);
      const itemTotal = unitPrice * quantity;
      subtotal += itemTotal;

      validatedItems.push({
        bookId: bookData.id,
        title: bookData.title,
        coverImage: bookData.coverImage,
        authorName: bookData.authorName || "",
        price: unitPrice,
        quantity,
        total: itemTotal,
        stockBefore: availableStock
      });
    }

    // Authoritative Server-Side Coupon Validation
    let discount = 0;
    let validatedCoupon: any = null;

    if (rawCouponCode && rawCouponCode.trim()) {
      const code = String(rawCouponCode).trim().toUpperCase();

      let couponData: any = null;
      if (firestoreAdmin) {
        try {
          const qSnap = await firestoreAdmin
            .collection("coupons")
            .where("code", "==", code)
            .where("active", "==", true)
            .get();
          if (!qSnap.empty) {
            couponData = { id: qSnap.docs[0].id, ...qSnap.docs[0].data() };
          }
        } catch (e) {
          console.warn("Firestore coupon fetch fallback to local:", e);
        }
      }

      if (!couponData) {
        couponData = localMemoryStore.coupons.get(code);
      }

      if (couponData && couponData.active) {
        const now = new Date();
        const expiration = couponData.expirationDate ? new Date(couponData.expirationDate) : null;
        const isNotExpired = !expiration || expiration >= now;
        const isUnderLimit = !couponData.usageLimit || (couponData.usedCount || 0) < couponData.usageLimit;
        const meetsMinOrder = subtotal >= (couponData.minOrderAmount || 0);

        if (isNotExpired && isUnderLimit && meetsMinOrder) {
          validatedCoupon = couponData;
          if (couponData.discountType === "percentage") {
            const calculated = Math.round(subtotal * (Number(couponData.discountValue || 0) / 100));
            discount = couponData.maxDiscount ? Math.min(couponData.maxDiscount, calculated) : calculated;
          } else {
            discount = Math.min(Number(couponData.discountValue || 0), subtotal);
          }
        }
      }
    }

    // Authoritative Shipping Fee: Free if subtotal >= 1500 ETB, else 150 ETB
    const shippingFee = subtotal >= 1500 ? 0 : 150;

    // Authoritative 15% Ethiopian VAT Tax
    const tax = Math.round(Math.max(0, subtotal - discount) * 0.15);

    // Authoritative Grand Total
    const grandTotal = Math.max(0, subtotal - discount + tax + shippingFee);

    return {
      items: validatedItems,
      subtotal,
      discount,
      shippingFee,
      tax,
      grandTotal,
      currency: "ETB",
      coupon: validatedCoupon
    };
  }

  // ==============================================================================
  // ==============================================================================
  // 1. SECURE CHECKOUT VALIDATION ENDPOINT
  // ==============================================================================
  app.post("/api/checkout/validate", async (req, res) => {
    try {
      const { items, couponCode } = req.body;
      const calculation = await calculateOrderFinancials(items, couponCode);

      res.json({
        success: true,
        subtotal: calculation.subtotal,
        discount: calculation.discount,
        shippingFee: calculation.shippingFee,
        tax: calculation.tax,
        grandTotal: calculation.grandTotal,
        currency: calculation.currency,
        couponCode: calculation.coupon?.code || null,
        items: calculation.items
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        message: err.message || "Failed to calculate authoritative order totals."
      });
    }
  });

  // ==============================================================================
  // 2. SECURE SERVER-SIDE ORDER CREATION WITH AUTHORITATIVE AUTHENTICATION
  // ==============================================================================
  app.post("/api/orders/create", requireAuth, async (req, res) => {
    try {
      const authUser = (req as any).user as AuthenticatedUser;
      const {
        items: rawItems,
        couponCode,
        customerName: rawCustomerName,
        customerEmail: rawCustomerEmail,
        customerPhone,
        shippingAddress,
        paymentMethod,
        paymentReference,
        deliveryNotes,
        idempotencyKey
      } = req.body;

      // SECURITY: Derive authoritative customer identity from verified Firebase ID token!
      const customerId = authUser.uid;
      const customerEmail = (authUser.email || rawCustomerEmail || "customer@example.com").trim();
      const customerName = (rawCustomerName || authUser.displayName || "Customer").trim();

      // Check Idempotency: Prevent duplicate orders on double click or retry
      if (idempotencyKey) {
        if (firestoreAdmin) {
          try {
            const existingQ = await firestoreAdmin
              .collection("orders")
              .where("idempotencyKey", "==", String(idempotencyKey))
              .limit(1)
              .get();
            if (!existingQ.empty) {
              const existingDoc = existingQ.docs[0];
              res.json({
                success: true,
                order: { id: existingDoc.id, ...existingDoc.data() },
                idempotent: true,
                message: "Order previously created."
              });
              return;
            }
          } catch (e) {}
        }

        const existingOrder = Array.from(localMemoryStore.orders.values()).find(
          (o) => o.idempotencyKey === idempotencyKey
        );
        if (existingOrder) {
          res.json({
            success: true,
            order: existingOrder,
            idempotent: true,
            message: "Order previously created."
          });
          return;
        }
      }

      // Server-Side Financial & Stock Calculation
      const calculation = await calculateOrderFinancials(rawItems, couponCode);

      const orderNumber = `JJ-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
      const now = new Date().toISOString();

      const newOrder: any = {
        orderId: orderNumber,
        customerId,
        customerName,
        customerEmail,
        customerPhone: String(customerPhone || "+251 ").trim(),
        items: calculation.items.map((it) => ({
          bookId: it.bookId,
          title: it.title,
          coverImage: it.coverImage,
          authorName: it.authorName,
          price: it.price,
          quantity: it.quantity,
          total: it.total
        })),
        subtotal: calculation.subtotal,
        discount: calculation.discount,
        shippingFee: calculation.shippingFee,
        tax: calculation.tax,
        grandTotal: calculation.grandTotal,
        currency: "ETB",
        paymentMethod: paymentMethod || "cod",
        paymentStatus: "pending",
        paymentReference: paymentReference ? String(paymentReference).trim() : (paymentMethod === "cod" ? "Cash on Delivery" : "Pending Verification"),
        orderStatus: "pending",
        isReceiptVerified: false,
        shippingAddress: shippingAddress || {
          fullName: customerName,
          phone: customerPhone,
          region: "Addis Ababa",
          city: "Addis Ababa",
          streetAddress: "Central Addis"
        },
        deliveryNotes: deliveryNotes || "",
        couponCode: calculation.coupon?.code || "",
        idempotencyKey: idempotencyKey || "",
        createdAt: now,
        updatedAt: now,
        statusHistory: [
          {
            status: "pending",
            timestamp: now,
            note: "Order created. Awaiting payment & inventory dispatch."
          }
        ]
      };

      // ATOMIC INVENTORY DEDUCTION TRANSACTION
      if (firestoreAdmin) {
        await firestoreAdmin.runTransaction(async (transaction) => {
          // Phase 1: Read all book documents within the transaction
          const bookReadResults: { ref: FirebaseFirestore.DocumentReference; snap: FirebaseFirestore.DocumentSnapshot; item: typeof calculation.items[0] }[] = [];
          for (const item of calculation.items) {
            const bookRef = firestoreAdmin.collection("books").doc(item.bookId);
            const bookDoc = await transaction.get(bookRef);

            if (!bookDoc.exists) {
              const err: any = new Error(`Book "${item.title}" (${item.bookId}) no longer exists in catalog.`);
              err.code = "BOOK_NOT_FOUND";
              throw err;
            }

            const bData = bookDoc.data() || {};
            if (bData.active === false) {
              const err: any = new Error(`"${item.title}" is currently deactivated.`);
              err.code = "BOOK_UNAVAILABLE";
              throw err;
            }

            const currentStock = typeof bData.stock === "number" ? bData.stock : 0;
            if (currentStock < item.quantity) {
              const err: any = new Error(
                `INSUFFICIENT_STOCK: Insufficient stock for "${item.title}". Requested: ${item.quantity}, Available: ${currentStock}.`
              );
              err.code = "INSUFFICIENT_STOCK";
              err.bookId = item.bookId;
              err.availableStock = currentStock;
              throw err;
            }

            bookReadResults.push({ ref: bookRef, snap: bookDoc, item });
          }

          // Read coupon if applicable
          let couponRef: FirebaseFirestore.DocumentReference | null = null;
          let couponDoc: FirebaseFirestore.DocumentSnapshot | null = null;
          if (calculation.coupon?.id) {
            couponRef = firestoreAdmin.collection("coupons").doc(calculation.coupon.id);
            couponDoc = await transaction.get(couponRef);
          }

          // Phase 2: Atomic writes
          for (const { ref: bookRef, snap: bookDoc, item } of bookReadResults) {
            const bData = bookDoc.data() || {};
            const currentStock = typeof bData.stock === "number" ? bData.stock : 0;
            const currentSoldCount = typeof bData.soldCount === "number" ? bData.soldCount : 0;
            const newStock = currentStock - item.quantity;
            const newSoldCount = currentSoldCount + item.quantity;

            transaction.update(bookRef, {
              stock: newStock,
              soldCount: newSoldCount,
              updatedAt: now
            });

            // Deterministic transaction record ID to prevent duplicates on transaction retry
            const txDocId = `tx_order_${orderNumber}_${item.bookId}_sale`;
            const invTxRef = firestoreAdmin.collection("inventoryTransactions").doc(txDocId);
            transaction.set(invTxRef, {
              id: txDocId,
              transactionId: txDocId,
              bookId: item.bookId,
              bookTitle: item.title,
              orderId: orderNumber,
              type: "SALE",
              reason: "order_placed",
              quantity: item.quantity,
              changeQuantity: -item.quantity,
              previousStock: currentStock,
              newStock: newStock,
              previousSoldCount: currentSoldCount,
              newSoldCount: newSoldCount,
              performedBy: customerId,
              createdAt: now
            });
          }

          if (couponRef && couponDoc && couponDoc.exists) {
            transaction.update(couponRef, {
              usedCount: (couponDoc.data()?.usedCount || 0) + 1
            });
          }

          const orderDocRef = firestoreAdmin.collection("orders").doc();
          newOrder.id = orderDocRef.id;
          transaction.set(orderDocRef, newOrder);

          const actLogRef = firestoreAdmin.collection("activity_logs").doc();
          transaction.set(actLogRef, {
            title: `New Order #${orderNumber}`,
            description: `${newOrder.customerName} placed order for ${newOrder.items.length} book(s) totaling ${newOrder.grandTotal} ETB`,
            category: "orders",
            type: "order_created",
            orderId: orderNumber,
            amount: newOrder.grandTotal,
            timestamp: now
          });
        });
      } else {
        // In-memory fallback (when Firestore Admin credentials are not provided in local dev)
        for (const item of calculation.items) {
          const memBook = localMemoryStore.books.get(item.bookId);
          if (!memBook) {
            const err: any = new Error(`Book "${item.title}" not found.`);
            err.code = "BOOK_NOT_FOUND";
            throw err;
          }
          const curStock = typeof memBook.stock === "number" ? memBook.stock : 0;
          if (curStock < item.quantity) {
            const err: any = new Error(`INSUFFICIENT_STOCK: Insufficient stock for "${item.title}".`);
            err.code = "INSUFFICIENT_STOCK";
            throw err;
          }
        }

        if (!newOrder.id) {
          newOrder.id = `order_${Date.now()}`;
        }
        localMemoryStore.orders.set(newOrder.id, newOrder);

        for (const item of calculation.items) {
          const memBook = localMemoryStore.books.get(item.bookId);
          if (memBook) {
            const curStock = typeof memBook.stock === "number" ? memBook.stock : 0;
            const curSold = typeof memBook.soldCount === "number" ? memBook.soldCount : 0;
            memBook.stock = Math.max(0, curStock - item.quantity);
            memBook.soldCount = curSold + item.quantity;

            localMemoryStore.inventoryTransactions.push({
              id: `tx_order_${orderNumber}_${item.bookId}_sale`,
              bookId: item.bookId,
              bookTitle: item.title,
              orderId: orderNumber,
              type: "SALE",
              reason: "order_placed",
              quantity: item.quantity,
              changeQuantity: -item.quantity,
              previousStock: curStock,
              newStock: memBook.stock,
              previousSoldCount: curSold,
              newSoldCount: memBook.soldCount,
              performedBy: customerId,
              createdAt: now
            });
          }
        }
      }

      // Asynchronous email notification (resilient: failures do not block the order!)
      sendOrderEmailNotifications(newOrder).catch((err) => {
        console.warn("Order email notification dispatch notice:", err?.message);
      });

      res.json({
        success: true,
        order: newOrder,
        message: `Order ${orderNumber} created successfully.`
      });
    } catch (err: any) {
      console.error("Order creation error:", err);
      const isStockError = err?.code === "INSUFFICIENT_STOCK" || err?.message?.includes("INSUFFICIENT_STOCK");
      res.status(400).json({
        success: false,
        code: err?.code || (isStockError ? "INSUFFICIENT_STOCK" : "ORDER_CREATION_FAILED"),
        message: err?.message || "Failed to create order."
      });
    }
  });

  // ==============================================================================
  // 3. SECURE ORDER CANCELLATION WITH IDOR PROTECTION & ATOMIC STOCK RESTOCKING
  // ==============================================================================
  app.post("/api/orders/cancel", requireAuth, async (req, res) => {
    try {
      const authUser = (req as any).user as AuthenticatedUser;
      const { orderId, reason } = req.body;

      if (!orderId) {
        res.status(400).json({ success: false, code: "MISSING_PARAM", message: "Order ID is required." });
        return;
      }

      let orderNumber = "";
      const now = new Date().toISOString();
      const isStaff = ["admin", "superAdmin", "staff", "employee"].includes(authUser.role) || isAuthorizedAdminEmail(authUser.email);

      if (firestoreAdmin) {
        const orderDocRef = firestoreAdmin.collection("orders").doc(orderId);
        await firestoreAdmin.runTransaction(async (transaction) => {
          const freshOrderSnap = await transaction.get(orderDocRef);
          if (!freshOrderSnap.exists) {
            const err: any = new Error("Order not found.");
            err.code = "ORDER_NOT_FOUND";
            throw err;
          }

          const oData = freshOrderSnap.data() || {};
          orderNumber = oData.orderId || orderId;

          // IDOR PROTECTION: Only order owner or staff can cancel this order!
          if (oData.customerId !== authUser.uid && !isStaff) {
            const err: any = new Error("Unauthorized: You cannot cancel an order belonging to another customer.");
            err.code = "UNAUTHORIZED";
            throw err;
          }

          // Idempotency Guard: If already cancelled, do not restock again!
          if (oData.orderStatus === "cancelled") {
            return;
          }

          // State Machine Guard: Only 'pending' orders can be cancelled by customer
          if (oData.orderStatus !== "pending" && !isStaff) {
            const err: any = new Error(`Cannot cancel order with status "${oData.orderStatus}". Only pending orders can be cancelled.`);
            err.code = "ORDER_CANNOT_BE_CANCELLED";
            throw err;
          }

          // Read all books and restore stock atomically
          for (const item of oData.items || []) {
            if (item.bookId) {
              const bookRef = firestoreAdmin.collection("books").doc(item.bookId);
              const bookDoc = await transaction.get(bookRef);
              if (bookDoc.exists) {
                const bData = bookDoc.data() || {};
                const currentStock = typeof bData.stock === "number" ? bData.stock : 0;
                const currentSoldCount = typeof bData.soldCount === "number" ? bData.soldCount : 0;
                const itemQty = Math.max(1, Number(item.quantity) || 1);
                const newStock = currentStock + itemQty;
                const newSoldCount = Math.max(0, currentSoldCount - itemQty);

                transaction.update(bookRef, {
                  stock: newStock,
                  soldCount: newSoldCount,
                  updatedAt: now
                });

                const txDocId = `tx_order_${orderNumber}_${item.bookId}_cancel`;
                const invTxRef = firestoreAdmin.collection("inventoryTransactions").doc(txDocId);
                transaction.set(invTxRef, {
                  id: txDocId,
                  transactionId: txDocId,
                  bookId: item.bookId,
                  bookTitle: item.title,
                  orderId: orderNumber,
                  type: "RELEASE",
                  reason: "order_cancelled",
                  quantity: itemQty,
                  changeQuantity: itemQty,
                  previousStock: currentStock,
                  newStock: newStock,
                  previousSoldCount: currentSoldCount,
                  newSoldCount: newSoldCount,
                  performedBy: authUser.uid,
                  createdAt: now
                });
              }
            }
          }

          const existingHistory = oData.statusHistory || [];
          transaction.update(orderDocRef, {
            orderStatus: "cancelled",
            cancelledReason: reason || "Cancelled by user",
            updatedAt: now,
            statusHistory: [
              ...existingHistory,
              {
                status: "cancelled",
                timestamp: now,
                note: `Order cancelled by ${isStaff ? "staff" : "customer"}. Stock returned to inventory. Reason: ${reason || "User request"}`
              }
            ]
          });
        });
      } else {
        // Memory fallback
        const orderData = localMemoryStore.orders.get(orderId);
        if (!orderData) {
          res.status(404).json({ success: false, code: "ORDER_NOT_FOUND", message: "Order not found." });
          return;
        }

        if (orderData.customerId !== authUser.uid && !isStaff) {
          res.status(403).json({ success: false, code: "UNAUTHORIZED", message: "Unauthorized: You cannot cancel an order belonging to another customer." });
          return;
        }

        if (orderData.orderStatus === "cancelled") {
          res.json({ success: true, alreadyCancelled: true, message: `Order ${orderData.orderId} was already cancelled.` });
          return;
        }

        if (orderData.orderStatus !== "pending" && !isStaff) {
          res.status(400).json({
            success: false,
            code: "ORDER_CANNOT_BE_CANCELLED",
            message: `Cannot cancel order with status "${orderData.orderStatus}". Only pending orders can be cancelled.`
          });
          return;
        }

        orderData.orderStatus = "cancelled";
        orderData.cancelledReason = reason || "Cancelled by user";
        orderData.updatedAt = now;

        for (const item of orderData.items || []) {
          const memBook = localMemoryStore.books.get(item.bookId);
          if (memBook) {
            const curStock = typeof memBook.stock === "number" ? memBook.stock : 0;
            const curSold = typeof memBook.soldCount === "number" ? memBook.soldCount : 0;
            const itemQty = Math.max(1, Number(item.quantity) || 1);
            memBook.stock = curStock + itemQty;
            memBook.soldCount = Math.max(0, curSold - itemQty);

            localMemoryStore.inventoryTransactions.push({
              id: `tx_order_${orderData.orderId}_${item.bookId}_cancel`,
              bookId: item.bookId,
              bookTitle: item.title,
              orderId: orderData.orderId,
              type: "RELEASE",
              reason: "order_cancelled",
              quantity: itemQty,
              changeQuantity: itemQty,
              previousStock: curStock,
              newStock: memBook.stock,
              previousSoldCount: curSold,
              newSoldCount: memBook.soldCount,
              performedBy: authUser.uid,
              createdAt: now
            });
          }
        }
        orderNumber = orderData.orderId;
      }

      res.json({
        success: true,
        orderId: orderNumber || orderId,
        message: `Order ${orderNumber || orderId} cancelled and stock replenished successfully.`
      });
    } catch (err: any) {
      res.status(err?.code === "UNAUTHORIZED" ? 403 : 400).json({
        success: false,
        code: err?.code || "ORDER_CANCELLATION_FAILED",
        message: err?.message || "Failed to cancel order."
      });
    }
  });

  // ==============================================================================
  // 4. ATOMIC ORDER RETURN & RESTOCK ENDPOINT (STAFF/ADMIN ONLY)
  // ==============================================================================
  app.post("/api/orders/return", requireEmployee, async (req, res) => {
    try {
      const authUser = (req as any).user as AuthenticatedUser;
      const { orderId, returnCondition, notes } = req.body;

      if (!orderId) {
        res.status(400).json({ success: false, code: "MISSING_PARAM", message: "Order ID is required." });
        return;
      }

      const now = new Date().toISOString();
      let orderNumber = "";

      if (firestoreAdmin) {
        const orderDocRef = firestoreAdmin.collection("orders").doc(orderId);
        await firestoreAdmin.runTransaction(async (transaction) => {
          const freshOrderSnap = await transaction.get(orderDocRef);
          if (!freshOrderSnap.exists) {
            const err: any = new Error("Order not found.");
            err.code = "ORDER_NOT_FOUND";
            throw err;
          }

          const oData = freshOrderSnap.data() || {};
          orderNumber = oData.orderId || orderId;

          // Idempotency: do not restock twice if already returned
          if (oData.isRestocked || oData.orderStatus === "returned_to_store") {
            return;
          }

          // Restock good condition books
          const shouldRestock = returnCondition !== "damaged";
          if (shouldRestock) {
            for (const item of oData.items || []) {
              if (item.bookId) {
                const bookRef = firestoreAdmin.collection("books").doc(item.bookId);
                const bookDoc = await transaction.get(bookRef);
                if (bookDoc.exists) {
                  const bData = bookDoc.data() || {};
                  const currentStock = typeof bData.stock === "number" ? bData.stock : 0;
                  const currentSoldCount = typeof bData.soldCount === "number" ? bData.soldCount : 0;
                  const itemQty = Math.max(1, Number(item.quantity) || 1);
                  const newStock = currentStock + itemQty;
                  const newSoldCount = Math.max(0, currentSoldCount - itemQty);

                  transaction.update(bookRef, {
                    stock: newStock,
                    soldCount: newSoldCount,
                    updatedAt: now
                  });

                  const txDocId = `tx_order_${orderNumber}_${item.bookId}_return`;
                  const invTxRef = firestoreAdmin.collection("inventoryTransactions").doc(txDocId);
                  transaction.set(invTxRef, {
                    id: txDocId,
                    transactionId: txDocId,
                    bookId: item.bookId,
                    bookTitle: item.title,
                    orderId: orderNumber,
                    type: "RETURN",
                    reason: "returned_to_store",
                    quantity: itemQty,
                    changeQuantity: itemQty,
                    previousStock: currentStock,
                    newStock: newStock,
                    previousSoldCount: currentSoldCount,
                    newSoldCount: newSoldCount,
                    performedBy: authUser.uid,
                    performedByName: authUser.displayName || "Staff",
                    createdAt: now
                  });
                }
              }
            }
          }

          const existingHistory = oData.statusHistory || [];
          transaction.update(orderDocRef, {
            orderStatus: "returned_to_store",
            returnCondition: returnCondition || "good",
            isRestocked: shouldRestock,
            updatedAt: now,
            statusHistory: [
              ...existingHistory,
              {
                status: "returned_to_store",
                timestamp: now,
                note: `Package returned to store (${returnCondition || "good"}) by ${authUser.displayName || "Staff"}. ${shouldRestock ? "Restocked to inventory." : "Damaged: not restocked."} Note: ${notes || "No extra note"}`
              }
            ]
          });
        });
      } else {
        const orderData = localMemoryStore.orders.get(orderId);
        if (orderData) {
          orderData.orderStatus = "returned_to_store";
          orderData.isRestocked = returnCondition !== "damaged";
          orderData.updatedAt = now;
          orderNumber = orderData.orderId;
        }
      }

      res.json({
        success: true,
        orderId: orderNumber || orderId,
        message: `Order ${orderNumber || orderId} returned and inventory updated.`
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        code: err?.code || "RETURN_FAILED",
        message: err?.message || "Failed to process return."
      });
    }
  });

  // ==============================================================================
  // 5. ATOMIC ADMIN & EMPLOYEE RESTOCK ENDPOINT (PRIVILEGED)
  // ==============================================================================
  app.post("/api/admin/inventory/restock", requirePermission("inventory.restock"), async (req, res) => {
    try {
      const authUser = (req as any).user as AuthenticatedUser;
      const { bookId, quantity, reason } = req.body;

      const addQty = Number(quantity);
      if (!bookId || isNaN(addQty) || addQty <= 0) {
        res.status(400).json({ success: false, code: "INVALID_PARAM", message: "Valid bookId and positive quantity are required." });
        return;
      }

      const now = new Date().toISOString();
      let updatedBook: any = null;

      if (firestoreAdmin) {
        const bookRef = firestoreAdmin.collection("books").doc(bookId);
        await firestoreAdmin.runTransaction(async (transaction) => {
          const bookDoc = await transaction.get(bookRef);
          if (!bookDoc.exists) {
            const err: any = new Error(`Book "${bookId}" not found.`);
            err.code = "BOOK_NOT_FOUND";
            throw err;
          }

          const bData = bookDoc.data() || {};
          const currentStock = typeof bData.stock === "number" ? bData.stock : 0;
          const newStock = currentStock + addQty;

          transaction.update(bookRef, {
            stock: newStock,
            updatedAt: now
          });

          const txDocId = `tx_restock_${bookId}_${Date.now()}`;
          const invTxRef = firestoreAdmin.collection("inventoryTransactions").doc(txDocId);
          transaction.set(invTxRef, {
            id: txDocId,
            transactionId: txDocId,
            bookId,
            bookTitle: bData.title || bookId,
            type: "RESTOCK",
            reason: reason || "staff_restock",
            quantity: addQty,
            changeQuantity: addQty,
            previousStock: currentStock,
            newStock: newStock,
            performedBy: authUser.uid,
            performedByName: authUser.displayName || "Store Staff",
            createdAt: now
          });

          updatedBook = { id: bookDoc.id, ...bData, stock: newStock, updatedAt: now };
        });
      } else {
        const memBook = localMemoryStore.books.get(bookId);
        if (!memBook) {
          res.status(404).json({ success: false, code: "BOOK_NOT_FOUND", message: `Book "${bookId}" not found.` });
          return;
        }

        const currentStock = typeof memBook.stock === "number" ? memBook.stock : 0;
        memBook.stock = currentStock + addQty;
        memBook.updatedAt = now;
        updatedBook = { ...memBook };

        localMemoryStore.inventoryTransactions.push({
          id: `tx_restock_${bookId}_${Date.now()}`,
          bookId,
          bookTitle: memBook.title || bookId,
          type: "RESTOCK",
          reason: reason || "staff_restock",
          quantity: addQty,
          changeQuantity: addQty,
          previousStock: currentStock,
          newStock: memBook.stock,
          performedBy: authUser.uid,
          performedByName: authUser.displayName || "Store Staff",
          createdAt: now
        });
      }

      res.json({
        success: true,
        book: updatedBook,
        message: `Successfully restocked +${addQty} copies. New stock: ${updatedBook?.stock}`
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        code: err?.code || "RESTOCK_FAILED",
        message: err?.message || "Failed to restock book."
      });
    }
  });

  // ==============================================================================
  // 6. ATOMIC INVENTORY ADJUSTMENT ENDPOINT (PRIVILEGED)
  // ==============================================================================
  app.post("/api/admin/inventory/adjust", requirePermission("inventory.adjust"), async (req, res) => {
    try {
      const authUser = (req as any).user as AuthenticatedUser;
      const { bookId, targetStock, reason } = req.body;

      const newTarget = Number(targetStock);
      if (!bookId || isNaN(newTarget) || newTarget < 0) {
        res.status(400).json({ success: false, code: "INVALID_PARAM", message: "Valid bookId and non-negative target stock required." });
        return;
      }

      const now = new Date().toISOString();
      let updatedBook: any = null;

      if (firestoreAdmin) {
        const bookRef = firestoreAdmin.collection("books").doc(bookId);
        await firestoreAdmin.runTransaction(async (transaction) => {
          const bookDoc = await transaction.get(bookRef);
          if (!bookDoc.exists) {
            const err: any = new Error(`Book "${bookId}" not found.`);
            err.code = "BOOK_NOT_FOUND";
            throw err;
          }

          const bData = bookDoc.data() || {};
          const currentStock = typeof bData.stock === "number" ? bData.stock : 0;
          const changeQty = newTarget - currentStock;

          transaction.update(bookRef, {
            stock: newTarget,
            updatedAt: now
          });

          const txDocId = `tx_adjust_${bookId}_${Date.now()}`;
          const invTxRef = firestoreAdmin.collection("inventoryTransactions").doc(txDocId);
          transaction.set(invTxRef, {
            id: txDocId,
            transactionId: txDocId,
            bookId,
            bookTitle: bData.title || bookId,
            type: "ADJUSTMENT",
            reason: reason || "manual_inventory_adjustment",
            quantity: Math.abs(changeQty),
            changeQuantity: changeQty,
            previousStock: currentStock,
            newStock: newTarget,
            performedBy: authUser.uid,
            performedByName: authUser.displayName || "Store Admin",
            createdAt: now
          });

          updatedBook = { id: bookDoc.id, ...bData, stock: newTarget, updatedAt: now };
        });
      } else {
        const memBook = localMemoryStore.books.get(bookId);
        if (!memBook) {
          res.status(404).json({ success: false, code: "BOOK_NOT_FOUND", message: `Book "${bookId}" not found.` });
          return;
        }

        const currentStock = typeof memBook.stock === "number" ? memBook.stock : 0;
        const changeQty = newTarget - currentStock;
        memBook.stock = newTarget;
        memBook.updatedAt = now;
        updatedBook = { ...memBook };

        localMemoryStore.inventoryTransactions.push({
          id: `tx_adjust_${bookId}_${Date.now()}`,
          bookId,
          bookTitle: memBook.title || bookId,
          type: "ADJUSTMENT",
          reason: reason || "manual_inventory_adjustment",
          quantity: Math.abs(changeQty),
          changeQuantity: changeQty,
          previousStock: currentStock,
          newStock: newTarget,
          performedBy: authUser.uid,
          performedByName: authUser.displayName || "Store Admin",
          createdAt: now
        });
      }

      res.json({
        success: true,
        book: updatedBook,
        message: `Inventory adjusted to ${newTarget} units.`
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        code: err?.code || "ADJUSTMENT_FAILED",
        message: err?.message || "Failed to adjust inventory."
      });
    }
  });

  // ==============================================================================
  // 7. SECURE & IDEMPOTENT PAYMENT VERIFICATION
  // ==============================================================================
  app.post("/api/payments/verify", requireAuth, async (req, res) => {
    try {
      const { orderId, paymentMethod, transactionRef, amount, providerStatus } = req.body;

      if (!orderId) {
        res.status(400).json({ success: false, code: "MISSING_PARAM", message: "Order ID is required for verification." });
        return;
      }

      let order: any = null;
      let orderDocRef: any = null;

      if (firestoreAdmin) {
        try {
          const snap = await firestoreAdmin.collection("orders").doc(orderId).get();
          if (snap.exists) {
            order = snap.data();
            orderDocRef = snap.ref;
          }
        } catch (e) {}
      }

      if (!order) {
        order = localMemoryStore.orders.get(orderId);
      }

      if (!order) {
        res.status(404).json({ success: false, code: "ORDER_NOT_FOUND", message: "Order not found." });
        return;
      }

      // IDEMPOTENCY GUARD: If already paid, return immediately without duplicate side-effects
      if (order.paymentStatus === "paid") {
        res.json({
          success: true,
          alreadyProcessed: true,
          orderId: order.orderId,
          message: "Payment was already verified and confirmed."
        });
        return;
      }

      // FINANCIAL SECURITY: Verify provider amount matches server-calculated grandTotal!
      const expectedAmount = Number(order.grandTotal || 0);
      const verifiedAmount = Number(amount || 0);

      if (amount !== undefined && verifiedAmount !== expectedAmount) {
        console.error(
          `[SECURITY ALERT] Payment amount mismatch for order ${order.orderId}! Expected: ${expectedAmount} ETB, Received: ${verifiedAmount} ETB.`
        );

        if (firestoreAdmin && orderDocRef) {
          await orderDocRef.update({
            paymentStatus: "failed",
            paymentMismatchError: `Received ${verifiedAmount} ETB but order total is ${expectedAmount} ETB.`,
            updatedAt: new Date().toISOString()
          });
        }

        res.status(400).json({
          success: false,
          mismatch: true,
          code: "PAYMENT_AMOUNT_MISMATCH",
          message: `Payment amount (${verifiedAmount} ETB) does not match required order total (${expectedAmount} ETB). Payment not confirmed.`
        });
        return;
      }

      const now = new Date().toISOString();
      const finalTxRef = transactionRef || `TXN-${Math.floor(10000000 + Math.random() * 90000000)}`;

      if (firestoreAdmin && orderDocRef) {
        await orderDocRef.update({
          paymentStatus: "paid",
          orderStatus: "confirmed",
          isReceiptVerified: true,
          verifiedReceiptNumber: finalTxRef,
          verifiedAt: now,
          updatedAt: now
        });
      }

      order.paymentStatus = "paid";
      order.orderStatus = "confirmed";
      order.isReceiptVerified = true;
      order.verifiedReceiptNumber = finalTxRef;
      order.verifiedAt = now;
      order.updatedAt = now;

      localMemoryStore.orders.set(orderId, order);

      res.json({
        success: true,
        orderId: order.orderId,
        transactionId: finalTxRef,
        verifiedAmount: expectedAmount,
        paymentStatus: "paid",
        orderStatus: "confirmed",
        timestamp: now
      });
    } catch (err: any) {
      res.status(500).json({ success: false, code: "VERIFICATION_ERROR", message: err.message || "Failed to verify payment." });
    }
  });

  // ==============================================================================
  // 8. ADMIN SMTP CONFIGURATION ENDPOINTS (STRICT ADMIN ONLY)
  // ==============================================================================
  app.get("/api/admin/smtp-config", requireAdmin, (_req, res) => {
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

  app.post("/api/admin/save-smtp-config", requireAdmin, (req, res) => {
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
        message: newConfig.configured
          ? "SMTP Configuration updated successfully!"
          : "SMTP configuration saved, but fields are incomplete."
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err?.message || "Failed to update SMTP configuration" });
    }
  });

  // ==============================================================================
  // 9. ADMIN TEST EMAIL ENDPOINT (STRICT ADMIN ONLY)
  // ==============================================================================
  app.post("/api/admin/test-email", requireAdmin, async (req, res) => {
    try {
      const { toEmail, subject, textMessage } = req.body;
      const cleanTo = String(toEmail || "").trim();

      if (!isValidEmail(cleanTo)) {
        res.status(400).json({
          success: false,
          code: "INVALID_RECIPIENT",
          message: "Please specify a valid recipient email address."
        });
        return;
      }

      const smtpConfig = getSmtpTransporter();
      if (!smtpConfig.configured || !smtpConfig.transporter) {
        logEmailEvent("email.configuration.invalid", {
          endpoint: "/api/admin/test-email",
          reason: "SMTP is not configured on the server."
        });
        res.status(400).json({
          success: false,
          configured: false,
          code: "SMTP_UNCONFIGURED",
          message: "SMTP is not fully configured. Please configure host, user, and password.",
          hint: "Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and ADMIN_EMAIL in environment variables."
        });
        return;
      }

      const safeSubject = sanitizeSubject(subject || "✅ [JJ Bookstore] SMTP Test Email");
      const safeText = escapeHtml(textMessage || "This is a verified test email sent from JJ Book Store SMTP Server.");
      const fromAddress = `"${smtpConfig.fromName}" <${smtpConfig.fromEmail}>`;

      logEmailEvent("email.send.started", { type: "admin_test", recipient: cleanTo });

      await smtpConfig.transporter.sendMail({
        from: fromAddress,
        to: cleanTo,
        subject: safeSubject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 540px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
            <div style="background-color: #064e3b; color: #ecfdf5; padding: 18px; text-align: center;">
              <h2 style="margin: 0; font-size: 18px; color: #34d399;">JJ BOOKSTORE SMTP TEST</h2>
            </div>
            <div style="padding: 20px; color: #334155; font-size: 14px; line-height: 1.5;">
              <p>Hello,</p>
              <p>${safeText}</p>
              <p style="margin-top: 20px; font-size: 12px; color: #64748b;">
                SMTP Server: <strong>${escapeHtml(smtpConfig.host)}:${smtpConfig.port}</strong> (TLS: ${smtpConfig.secure ? "SMTPS/465" : "STARTTLS/587"})<br/>
                Sender Address: <strong>${escapeHtml(smtpConfig.fromEmail)}</strong>
              </p>
            </div>
          </div>
        `
      });

      logEmailEvent("email.send.success", { type: "admin_test", recipient: cleanTo });

      res.json({
        success: true,
        configured: true,
        message: `Test email successfully dispatched to ${cleanTo}!`
      });
    } catch (err: any) {
      logEmailEvent("email.send.failed", { type: "admin_test", error: err?.message });
      res.status(500).json({
        success: false,
        code: "EMAIL_SEND_FAILED",
        message: "Failed to dispatch test email. Please check your SMTP host credentials and connection.",
        hint: "Verify host server, port (587/465), user, password, and SSL/TLS configuration."
      });
    }
  });

  // ==============================================================================
  // 10. ORDER STATUS EMAIL DISPATCH (EMPLOYEE/ADMIN ONLY)
  // ==============================================================================
  app.post("/api/orders/send-status-email", requireEmployee, async (req, res) => {
    try {
      const { orderId, type, verifiedByEmployeeName, receiptNumber, note } = req.body;
      if (!orderId || !type) {
        res.status(400).json({ success: false, code: "MISSING_PARAM", message: "Order ID and email type are required." });
        return;
      }

      let order: any = null;
      if (firestoreAdmin) {
        try {
          const snap = await firestoreAdmin.collection("orders").doc(orderId).get();
          if (snap.exists) order = { id: snap.id, ...snap.data() };
        } catch (e) {}
      }
      if (!order) {
        order = localMemoryStore.orders.get(orderId);
      }

      if (!order) {
        res.status(404).json({ success: false, code: "ORDER_NOT_FOUND", message: "Order not found." });
        return;
      }

      const eventKey = type === "approved" ? "payment_verified" : type === "rejected" ? "payment_rejected" : `status_${type}`;
      if (order.emailDelivery?.[eventKey]?.status === "sent") {
        logEmailEvent("email.duplicate.prevented", { type: eventKey, orderId: order.orderId });
        res.json({ success: true, alreadySent: true, message: "Status email was already dispatched." });
        return;
      }

      const smtpConfig = getSmtpTransporter();
      if (!smtpConfig.configured || !smtpConfig.transporter) {
        logEmailEvent("email.send.unavailable", { type: eventKey, orderId: order.orderId, reason: "SMTP not configured" });
        res.json({ success: true, sent: false, message: "Email delivery unavailable; status recorded in system." });
        return;
      }

      const customerEmail = (order.customerEmail || "").trim();
      if (!isValidEmail(customerEmail)) {
        res.status(400).json({ success: false, code: "INVALID_CUSTOMER_EMAIL", message: "Customer email is invalid." });
        return;
      }

      const safeOrderId = escapeHtml(order.orderId || orderId);
      const safeCustomerName = escapeHtml(order.customerName || "Customer");
      const safeVerifier = escapeHtml(verifiedByEmployeeName || "Store Staff");
      const safeReceipt = escapeHtml(receiptNumber || order.paymentReference || "N/A");
      const safeNote = note ? escapeHtml(note) : "";
      const fromAddress = `"${smtpConfig.fromName}" <${smtpConfig.fromEmail}>`;

      const subject = type === "approved"
        ? sanitizeSubject(`✅ [JJ Bookstore] Order #${order.orderId || orderId} Payment Verified & Order Confirmed!`)
        : sanitizeSubject(`⚠️ [JJ Bookstore] Payment Verification Alert for Order #${order.orderId || orderId}`);

      const htmlBody = type === "approved"
        ? `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
            <div style="background-color: #064e3b; color: #ecfdf5; padding: 22px; text-align: center;">
              <h1 style="margin: 0; font-size: 22px; color: #34d399;">JJ BOOKSTORE</h1>
              <p style="margin: 4px 0 0; font-size: 13px; color: #a7f3d0;">Payment Verified & Order Confirmed</p>
            </div>
            <div style="padding: 24px;">
              <p>Dear <strong>${safeCustomerName}</strong>,</p>
              <p>Your payment for order <strong>#${safeOrderId}</strong> has been successfully verified by our staff (<strong>${safeVerifier}</strong>). Receipt #: <strong>${safeReceipt}</strong>.</p>
              ${safeNote ? `<p style="font-style: italic; color: #475569;">Note: "${safeNote}"</p>` : ""}
              <p style="margin-top: 16px;">Total Amount: <strong>${escapeHtml(order.grandTotal)} ETB</strong></p>
            </div>
          </div>
        `
        : `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
            <div style="background-color: #7f1d1d; color: #fef2f2; padding: 22px; text-align: center;">
              <h1 style="margin: 0; font-size: 22px; color: #fca5a5;">JJ BOOKSTORE</h1>
              <p style="margin: 4px 0 0; font-size: 13px; color: #fecaca;">Payment Verification Issue</p>
            </div>
            <div style="padding: 24px;">
              <p>Dear <strong>${safeCustomerName}</strong>,</p>
              <p>Our staff (<strong>${safeVerifier}</strong>) checked your order <strong>#${safeOrderId}</strong> and found an issue with the transaction reference.</p>
              ${safeNote ? `<p style="font-style: italic; color: #991b1b;">Reason: "${safeNote}"</p>` : ""}
              <p>Please contact customer support with your payment transfer confirmation to dispatch your books.</p>
            </div>
          </div>
        `;

      await smtpConfig.transporter.sendMail({
        from: fromAddress,
        to: customerEmail,
        subject,
        html: htmlBody
      });

      const sentTime = new Date().toISOString();
      if (!order.emailDelivery) order.emailDelivery = {};
      order.emailDelivery[eventKey] = { status: "sent", sentAt: sentTime };

      if (firestoreAdmin && order.id) {
        try {
          await firestoreAdmin.collection("orders").doc(order.id).update({
            [`emailDelivery.${eventKey}`]: { status: "sent", sentAt: sentTime }
          });
        } catch (e) {}
      }

      logEmailEvent("email.send.success", { type: eventKey, orderId: order.orderId });
      res.json({ success: true, sent: true, message: `Status notification email dispatched to ${customerEmail}` });
    } catch (err: any) {
      logEmailEvent("email.send.failed", { error: err?.message });
      res.status(500).json({ success: false, message: "Failed to dispatch status email." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
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
    console.log(`JJ Book Shopping secure server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
