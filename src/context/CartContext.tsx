import React, { createContext, useContext, useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Book, CartItem, Coupon } from "../types";
import { useAuth } from "./AuthContext";

interface CartContextType {
  cartItems: CartItem[];
  appliedCoupon: Coupon | null;
  addToCart: (book: Book, quantity?: number) => boolean;
  removeFromCart: (bookId: string) => void;
  updateQuantity: (bookId: string, quantity: number) => void;
  clearCart: () => void;
  applyCoupon: (coupon: Coupon) => void;
  removeCoupon: () => void;
  subtotal: number;
  discount: number;
  shippingFee: number;
  tax: number;
  grandTotal: number;
  totalItemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const LOCAL_STORAGE_CART_KEY = "jj_bookstore_cart";

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_CART_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);

  // Sync with Firestore on user login
  useEffect(() => {
    if (currentUser) {
      const syncUserCart = async () => {
        try {
          const cartDocRef = doc(db, "carts", currentUser.uid);
          const cartSnap = await getDoc(cartDocRef);
          if (cartSnap.exists()) {
            const data = cartSnap.data();
            if (data.items && Array.isArray(data.items)) {
              // Merge local items with Firestore items
              setCartItems(data.items as CartItem[]);
            }
          } else if (cartItems.length > 0) {
            // Save local guest cart to user doc
            await setDoc(cartDocRef, {
              userId: currentUser.uid,
              items: cartItems,
              updatedAt: new Date().toISOString()
            });
          }
        } catch (err) {
          console.error("Error loading user cart from Firestore:", err);
        }
      };
      syncUserCart();
    }
  }, [currentUser]);

  // Persist local storage and Firestore on cart change
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_CART_KEY, JSON.stringify(cartItems));
    } catch (e) {
      console.error("Failed to save cart to localStorage", e);
    }

    if (currentUser) {
      const saveToFirestore = async () => {
        try {
          await setDoc(doc(db, "carts", currentUser.uid), {
            userId: currentUser.uid,
            items: cartItems,
            updatedAt: new Date().toISOString()
          });
        } catch (e) {
          console.error("Failed to save cart to Firestore", e);
        }
      };
      saveToFirestore();
    }
  }, [cartItems, currentUser]);

  const addToCart = (book: Book, quantity = 1): boolean => {
    let success = true;
    setCartItems((prev) => {
      const existing = prev.find((item) => item.bookId === book.id);
      const currentQty = existing ? existing.quantity : 0;
      const newQty = currentQty + quantity;

      if (newQty > book.stock) {
        alert(`Sorry! Only ${book.stock} units available in stock for "${book.title}".`);
        success = false;
        return prev;
      }

      if (existing) {
        return prev.map((item) =>
          item.bookId === book.id ? { ...item, quantity: newQty, book } : item
        );
      }

      return [
        ...prev,
        {
          bookId: book.id,
          book,
          quantity,
          addedAt: new Date().toISOString()
        }
      ];
    });
    return success;
  };

  const removeFromCart = (bookId: string) => {
    setCartItems((prev) => prev.filter((item) => item.bookId !== bookId));
  };

  const updateQuantity = (bookId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(bookId);
      return;
    }
    setCartItems((prev) =>
      prev.map((item) => {
        if (item.bookId === bookId) {
          if (quantity > item.book.stock) {
            alert(`Maximum stock available for "${item.book.title}" is ${item.book.stock}`);
            return { ...item, quantity: item.book.stock };
          }
          return { ...item, quantity };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setCartItems([]);
    setAppliedCoupon(null);
  };

  const applyCoupon = (coupon: Coupon) => {
    setAppliedCoupon(coupon);
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
  };

  // Totals calculations
  const subtotal = cartItems.reduce((sum, item) => {
    if (!item || !item.book) return sum;
    const price = Number(item.book.discountPrice || item.book.price || 0);
    const qty = Number(item.quantity || 1);
    const validPrice = isNaN(price) ? 0 : price;
    const validQty = isNaN(qty) ? 1 : qty;
    return sum + validPrice * validQty;
  }, 0);

  let discount = 0;
  if (appliedCoupon && subtotal >= appliedCoupon.minOrderAmount) {
    if (appliedCoupon.discountType === "percentage") {
      discount = (subtotal * appliedCoupon.discountValue) / 100;
      if (appliedCoupon.maxDiscount && discount > appliedCoupon.maxDiscount) {
        discount = appliedCoupon.maxDiscount;
      }
    } else {
      discount = appliedCoupon.discountValue;
    }
  }

  const shippingFee = subtotal === 0 || subtotal >= 1500 ? 0 : 150; // ETB 150 standard delivery or Free over 1,500 ETB
  const taxableAmount = Math.max(0, subtotal - discount);
  const tax = Math.round(taxableAmount * 0.15); // 15% VAT
  const grandTotal = Math.max(0, taxableAmount + tax + shippingFee);

  const totalItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        appliedCoupon,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        applyCoupon,
        removeCoupon,
        subtotal,
        discount,
        shippingFee,
        tax,
        grandTotal,
        totalItemCount
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};
