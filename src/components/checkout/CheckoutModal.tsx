import React, { useState, useRef } from "react";
import { captureElementToCanvas } from "../../lib/screenshotUtils";
import {
  X,
  CheckCircle2,
  Truck,
  CreditCard,
  MapPin,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  Smartphone,
  Building,
  Check,
  Download,
  Camera,
  ShoppingBag,
  FileText
} from "lucide-react";
import { collection, addDoc, doc, updateDoc, increment } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import { EthiopianAddress, EthiopianRegion, Order, PaymentMethod } from "../../types";
import { useToast } from "../ui/Toast";

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

  // Form State
  const [customerName, setCustomerName] = useState(userProfile?.fullName || "");
  const [customerEmail, setCustomerEmail] = useState(currentUser?.email || "");
  const [customerPhone, setCustomerPhone] = useState(userProfile?.phone || "+251 9");

  // Address
  const [region, setRegion] = useState<EthiopianRegion>("Addis Ababa");
  const [city, setCity] = useState("Addis Ababa");
  const [subcity, setSubcity] = useState("Bole");
  const [houseNumber, setHouseNumber] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");

  // Payment & Delivery
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("telebirr");
  const [paymentReference, setPaymentReference] = useState("");

  if (!isOpen) return null;

  const handleDownloadScreenshot = async () => {
    if (!receiptRef.current) return;
    setCapturingScreenshot(true);
    try {
      const canvas = await captureElementToCanvas(receiptRef.current, {
        scale: 2,
        backgroundColor: "#ffffff"
      });
      const imageUri = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = imageUri;
      link.download = `JJ-Bookstore-Receipt-${createdOrder?.orderId || "order"}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast("Screenshot Downloaded", "Receipt image saved to your downloads.", "success");
    } catch (err) {
      console.error("Screenshot capture failed:", err);
      showToast("Screenshot Error", "Failed to capture receipt image.", "error");
    } finally {
      setCapturingScreenshot(false);
    }
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (!customerName || !customerEmail || !customerPhone) {
        showToast("Missing Information", "Please enter your name, email, and phone number.", "error");
        return;
      }
    } else if (step === 2) {
      if (!streetAddress) {
        showToast("Missing Address", "Please enter your street address or prominent landmark.", "error");
        return;
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

    setLoading(true);
    try {
      // 1. Server Side Total Verification
      let trustedSubtotal = subtotal;
      let trustedDiscount = discount;
      let trustedShippingFee = shippingFee;
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
            if (typeof validatedData.shippingFee === "number") trustedShippingFee = validatedData.shippingFee;
            if (typeof validatedData.tax === "number") trustedTax = validatedData.tax;
            if (typeof validatedData.grandTotal === "number") trustedGrandTotal = validatedData.grandTotal;
          }
        }
      } catch (validateErr) {
        console.warn("Validation endpoint notice, using local calculated totals:", validateErr);
      }

      const orderNumber = `JJ-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

      const shippingAddressObj: EthiopianAddress = {
        fullName: customerName,
        phone: customerPhone,
        region,
        city: region === "Addis Ababa" ? "Addis Ababa" : city,
        subcity: region === "Addis Ababa" ? subcity : "",
        houseNumber: houseNumber || "",
        streetAddress: streetAddress || "",
        deliveryNotes: deliveryNotes || ""
      };

      const newOrderData: Omit<Order, "id"> = {
        orderId: orderNumber,
        customerId: currentUser?.uid || "guest_customer",
        customerName,
        customerEmail,
        customerPhone,
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
        paymentReference: paymentReference || "",
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
      const docRef = await addDoc(collection(db, "orders"), newOrderData);
      const fullOrder: Order = { id: docRef.id, ...newOrderData };

      // Record Activity Log
      try {
        await addDoc(collection(db, "activity_logs"), {
          title: `New Order #${orderNumber}`,
          description: `${customerName} placed order for ${cartItems.length} item(s) totalling ${grandTotal.toLocaleString()} ETB via ${paymentMethod.toUpperCase()}`,
          category: "orders",
          type: "order_created",
          orderId: orderNumber,
          amount: grandTotal,
          timestamp: new Date().toISOString()
        });
      } catch (logErr) {
        console.warn("Activity log creation warning:", logErr);
      }

      // Send Order Confirmation & Notification Email
      try {
        await fetch("/api/orders/notify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: fullOrder })
        });
      } catch (emailErr) {
        console.error("Order email notification notice:", emailErr);
      }

      // Update book inventory sold counts & stock
      for (const item of cartItems) {
        try {
          const bookRef = doc(db, "books", item.bookId);
          await updateDoc(bookRef, {
            stock: increment(-item.quantity),
            soldCount: increment(item.quantity)
          });
        } catch (err) {
          console.error("Stock update notice:", err);
        }
      }

      setCreatedOrder(fullOrder);
      clearCart();
      setStep(6);
      onOrderCompleted(fullOrder);
      showToast("Order Confirmed!", `Order ${orderNumber} has been placed.`, "success");
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
    "Bole",
    "Kirkos",
    "Yeka",
    "Arada",
    "Nifas Silk",
    "Kolfe",
    "Akaky",
    "Gullele",
    "Lideta",
    "Lemi Kura"
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
            <p className="text-xs text-amber-300/80 font-medium mt-0.5">JJ Book Shopping • Direct Delivery & Verified Payment</p>
          </div>
          {step !== 6 && (
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-stone-800 text-stone-300 hover:text-amber-300 transition-colors">
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
                    placeholder="e.g. Mikiyas Wolde"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500"
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
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Phone Number (Ethiopian format) *</label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+251 938 014 055"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500"
                    required
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Used by delivery drivers to contact you upon arrival.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Ethiopian Address */}
          {step === 2 && (
            <div className="space-y-4">
              <h4 className="font-serif font-bold text-slate-900 text-base flex items-center gap-2">
                <MapPin className="w-5 h-5 text-amber-700" />
                <span>Delivery Address (Ethiopia)</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Region *</label>
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value as EthiopianRegion)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 bg-white"
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
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 bg-white"
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
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block font-bold text-slate-700 mb-1">House No. / Building Name</label>
                  <input
                    type="text"
                    value={houseNumber}
                    onChange={(e) => setHouseNumber(e.target.value)}
                    placeholder="e.g. Bldg 4, Apt 201"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Street Address / Nearby Landmark *</label>
                  <input
                    type="text"
                    value={streetAddress}
                    onChange={(e) => setStreetAddress(e.target.value)}
                    placeholder="e.g. Near Edna Mall, opposite Friendship Bldg"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Delivery Notes / Instructions</label>
                  <textarea
                    rows={2}
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                    placeholder="Optional instructions for the courier driver..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Shipping Method */}
          {step === 3 && (
            <div className="space-y-4">
              <h4 className="font-serif font-bold text-slate-900 text-base flex items-center gap-2">
                <Truck className="w-5 h-5 text-amber-700" />
                <span>Select Delivery Option</span>
              </h4>

              <div className="space-y-3 text-xs">
                <label className="p-4 rounded-2xl border-2 border-amber-500 bg-amber-50/50 flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-3">
                    <input type="radio" name="shipping" defaultChecked className="accent-amber-600" />
                    <div>
                      <strong className="block text-slate-900 font-bold text-sm">
                        Standard Doorstep Delivery ({region})
                      </strong>
                      <p className="text-slate-500">Delivered within 24-48 hours directly to your address.</p>
                    </div>
                  </div>
                  <span className="font-extrabold text-slate-900 text-sm">
                    {shippingFee === 0 ? "FREE" : `${shippingFee} ETB`}
                  </span>
                </label>

                <label className="p-4 rounded-2xl border border-slate-200 hover:border-amber-400 bg-white flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-3">
                    <input type="radio" name="shipping" className="accent-amber-600" />
                    <div>
                      <strong className="block text-slate-900 font-bold text-sm">
                        Bookstore Store Pickup (Bole Edna Mall)
                      </strong>
                      <p className="text-slate-500">Pick up ready order at our Edna Mall branch at your convenience.</p>
                    </div>
                  </div>
                  <span className="font-extrabold text-emerald-700 text-sm">FREE</span>
                </label>
              </div>
            </div>
          )}

          {/* STEP 4: Payment Provider */}
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
                      ? "border-sky-500 bg-sky-50/80"
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
                      ? "border-purple-500 bg-purple-50/80"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-purple-950 text-sm">
                    <Building className="w-4 h-4 text-purple-600" /> CBE Birr (ሲቢኢ ብር)
                  </div>
                  <p className="text-slate-500 text-[11px] mt-1">Commercial Bank of Ethiopia CBE Birr payment.</p>
                </div>

                {/* Cash on Delivery */}
                <div
                  onClick={() => setPaymentMethod("cod")}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                    paymentMethod === "cod"
                      ? "border-amber-500 bg-amber-50/80"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-amber-950 text-sm">
                    <Truck className="w-4 h-4 text-amber-700" /> Cash on Delivery (COD)
                  </div>
                  <p className="text-slate-500 text-[11px] mt-1">Pay with cash upon arrival of your book package.</p>
                </div>

                {/* Bank Wire */}
                <div
                  onClick={() => setPaymentMethod("bank_transfer")}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                    paymentMethod === "bank_transfer"
                      ? "border-emerald-500 bg-emerald-50/80"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-emerald-950 text-sm">
                    <Building className="w-4 h-4 text-emerald-600" /> Bank Transfer
                  </div>
                  <p className="text-slate-500 text-[11px] mt-1">Bank of Abyssinia direct account wire.</p>
                </div>
              </div>

              {/* Payment Details Card */}
              {paymentMethod !== "cod" && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                  <p className="font-bold text-slate-800">Payment Account Details:</p>
                  {paymentMethod === "telebirr" && (
                    <p className="text-sky-900 font-medium">Send <strong className="text-slate-900">{grandTotal} ETB</strong> to Telebirr No: <strong>+251938014055</strong> (JJ Book Shopping)</p>
                  )}
                  {paymentMethod === "cbe_birr" && (
                    <p className="text-purple-900 font-medium">CBE Account: <strong>1000123456789</strong> (JJ Book Shopping)</p>
                  )}
                  {paymentMethod === "bank_transfer" && (
                    <p className="text-emerald-900 font-medium">Bank of Abyssinia (አቢሲንያ ባንክ) Account: <strong>155832444</strong> (JJ Book Shopping)</p>
                  )}

                  <div className="pt-2">
                    <label className="block font-bold text-slate-700 mb-1">Transaction Ref / Reference Number (Optional)</label>
                    <input
                      type="text"
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      placeholder="e.g. FT260812999..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 5: Order Review */}
          {step === 5 && (
            <div className="space-y-4 text-xs">
              <h4 className="font-serif font-bold text-slate-900 text-base">Order Review & Trusted Totals</h4>

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
                  <p className="text-slate-800 font-semibold">{customerName} ({customerPhone})</p>
                  <p className="text-slate-600">{streetAddress}, {subcity ? `${subcity}, ` : ""}{region}</p>
                </div>
                <div>
                  <span className="text-amber-800 font-bold block">Payment Method:</span>
                  <p className="text-slate-800 font-bold uppercase">{paymentMethod}</p>
                  <p className="text-slate-600">Status: Pending Verification</p>
                </div>
              </div>

              {/* Final Math */}
              <div className="space-y-1.5 pt-2 text-slate-700">
                <div className="flex justify-between"><span>Subtotal:</span><span>{subtotal} ETB</span></div>
                {discount > 0 && <div className="flex justify-between text-emerald-700 font-semibold"><span>Discount:</span><span>-{discount} ETB</span></div>}
                <div className="flex justify-between"><span>Shipping Fee:</span><span>{shippingFee === 0 ? "FREE" : `${shippingFee} ETB`}</span></div>
                <div className="flex justify-between"><span>15% VAT Tax:</span><span>{tax} ETB</span></div>
                <div className="flex justify-between text-base font-extrabold text-slate-900 pt-2 border-t border-slate-300">
                  <span>Grand Total:</span>
                  <span className="text-amber-800 text-lg">{grandTotal} ETB</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: Order Confirmation */}
          {step === 6 && createdOrder && (
            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-inner">
                <Check className="w-7 h-7" />
              </div>

              <div>
                <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-[11px] font-extrabold uppercase tracking-wide">
                  Order Successfully Placed
                </span>
                <h3 className="font-serif font-extrabold text-2xl text-slate-900 mt-2">
                  Thank You for Your Order!
                </h3>
              </div>

              {/* Printable/Downloadable Official Receipt Container */}
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
                    <span className="text-slate-400 font-semibold block">Shipping Address:</span>
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
