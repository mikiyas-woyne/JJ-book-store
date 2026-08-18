import React, { useState, useEffect } from "react";
import {
  Order,
  OrderStatus,
  Employee,
  PackageInfo,
  DeliveryAssignment,
  DeliveryHandoffRecord,
  EmailNotificationLog
} from "../../types";
import { sendCustomerOrderEmail } from "../../lib/emailService";
import {
  CheckCircle2,
  XCircle,
  PackageCheck,
  Truck,
  Box,
  ClipboardList,
  UserCheck,
  AlertTriangle,
  QrCode,
  MapPin,
  Phone,
  Clock,
  Printer,
  X,
  Sparkles,
  FileText,
  Mail,
  Send,
  Check
} from "lucide-react";
import { BarcodeScannerModal } from "./BarcodeScannerModal";

interface OrderWorkflowModalProps {
  isOpen?: boolean;
  order: Order | null;
  mode: "verify" | "prepare" | "pack" | "assign" | "deliver" | "return";
  onClose: () => void;
  onUpdateOrderStatus: (
    orderId: string,
    newStatus: OrderStatus,
    note: string,
    metadata?: Record<string, any>
  ) => Promise<void>;
  employees: Employee[];
  currentEmployee: Employee | null;
  onNavigateHome?: () => void;
}

export const OrderWorkflowModal: React.FC<OrderWorkflowModalProps> = ({
  isOpen = true,
  order,
  mode,
  onClose,
  onUpdateOrderStatus,
  employees,
  currentEmployee,
  onNavigateHome
}) => {
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState("");
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Verification Form State
  const [receiptNumber, setReceiptNumber] = useState(
    order?.verifiedReceiptNumber || order?.paymentReference || ""
  );
  const [verifierName, setVerifierName] = useState(
    currentEmployee?.fullName || order?.verifiedByEmployeeName || "Store Staff"
  );
  const [selectedVerifierId, setSelectedVerifierId] = useState(
    currentEmployee?.uid || order?.verifiedByEmployeeId || "emp-101"
  );

  // Item Picking Checklist State
  const [itemsChecklist, setItemsChecklist] = useState(
    order?.items
      ? order.items.map((it) => ({
          ...it,
          collected: true,
          shelfLocation: `Shelf ${it.bookId.slice(0, 2).toUpperCase()}-12`
        }))
      : []
  );

  // Packing Form State
  const [packageNumber, setPackageNumber] = useState(
    order?.orderId ? `PKG-${order.orderId.replace("#", "")}` : "PKG-0000"
  );
  const [packageType, setPackageType] = useState<"box" | "bubble_mailer" | "bag" | "envelope">("box");
  const [weightKg, setWeightKg] = useState("0.8");

  // Delivery Assignment State
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [expectedDate, setExpectedDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split("T")[0]
  );

  // Delivery Result State
  const [codAmountCollected, setCodAmountCollected] = useState(
    order?.grandTotal ? order.grandTotal.toString() : "0"
  );
  const [failedReason, setFailedReason] = useState("Customer unavailable at time of delivery");
  const [returnCondition, setReturnCondition] = useState<"good" | "damaged" | "opened">("good");

  // Email Dispatch State
  const [dispatchedEmailLog, setDispatchedEmailLog] = useState<EmailNotificationLog | null>(null);

  const drivers = employees.filter((e) => e.assignedRoles?.includes("delivery_personnel"));

  useEffect(() => {
    if (mode === "assign" && !selectedDriverId) {
      if (drivers.length > 0) {
        setSelectedDriverId(drivers[0].uid);
      } else {
        setSelectedDriverId("driver-default-01");
      }
    }
  }, [mode, drivers, selectedDriverId]);

  if (!isOpen || !order) return null;

  const toggleItemCollected = (index: number) => {
    const updated = [...itemsChecklist];
    updated[index].collected = !updated[index].collected;
    setItemsChecklist(updated);
  };

  const handleBarcodeScanned = (code: string) => {
    // If scanning during picking, mark matching book as collected
    const matchIdx = itemsChecklist.findIndex(
      (it) => code.includes(it.bookId) || code.includes("ISBN")
    );
    if (matchIdx !== -1) {
      const updated = [...itemsChecklist];
      updated[matchIdx].collected = true;
      setItemsChecklist(updated);
    } else {
      setPackageNumber(code);
    }
  };

  const handleCancelOrderInWorkflow = async () => {
    const cancelReason = prompt(
      `Enter reason for cancelling order ${order.orderId}:`,
      "Cancelled by store staff due to customer request or inventory shortage."
    );
    if (!cancelReason) return;

    setLoading(true);
    try {
      await onUpdateOrderStatus(order.id, "cancelled", cancelReason, {
        cancelledAt: new Date().toISOString(),
        cancelledByEmployeeName: currentEmployee?.fullName || "Store Staff"
      });
      alert(`Order ${order.orderId} marked as Cancelled.`);
      onClose();
    } catch (err) {
      console.error("Failed to cancel order:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmVerification = async (approved: boolean) => {
    setLoading(true);
    try {
      const status: OrderStatus = approved ? "confirmed" : "cancelled";
      const finalReceipt = receiptNumber.trim() || order.paymentReference || "N/A";
      const finalVerifierName = verifierName.trim() || currentEmployee?.fullName || "Store Staff";

      const statusNote = note || (
        approved
          ? `Receipt #${finalReceipt} verified by staff (${finalVerifierName}). Stock reserved.`
          : `Order rejected during receipt verification by staff (${finalVerifierName}).`
      );

      const metadata: Record<string, any> = {
        verifiedReceiptNumber: finalReceipt,
        paymentReference: finalReceipt,
        verifiedByEmployeeId: selectedVerifierId,
        verifiedByEmployeeName: finalVerifierName,
        verifiedAt: new Date().toISOString(),
        isReceiptVerified: approved,
        lastActionByEmployeeId: selectedVerifierId,
        lastActionByEmployeeName: finalVerifierName
      };

      if (approved && order.paymentMethod !== "cod") {
        metadata.paymentStatus = "paid";
      }

      await onUpdateOrderStatus(order.id, status, statusNote, metadata);

      // Automatically dispatch email notification to the customer
      const emailLog = await sendCustomerOrderEmail(
        order,
        approved ? "approved" : "rejected",
        finalVerifierName,
        finalReceipt,
        statusNote
      );

      setDispatchedEmailLog(emailLog);
    } catch (err) {
      console.error("Failed verification workflow:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFinishPreparation = async () => {
    setLoading(true);
    try {
      const allCollected = itemsChecklist.every((it) => it.collected);
      if (!allCollected) {
        if (!confirm("Some items are marked as missing. Proceed to packing with available items?")) {
          setLoading(false);
          return;
        }
      }
      const prepNote = note || `Books collected by ${currentEmployee?.fullName || "Staff"}. Ready for packaging.`;
      // Set status to "packed" so order advances from Stage 2 (Prepare) to Stage 3 (Packaging & Ready)
      await onUpdateOrderStatus(order.id, "packed", prepNote, {
        itemsChecklist
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleSavePacking = async () => {
    setLoading(true);
    try {
      const pkgInfo: PackageInfo = {
        orderId: order.id,
        packageNumber,
        itemCount: order.items.reduce((sum, i) => sum + i.quantity, 0),
        weightKg: parseFloat(weightKg) || 0.8,
        packageType,
        packedByEmployeeId: currentEmployee?.uid || "emp-101",
        packedByEmployeeName: currentEmployee?.fullName || "Store Packer",
        packedAt: new Date().toISOString()
      };

      const packNote = note || `Packed in ${packageType} (Ref: ${packageNumber}). Ready for delivery dispatch.`;
      await onUpdateOrderStatus(order.id, "ready_for_delivery", packNote, {
        packages: [pkgInfo]
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleAssignDelivery = async () => {
    const targetDriverId = selectedDriverId || (drivers.length > 0 ? drivers[0].uid : "driver-default-01");
    setLoading(true);
    try {
      const driver = employees.find((e) => e.uid === targetDriverId);
      const driverName = driver?.fullName || (targetDriverId === "driver-default-01" ? "Express Delivery Driver (Abebe)" : "Delivery Personnel");
      const assignNote = `Assigned to delivery driver ${driverName}. Expected: ${expectedDate}.`;
      
      await onUpdateOrderStatus(order.id, "assigned", assignNote, {
        assignedDeliveryDriverId: targetDriverId,
        assignedDeliveryDriverName: driverName,
        assignedDeliveryDriverPhone: driver?.phone || "+251 911 234 567",
        expectedDeliveryDate: expectedDate
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleDeliveryCompletion = async (success: boolean) => {
    setLoading(true);
    try {
      if (success) {
        const delNote = note || `Successfully delivered to customer. Collected: ETB ${codAmountCollected}`;
        await onUpdateOrderStatus(order.id, "delivered", delNote, {
          paymentStatus: "paid",
          amountCollected: parseFloat(codAmountCollected) || order.grandTotal
        });
      } else {
        const failNote = note || `Delivery failed: ${failedReason}`;
        await onUpdateOrderStatus(order.id, "delivery_failed", failNote, {
          deliveryFailedReason: failedReason
        });
      }
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterReturn = async () => {
    setLoading(true);
    try {
      const retNote = note || `Returned to store inventory. Condition: ${returnCondition}.`;
      await onUpdateOrderStatus(order.id, "returned_to_store", retNote, {
        returnCondition
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-6 border border-slate-200 shadow-2xl my-8 animate-in zoom-in-95">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-800 border border-amber-500/20">
                {mode === "verify" && <UserCheck className="w-5 h-5" />}
                {mode === "prepare" && <ClipboardList className="w-5 h-5" />}
                {mode === "pack" && <Box className="w-5 h-5" />}
                {mode === "assign" && <Truck className="w-5 h-5" />}
                {mode === "deliver" && <CheckCircle2 className="w-5 h-5" />}
                {mode === "return" && <AlertTriangle className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="font-serif font-extrabold text-lg text-slate-900">
                  {mode === "verify" && `Stage 2: Confirm Order ${order.orderId}`}
                  {mode === "prepare" && `Stage 3: Collect Books Checklist (${order.orderId})`}
                  {mode === "pack" && `Stage 4: Packaging & Ready for Delivery`}
                  {mode === "assign" && `Stage 5: Assign Delivery Personnel`}
                  {mode === "deliver" && `Stage 6: Record Delivery Result`}
                  {mode === "return" && `Return Package to Store Inventory`}
                </h3>
                <p className="text-xs text-slate-500">
                  Customer: <strong className="text-slate-800">{order.customerName}</strong> ({order.customerPhone})
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* IF EMAIL DISPATCHED SCREEN */}
          {dispatchedEmailLog ? (
            <div className="space-y-5 animate-in fade-in">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-emerald-600 text-white shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-serif font-bold text-sm text-emerald-950">
                    Automated Customer Email Notification Dispatched!
                  </h4>
                  <p className="text-xs text-emerald-800">
                    An email has been formatted, logged, and sent to <strong>{dispatchedEmailLog.recipientEmail}</strong> for Order {order.orderId}.
                  </p>
                </div>
              </div>

              {/* Email Record Details */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500 font-medium">Recipient:</span>
                  <strong className="text-slate-900">{dispatchedEmailLog.recipientName} ({dispatchedEmailLog.recipientEmail})</strong>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500 font-medium">Subject:</span>
                  <strong className="text-amber-800">{dispatchedEmailLog.subject}</strong>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500 font-medium">Verification Status:</span>
                  <span className={`px-2 py-0.5 rounded-md font-bold uppercase text-[10px] ${dispatchedEmailLog.emailType === "approved" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                    {dispatchedEmailLog.emailType === "approved" ? "Verified & Confirmed" : "Declined & Cancelled"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Verified By:</span>
                  <strong className="text-slate-800">{dispatchedEmailLog.verifiedByEmployeeName}</strong>
                </div>
              </div>

              {/* HTML Email Body Live Preview Box */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>HTML Email Body Render Preview</span>
                  <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                    <Check className="w-3 h-3" /> Dispatched to Customer Inbox
                  </span>
                </label>
                <div
                  className="max-h-64 overflow-y-auto p-4 bg-white rounded-2xl border border-slate-200 shadow-inner text-xs scrollbar-none"
                  dangerouslySetInnerHTML={{ __html: dispatchedEmailLog.htmlBody }}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  onClick={async () => {
                    await sendCustomerOrderEmail(
                      order,
                      dispatchedEmailLog.emailType as any,
                      dispatchedEmailLog.verifiedByEmployeeName || "Staff",
                      dispatchedEmailLog.receiptNumber,
                      dispatchedEmailLog.note
                    );
                    alert(`Email notification resent to ${dispatchedEmailLog.recipientEmail}!`);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5 text-amber-700" />
                  <span>Resend Email</span>
                </button>
                <button
                  onClick={() => {
                    onClose();
                    if (onNavigateHome) onNavigateHome();
                  }}
                  className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-extrabold text-xs shadow-md flex items-center gap-1.5 transition-all"
                >
                  <Check className="w-4 h-4" />
                  <span>Done (Go to Home)</span>
                </button>
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 text-slate-100 font-extrabold text-xs shadow-md hover:bg-slate-800"
                >
                  Close & Stay in Panel
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Mode 1: Order Verification */}
              {mode === "verify" && (
            <div className="space-y-5">
              {/* Order Summary Box */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between items-center border-b border-slate-200/60 pb-2 mb-2">
                  <span className="font-bold text-slate-700">Order ID & Date:</span>
                  <span className="font-mono font-extrabold text-amber-900">{order.orderId} ({new Date(order.createdAt).toLocaleDateString()})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Book Titles:</span>
                  <span className="font-bold text-slate-900">{order.items.length} titles ({order.items.reduce((s, i) => s + i.quantity, 0)} copies)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Grand Total Amount:</span>
                  <span className="font-extrabold text-emerald-700 text-sm">ETB {order.grandTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Payment Gateway:</span>
                  <span className="font-extrabold uppercase px-2 py-0.5 rounded bg-slate-200 text-slate-900 text-[10px]">
                    {order.paymentMethod} ({order.paymentStatus})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Delivery Address:</span>
                  <span className="font-medium text-slate-800 text-right">
                    {order.shippingAddress.subcity || order.shippingAddress.city}, {order.shippingAddress.region}
                  </span>
                </div>
                {order.paymentReference && (
                  <div className="flex justify-between items-center pt-1 text-sky-900 font-bold border-t border-slate-200/60">
                    <span>Customer Submitted Ref:</span>
                    <span className="font-mono bg-sky-100 px-2 py-0.5 rounded text-sky-950">{order.paymentReference}</span>
                  </div>
                )}
              </div>

              {/* Employee Verifier Field */}
              <div className="bg-amber-50/60 border border-amber-200 p-4 rounded-2xl space-y-3">
                <label className="block text-xs font-bold text-amber-950 flex items-center justify-between">
                  <span>1. Verifying Employee Name *</span>
                  <span className="text-[10px] font-normal text-amber-800">Staff performing verification</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <select
                      value={selectedVerifierId}
                      onChange={(e) => {
                        const emp = employees.find((x) => x.uid === e.target.value);
                        setSelectedVerifierId(e.target.value);
                        if (emp) setVerifierName(emp.fullName);
                      }}
                      className="w-full p-2.5 rounded-xl border border-amber-300 bg-white font-bold text-xs text-slate-900"
                    >
                      {employees.map((emp) => (
                        <option key={emp.uid} value={emp.uid}>
                          {emp.fullName} ({emp.assignedRoles?.join(", ") || "Staff"})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <input
                      type="text"
                      value={verifierName}
                      onChange={(e) => setVerifierName(e.target.value)}
                      placeholder="Enter Employee Full Name"
                      className="w-full p-2.5 rounded-xl border border-amber-300 bg-white font-bold text-xs text-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* Receipt / Transaction Reference Number Input */}
              <div className="bg-slate-900 text-white p-4 rounded-2xl space-y-3 shadow-md">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <FileText className="w-4 h-4" />
                    <span>2. Verified Receipt / Transaction Ref Number *</span>
                  </label>
                  {order.paymentReference && (
                    <button
                      type="button"
                      onClick={() => setReceiptNumber(order.paymentReference || "")}
                      className="text-[10px] font-bold text-amber-300 hover:text-amber-200 underline"
                    >
                      Use Customer Ref ({order.paymentReference})
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={receiptNumber}
                    onChange={(e) => setReceiptNumber(e.target.value)}
                    placeholder="e.g. TXN-987654321, FT260812999 or Bank Slip #"
                    className="flex-1 p-2.5 rounded-xl border border-slate-700 bg-slate-800 text-amber-300 font-mono font-bold text-xs focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const autoRef = `REC-${order.orderId.replace("#", "")}-${Math.floor(1000 + Math.random() * 9000)}`;
                      setReceiptNumber(autoRef);
                    }}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-[11px] shrink-0 border border-slate-700"
                  >
                    Auto Generate
                  </button>
                </div>
                <p className="text-[10px] text-slate-400">
                  Enter or verify the Telebirr / CBE / Bank transfer transaction slip or receipt number.
                </p>
              </div>

              {/* Verification Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  3. Verification Notes / Instructions
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Telebirr receipt matched ETB total. Customer contact confirmed via phone."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full p-3 rounded-2xl border border-slate-200 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <div className="text-[11px] text-slate-500 font-medium">
                  Verified By: <strong className="text-slate-900">{verifierName}</strong>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleConfirmVerification(false)}
                    disabled={loading}
                    className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs"
                  >
                    Reject Order
                  </button>
                  <button
                    onClick={() => handleConfirmVerification(true)}
                    disabled={loading}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Verify & Approve Order
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Mode 2: Item Preparation / Collecting Checklist */}
          {mode === "prepare" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-slate-500">
                  Book Picking Checklist ({itemsChecklist.filter((i) => i.collected).length}/{itemsChecklist.length})
                </span>

                <button
                  onClick={() => setIsScannerOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-300 font-bold text-xs flex items-center gap-1.5 hover:bg-amber-100"
                >
                  <QrCode className="w-3.5 h-3.5 text-amber-700" />
                  <span>Scan Book ISBN</span>
                </button>
              </div>

              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {itemsChecklist.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => toggleItemCollected(idx)}
                    className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                      item.collected
                        ? "bg-emerald-50/80 border-emerald-300 text-emerald-950"
                        : "bg-amber-50/50 border-amber-200 text-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={item.collected}
                        onChange={() => {}}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <img
                        src={item.coverImage}
                        alt={item.title}
                        className="w-10 h-12 object-cover rounded-lg border border-slate-200"
                      />
                      <div>
                        <h5 className="font-bold text-xs">{item.title}</h5>
                        <p className="text-[11px] text-slate-500">Author: {item.authorName}</p>
                        <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md inline-block mt-1">
                          {item.shelfLocation}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-extrabold text-xs block">Qty: {item.quantity}</span>
                      <span
                        className={`text-[10px] font-bold ${
                          item.collected ? "text-emerald-700" : "text-amber-700"
                        }`}
                      >
                        {item.collected ? "Collected ✅" : "Awaiting Pick"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Preparation Notes / Shelf Observations
                </label>
                <input
                  type="text"
                  placeholder="e.g. All books collected in pristine condition."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCancelOrderInWorkflow}
                  disabled={loading}
                  className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 flex items-center gap-1.5"
                >
                  <XCircle className="w-4 h-4 text-rose-600" />
                  <span>Cancel Order</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                  >
                    Close Window
                  </button>
                  <button
                    type="button"
                    onClick={handleFinishPreparation}
                    disabled={loading}
                    className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs shadow-md"
                  >
                    Mark Prepared & Move to Stage 3 (Pack)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Mode 3: Packing */}
          {mode === "pack" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Package Barcode / Box Number
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={packageNumber}
                      onChange={(e) => setPackageNumber(e.target.value)}
                      className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold focus:outline-none"
                    />
                    <button
                      onClick={() => setIsScannerOpen(true)}
                      className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700"
                      title="Scan Box Barcode"
                    >
                      <QrCode className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Packaging Type</label>
                  <select
                    value={packageType}
                    onChange={(e) => setPackageType(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none"
                  >
                    <option value="box">Standard Cardboard Box</option>
                    <option value="bubble_mailer">Padded Bubble Mailer</option>
                    <option value="bag">Heavy Poly Bag</option>
                    <option value="envelope">Document Envelope</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Weight (Kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Packer Employee</label>
                  <input
                    type="text"
                    disabled
                    value={currentEmployee?.fullName || "JJ Store Staff"}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Packing Notes / Warning</label>
                <input
                  type="text"
                  placeholder="e.g. Fragile hardcovers wrapped in bubble wrap."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCancelOrderInWorkflow}
                  disabled={loading}
                  className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 flex items-center gap-1.5"
                >
                  <XCircle className="w-4 h-4 text-rose-600" />
                  <span>Cancel Order</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                  >
                    Close Window
                  </button>
                  <button
                    type="button"
                    onClick={handleSavePacking}
                    disabled={loading}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md"
                  >
                    Mark Packed & Ready for Driver
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Mode 4: Delivery Driver Assignment */}
          {mode === "assign" && (
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Select Assigned Delivery Personnel / Driver
                </label>
                <select
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- Choose Field Delivery Personnel --</option>
                  {drivers.map((d) => (
                    <option key={d.uid} value={d.uid}>
                      {d.fullName} ({d.phone}) - {d.zone || "Addis Ababa"}
                    </option>
                  ))}
                  {drivers.length === 0 && (
                    <option value="driver-default-01">Express Delivery Driver (Abebe)</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Target / Expected Delivery Date
                </label>
                <input
                  type="date"
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none"
                />
              </div>

              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 space-y-1 text-xs text-amber-950">
                <p className="font-bold">Dispatch Summary:</p>
                <p>• Delivery Address: {order.shippingAddress.streetAddress}, {order.shippingAddress.subcity || order.shippingAddress.city}</p>
                <p>• Amount to Collect (COD): ETB {order.grandTotal.toLocaleString()}</p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCancelOrderInWorkflow}
                  disabled={loading}
                  className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 flex items-center gap-1.5"
                >
                  <XCircle className="w-4 h-4 text-rose-600" />
                  <span>Cancel Order</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                  >
                    Close Window
                  </button>
                  <button
                    type="button"
                    onClick={handleAssignDelivery}
                    disabled={loading}
                    className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs shadow-md"
                  >
                    Assign Driver & Dispatch
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Mode 5: Field Delivery Completion or Failure */}
          {mode === "deliver" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    COD Payment Amount Collected (ETB)
                  </label>
                  <input
                    type="number"
                    value={codAmountCollected}
                    onChange={(e) => setCodAmountCollected(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-extrabold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Failure Reason (if failed)</label>
                  <select
                    value={failedReason}
                    onChange={(e) => setFailedReason(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none"
                  >
                    <option value="Customer unavailable at time of delivery">Customer unavailable</option>
                    <option value="Incorrect address provided">Incorrect address</option>
                    <option value="Customer refused order">Customer refused order</option>
                    <option value="Phone number unreachable">Phone unreachable</option>
                    <option value="Delivery area inaccessible">Area inaccessible</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Delivery Notes / Signature Acknowledgement
                </label>
                <input
                  type="text"
                  placeholder="e.g. Delivered directly to customer. Signed receipt confirmed."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCancelOrderInWorkflow}
                  disabled={loading}
                  className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 flex items-center gap-1.5"
                >
                  <XCircle className="w-4 h-4 text-rose-600" />
                  <span>Cancel Order</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDeliveryCompletion(false)}
                    disabled={loading}
                    className="px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs"
                  >
                    Mark Delivery Failed
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeliveryCompletion(true)}
                    disabled={loading}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md"
                  >
                    Mark Delivered & Paid ✅
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Mode 6: Return to Store */}
          {mode === "return" && (
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Package Condition</label>
                <select
                  value={returnCondition}
                  onChange={(e) => setReturnCondition(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none"
                >
                  <option value="good">Intact / Good Condition</option>
                  <option value="opened">Opened Package</option>
                  <option value="damaged">Damaged Box / Cover</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Return Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Returned to warehouse shelf A-04."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Close Window
                </button>
                <button
                  type="button"
                  onClick={handleRegisterReturn}
                  disabled={loading}
                  className="px-6 py-2.5 rounded-xl bg-slate-900 text-white font-extrabold text-xs shadow-md"
                >
                  Restock Items & Confirm Return
                </button>
              </div>
            </div>
          )}
          </>
          )}
        </div>
      </div>


      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanResult={handleBarcodeScanned}
      />
    </>
  );
};
