import React, { useState, useRef } from "react";
import { downloadOrderReceiptScreenshot } from "../../lib/screenshotUtils";
import {
  X,
  Truck,
  CreditCard,
  MapPin,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  Smartphone,
  Building,
  Check,
  Camera,
  AlertCircle
} from "lucide-react";
import { collection, addDoc, doc, updateDoc, increment } from "firebase/firestore";
import { db, cleanFirestoreData } from "../../lib/firebase";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import { EthiopianAddress, EthiopianRegion, Order, PaymentMethod } from "../../types";
import { useToast } from "../ui/Toast";
import { sendCustomerOrderEmail } from "../../lib/emailService";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCompleted: (order: Order) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  onOrderCompleted
}) => {
  const { currentUser, userProfile } = useAuth();
  const { cartItems, clearCart, subtotal, discount, shippingFee, tax, grandTotal, appliedCoupon } = useCart();
  const { showToast } = useToast();

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [loading, setLoading] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);

  const receiptRef = useRef<HTMLDivElement>(null);
  const [capturingScreenshot, setCapturingScreenshot] = useState(false);

  // Helper to extract 8 digits from any existing profile phone
  const extractPhoneSuffix = (rawPhone?: string): string => {
    if (!rawPhone) return "";
    const clean = rawPhone.replace(/\D/g, "");
    if (clean.startsWith("2519") && clean.length >= 12) {
      return clean.slice(4, 12);
    }
    if (clean.startsWith("251") && clean.length >= 11) {
      return clean.slice(3, 11);
    }
    if (clean.startsWith("09") && clean.length >= 10) {
      return clean.slice(2, 10);
    }
    if (clean.startsWith("9") && clean.length >= 9) {
      return clean.slice(1, 9);
    }
    return clean.slice(0, 8);
  };

  // Form State
  const [customerName, setCustomerName] = useState(userProfile?.fullName || "");
  const [customerEmail, setCustomerEmail] = useState(currentUser?.email || "");
  const [phoneDigits, setPhoneDigits] = useState(extractPhoneSuffix(userProfile?.phone));

  // Address State - House number removed, Subcity & Street/Neighborhood (የሰፈር ስም) kept
  const [region, setRegion] = useState<EthiopianRegion>("Addis Ababa");
  const [city, setCity] = useState("Addis Ababa");
  const [subcity, setSubcity] = useState("Bole");
  const [streetAddress, setStreetAddress] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");

  // Shipping Selection
  const [shippingOption, setShippingOption] = useState<"doorstep" | "pickup">("doorstep");

  // Payment & Delivery
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("telebirr");
  const [paymentReference, setPaymentReference] = useState("");

  if (!isOpen) return null;

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only accept numeric digits, strictly maximum 8 characters
    const val = e.target.value.replace(/\D/g, "").slice(0, 8);
    setPhoneDigits(val);
  };

  const getFullPhoneNumber = () => {
    return `+251 9${phoneDigits}`;
  };

  const handleDownloadScreenshot = async () => {
    if (!createdOrder) return;
    setCapturingScreenshot(true);
    try {
      await downloadOrderReceiptScreenshot(createdOrder, receiptRef.current);
      showToast("Screenshot Downloaded", "Official receipt image saved to your device.", "success");
    } catch (err) {
      console.error("Screenshot capture failed:", err);
      showToast("Screenshot Error", "Failed to capture receipt screenshot.", "error");
    } finally {
      setCapturingScreenshot(false);
    }
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (!customerName.trim()) {
        showToast("Full Name Required", "Please enter your full name.", "error");
        return;
      }
      if (!customerEmail.trim() || !customerEmail.includes("@")) {
        showToast("Email Required", "Please enter a valid email address.", "error");
        return;
      }
      if (phoneDigits.length !== 8) {
        showToast(
          "Invalid Phone Number",
          `Please enter exactly 8 digits after +251 9 (Currently: ${phoneDigits.length}/8 digits).`,
          "error"
        );
        return;
      }
    } else if (step === 2) {
      if (!streetAddress.trim()) {
        showToast("Address Required", "Please enter your neighborhood or street address (የሰፈር ስም / የመንገድ ስም).", "error");
        return;
      }
    } else if (step === 4) {
      // If payment is Telebirr, CBE Birr, or Bank of Abyssinia, transaction ref is mandatory
      if (paymentMethod !== "cod") {
        if (!paymentReference.trim()) {
          showToast(
            "Transaction Number Required",
            "Transaction reference number is mandatory for Telebirr, CBE, and Bank of Abyssinia payments.",
            "error"
          );
          return;
        }
        if (paymentReference.trim().length < 4) {
          showToast(
            "Invalid Transaction Reference",
            "Please enter a valid transaction reference code from your SMS receipt.",
            "error"
          );
          return;
        }
      }
    }
    setStep((prev) => (prev < 5 ? ((prev + 1) as any) : prev));
  };

  const handlePrevStep = () => {
    setStep((prev) => (prev > 1 ? ((prev - 1) as any) : prev));
  };

  const handleCreateOrder = async () => {
    if (cartItems.length === 0) {
      showToast("Cart is Empty", "Please add books to your shopping cart before checking out.", "error");
      return;
    }

    if (paymentMethod !== "cod" && !paymentReference.trim()) {
      showToast(
        "Transaction Number Required",
        "Please provide the transaction reference number from your Telebirr, CBE, or Abyssinia transfer.",
        "error"
      );
      setStep(4);
      return;
    }

    setLoading(true);
    try {
      // 1. Server Side Total Verification
      let trustedSubtotal = subtotal;
      let trustedDiscount = discount;
      let trustedShippingFee = shippingOption === "pickup" ? 0 : shippingFee;
      let trustedTax = tax;
      let trustedGrandTotal = grandTotal;

      try {
        const res = await fetch("/api/checkout/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: cartItems.map((i) => ({
              bookId: i.bookId,
              price: Number(i.book.price || 0),
              discountPrice: i.book.discountPrice ? Number(i.book.discountPrice) : undefined,
              quantity: Number(i.quantity || 1)
            })),
            couponCode: appliedCoupon?.code
          })
        });

        if (res.ok) {
          const validatedData = await res.json();
          if (validatedData && validatedData.success) {
            if (typeof validatedData.subtotal === "number") trustedSubtotal = validatedData.subtotal;
            if (typeof validatedData.discount === "number") trustedDiscount = validatedData.discount;
            if (typeof validatedData.shippingFee === "number") {
              trustedShippingFee = shippingOption === "pickup" ? 0 : validatedData.shippingFee;
            }
            if (typeof validatedData.tax === "number") trustedTax = validatedData.tax;
            trustedGrandTotal = Math.max(0, trustedSubtotal - trustedDiscount + trustedTax + trustedShippingFee);
          }
        }
      } catch (validateErr) {
        console.warn("Validation endpoint notice, using local calculated totals:", validateErr);
      }

      const orderNumber = `JJ-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
      const formattedPhone = getFullPhoneNumber();

      const shippingAddressObj: EthiopianAddress = {
        fullName: customerName.trim(),
        phone: formattedPhone,
        region,
        city: region === "Addis Ababa" ? "Addis Ababa" : city,
        subcity: region === "Addis Ababa" ? subcity : "",
        houseNumber: "",
        streetAddress: streetAddress.trim(),
        deliveryNotes: deliveryNotes.trim()
      };

      const newOrderData: Omit<Order, "id"> = {
        orderId: orderNumber,
        customerId: currentUser?.uid || "guest_customer",
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        customerPhone: formattedPhone,
        items: cartItems.map((i) => ({
          bookId: i.bookId,
          title: i.book.title,
          coverImage: i.book.coverImage,
          authorName: i.book.authorName || "",
          price: i.book.discountPrice || i.book.price,
          quantity: i.quantity,
          total: (i.book.discountPrice || i.book.price) * i.quantity
        })),
        subtotal: trustedSubtotal,
        discount: trustedDiscount,
        tax: trustedTax,
        shippingFee: trustedShippingFee,
        grandTotal: trustedGrandTotal,
        paymentMethod,
        paymentStatus: paymentMethod === "cod" ? "pending" : "paid",
        paymentReference: paymentReference.trim(),
        orderStatus: "pending",
        shippingAddress: shippingAddressObj,
        couponCode: appliedCoupon?.code || "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        statusHistory: [
          {
            status: "pending",
            timestamp: new Date().toISOString(),
            note: "Order placed. Awaiting staff payment & address verification."
          }
        ]
      };

      // Create in Firestore
      const docRef = await addDoc(collection(db, "orders"), cleanFirestoreData(newOrderData));
      const fullOrder: Order = { id: docRef.id, ...newOrderData };

      // Record Activity Log
      try {
        await addDoc(collection(db, "activity_logs"), {
          title: `New Order #${orderNumber}`,
          description: `${customerName} placed order for ${cartItems.length} item(s) totalling ${trustedGrandTotal.toLocaleString()} ETB via ${paymentMethod.toUpperCase()}`,
          category: "orders",
          type: "order_created",
          orderId: orderNumber,
          amount: trustedGrandTotal,
          timestamp: new Date().toISOString()
        });
      } catch (logErr) {
        console.warn("Activity log warning:", logErr);
      }

      // Send Order Confirmation Email & Store in Firestore
      try {
        await fetch("/api/orders/notify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: fullOrder })
        });
      } catch (emailErr) {
        console.warn("Order email notification dispatch notice:", emailErr);
      }

      try {
        await sendCustomerOrderEmail(
          fullOrder,
          "approved",
          "JJ Order System",
          paymentReference || "N/A",
          "Your order has been recorded and is being prepared for dispatch."
        );
      } catch (inAppEmailErr) {
        console.warn("In-app email log notice:", inAppEmailErr);
      }

      // Update book inventory stock & sold counts
      for (const item of cartItems) {
        try {
          const bookRef = doc(db, "books", item.bookId);
          await updateDoc(bookRef, {
            stock: increment(-item.quantity),
            soldCount: increment(item.quantity)
          });
        } catch (err) {
          console.warn("Stock update notice:", err);
        }
      }

      setCreatedOrder(fullOrder);
      clearCart();
      setStep(6);
      onOrderCompleted(fullOrder);
      showToast("Order Confirmed!", `Order ${orderNumber} has been successfully placed.`, "success");
    } catch (err) {
      console.error("Error creating order:", err);
      showToast("Checkout Error", "Failed to place order. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const ethiopianRegionsList: EthiopianRegion[] = [
    "Addis Ababa",
    "Oromia",
    "Amhara",
    "Sidama",
    "SNNPR",
    "Dire Dawa",
    "Harari",
    "Tigray",
    "Somali",
    "Afar",
    "Benishangul-Gumuz",
    "Gambela"
  ];

  const addisSubcities = [
    "Bole (ቦሌ)",
    "Kirkos (ቂርቆስ)",
    "Yeka (የካ)",
    "Arada (አራዳ)",
    "Nifas Silk (ንፋስ ስልክ)",
    "Kolfe Keranio (ኮልፌ ቀራኒዮ)",
    "Akaky Kaliti (አቃቂ ቃሊቲ)",
    "Gullele (ጉለሌ)",
    "Lideta (ልደታ)",
    "Lemi Kura (ለሚ ኩራ)"
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
      <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-3xl overflow-hidden max-h-[92vh] flex flex-col my-auto">
        {/* Header */}
        <div className="p-5 border-b border-amber-950/60 bg-[#16120e] text-stone-100 flex items-center justify-between">
          <div>
            <h3 className="font-serif font-extrabold text-xl text-white flex items-center gap-2">
              <span>Secure Bookstore Checkout</span>
            </h3>
            <p className="text-xs text-amber-300/80 font-medium mt-0.5">JJ Book Shopping • Ethiopian Delivery & Payment</p>
          </div>
          {step !== 6 && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-stone-800 text-stone-300 hover:text-amber-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Progress Tracker Bar */}
        {step !== 6 && (
          <div className="bg-stone-900/90 px-3 sm:px-6 py-2.5 sm:py-3 border-b border-stone-800 flex items-center justify-between text-xs font-semibold text-stone-400 overflow-x-auto gap-2 shrink-0 scrollbar-none">
            <span className={step >= 1 ? "text-amber-400 font-bold flex items-center gap-1" : "flex items-center gap-1"}>
              <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center ${step >= 1 ? "bg-amber-500 text-stone-950 font-extrabold" : "bg-stone-800 text-stone-400"}`}>1</span> Contact
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-stone-600 shrink-0" />
            <span className={step >= 2 ? "text-amber-400 font-bold flex items-center gap-1" : "flex items-center gap-1"}>
              <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center ${step >= 2 ? "bg-amber-500 text-stone-950 font-extrabold" : "bg-stone-800 text-stone-400"}`}>2</span> Address
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-stone-600 shrink-0" />
            <span className={step >= 3 ? "text-amber-400 font-bold flex items-center gap-1" : "flex items-center gap-1"}>
              <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center ${step >= 3 ? "bg-amber-500 text-stone-950 font-extrabold" : "bg-stone-800 text-stone-400"}`}>3</span> Shipping
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-stone-600 shrink-0" />
            <span className={step >= 4 ? "text-amber-400 font-bold flex items-center gap-1" : "flex items-center gap-1"}>
              <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center ${step >= 4 ? "bg-amber-500 text-stone-950 font-extrabold" : "bg-stone-800 text-stone-400"}`}>4</span> Payment
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-stone-600 shrink-0" />
            <span className={step >= 5 ? "text-amber-400 font-bold flex items-center gap-1" : "flex items-center gap-1"}>
              <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center ${step >= 5 ? "bg-amber-500 text-stone-950 font-extrabold" : "bg-stone-800 text-stone-400"}`}>5</span> Review
            </span>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* STEP 1: Customer Contact */}
          {step === 1 && (
            <div className="space-y-4">
              <h4 className="font-serif font-bold text-slate-900 text-base flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-700" />
                <span>Customer Contact Information</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="ሙሉ ስም ያስገቡ (Enter Full Name)"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 font-medium text-slate-800"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="name@domain.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 font-medium text-slate-800"
                    required
                  />
                </div>

                {/* Ethiopian Phone with fixed +251 9 and exactly 8 digits */}
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">Phone Number (Ethiopian format) *</label>
                    <span className={`text-[11px] font-bold ${phoneDigits.length === 8 ? "text-emerald-700" : "text-amber-800"}`}>
                      {phoneDigits.length}/8 digits
                    </span>
                  </div>
                  <div className="flex rounded-xl border border-slate-200 overflow-hidden focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-200 bg-white">
                    <div className="bg-amber-50 border-r border-slate-200 px-3.5 py-2.5 flex items-center gap-1.5 shrink-0 text-slate-800 font-bold select-none">
                      <span className="text-sm">🇪🇹</span>
                      <span className="text-xs font-mono font-extrabold">+251 9</span>
                    </div>
                    <input
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={8}
                      value={phoneDigits}
                      onChange={handlePhoneChange}
                      placeholder="12345678"
                      className="w-full px-3.5 py-2.5 text-xs font-mono font-bold tracking-widest text-slate-900 focus:outline-none bg-transparent"
                      required
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Enter the 8 digits following +251 9 (e.g. <span className="font-mono font-bold text-slate-700">38014055</span> for +251 9 38 01 40 55).
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Ethiopian Address (Subcity & Street/Neighborhood, House No removed) */}
          {step === 2 && (
            <div className="space-y-4">
              <h4 className="font-serif font-bold text-slate-900 text-base flex items-center gap-2">
                <MapPin className="w-5 h-5 text-amber-700" />
                <span>Delivery Address (Ethiopia)</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Region (ክልል) *</label>
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value as EthiopianRegion)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 bg-white font-medium"
                  >
                    {ethiopianRegionsList.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                {region === "Addis Ababa" ? (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Subcity (ክፍለ ከተማ) *</label>
                    <select
                      value={subcity}
                      onChange={(e) => setSubcity(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 bg-white font-medium"
                    >
                      {addisSubcities.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">City / Town *</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Adama, Hawassa, Bahir Dar"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 font-medium"
                    />
                  </div>
                )}

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">
                    የሰፈር ስም ወይም የመንገድ ስም (Neighborhood / Street Name) *
                  </label>
                  <input
                    type="text"
                    value={streetAddress}
                    onChange={(e) => setStreetAddress(e.target.value)}
                    placeholder="e.g. ቦሌ መድኃኔዓለም / ገርጂ / ካዛንቺስ / ሳሪስ (e.g. Bole Medhaniallem, Gerji, Kazanchis)"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 font-medium"
                    required
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Subcity and neighborhood name (የሰፈር ስም) are used by the courier to navigate directly to you.
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Delivery Notes / Landmark Instructions (Optional)</label>
                  <textarea
                    rows={2}
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                    placeholder="Optional instructions for the courier driver..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 font-medium"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Shipping Method (Edna Mall removed) */}
          {step === 3 && (
            <div className="space-y-4">
              <h4 className="font-serif font-bold text-slate-900 text-base flex items-center gap-2">
                <Truck className="w-5 h-5 text-amber-700" />
                <span>Select Delivery Option</span>
              </h4>

              <div className="space-y-3 text-xs">
                <label
                  onClick={() => setShippingOption("doorstep")}
                  className={`p-4 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition-all ${
                    shippingOption === "doorstep"
                      ? "border-amber-500 bg-amber-50/70"
                      : "border-slate-200 bg-white hover:border-amber-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="shipping"
                      checked={shippingOption === "doorstep"}
                      onChange={() => setShippingOption("doorstep")}
                      className="accent-amber-600"
                    />
                    <div>
                      <strong className="block text-slate-900 font-bold text-sm">
                        Standard Doorstep Delivery ({region})
                      </strong>
                      <p className="text-slate-500">Delivered within 24-48 hours directly to your neighborhood address.</p>
                    </div>
                  </div>
                  <span className="font-extrabold text-slate-900 text-sm">
                    {shippingFee === 0 ? "FREE" : `${shippingFee} ETB`}
                  </span>
                </label>

                <label
                  onClick={() => setShippingOption("pickup")}
                  className={`p-4 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition-all ${
                    shippingOption === "pickup"
                      ? "border-amber-500 bg-amber-50/70"
                      : "border-slate-200 bg-white hover:border-amber-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="shipping"
                      checked={shippingOption === "pickup"}
                      onChange={() => setShippingOption("pickup")}
                      className="accent-amber-600"
                    />
                    <div>
                      <strong className="block text-slate-900 font-bold text-sm">
                        Bookstore Store Pickup / ከመደብሩ መውሰድ
                      </strong>
                      <p className="text-slate-500">Pick up your packed order directly from JJ Bookstore main store at your convenience.</p>
                    </div>
                  </div>
                  <span className="font-extrabold text-emerald-700 text-sm">FREE</span>
                </label>
              </div>
            </div>
          )}

          {/* STEP 4: Payment Provider with Mandatory Transaction Number for Telebirr/CBE/Abyssinia */}
          {step === 4 && (
            <div className="space-y-4">
              <h4 className="font-serif font-bold text-slate-900 text-base flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-amber-700" />
                <span>Choose Payment Method (Ethiopia)</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Telebirr */}
                <div
                  onClick={() => setPaymentMethod("telebirr")}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                    paymentMethod === "telebirr"
                      ? "border-sky-500 bg-sky-50/80 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-sky-950 text-sm">
                    <Smartphone className="w-4 h-4 text-sky-600" /> Telebirr (ቴሌብር)
                  </div>
                  <p className="text-slate-500 text-[11px] mt-1">Instant mobile transfer via Ethio Telecom Telebirr.</p>
                </div>

                {/* CBE Birr */}
                <div
                  onClick={() => setPaymentMethod("cbe_birr")}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                    paymentMethod === "cbe_birr"
                      ? "border-purple-500 bg-purple-50/80 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-purple-950 text-sm">
                    <Building className="w-4 h-4 text-purple-600" /> CBE Birr (ሲቢኢ ብር)
                  </div>
                  <p className="text-slate-500 text-[11px] mt-1">Commercial Bank of Ethiopia CBE transfer.</p>
                </div>

                {/* Bank Transfer (Abyssinia) */}
                <div
                  onClick={() => setPaymentMethod("bank_transfer")}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                    paymentMethod === "bank_transfer"
                      ? "border-emerald-500 bg-emerald-50/80 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-emerald-950 text-sm">
                    <Building className="w-4 h-4 text-emerald-600" /> Bank of Abyssinia (አቢሲንያ)
                  </div>
                  <p className="text-slate-500 text-[11px] mt-1">Direct Bank of Abyssinia wire transfer.</p>
                </div>

                {/* Cash on Delivery */}
                <div
                  onClick={() => setPaymentMethod("cod")}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                    paymentMethod === "cod"
                      ? "border-amber-500 bg-amber-50/80 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-amber-950 text-sm">
                    <Truck className="w-4 h-4 text-amber-700" /> Cash on Delivery (COD)
                  </div>
                  <p className="text-slate-500 text-[11px] mt-1">Pay with cash upon arrival of your package.</p>
                </div>
              </div>

              {/* Payment Details Card */}
              {paymentMethod !== "cod" ? (
                <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-900/15 text-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-slate-900">Transfer Account Details:</p>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900">
                      Amount: {grandTotal} ETB
                    </span>
                  </div>

                  {paymentMethod === "telebirr" && (
                    <div className="p-3 bg-white rounded-xl border border-sky-200 text-sky-950 space-y-1">
                      <p className="font-medium">
                        Send <strong className="text-slate-900">{grandTotal} ETB</strong> to Telebirr Number:
                      </p>
                      <p className="font-mono font-extrabold text-sm text-sky-700">+251938014055</p>
                      <p className="text-[11px] text-slate-500">Account Name: JJ Book Shopping</p>
                    </div>
                  )}

                  {paymentMethod === "cbe_birr" && (
                    <div className="p-3 bg-white rounded-xl border border-purple-200 text-purple-950 space-y-1">
                      <p className="font-medium">
                        Commercial Bank of Ethiopia (CBE) Account:
                      </p>
                      <p className="font-mono font-extrabold text-sm text-purple-700">1000123456789</p>
                      <p className="text-[11px] text-slate-500">Account Name: JJ Book Shopping</p>
                    </div>
                  )}

                  {paymentMethod === "bank_transfer" && (
                    <div className="p-3 bg-white rounded-xl border border-emerald-200 text-emerald-950 space-y-1">
                      <p className="font-medium">
                        Bank of Abyssinia (አቢሲንያ ባንክ) Account:
                      </p>
                      <p className="font-mono font-extrabold text-sm text-emerald-700">155832444</p>
                      <p className="text-[11px] text-slate-500">Account Name: JJ Book Shopping</p>
                    </div>
                  )}

                  {/* Mandatory Transaction Reference Input */}
                  <div className="pt-1">
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-slate-800 flex items-center gap-1">
                        <span>Transaction Reference Number (የግብይት ቁጥር) *</span>
                        <span className="text-rose-600 font-extrabold">* Mandatory</span>
                      </label>
                      {paymentReference.trim().length > 0 && (
                        <span className="text-emerald-700 font-bold text-[11px] flex items-center gap-0.5">
                          <Check className="w-3 h-3" /> Valid
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      placeholder="e.g. FT260812999... / TXN-892341..."
                      required
                      className={`w-full px-3.5 py-2.5 rounded-xl border font-mono text-xs focus:outline-none transition-all ${
                        paymentReference.trim()
                          ? "border-emerald-500 bg-white"
                          : "border-rose-400 bg-rose-50/30 focus:border-rose-500"
                      }`}
                    />
                    <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>Please copy & paste the confirmation code from your {paymentMethod === "telebirr" ? "Telebirr" : paymentMethod === "cbe_birr" ? "CBE" : "Abyssinia"} SMS message.</span>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-900/15 text-xs text-amber-950 space-y-1">
                  <p className="font-bold">Cash on Delivery Selected:</p>
                  <p className="text-slate-600">
                    You can pay the full amount of <strong>{grandTotal} ETB</strong> in cash to the delivery driver upon receiving your books.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* STEP 5: Order Review */}
          {step === 5 && (
            <div className="space-y-4 text-xs">
              <h4 className="font-serif font-bold text-slate-900 text-base">Order Review & Summary</h4>

              {/* Items Breakdown */}
              <div className="space-y-2 max-h-48 overflow-y-auto p-3 rounded-2xl bg-slate-50 border border-slate-200">
                {cartItems.map((i) => (
                  <div key={i.bookId} className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2">
                      <img src={i.book.coverImage} alt={i.book.title} className="w-8 h-10 object-cover rounded" />
                      <div>
                        <strong className="block text-slate-900 font-bold line-clamp-1">{i.book.title}</strong>
                        <span className="text-slate-500">Qty: {i.quantity} x {i.book.discountPrice || i.book.price} ETB</span>
                      </div>
                    </div>
                    <strong className="text-slate-900 font-bold">
                      {(i.book.discountPrice || i.book.price) * i.quantity} ETB
                    </strong>
                  </div>
                ))}
              </div>

              {/* Delivery & Payment Summary */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-amber-50/60 border border-amber-900/10">
                <div>
                  <span className="text-amber-800 font-bold block">Delivery Address:</span>
                  <p className="text-slate-800 font-semibold">{customerName} ({getFullPhoneNumber()})</p>
                  <p className="text-slate-600">{streetAddress}, {subcity ? `${subcity}, ` : ""}{region}</p>
                </div>
                <div>
                  <span className="text-amber-800 font-bold block">Payment Method:</span>
                  <p className="text-slate-800 font-bold uppercase">{paymentMethod}</p>
                  {paymentReference && <p className="text-slate-600 font-mono text-[11px]">Ref: {paymentReference}</p>}
                </div>
              </div>

              {/* Final Math */}
              <div className="space-y-1.5 pt-2 text-slate-700">
                <div className="flex justify-between"><span>Subtotal:</span><span>{subtotal} ETB</span></div>
                {discount > 0 && <div className="flex justify-between text-emerald-700 font-semibold"><span>Discount:</span><span>-{discount} ETB</span></div>}
                <div className="flex justify-between">
                  <span>Shipping Fee:</span>
                  <span>{shippingOption === "pickup" || shippingFee === 0 ? "FREE (0 ETB)" : `${shippingFee} ETB`}</span>
                </div>
                <div className="flex justify-between"><span>15% VAT Tax:</span><span>{tax} ETB</span></div>
                <div className="flex justify-between text-base font-extrabold text-slate-900 pt-2 border-t border-slate-300">
                  <span>Grand Total:</span>
                  <span className="text-amber-800 text-lg">{grandTotal} ETB</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: Order Confirmation & Receipt */}
          {step === 6 && createdOrder && (
            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-inner">
                <Check className="w-7 h-7 stroke-[3]" />
              </div>

              <div>
                <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-[11px] font-extrabold uppercase tracking-wide">
                  Order Successfully Placed
                </span>
                <h3 className="font-serif font-extrabold text-2xl text-slate-900 mt-2">
                  Thank You for Your Order!
                </h3>
              </div>

              {/* Official Printable/Screenshot Receipt Container */}
              <div
                ref={receiptRef}
                className="p-6 rounded-3xl bg-white border border-slate-200 shadow-md text-left text-xs space-y-4 max-w-lg mx-auto"
              >
                {/* Receipt Header */}
                <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
                  <div>
                    <strong className="font-serif font-extrabold text-base text-slate-900 block">
                      JJ BOOKSTORE RECEIPT
                    </strong>
                    <span className="text-[10px] text-slate-500">Official Purchase Voucher</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-amber-800 text-sm block">{createdOrder.orderId}</span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(createdOrder.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Customer Details */}
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-700 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <div>
                    <span className="text-slate-400 font-semibold block">Customer:</span>
                    <strong className="text-slate-900 font-bold">{createdOrder.customerName}</strong>
                    <p className="text-slate-500">{createdOrder.customerPhone}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block">Delivery Location:</span>
                    <p className="text-slate-800 font-medium line-clamp-2">
                      {createdOrder.shippingAddress?.streetAddress}, {createdOrder.shippingAddress?.region}
                    </p>
                  </div>
                </div>

                {/* Items Summary */}
                <div className="space-y-1.5">
                  <span className="font-bold text-slate-900 text-[11px]">Purchased Items:</span>
                  <div className="divide-y divide-slate-100 max-h-36 overflow-y-auto pr-1">
                    {createdOrder.items.map((item) => (
                      <div key={item.bookId} className="py-1.5 flex justify-between items-center text-[11px]">
                        <span className="font-semibold text-slate-800 truncate max-w-[220px]">
                          {item.title} <span className="text-slate-400 font-normal">(x{item.quantity})</span>
                        </span>
                        <span className="font-bold text-slate-900">{item.total} ETB</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total & Payment */}
                <div className="pt-2 border-t border-slate-200 space-y-1 text-[11px]">
                  <div className="flex justify-between text-slate-600">
                    <span>Payment Method:</span>
                    <span className="font-bold uppercase text-slate-900">{createdOrder.paymentMethod}</span>
                  </div>
                  {createdOrder.paymentReference && (
                    <div className="flex justify-between text-slate-600">
                      <span>Transaction Ref:</span>
                      <span className="font-mono font-bold text-slate-900">{createdOrder.paymentReference}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600">
                    <span>Payment Status:</span>
                    <span className="font-bold text-emerald-700 uppercase">{createdOrder.paymentStatus}</span>
                  </div>
                  <div className="flex justify-between font-extrabold text-sm text-slate-900 pt-1.5 border-t border-slate-200">
                    <span>Grand Total:</span>
                    <span className="text-amber-800">{createdOrder.grandTotal} ETB</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleDownloadScreenshot}
                  disabled={capturingScreenshot}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-2 shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  {capturingScreenshot ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Taking Screenshot...</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4 text-amber-400" />
                      <span>Download Receipt Screenshot</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold text-xs shadow-md transition-all"
                >
                  Return to Store
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Controls Footer */}
        {step !== 6 && (
          <div className="p-4 border-t border-stone-800 bg-stone-950 flex items-center justify-between">
            <button
              onClick={handlePrevStep}
              disabled={step === 1}
              className="px-4 py-2.5 rounded-xl border border-stone-800 text-stone-300 hover:bg-stone-900 hover:text-white text-xs font-bold disabled:opacity-30 flex items-center gap-1 transition-all"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>

            {step < 5 ? (
              <button
                onClick={handleNextStep}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-stone-950 font-extrabold text-xs shadow-md shadow-amber-950/40 flex items-center gap-1.5 transition-all transform hover:-translate-y-0.5"
              >
                <span>Continue</span> <ChevronRight className="w-4 h-4 stroke-[2.5]" />
              </button>
            ) : (
              <button
                onClick={handleCreateOrder}
                disabled={loading}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-stone-950 font-extrabold text-xs sm:text-sm shadow-xl shadow-amber-950/60 flex items-center gap-2 active:scale-95 disabled:opacity-50 transition-all transform hover:-translate-y-0.5"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                    <span>Processing Order...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                    <span>Complete & Place Order ({grandTotal} ETB)</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
