import { doc, getDoc, setDoc, writeBatch, collection, getDocs, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import {
  INITIAL_AUTHORS,
  INITIAL_BOOKS,
  INITIAL_CATEGORIES,
  INITIAL_COUPONS,
  INITIAL_STORE_SETTINGS
} from "./sampleData";

export async function resetAllReviewsToZeroInFirestore() {
  try {
    const booksSnap = await getDocs(collection(db, "books"));
    if (!booksSnap.empty) {
      const batch = writeBatch(db);
      booksSnap.forEach((bookDoc) => {
        batch.update(bookDoc.ref, {
          ratingAverage: 0,
          reviewCount: 0,
          updatedAt: new Date().toISOString()
        });
      });
      await batch.commit();
      console.log("Successfully reset all book review counts and rating averages to 0 in Firestore.");
    }
  } catch (err) {
    console.warn("Notice resetting reviews in Firestore:", err);
  }
}

export async function seedBookstoreData(forceReset = false) {
  try {
    // Check if store settings already exist
    const settingsRef = doc(db, "settings", "store_config");
    let settingsSnap;
    try {
      settingsSnap = await getDoc(settingsRef);
    } catch (e) {
      console.warn("Firestore connectivity notice during seed check:", e);
      return { success: false, error: "Firestore currently offline or connecting." };
    }

    if (settingsSnap.exists() && !forceReset) {
      console.log("Firestore already seeded with initial bookstore data.");
      return { success: true, message: "Data already initialized." };
    }

    const batch = writeBatch(db);

    // Seed Settings
    batch.set(settingsRef, {
      ...INITIAL_STORE_SETTINGS,
      updatedAt: new Date().toISOString()
    });

    // Seed Categories
    for (const cat of INITIAL_CATEGORIES) {
      const catRef = doc(db, "categories", cat.id);
      batch.set(catRef, {
        ...cat,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    // Seed Authors
    for (const auth of INITIAL_AUTHORS) {
      const authRef = doc(db, "authors", auth.id);
      batch.set(authRef, {
        ...auth,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    // Seed Books
    for (const book of INITIAL_BOOKS) {
      const bookRef = doc(db, "books", book.id);
      batch.set(bookRef, {
        ...book,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    // Seed Coupons
    for (const coupon of INITIAL_COUPONS) {
      const couponRef = doc(db, "coupons", coupon.id);
      batch.set(couponRef, coupon);
    }

    await batch.commit();
    console.log("Successfully seeded JJ Book Shopping Firestore collections.");
    return { success: true, message: "Firestore database successfully seeded!" };
  } catch (error) {
    console.error("Error seeding Firestore database:", error);
    return { success: false, error: (error as Error).message };
  }
}
