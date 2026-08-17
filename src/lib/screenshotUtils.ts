import html2canvas from "html2canvas";
import { Order } from "../types";

/**
 * Sanitizes stylesheets in the cloned document for html2canvas
 * to prevent crashes caused by unsupported CSS color functions like `oklch()`.
 */
export function sanitizeClonedDocForHtml2Canvas(clonedDoc: Document): void {
  try {
    // 1. Sanitize all <style> elements in the cloned document containing oklch(...)
    const styleElements = clonedDoc.querySelectorAll("style");
    styleElements.forEach((styleEl) => {
      if (styleEl.textContent && styleEl.textContent.includes("oklch")) {
        styleEl.textContent = styleEl.textContent.replace(
          /oklch\([^)]+\)/gi,
          (match) => {
            if (match.includes("/")) {
              const parts = match.split("/");
              const alpha = parts[1]?.replace(")", "").trim() || "1";
              return `rgba(30, 41, 59, ${alpha})`;
            }
            return "rgb(30, 41, 59)";
          }
        );
      }
    });

    // 2. Sanitize inline style attributes on all cloned elements
    const elementsWithStyle = clonedDoc.querySelectorAll("[style]");
    elementsWithStyle.forEach((el) => {
      const htmlEl = el as HTMLElement;
      if (htmlEl.style && htmlEl.style.cssText && htmlEl.style.cssText.includes("oklch")) {
        htmlEl.style.cssText = htmlEl.style.cssText.replace(
          /oklch\([^)]+\)/gi,
          "rgb(30, 41, 59)"
        );
      }
    });

    // 3. Remove external stylesheet links that might contain unparseable oklch rules
    const linkElements = clonedDoc.querySelectorAll("link[rel='stylesheet']");
    linkElements.forEach((linkEl) => {
      try {
        const href = linkEl.getAttribute("href");
        if (href && (href.includes("tailwind") || href.includes("oklch"))) {
          linkEl.remove();
        }
      } catch {
        // ignore
      }
    });
  } catch (err) {
    console.warn("Error during clonedDoc sanitization:", err);
  }
}

/**
 * Safely captures an HTML element as a canvas without crashing on oklch CSS color functions.
 */
export async function captureElementToCanvas(
  element: HTMLElement,
  options: Parameters<typeof html2canvas>[1] = {}
): Promise<HTMLCanvasElement> {
  const { onclone: userOnClone, ...restOptions } = options;

  const mergedOptions: Parameters<typeof html2canvas>[1] = {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: "#ffffff",
    logging: false,
    onclone: (clonedDoc, clonedElement) => {
      sanitizeClonedDocForHtml2Canvas(clonedDoc);
      if (userOnClone) {
        userOnClone(clonedDoc, clonedElement);
      }
    },
    ...restOptions
  };

  return await html2canvas(element, mergedOptions);
}

/**
 * Generates an ultra-sharp, publication-quality Canvas voucher receipt for any order.
 * This is 100% reliable across all browsers and iframes, independent of CSS stylesheets.
 */
export function generateOrderReceiptCanvas(order: Order): HTMLCanvasElement {
  const width = 800;
  const padding = 40;
  const itemsCount = order.items?.length || 1;
  const itemRowHeight = 36;
  const calculatedHeight = Math.max(900, 580 + itemsCount * itemRowHeight);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = calculatedHeight;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Could not get 2D canvas context");
  }

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, calculatedHeight);

  // Outer border & shadow effect
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, width - 20, calculatedHeight - 20);

  // Top Gold Accent Line
  ctx.fillStyle = "#d97706";
  ctx.fillRect(10, 10, width - 20, 8);

  // Header Banner
  ctx.fillStyle = "#451a03";
  ctx.fillRect(10, 18, width - 20, 110);

  // Header Typography
  ctx.fillStyle = "#fbbf24";
  ctx.font = "bold 28px serif, Georgia, 'Times New Roman'";
  ctx.fillText("JJ BOOKSTORE ETHIOPIA", padding, 65);

  ctx.fillStyle = "#fde68a";
  ctx.font = "bold 13px sans-serif";
  ctx.fillText("OFFICIAL SALES VOUCHER & PURCHASE RECEIPT", padding, 92);

  // Order ID Badge in Header (Right aligned)
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 20px monospace, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(`#${order.orderId}`, width - padding, 65);

  ctx.fillStyle = "#cbd5e1";
  ctx.font = "12px sans-serif";
  const formattedDate = new Date(order.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
  ctx.fillText(formattedDate, width - padding, 92);
  ctx.textAlign = "left"; // Reset

  let currentY = 155;

  // Customer & Shipping Info Box
  ctx.fillStyle = "#f8fafc";
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1;
  ctx.fillRect(padding, currentY, width - padding * 2, 105);
  ctx.strokeRect(padding, currentY, width - padding * 2, 105);

  // Left column: Customer
  ctx.fillStyle = "#64748b";
  ctx.font = "bold 11px sans-serif";
  ctx.fillText("CUSTOMER DETAILS", padding + 16, currentY + 24);

  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 15px sans-serif";
  ctx.fillText(order.customerName || "JJ Customer", padding + 16, currentY + 48);

  ctx.fillStyle = "#475569";
  ctx.font = "13px sans-serif";
  ctx.fillText(`Phone: ${order.customerPhone || "N/A"}`, padding + 16, currentY + 70);
  ctx.fillText(`Email: ${order.customerEmail || "N/A"}`, padding + 16, currentY + 90);

  // Right column: Delivery
  const rightColX = width / 2 + 20;
  ctx.fillStyle = "#64748b";
  ctx.font = "bold 11px sans-serif";
  ctx.fillText("DELIVERY LOCATION", rightColX, currentY + 24);

  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 14px sans-serif";
  const subcityText = order.shippingAddress?.subcity ? `${order.shippingAddress.subcity}, ` : "";
  const streetText = order.shippingAddress?.streetAddress || "Addis Ababa Delivery";
  ctx.fillText(`${subcityText}${streetText}`, rightColX, currentY + 48);

  ctx.fillStyle = "#475569";
  ctx.font = "13px sans-serif";
  ctx.fillText(`Region: ${order.shippingAddress?.region || "Addis Ababa"}`, rightColX, currentY + 70);
  ctx.fillText(`Payment: ${String(order.paymentMethod).toUpperCase()} (${order.paymentStatus || "PENDING"})`, rightColX, currentY + 90);

  currentY += 130;

  // Items Table Header
  ctx.fillStyle = "#f1f5f9";
  ctx.fillRect(padding, currentY, width - padding * 2, 32);
  ctx.strokeStyle = "#cbd5e1";
  ctx.strokeRect(padding, currentY, width - padding * 2, 32);

  ctx.fillStyle = "#334155";
  ctx.font = "bold 12px sans-serif";
  ctx.fillText("BOOK TITLE / ITEM", padding + 12, currentY + 21);
  ctx.textAlign = "center";
  ctx.fillText("QTY", width - padding - 180, currentY + 21);
  ctx.fillText("UNIT PRICE", width - padding - 100, currentY + 21);
  ctx.textAlign = "right";
  ctx.fillText("TOTAL", width - padding - 12, currentY + 21);
  ctx.textAlign = "left";

  currentY += 32;

  // Items Rows
  (order.items || []).forEach((item, index) => {
    ctx.fillStyle = index % 2 === 0 ? "#ffffff" : "#f8fafc";
    ctx.fillRect(padding, currentY, width - padding * 2, itemRowHeight);

    ctx.strokeStyle = "#f1f5f9";
    ctx.lineWidth = 1;
    ctx.strokeRect(padding, currentY, width - padding * 2, itemRowHeight);

    // Title (truncate if long)
    ctx.fillStyle = "#0f172a";
    ctx.font = "13px sans-serif";
    const displayTitle = item.title.length > 42 ? item.title.substring(0, 40) + "..." : item.title;
    ctx.fillText(displayTitle, padding + 12, currentY + 23);

    // Qty
    ctx.fillStyle = "#475569";
    ctx.textAlign = "center";
    ctx.fillText(String(item.quantity), width - padding - 180, currentY + 23);

    // Unit Price
    ctx.fillText(`${item.price} ETB`, width - padding - 100, currentY + 23);

    // Total
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`${item.total || item.price * item.quantity} ETB`, width - padding - 12, currentY + 23);
    ctx.textAlign = "left";

    currentY += itemRowHeight;
  });

  currentY += 16;

  // Financial Breakdown Box (Right Aligned)
  const totalsBoxWidth = 320;
  const totalsBoxX = width - padding - totalsBoxWidth;

  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(totalsBoxX, currentY, totalsBoxWidth, 140);
  ctx.strokeStyle = "#e2e8f0";
  ctx.strokeRect(totalsBoxX, currentY, totalsBoxWidth, 140);

  const drawSummaryLine = (label: string, value: string, yPos: number, isBold = false, isHighlight = false) => {
    ctx.fillStyle = isHighlight ? "#b45309" : isBold ? "#0f172a" : "#475569";
    ctx.font = isBold ? "bold 14px sans-serif" : "13px sans-serif";
    ctx.fillText(label, totalsBoxX + 16, yPos);
    ctx.textAlign = "right";
    ctx.fillText(value, totalsBoxX + totalsBoxWidth - 16, yPos);
    ctx.textAlign = "left";
  };

  drawSummaryLine("Subtotal:", `${order.subtotal || order.grandTotal} ETB`, currentY + 26);
  if (order.discount && order.discount > 0) {
    drawSummaryLine("Coupon Discount:", `-${order.discount} ETB`, currentY + 50, false, true);
  }
  drawSummaryLine("Shipping Fee:", order.shippingFee === 0 ? "FREE" : `${order.shippingFee || 0} ETB`, currentY + 74);
  drawSummaryLine("15% VAT Tax:", `${order.tax || 0} ETB`, currentY + 98);

  // Grand Total Divider & Line
  ctx.strokeStyle = "#cbd5e1";
  ctx.beginPath();
  ctx.moveTo(totalsBoxX + 16, currentY + 108);
  ctx.lineTo(totalsBoxX + totalsBoxWidth - 16, currentY + 108);
  ctx.stroke();

  drawSummaryLine("GRAND TOTAL:", `${order.grandTotal} ETB`, currentY + 128, true, true);

  // Left Note: Payment Info
  const paymentBoxWidth = width - padding * 2 - totalsBoxWidth - 20;
  ctx.fillStyle = "#fffbeb";
  ctx.fillRect(padding, currentY, paymentBoxWidth, 140);
  ctx.strokeStyle = "#fef3c7";
  ctx.strokeRect(padding, currentY, paymentBoxWidth, 140);

  ctx.fillStyle = "#92400e";
  ctx.font = "bold 12px sans-serif";
  ctx.fillText("PAYMENT VERIFICATION", padding + 14, currentY + 26);

  ctx.fillStyle = "#78350f";
  ctx.font = "12px sans-serif";
  ctx.fillText(`Method: ${String(order.paymentMethod).toUpperCase()}`, padding + 14, currentY + 50);
  ctx.fillText(`Status: ${String(order.paymentStatus || "PENDING").toUpperCase()}`, padding + 14, currentY + 72);
  if (order.paymentReference) {
    ctx.fillText(`Ref Code: ${order.paymentReference}`, padding + 14, currentY + 94);
  }

  currentY += 160;

  // Footer & Barcode simulation
  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 11px monospace";
  ctx.textAlign = "center";
  ctx.fillText(`* JJ-${order.orderId}-${Date.now().toString().slice(-6)} *`, width / 2, currentY + 10);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "11px sans-serif";
  ctx.fillText("Thank you for buying books from JJ Bookstore Ethiopia! • Customer Support: +251 938 014 055", width / 2, currentY + 30);
  ctx.fillText("Bole, Addis Ababa, Ethiopia • https://jjbookshopping.com", width / 2, currentY + 48);

  return canvas;
}

/**
 * Downloads a receipt screenshot image for an order with high reliability.
 */
export async function downloadOrderReceiptScreenshot(
  order: Order,
  element?: HTMLElement | null
): Promise<void> {
  let canvas: HTMLCanvasElement;

  try {
    if (element) {
      canvas = await captureElementToCanvas(element, { scale: 2 });
    } else {
      canvas = generateOrderReceiptCanvas(order);
    }
  } catch (domErr) {
    console.warn("DOM html2canvas fallback to vector canvas receipt:", domErr);
    canvas = generateOrderReceiptCanvas(order);
  }

  const imageUri = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.href = imageUri;
  link.download = `JJ-Bookstore-Receipt-${order.orderId || "order"}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
