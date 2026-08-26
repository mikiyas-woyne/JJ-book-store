import React, { useState } from "react";
import {
  X,
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  ArrowRight,
  Tag,
  Truck,
  Sparkles
} from "lucide-react";
import { useCart } from "../../context/CartContext";
import { useToast } from "../ui/Toast";
import { INITIAL_COUPONS } from "../../lib/sampleData";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onProceedToCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  onProceedToCheckout
}) => {
  const {
    cartItems,
    removeFromCart,
    updateQuantity,
    clearCart,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    subtotal,
    discount,
    shippingFee,
    tax,
    grandTotal
  } = useCart();

  const { showToast } = useToast();
  const [couponCodeInput, setCouponCodeInput] = useState("");

  if (!isOpen) return null;

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    const code = couponCodeInput.trim().toUpperCase();
    const found = INITIAL_COUPONS.find(
      (c) => c.code.toUpperCase() === code && c.active
    );

    if (!found) {
      showToast("Invalid Coupon", "The coupon code entered is invalid or expired.", "error");
      return;
    }

    if (subtotal < found.minOrderAmount) {
      showToast(
        "Minimum Order Required",
        `This coupon requires a minimum order of ${found.minOrderAmount} ETB.`,
        "info"
      );
      return;
    }

    applyCoupon(found);
    setCouponCodeInput("");
    showToast("Coupon Applied!", `Successfully applied code ${found.code}`, "success");
  };

  const freeShippingThreshold = 1500;
  const freeShippingProgress = Math.min(100, (subtotal / freeShippingThreshold) * 100);
  const amountToFreeShipping = Math.max(0, freeShippingThreshold - subtotal);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-sm flex justify-end animate-fadeIn">
      <div className="relative w-full max-w-md bg-white shadow-2xl h-full flex flex-col justify-between overflow-hidden">
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-200 bg-white text-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-sm">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <h3 className="font-serif font-extrabold text-lg text-slate-900">Your Shopping Cart</h3>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
              {cartItems.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Free Shipping Progress Ticker */}
        <div className="bg-amber-50/80 px-5 py-3 border-b border-amber-200/60 text-xs">
          {amountToFreeShipping > 0 ? (
            <p className="text-amber-900 font-semibold mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-amber-700" />
                Add <strong className="text-slate-900 font-bold">{amountToFreeShipping} ETB</strong> more for Free Delivery!
              </span>
              <span className="font-bold text-amber-800">{Math.round(freeShippingProgress)}%</span>
            </p>
          ) : (
            <p className="text-emerald-800 font-bold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              You qualify for FREE Delivery across Addis Ababa!
            </p>
          )}
          <div className="w-full h-1.5 bg-amber-200/80 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
              style={{ width: `${freeShippingProgress}%` }}
            />
          </div>
        </div>

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {cartItems.length === 0 ? (
            <div className="text-center py-16 text-slate-400 space-y-3">
              <ShoppingBag className="w-16 h-16 mx-auto text-slate-300 stroke-1" />
              <p className="font-serif font-bold text-slate-700 text-lg">Your cart is currently empty.</p>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Discover our rich catalog of Ethiopian literature, history, novels, textbooks, and bestsellers.
              </p>
            </div>
          ) : (
            cartItems.map((item) => (
              <div
                key={item.bookId}
                className="p-3.5 rounded-2xl border border-slate-200 bg-white shadow-sm flex items-center gap-3.5"
              >
                <img
                  src={item.book.coverImage}
                  alt={item.book.title}
                  className="w-16 h-20 object-cover rounded-xl shrink-0 border border-slate-100"
                />
                <div className="flex-1 min-w-0 space-y-1">
                  <h4 className="font-serif font-bold text-slate-900 text-xs truncate">
                    {item.book.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 truncate">
                    {item.book.authorName}
                  </p>
                  <p className="font-extrabold text-slate-900 text-xs">
                    {item.book.discountPrice || item.book.price} ETB
                  </p>

                  {/* Quantity Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50 overflow-hidden text-xs">
                      <button
                        onClick={() => updateQuantity(item.bookId, item.quantity - 1)}
                        className="p-2 hover:bg-slate-200 text-slate-700 font-bold min-w-[32px] min-h-[32px] flex items-center justify-center active:bg-slate-300 cursor-pointer"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-3 py-1 font-bold text-slate-900 bg-white min-w-[28px] text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.bookId, item.quantity + 1)}
                        className="p-2 hover:bg-slate-200 text-slate-700 font-bold min-w-[32px] min-h-[32px] flex items-center justify-center active:bg-slate-300 cursor-pointer"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      onClick={() => removeFromCart(item.bookId)}
                      className="text-slate-400 hover:text-rose-600 p-2 min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer"
                      title="Remove item"
                      aria-label="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Totals & Checkout Actions */}
        {cartItems.length > 0 && (
          <div className="p-5 border-t border-slate-200 bg-slate-50 space-y-3">
            {/* Coupon Application */}
            {appliedCoupon ? (
              <div className="p-2.5 rounded-xl bg-amber-100/80 text-amber-950 border border-amber-300 text-xs flex items-center justify-between">
                <span className="font-bold flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-amber-700" /> Coupon "{appliedCoupon.code}" Applied
                </span>
                <button
                  onClick={removeCoupon}
                  className="text-amber-800 hover:text-rose-600 text-[11px] font-bold underline cursor-pointer"
                >
                  Remove
                </button>
              </div>
            ) : (
              <form onSubmit={handleApplyCoupon} className="flex gap-2">
                <input
                  type="text"
                  value={couponCodeInput}
                  onChange={(e) => setCouponCodeInput(e.target.value)}
                  placeholder="Coupon code (e.g. WELCOME15)"
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:border-amber-500 uppercase"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 cursor-pointer"
                >
                  Apply
                </button>
              </form>
            )}

            {/* Calculations Breakdown */}
            <div className="space-y-1.5 text-xs text-slate-600 pt-1">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-bold text-slate-900">{subtotal} ETB</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Discount</span>
                  <span>-{discount} ETB</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Delivery Fee</span>
                <span className="font-bold text-slate-900">
                  {shippingFee === 0 ? "FREE" : `${shippingFee} ETB`}
                </span>
              </div>
              <div className="flex justify-between">
                <span>15% VAT Tax</span>
                <span className="font-bold text-slate-900">{tax} ETB</span>
              </div>
              <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-2 border-t border-slate-200">
                <span>Total Amount</span>
                <span className="text-slate-900 font-serif text-lg">{grandTotal} ETB</span>
              </div>
            </div>

            {/* Checkout & Clear Buttons */}
            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  onProceedToCheckout();
                  onClose();
                }}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold text-sm shadow-md shadow-amber-200 transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
              >
                <span>Proceed to Secure Checkout</span>
                <ArrowRight className="w-4 h-4 text-slate-950" />
              </button>

              <button
                onClick={clearCart}
                className="w-full py-2 text-xs font-semibold text-slate-400 hover:text-rose-600 text-center cursor-pointer"
              >
                Clear Cart Items
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
