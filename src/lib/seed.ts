import { doc, getDoc, setDoc, writeBatch } from "firebase/firestore";
import { db } from "./firebase";
import {
  INITIAL_AUTHORS,
  INITIAL_BOOKS,
  INITIAL_CATEGORIES,
  INITIAL_COUPONS,
  INITIAL_STORE_SETTINGS
} from "./sampleData";

export async function seedBookstoreData(forceReset = false) {
  try {
    // Check if store settings already exist
    const settingsRef = doc(db, "settings", "store_config");
    const settingsSnap = await getDoc(settingsRef);

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
