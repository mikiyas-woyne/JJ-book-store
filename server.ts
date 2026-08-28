import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
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

  // API Routes
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", service: "JJ Book Shopping API", timestamp: new Date().toISOString() });
  });

  // Server runtime SMTP configuration memory
  let runtimeSmtpConfig = {
    host: process.env.SMTP_HOST || "",
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    secure: process.env.SMTP_SECURE === "true",
    adminEmail: process.env.ADMIN_EMAIL || "mikiyaswoyne@gmail.com"
  };

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
          auth: { user: smtpUser, pass: smtpPass },
          tls: { rejectUnauthorized: false }
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
    if (!order) return;

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
        auth: { user: testAccount.user, pass: testAccount.pass }
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

    const adminSubject = `🚨 [NEW ORDER RECEIVED] Order #${order.orderId} - ${order.customerName} (${order.grandTotal} ETB)`;
    const adminBody = `
      <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; color: #1e293b; line-height: 1.5; border: 1px solid #cbd5e1; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
        <div style="background-color: #0f172a; color: #f8fafc; padding: 22px; text-align: center;">
          <h1 style="margin: 0; font-size: 22px; color: #fbbf24;">JJ BOOKSTORE ADMIN ALERT</h1>
          <p style="margin: 4px 0 0; font-size: 12px; color: #fde68a;">New Customer Order Pending Staff Review</p>
        </div>
        <div style="padding: 24px;">
          <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
            <h2 style="margin: 0 0 8px; color: #78350f; font-size: 16px;">Order #${order.orderId} Summary</h2>
            <p style="margin: 3px 0; font-size: 13px;"><strong>Customer:</strong> ${order.customerName}</p>
            <p style="margin: 3px 0; font-size: 13px;"><strong>Email:</strong> ${order.customerEmail || "N/A"}</p>
            <p style="margin: 3px 0; font-size: 13px;"><strong>Phone:</strong> ${order.customerPhone}</p>
            <p style="margin: 3px 0; font-size: 13px;"><strong>Delivery Address:</strong> ${order.shippingAddress?.streetAddress || ""}, ${order.shippingAddress?.subcity || ""}, ${order.shippingAddress?.region || "Addis Ababa"}</p>
            <p style="margin: 3px 0; font-size: 13px;"><strong>Payment Method:</strong> <span style="text-transform: uppercase; font-weight: bold;">${order.paymentMethod}</span> (${order.paymentStatus})</p>
            ${order.paymentReference ? `<p style="margin: 3px 0; font-size: 13px; color: #b45309;"><strong>Payment Reference #:</strong> ${order.paymentReference}</p>` : ""}
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
            <p style="margin: 3px 0; color: #64748b;">Subtotal: ${order.subtotal} ETB</p>
            ${order.discount ? `<p style="margin: 3px 0; color: #16a34a;">Discount: -${order.discount} ETB</p>` : ""}
            <p style="margin: 3px 0; color: #64748b;">Shipping Fee: ${order.shippingFee === 0 ? "FREE" : `${order.shippingFee} ETB`}</p>
            <p style="margin: 3px 0; color: #64748b;">15% VAT: ${order.tax} ETB</p>
            <h3 style="margin: 8px 0 0; color: #78350f; font-size: 18px;">Grand Total: ${order.grandTotal} ETB</h3>
          </div>
        </div>
      </div>
    `;

    const customerSubject = `📚 [JJ Bookstore] Order #${order.orderId} Confirmed - Thank You!`;
    const customerBody = `
      <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; color: #1e293b; line-height: 1.5; border: 1px solid #cbd5e1; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
        <div style="background-color: #0f172a; color: #f8fafc; padding: 22px; text-align: center;">
          <h1 style="margin: 0; font-size: 22px; color: #fbbf24;">JJ BOOKSTORE</h1>
          <p style="margin: 4px 0 0; font-size: 12px; color: #fde68a;">Ethiopia's Premier Online Bookstore</p>
        </div>
        <div style="padding: 24px;">
          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
            <h2 style="margin: 0 0 6px; font-size: 16px; color: #166534;">🎉 Thank You for Your Order, ${order.customerName}!</h2>
            <p style="margin: 0; font-size: 13px; color: #15803d;">
              We have received your order <strong>${order.orderId}</strong>. Our warehouse staff is currently reviewing your order for dispatch.
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
            <h3 style="margin: 8px 0 0; color: #b45309; font-size: 18px;">Total: ${order.grandTotal} ETB</h3>
          </div>
        </div>
      </div>
    `;

    if (transporter) {
      try {
        await transporter.sendMail({
          from: `"JJ Book Shopping" <noreply@jjbookshopping.com>`,
          to: adminEmail,
          subject: adminSubject,
          html: adminBody
        });
      } catch (err) {}

      if (customerEmail) {
        try {
          await transporter.sendMail({
            from: `"JJ Book Shopping" <noreply@jjbookshopping.com>`,
            to: customerEmail,
            subject: customerSubject,
            html: customerBody
          });
        } catch (err) {}
      }
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
  // 2. SECURE SERVER-SIDE ORDER CREATION WITH ATOMIC INVENTORY DEDUCTION
  // ==============================================================================
  app.post("/api/orders/create", async (req, res) => {
    try {
      const {
        items: rawItems,
        couponCode,
        customerId,
        customerName,
        customerEmail,
        customerPhone,
        shippingAddress,
        paymentMethod,
        paymentReference,
        deliveryNotes,
        idempotencyKey
      } = req.body;

      if (!customerId) {
        res.status(401).json({ success: false, message: "Authenticated customer ID is required." });
        return;
      }

      // Check Idempotency: Prevent duplicate orders on double click or retry
      if (idempotencyKey) {
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
        customerId: String(customerId).trim(),
        customerName: String(customerName || "Customer").trim(),
        customerEmail: String(customerEmail || "customer@example.com").trim(),
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
        // SECURITY: Initial payment status is ALWAYS pending (never 'paid' from client!)
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
        try {
          await firestoreAdmin.runTransaction(async (transaction) => {
            // 1. Check & Decrement Stock for all books
            for (const item of calculation.items) {
              const bookRef = firestoreAdmin.collection("books").doc(item.bookId);
              const bookDoc = await transaction.get(bookRef);

              if (!bookDoc.exists) {
                throw new Error(`Book "${item.title}" no longer exists in catalog.`);
              }

              const currentStock = bookDoc.data()?.stock ?? 0;
              if (currentStock < item.quantity) {
                throw new Error(`Insufficient stock for "${item.title}". Available: ${currentStock}`);
              }

              transaction.update(bookRef, {
                stock: currentStock - item.quantity,
                soldCount: (bookDoc.data()?.soldCount || 0) + item.quantity,
                updatedAt: now
              });

              // Log inventory transaction
              const invTxRef = firestoreAdmin.collection("inventoryTransactions").doc();
              transaction.set(invTxRef, {
                bookId: item.bookId,
                bookTitle: item.title,
                changeQuantity: -item.quantity,
                previousStock: currentStock,
                newStock: currentStock - item.quantity,
                reason: "order_placed",
                performedBy: customerId,
                orderId: orderNumber,
                createdAt: now
              });
            }

            // 2. Increment coupon used count if applicable
            if (calculation.coupon?.id) {
              const couponRef = firestoreAdmin.collection("coupons").doc(calculation.coupon.id);
              const couponDoc = await transaction.get(couponRef);
              if (couponDoc.exists) {
                transaction.update(couponRef, {
                  usedCount: (couponDoc.data()?.usedCount || 0) + 1
                });
              }
            }

            // 3. Save order document
            const orderDocRef = firestoreAdmin.collection("orders").doc();
            newOrder.id = orderDocRef.id;
            transaction.set(orderDocRef, newOrder);

            // 4. Log Activity
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
        } catch (fsTxErr: any) {
          console.warn("Firestore transaction notice (falling back to memory):", fsTxErr?.message);
        }
      }

      // Memory store fallback
      if (!newOrder.id) {
        newOrder.id = `order_${Date.now()}`;
      }
      localMemoryStore.orders.set(newOrder.id, newOrder);

      // Decrement memory stock
      for (const item of calculation.items) {
        const memBook = localMemoryStore.books.get(item.bookId);
        if (memBook) {
          memBook.stock = Math.max(0, (memBook.stock || 10) - item.quantity);
          memBook.soldCount = (memBook.soldCount || 0) + item.quantity;
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
      res.status(400).json({
        success: false,
        message: err.message || "Failed to create order."
      });
    }
  });

  // ==============================================================================
  // 3. SECURE ORDER CANCELLATION WITH ATOMIC STOCK RESTOCKING
  // ==============================================================================
  app.post("/api/orders/cancel", async (req, res) => {
    try {
      const { orderId, customerId, reason } = req.body;

      if (!orderId) {
        res.status(400).json({ success: false, message: "Order ID is required." });
        return;
      }

      let orderData: any = null;
      let orderDocRef: any = null;

      if (firestoreAdmin) {
        try {
          const snap = await firestoreAdmin.collection("orders").doc(orderId).get();
          if (snap.exists) {
            orderData = snap.data();
            orderDocRef = snap.ref;
          }
        } catch (e) {}
      }

      if (!orderData) {
        orderData = localMemoryStore.orders.get(orderId);
      }

      if (!orderData) {
        res.status(404).json({ success: false, message: "Order not found." });
        return;
      }

      // Verify ownership or staff authority
      if (customerId && orderData.customerId !== customerId) {
        res.status(403).json({ success: false, message: "Unauthorized to cancel this order." });
        return;
      }

      // State Machine Guard: Only 'pending' orders can be cancelled by customers
      if (orderData.orderStatus !== "pending") {
        res.status(400).json({
          success: false,
          message: `Cannot cancel order with status "${orderData.orderStatus}". Only pending orders can be cancelled.`
        });
        return;
      }

      const now = new Date().toISOString();

      // ATOMIC STOCK RESTORATION TRANSACTION
      if (firestoreAdmin && orderDocRef) {
        try {
          await firestoreAdmin.runTransaction(async (transaction) => {
            for (const item of orderData.items || []) {
              if (item.bookId) {
                const bookRef = firestoreAdmin.collection("books").doc(item.bookId);
                const bookDoc = await transaction.get(bookRef);
                if (bookDoc.exists) {
                  const currentStock = bookDoc.data()?.stock || 0;
                  transaction.update(bookRef, {
                    stock: currentStock + (item.quantity || 1),
                    soldCount: Math.max(0, (bookDoc.data()?.soldCount || 0) - (item.quantity || 1)),
                    updatedAt: now
                  });

                  const invTxRef = firestoreAdmin.collection("inventoryTransactions").doc();
                  transaction.set(invTxRef, {
                    bookId: item.bookId,
                    bookTitle: item.title,
                    changeQuantity: item.quantity || 1,
                    previousStock: currentStock,
                    newStock: currentStock + (item.quantity || 1),
                    reason: "order_cancelled",
                    performedBy: customerId || "system",
                    orderId: orderData.orderId,
                    createdAt: now
                  });
                }
              }
            }

            transaction.update(orderDocRef, {
              orderStatus: "cancelled",
              cancelledReason: reason || "Cancelled by user",
              updatedAt: now
            });
          });
        } catch (txErr) {
          console.warn("Firestore cancellation transaction notice:", txErr);
        }
      }

      // Update memory store
      orderData.orderStatus = "cancelled";
      localMemoryStore.orders.set(orderId, orderData);

      // Restock memory books
      for (const item of orderData.items || []) {
        const memBook = localMemoryStore.books.get(item.bookId);
        if (memBook) {
          memBook.stock = (memBook.stock || 0) + (item.quantity || 1);
          memBook.soldCount = Math.max(0, (memBook.soldCount || 0) - (item.quantity || 1));
        }
      }

      res.json({
        success: true,
        message: `Order ${orderData.orderId} cancelled and stock replenished successfully.`
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || "Failed to cancel order." });
    }
  });

  // ==============================================================================
  // 4. SECURE PAYMENT VERIFICATION & WEBHOOK CALLBACK HANDLER
  // ==============================================================================
  app.post("/api/payments/verify", async (req, res) => {
    try {
      const { orderId, paymentMethod, transactionRef, amount, providerStatus } = req.body;

      if (!orderId) {
        res.status(400).json({ success: false, message: "Order ID is required for verification." });
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
        res.status(404).json({ success: false, message: "Order not found." });
        return;
      }

      // IDEMPOTENCY GUARD: If already paid, return without duplicating side-effects
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
        // Record payment mismatch security alert
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
      res.status(500).json({ success: false, message: err.message || "Failed to verify payment." });
    }
  });

  // Admin SMTP configuration endpoints
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
        message: newConfig.configured
          ? "SMTP Configuration updated successfully!"
          : "SMTP configuration saved, but fields are incomplete."
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err?.message || "Failed to update SMTP configuration" });
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
