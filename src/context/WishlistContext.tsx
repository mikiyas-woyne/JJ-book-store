import React, { createContext, useContext, useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "./AuthContext";

interface WishlistContextType {
  wishlistIds: string[];
  toggleWishlist: (bookId: string) => void;
  isInWishlist: (bookId: string) => boolean;
  clearWishlist: () => void;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);
const LOCAL_WISHLIST_KEY = "jj_bookstore_wishlist";

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [wishlistIds, setWishlistIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_WISHLIST_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Load from Firestore
  useEffect(() => {
    if (currentUser) {
      const fetchWishlist = async () => {
        try {
          const docRef = doc(db, "wishlists", currentUser.uid);
          const snap = await getDoc(docRef);
          if (snap.exists() && snap.data().bookIds) {
            setWishlistIds(snap.data().bookIds);
          }
        } catch (e) {
          console.error("Error fetching wishlist:", e);
        }
      };
      fetchWishlist();
    }
  }, [currentUser]);

  // Persist
  useEffect(() => {
    localStorage.setItem(LOCAL_WISHLIST_KEY, JSON.stringify(wishlistIds));
    if (currentUser) {
      setDoc(
        doc(db, "wishlists", currentUser.uid),
        { userId: currentUser.uid, bookIds: wishlistIds, updatedAt: new Date().toISOString() },
        { merge: true }
      );
    }
  }, [wishlistIds, currentUser]);

  const toggleWishlist = (bookId: string) => {
    setWishlistIds((prev) =>
      prev.includes(bookId) ? prev.filter((id) => id !== bookId) : [...prev, bookId]
    );
  };

  const isInWishlist = (bookId: string) => wishlistIds.includes(bookId);

  const clearWishlist = () => setWishlistIds([]);

  return (
    <WishlistContext.Provider
      value={{ wishlistIds, toggleWishlist, isInWishlist, clearWishlist }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
};
