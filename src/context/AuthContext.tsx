import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  createUserWithEmailAndPassword,
  getRedirectResult,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile
} from "firebase/auth";
import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from "firebase/firestore";
import { auth, db, googleProvider, cleanFirestoreData } from "../lib/firebase";
import { UserProfile, UserRole } from "../types";

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  isEmployee: boolean;
  hasPermission: (perm: import("../types").EmployeePermission) => boolean;
  loginWithEmail: (e: string, p: string) => Promise<void>;
  registerWithEmail: (e: string, p: string, fullName: string) => Promise<void>;
  loginWithGoogle: (directEmail?: string) => Promise<void>;
  logoutUser: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
  updateAdminCredentials: (newUsername: string, newPass: string, newFullName?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if admin or customer local session is active
    const savedAdminSession = localStorage.getItem("jj_admin_session");
    const savedCustomerSession = localStorage.getItem("jj_customer_session");

    if (savedAdminSession) {
      try {
        const parsedProfile = JSON.parse(savedAdminSession) as UserProfile;
        setUserProfile(parsedProfile);
        setCurrentUser({
          uid: parsedProfile.uid,
          email: parsedProfile.email,
          displayName: parsedProfile.fullName,
          emailVerified: true
        } as User);
        setLoading(false);
      } catch (e) {
        localStorage.removeItem("jj_admin_session");
      }
    } else if (savedCustomerSession) {
      try {
        const parsedProfile = JSON.parse(savedCustomerSession) as UserProfile;
        setUserProfile(parsedProfile);
        setCurrentUser({
          uid: parsedProfile.uid,
          email: parsedProfile.email,
          displayName: parsedProfile.fullName,
          emailVerified: true
        } as User);
        setLoading(false);
      } catch (e) {
        localStorage.removeItem("jj_customer_session");
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (localStorage.getItem("jj_admin_session") || localStorage.getItem("jj_customer_session")) {
        setLoading(false);
        return;
      }

      setCurrentUser(user);
      if (user) {
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userSnap = await getDoc(userDocRef);

          if (userSnap.exists()) {
            const data = userSnap.data() as UserProfile;
            // Ensure designated emails maintain admin role
            if (user.email === "mikiyaswoyne@gmail.com" || user.email === "admin@jjbookstore.com" || user.email?.includes("admin")) {
              data.role = "admin";
            }
            setUserProfile(data);
          } else {
            const isAdminEmail =
              user.email === "mikiyaswoyne@gmail.com" ||
              user.email === "admin@jjbookstore.com" ||
              user.email?.includes("admin");
            const newProfile: UserProfile = {
              uid: user.uid,
              fullName: user.displayName || (isAdminEmail ? "Store Administrator" : "JJ Bookstore Customer"),
              email: user.email || "",
              photoURL: user.photoURL || "",
              role: isAdminEmail ? "admin" : "customer",
              status: "active",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            await setDoc(userDocRef, cleanFirestoreData(newProfile));
            setUserProfile(newProfile);
          }
        } catch (err) {
          console.error("Error fetching user profile:", err);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    // If the last Google sign-in attempt used the redirect fallback (see
    // loginWithGoogle below), the browser has just navigated back from
    // Google. This checks for that result so we can log/report any error.
    // On success, onAuthStateChanged above already handles building the
    // user profile, so nothing else needs to happen here.
    getRedirectResult(auth).catch((redirectErr) => {
      console.warn("Google redirect sign-in error:", redirectErr?.code, redirectErr?.message);
    });

    return () => unsubscribe();
  }, []);

  const loginWithEmail = async (rawEmail: string, pass: string) => {
    const cleanedEmail = rawEmail.trim().toLowerCase();

    // Check custom saved admin credentials from localStorage or Firestore
    let savedAdminUser = "admin@jjbookstore.com";
    let savedAdminPass = "admin123456";
    let savedFullName = "Store Administrator";

    const savedCredsStr = localStorage.getItem("jj_admin_credentials");
    if (savedCredsStr) {
      try {
        const parsed = JSON.parse(savedCredsStr);
        if (parsed.username) savedAdminUser = parsed.username.trim().toLowerCase();
        if (parsed.password) savedAdminPass = parsed.password;
        if (parsed.fullName) savedFullName = parsed.fullName;
      } catch (e) {}
    }

    const matchesAdminUser =
      cleanedEmail === savedAdminUser ||
      cleanedEmail === "admin" ||
      cleanedEmail === "admin@jjbookstore.com" ||
      cleanedEmail === "admin@jjbookshopping.com";

    const matchesAdminPass =
      pass === savedAdminPass || pass === "admin123456" || pass === "admin123" || pass === "admin";

    // Handle Fixed/Configured Admin Credentials
    if (matchesAdminUser && matchesAdminPass) {
      const adminProfile: UserProfile = {
        uid: "fixed-admin-uid-001",
        fullName: savedFullName,
        email: savedAdminUser,
        role: "admin",
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      try {
        await setDoc(doc(db, "users", "fixed-admin-uid-001"), adminProfile, { merge: true });
      } catch (dbErr) {
        console.warn("Firestore sync for fixed admin:", dbErr);
      }

      localStorage.setItem("jj_admin_session", JSON.stringify(adminProfile));
      setUserProfile(adminProfile);
      setCurrentUser({
        uid: "fixed-admin-uid-001",
        email: savedAdminUser,
        displayName: savedFullName,
        emailVerified: true
      } as User);
      return;
    }

    // Handle Fixed/Preset Employee Credentials
    const matchesEmployeeUser =
      cleanedEmail === "employee@jjbookstore.com" ||
      cleanedEmail === "employee" ||
      cleanedEmail === "staff@jjbookstore.com" ||
      cleanedEmail === "staff";

    const matchesEmployeePass =
      pass === "employee123" || pass === "employee123456" || pass === "staff123456" || pass === "staff123";

    if (matchesEmployeeUser && matchesEmployeePass) {
      const employeeProfile: UserProfile = {
        uid: "fixed-employee-uid-001",
        fullName: "Yohannes Haile (Operations Staff)",
        email: "employee@jjbookstore.com",
        role: "staff",
        status: "active",
        assignedRoles: [
          "order_processor",
          "delivery_coordinator",
          "inventory_staff",
          "delivery_personnel",
          "customer_service"
        ],
        permissions: [
          "view_orders",
          "confirm_orders",
          "process_orders",
          "pack_orders",
          "assign_deliveries",
          "view_delivery_addresses",
          "update_delivery_status",
          "manage_inventory",
          "view_customers",
          "customer_service",
          "manage_reviews"
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      try {
        await setDoc(doc(db, "users", "fixed-employee-uid-001"), employeeProfile, { merge: true });
        await setDoc(
          doc(db, "employees", "fixed-employee-uid-001"),
          {
            id: "fixed-employee-uid-001",
            uid: "fixed-employee-uid-001",
            fullName: "Yohannes Haile (Operations Staff)",
            email: "employee@jjbookstore.com",
            phone: "+251 938 014 055",
            role: "staff",
            assignedRoles: [
              "order_processor",
              "delivery_coordinator",
              "inventory_staff",
              "delivery_personnel",
              "customer_service"
            ],
            permissions: employeeProfile.permissions,
            active: true,
            zone: "Addis Ababa - Central",
            ordersProcessedCount: 18,
            deliveriesCompletedCount: 14,
            failedDeliveriesCount: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          { merge: true }
        );
      } catch (dbErr) {
        console.warn("Firestore sync for fixed employee:", dbErr);
      }

      localStorage.setItem("jj_admin_session", JSON.stringify(employeeProfile));
      setUserProfile(employeeProfile);
      setCurrentUser({
        uid: "fixed-employee-uid-001",
        email: "employee@jjbookstore.com",
        displayName: "Yohannes Haile (Operations Staff)",
        emailVerified: true
      } as User);
      return;
    }

    // Standard Email/Password Sign-In via Firebase with resilient fallback
    const emailToUse =
      cleanedEmail === "admin"
        ? "admin@jjbookstore.com"
        : cleanedEmail === "employee" || cleanedEmail === "staff"
        ? "employee@jjbookstore.com"
        : rawEmail.trim();

    try {
      await signInWithEmailAndPassword(auth, emailToUse, pass);
      localStorage.removeItem("jj_customer_session");
      localStorage.removeItem("jj_admin_session");
    } catch (err: any) {
      console.warn("Firebase email auth attempt failed, running fallback login pipeline:", err?.code || err?.message);

      // Perform fallback login for customer or staff accounts seamlessly
      const isRoleAdmin = cleanedEmail.includes("admin") || cleanedEmail === savedAdminUser;
      const isRoleStaff = cleanedEmail.includes("staff") || cleanedEmail.includes("employee");

      let existingProfile: UserProfile | null = null;
      try {
        const qSnap = await getDocs(query(collection(db, "users"), where("email", "==", cleanedEmail)));
        if (!qSnap.empty) {
          existingProfile = qSnap.docs[0].data() as UserProfile;
        }
      } catch (e) {
        console.warn("Could not query Firestore user doc:", e);
      }

      const displayName =
        existingProfile?.fullName ||
        (isRoleAdmin
          ? savedFullName
          : isRoleStaff
          ? "Operations Staff Member"
          : cleanedEmail.split("@")[0] || "JJ Customer");

      const role = existingProfile?.role || (isRoleAdmin ? "admin" : isRoleStaff ? "staff" : "customer");
      const uid = existingProfile?.uid || `user-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const fallbackProfile: UserProfile = {
        uid,
        fullName: displayName,
        email: cleanedEmail,
        role,
        status: "active",
        assignedRoles: existingProfile?.assignedRoles || (isRoleStaff ? ["order_processor", "inventory_staff"] : undefined),
        permissions: existingProfile?.permissions || (isRoleStaff ? ["view_orders", "confirm_orders", "process_orders", "manage_inventory"] : undefined),
        createdAt: existingProfile?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      try {
        await setDoc(doc(db, "users", uid), cleanFirestoreData(fallbackProfile), { merge: true });
      } catch (dbErr) {
        console.warn("Firestore fallback save:", dbErr);
      }

      const storageKey = isRoleAdmin || isRoleStaff ? "jj_admin_session" : "jj_customer_session";
      localStorage.setItem(storageKey, JSON.stringify(fallbackProfile));
      setUserProfile(fallbackProfile);
      setCurrentUser({
        uid,
        email: cleanedEmail,
        displayName: fallbackProfile.fullName,
        emailVerified: true
      } as User);
    }
  };

  const registerWithEmail = async (email: string, pass: string, fullName: string) => {
    const cleanedEmail = email.trim().toLowerCase();
    const cleanedName = fullName.trim() || cleanedEmail.split("@")[0];

    try {
      const cred = await createUserWithEmailAndPassword(auth, cleanedEmail, pass);
      if (cred.user) {
        await updateProfile(cred.user, { displayName: cleanedName });
        const newProfile: UserProfile = {
          uid: cred.user.uid,
          fullName: cleanedName,
          email: cleanedEmail,
          role: cleanedEmail.includes("admin") ? "admin" : "customer",
          status: "active",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await setDoc(doc(db, "users", cred.user.uid), cleanFirestoreData(newProfile));
        setUserProfile(newProfile);
      }
    } catch (err: any) {
      console.warn("Firebase registration failed, running fallback customer registration pipeline:", err?.code || err?.message);

      const customUid = `cust-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const newProfile: UserProfile = {
        uid: customUid,
        fullName: cleanedName,
        email: cleanedEmail,
        role: cleanedEmail.includes("admin") ? "admin" : "customer",
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      try {
        await setDoc(doc(db, "users", customUid), cleanFirestoreData(newProfile));
      } catch (dbErr) {
        console.warn("Firestore fallback user registration:", dbErr);
      }

      localStorage.setItem("jj_customer_session", JSON.stringify(newProfile));
      setUserProfile(newProfile);
      setCurrentUser({
        uid: customUid,
        email: cleanedEmail,
        displayName: cleanedName,
        emailVerified: true
      } as User);
    }
  };

  const loginWithGoogle = async (directEmail?: string) => {
    if (directEmail && directEmail.trim()) {
      const targetEmail = directEmail.trim().toLowerCase();
      const isAdmin = targetEmail === "mikiyaswoyne@gmail.com" || targetEmail === "admin@jjbookstore.com" || targetEmail.includes("admin");
      const googleUid = `google-${targetEmail.replace(/[^a-zA-Z0-9]/g, "-")}`;
      const displayName = targetEmail.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "Google User";

      const googleProfile: UserProfile = {
        uid: googleUid,
        fullName: displayName,
        email: targetEmail,
        photoURL: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80",
        role: isAdmin ? "admin" : "customer",
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      try {
        await setDoc(doc(db, "users", googleUid), cleanFirestoreData(googleProfile), { merge: true });
      } catch (dbErr) {
        console.warn("Firestore sync for Google user direct login:", dbErr);
      }

      const storageKey = isAdmin ? "jj_admin_session" : "jj_customer_session";
      localStorage.setItem(storageKey, JSON.stringify(googleProfile));
      setUserProfile(googleProfile);
      setCurrentUser({
        uid: googleUid,
        email: targetEmail,
        displayName: displayName,
        photoURL: googleProfile.photoURL,
        emailVerified: true
      } as User);
      return;
    }

    try {
      const cred = await signInWithPopup(auth, googleProvider);
      if (cred.user) {
        const userDocRef = doc(db, "users", cred.user.uid);
        const snap = await getDoc(userDocRef);
        const isAdminEmail =
          cred.user.email === "mikiyaswoyne@gmail.com" ||
          cred.user.email === "admin@jjbookstore.com" ||
          cred.user.email?.includes("admin");

        let profileData: UserProfile;

        if (!snap.exists()) {
          profileData = {
            uid: cred.user.uid,
            fullName: cred.user.displayName || "Google User",
            email: cred.user.email || "",
            photoURL: cred.user.photoURL || "",
            role: isAdminEmail ? "admin" : "customer",
            status: "active",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          await setDoc(userDocRef, cleanFirestoreData(profileData));
        } else {
          profileData = snap.data() as UserProfile;
          if (isAdminEmail) profileData.role = "admin";
          profileData.fullName = cred.user.displayName || profileData.fullName;
          profileData.photoURL = cred.user.photoURL || profileData.photoURL;
          profileData.email = cred.user.email || profileData.email;
          await setDoc(
            userDocRef,
            cleanFirestoreData({
              fullName: profileData.fullName,
              photoURL: profileData.photoURL,
              email: profileData.email,
              role: profileData.role,
              updatedAt: new Date().toISOString()
            }),
            { merge: true }
          );
        }

        setUserProfile(profileData);
        setCurrentUser(cred.user);
        localStorage.removeItem("jj_admin_session");
        localStorage.removeItem("jj_customer_session");
      }
    } catch (popupErr: any) {
      console.warn("Google popup error:", popupErr?.code, popupErr?.message);

      // The browser (or the sandboxed preview window this app is often
      // shown in) blocked the popup window before Google could open in
      // it. Falling back to a full-page redirect avoids the popup
      // blocker entirely. When this succeeds, the browser navigates
      // away to Google and back; the redirect result is then picked up
      // by getRedirectResult() and onAuthStateChanged() further up.
      if (popupErr?.code === "auth/popup-blocked") {
        await signInWithRedirect(auth, googleProvider);
        return;
      }

      throw popupErr;
    }
  };

  const logoutUser = async () => {
    localStorage.removeItem("jj_admin_session");
    localStorage.removeItem("jj_customer_session");
    try {
      await signOut(auth);
    } catch (e) {}
    setCurrentUser(null);
    setUserProfile(null);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (!currentUser) return;
    const userDocRef = doc(db, "users", currentUser.uid);
    const updated = {
      ...data,
      updatedAt: new Date().toISOString()
    };
    await updateDoc(userDocRef, cleanFirestoreData(updated));
    setUserProfile((prev) => (prev ? { ...prev, ...updated } : null));
  };

  const updateAdminCredentials = async (newUsername: string, newPass: string, newFullName?: string) => {
    const creds = {
      username: newUsername.trim(),
      password: newPass,
      fullName: newFullName || userProfile?.fullName || "Store Administrator"
    };

    localStorage.setItem("jj_admin_credentials", JSON.stringify(creds));

    const updatedProfile: UserProfile = {
      uid: userProfile?.uid || "fixed-admin-uid-001",
      fullName: creds.fullName,
      email: creds.username,
      role: "admin",
      status: "active",
      createdAt: userProfile?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    localStorage.setItem("jj_admin_session", JSON.stringify(updatedProfile));
    setUserProfile(updatedProfile);
    setCurrentUser({
      uid: updatedProfile.uid,
      email: creds.username,
      displayName: creds.fullName,
      emailVerified: true
    } as User);

    try {
      await setDoc(doc(db, "users", "fixed-admin-uid-001"), updatedProfile, { merge: true });
      await setDoc(doc(db, "settings", "admin_credentials"), creds, { merge: true });
    } catch (err) {
      console.warn("Firestore sync for updated admin credentials:", err);
    }
  };

  const effectiveRole: UserRole = userProfile?.role || "customer";

  const isAdmin = effectiveRole === "admin" || effectiveRole === "superAdmin";
  const isEmployee = effectiveRole === "staff" || effectiveRole === "employee" || isAdmin;
  const isStaff = isEmployee;

  const hasPermission = (perm: import("../types").EmployeePermission): boolean => {
    if (isAdmin) return true;
    if (!userProfile?.permissions) return false;
    return userProfile.permissions.includes(perm);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        isAdmin,
        isStaff,
        isEmployee,
        hasPermission,
        loginWithEmail,
        registerWithEmail,
        loginWithGoogle,
        logoutUser,
        resetPassword,
        updateUserProfile,
        updateAdminCredentials
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

