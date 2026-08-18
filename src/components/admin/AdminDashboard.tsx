import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  ShoppingBag,
  Plus,
  Edit,
  Trash2,
  TrendingUp,
  Tag,
  RefreshCw,
  Search,
  CheckCircle,
  AlertTriangle,
  Clock,
  Layers,
  Sparkles,
  FileText,
  Shield,
  Key,
  Lock,
  UserCheck,
  DollarSign,
  PackageCheck,
  BarChart3,
  Award,
  Zap,
  ArrowUpRight,
  Filter,
  CheckCircle2,
  Truck,
  XCircle,
  Box,
  Eye,
  EyeOff,
  Activity,
  AlertCircle,
  Mail
} from "lucide-react";
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, addDoc, onSnapshot, writeBatch } from "firebase/firestore";
import { db, cleanFirestoreData } from "../../lib/firebase";
import { Author, Book, Category, Coupon, Order, OrderStatus } from "../../types";
import { seedBookstoreData } from "../../lib/seed";
import { sendTestEmail, getSmtpConfig, saveSmtpConfig } from "../../lib/emailService";
import { useToast } from "../ui/Toast";
import { useAuth } from "../../context/AuthContext";
import { getValidBookCover } from "../../lib/sampleData";
import { EmployeeManager } from "./EmployeeManager";
import { ImageUploader } from "./ImageUploader";

export interface ActivityLogItem {
  id?: string;
  title: string;
  description: string;
  category: "orders" | "inventory" | "system" | "promo";
  type?: string;
  orderId?: string;
  amount?: number;
  timestamp: string;
}

interface AdminDashboardProps {
  books: Book[];
  authors: Author[];
  categories: Category[];
  coupons: Coupon[];
  onRefreshData: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  books,
  authors,
  categories,
  coupons,
  onRefreshData
}) => {
  const { showToast } = useToast();
  const { userProfile, updateAdminCredentials } = useAuth();
  const [activeTab, setActiveTab] = useState<
    "overview" | "books" | "orders" | "authors" | "categories" | "coupons" | "employees" | "email" | "security"
  >("overview");

  // Test Email & SMTP Configuration State
  const [testTargetEmail, setTestTargetEmail] = useState("mikiyaswoyne@gmail.com");
  const [testingEmail, setTestingEmail] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    hint?: string;
    details?: any;
  } | null>(null);

  // SMTP Config Form State
  const [smtpPreset, setSmtpPreset] = useState<"gmail" | "sendgrid" | "brevo" | "mailgun" | "outlook" | "yahoo" | "custom">("gmail");
  const [smtpHost, setSmtpHost] = useState("smtp.gmail.com");
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [adminReceiverEmail, setAdminReceiverEmail] = useState("mikiyaswoyne@gmail.com");
  const [isSmtpConfigured, setIsSmtpConfigured] = useState(false);
  const [hasPassSaved, setHasPassSaved] = useState(false);
  const [savingSmtp, setSavingSmtp] = useState(false);
  const [loadingSmtpConfig, setLoadingSmtpConfig] = useState(false);

  // Load existing SMTP config from backend
  const fetchSmtpConfig = async () => {
    setLoadingSmtpConfig(true);
    try {
      const config = await getSmtpConfig();
      if (config.success) {
        if (config.host) setSmtpHost(config.host);
        if (config.port) setSmtpPort(config.port);
        if (config.user) setSmtpUser(config.user);
        if (config.adminEmail) {
          setAdminReceiverEmail(config.adminEmail);
          setTestTargetEmail(config.adminEmail);
        }
        setSmtpSecure(config.secure);
        setIsSmtpConfigured(config.configured);
        setHasPassSaved(config.hasPass);

        // Detect preset from host
        const h = (config.host || "").toLowerCase();
        if (h.includes("gmail")) setSmtpPreset("gmail");
        else if (h.includes("sendgrid")) setSmtpPreset("sendgrid");
        else if (h.includes("brevo") || h.includes("sendinblue")) setSmtpPreset("brevo");
        else if (h.includes("mailgun")) setSmtpPreset("mailgun");
        else if (h.includes("office365") || h.includes("outlook")) setSmtpPreset("outlook");
        else if (h.includes("yahoo")) setSmtpPreset("yahoo");
        else if (h) setSmtpPreset("custom");
      }
    } catch (err) {
      console.warn("Failed to load SMTP config:", err);
    } finally {
      setLoadingSmtpConfig(false);
    }
  };

  useEffect(() => {
    if (activeTab === "email") {
      fetchSmtpConfig();
    }
  }, [activeTab]);

  const handleApplyPreset = (preset: "gmail" | "sendgrid" | "brevo" | "mailgun" | "outlook" | "yahoo" | "custom") => {
    setSmtpPreset(preset);
    switch (preset) {
      case "gmail":
        setSmtpHost("smtp.gmail.com");
        setSmtpPort(587);
        setSmtpSecure(false);
        break;
      case "sendgrid":
        setSmtpHost("smtp.sendgrid.net");
        setSmtpPort(587);
        setSmtpSecure(false);
        setSmtpUser("apikey");
        break;
      case "brevo":
        setSmtpHost("smtp-relay.brevo.com");
        setSmtpPort(587);
        setSmtpSecure(false);
        break;
      case "mailgun":
        setSmtpHost("smtp.mailgun.org");
        setSmtpPort(587);
        setSmtpSecure(false);
        break;
      case "outlook":
        setSmtpHost("smtp.office365.com");
        setSmtpPort(587);
        setSmtpSecure(false);
        break;
      case "yahoo":
        setSmtpHost("smtp.mail.yahoo.com");
        setSmtpPort(465);
        setSmtpSecure(true);
        break;
      case "custom":
        break;
    }
  };

  const handleSaveSmtpSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smtpHost.trim()) {
      showToast("Host Required", "Please specify an SMTP host server address.", "error");
      return;
    }
    if (!smtpUser.trim()) {
      showToast("User Required", "Please specify an SMTP username or sender email address.", "error");
      return;
    }

    setSavingSmtp(true);
    try {
      const res = await saveSmtpConfig({
        host: smtpHost.trim(),
        port: Number(smtpPort) || 587,
        user: smtpUser.trim(),
        pass: smtpPass.trim() || undefined,
        secure: smtpSecure,
        adminEmail: adminReceiverEmail.trim()
      });

      if (res.success) {
        setIsSmtpConfigured(res.configured);
        if (smtpPass.trim()) setHasPassSaved(true);
        setSmtpPass("");
        showToast("SMTP Configured!", res.message, "success");
      } else {
        showToast("Configuration Error", res.message, "error");
      }
    } catch (err: any) {
      showToast("Save Failed", err?.message || "Failed to save SMTP settings.", "error");
    } finally {
      setSavingSmtp(false);
    }
  };

  const handleRunEmailTest = async () => {
    if (!testTargetEmail.trim() || !testTargetEmail.includes("@")) {
      showToast("Invalid Email", "Please enter a valid recipient email address.", "error");
      return;
    }

    setTestingEmail(true);
    setTestResult(null);
    try {
      const res = await sendTestEmail(testTargetEmail.trim());
      setTestResult(res);
      if (res.success) {
        showToast("Test Email Sent!", res.message, "success");
      } else {
        showToast("Email Test Alert", res.message || "Failed to send test email.", "error");
      }
    } catch (err: any) {
      const errRes = {
        success: false,
        message: err?.message || "Failed to execute email test.",
        hint: "Verify server connection and environment SMTP variable configuration."
      };
      setTestResult(errRes);
      showToast("Email Test Error", errRes.message, "error");
    } finally {
      setTestingEmail(false);
    }
  };

  // Admin Security Credentials Form State
  const [adminFullName, setAdminFullName] = useState("");
  const [adminUsername, setAdminUsername] = useState("");
  const [adminNewPassword, setAdminNewPassword] = useState("");
  const [adminConfirmPassword, setAdminConfirmPassword] = useState("");
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [savingCredentials, setSavingCredentials] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setAdminFullName(userProfile.fullName || "Store Administrator");
      setAdminUsername(userProfile.email || "admin@jjbookstore.com");
    } else {
      const saved = localStorage.getItem("jj_admin_credentials");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setAdminFullName(parsed.fullName || "Store Administrator");
          setAdminUsername(parsed.username || "admin@jjbookstore.com");
        } catch (e) {}
      } else {
        setAdminFullName("Store Administrator");
        setAdminUsername("admin@jjbookstore.com");
      }
    }
  }, [userProfile]);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [seeding, setSeeding] = useState(false);

  // Real-time Activity Logs State
  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>([]);
  const [lowStockFilter, setLowStockFilter] = useState<"all" | "out" | "critical" | "low">("all");
  const [lowStockQuery, setLowStockQuery] = useState("");
  const [activityCategoryFilter, setActivityCategoryFilter] = useState<"all" | "orders" | "inventory" | "system" | "promo">("all");
  const [activityQuery, setActivityQuery] = useState("");
  const [customRestockQty, setCustomRestockQty] = useState<{ [bookId: string]: number }>({});

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCatFilter, setSelectedCatFilter] = useState("all");
  const [selectedStockFilter, setSelectedStockFilter] = useState<"all" | "low" | "out" | "in">("all");
  const [selectedOrderStatusFilter, setSelectedOrderStatusFilter] = useState<string>("all");

  // Book Modal Form
  const [showBookModal, setShowBookModal] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [bookTitle, setBookTitle] = useState("");
  const [bookAuthorId, setBookAuthorId] = useState("");
  const [bookCategoryId, setBookCategoryId] = useState("");
  const [bookPrice, setBookPrice] = useState(350);
  const [bookDiscountPrice, setBookDiscountPrice] = useState<number | "">("");
  const [bookStock, setBookStock] = useState(20);
  const [bookCover, setBookCover] = useState("");
  const [bookISBN, setBookISBN] = useState("");
  const [bookPublisher, setBookPublisher] = useState("Mega Publishing");
  const [bookPages, setBookPages] = useState(300);
  const [bookLanguage, setBookLanguage] = useState("Amharic");
  const [bookDesc, setBookDesc] = useState("");
  const [bookFeatured, setBookFeatured] = useState(false);
  const [bookNewArrival, setBookNewArrival] = useState(true);

  // Author Modal Form
  const [showAuthorModal, setShowAuthorModal] = useState(false);
  const [editingAuthor, setEditingAuthor] = useState<Author | null>(null);
  const [authorName, setAuthorName] = useState("");
  const [authorBio, setAuthorBio] = useState("");
  const [authorImage, setAuthorImage] = useState("");

  // Category Modal Form
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [categoryDesc, setCategoryDesc] = useState("");
  const [categoryImage, setCategoryImage] = useState("");

  // Coupon Form
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponValue, setCouponValue] = useState(15);
  const [couponMinOrder, setCouponMinOrder] = useState(300);

  // Order Details Modal
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);

  // Helper to log real-time activity events to Firestore
  const logActivityEvent = async (
    title: string,
    description: string,
    category: "orders" | "inventory" | "system" | "promo",
    extraData?: Record<string, any>
  ) => {
    try {
      await addDoc(collection(db, "activity_logs"), cleanFirestoreData({
        title,
        description,
        category,
        timestamp: new Date().toISOString(),
        ...extraData
      }));
    } catch (err) {
      console.warn("Could not log activity event:", err);
    }
  };

  // Realtime Subscriptions for Orders & Activity Logs
  useEffect(() => {
    setLoadingOrders(true);
    const unsubOrders = onSnapshot(
      collection(db, "orders"),
      (snap) => {
        const list: Order[] = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as Order);
        });
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setOrders(list);
        setLoadingOrders(false);
      },
      (err) => {
        console.error("Orders realtime error:", err);
        setLoadingOrders(false);
      }
    );

    const unsubLogs = onSnapshot(
      collection(db, "activity_logs"),
      (snap) => {
        const list: ActivityLogItem[] = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as ActivityLogItem);
        });
        list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setActivityLogs(list);
      },
      (err) => {
        console.warn("Activity logs realtime warning:", err);
      }
    );

    return () => {
      unsubOrders();
      unsubLogs();
    };
  }, []);

  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const snap = await getDocs(collection(db, "orders"));
      const list: Order[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as Order);
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setOrders(list);
    } catch (err) {
      console.error("Error fetching orders:", err);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleSeedDatabase = async () => {
    if (!confirm("Reset and seed Firestore Database with fresh initial sample bookstore records?")) return;
    setSeeding(true);
    try {
      const res = await seedBookstoreData(true);
      if (res.success) {
        showToast("Database Seeded", "Populated books, authors, categories, and coupons.", "success");
        await logActivityEvent("Database Seed Reset", "Reset bookstore database with fresh catalog records", "system");
        onRefreshData();
        fetchOrders();
      } else {
        showToast("Seed Error", res.error, "error");
      }
    } catch (err: any) {
      showToast("Seed Failed", err.message, "error");
    } finally {
      setSeeding(false);
    }
  };

  // Quick Restock Function with Custom Quantities & Activity Logging
  const handleQuickRestockCustom = async (bookId: string, currentStock: number, addQty: number, title: string) => {
    try {
      const newStock = currentStock + addQty;
      await updateDoc(doc(db, "books", bookId), {
        stock: newStock,
        updatedAt: new Date().toISOString()
      });
      showToast("Stock Replenished", `Added +${addQty} copies to "${title}". New Total: ${newStock}`, "success");
      await logActivityEvent(
        `Inventory Restocked (+${addQty})`,
        `Restocked ${addQty} unit(s) of "${title}". New stock level: ${newStock}`,
        "inventory",
        { bookId, newStock }
      );
      onRefreshData();
    } catch (err) {
      showToast("Restock Error", "Could not update stock level.", "error");
    }
  };

  const handleSaveBook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const selectedAuthor = authors.find((a) => a.id === bookAuthorId) || authors[0];
      const selectedCat = categories.find((c) => c.id === bookCategoryId) || categories[0];

      const slug = bookTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const bookData: Omit<Book, "id"> = {
        title: bookTitle,
        slug,
        description: bookDesc,
        authorId: selectedAuthor?.id || "auth-haddis",
        authorName: selectedAuthor?.name || "Haddis Alemayehu",
        categoryId: selectedCat?.id || "cat-amharic-lit",
        categoryName: selectedCat?.name || "Amharic Literature",
        price: Number(bookPrice),
        discountPrice: bookDiscountPrice ? Number(bookDiscountPrice) : undefined,
        currency: "ETB",
        coverImage: getValidBookCover({
          title: bookTitle,
          authorName: selectedAuthor?.name,
          categoryName: selectedCat?.name,
          coverImage: bookCover
        }),
        ISBN: bookISBN || `98944-${Math.floor(1000 + Math.random() * 9000)}`,
        publisher: bookPublisher || "Mega Publishing",
        publicationDate: new Date().toISOString().split("T")[0],
        pages: Number(bookPages) || 250,
        language: bookLanguage || "Amharic",
        stock: Number(bookStock),
        soldCount: editingBook ? editingBook.soldCount : 0,
        ratingAverage: editingBook ? editingBook.ratingAverage : 0,
        reviewCount: editingBook ? editingBook.reviewCount : 0,
        featured: bookFeatured,
        newArrival: bookNewArrival,
        active: true,
        updatedAt: new Date().toISOString()
      };

      if (editingBook) {
        await updateDoc(doc(db, "books", editingBook.id), cleanFirestoreData(bookData));
        showToast("Book Updated", `Changes saved to "${bookTitle}".`, "success");
      } else {
        await addDoc(collection(db, "books"), cleanFirestoreData({
          ...bookData,
          createdAt: new Date().toISOString()
        }));
        showToast("Book Added", `"${bookTitle}" added to catalog.`, "success");
      }

      setShowBookModal(false);
      onRefreshData();
    } catch (err) {
      console.error("Error saving book:", err);
      showToast("Save Failed", "Could not save book record.", "error");
    }
  };

  const handleDeleteBook = async (bookId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;
    try {
      await deleteDoc(doc(db, "books", bookId));
      showToast("Book Deleted", `Deleted "${title}".`, "info");
      onRefreshData();
    } catch (err) {
      showToast("Delete Failed", "Could not remove book.", "error");
    }
  };

  const handleSaveAuthor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const slug = authorName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const authorData = {
        name: authorName,
        slug,
        bio: authorBio,
        image: authorImage || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
        active: true,
        createdAt: new Date().toISOString()
      };

      if (editingAuthor) {
        await updateDoc(doc(db, "authors", editingAuthor.id), authorData);
        showToast("Author Updated", `Updated ${authorName}.`, "success");
      } else {
        await addDoc(collection(db, "authors"), authorData);
        showToast("Author Added", `Added author ${authorName}.`, "success");
      }
      setShowAuthorModal(false);
      onRefreshData();
    } catch (err) {
      showToast("Save Failed", "Could not save author record.", "error");
    }
  };

  const handleDeleteAuthor = async (authorId: string, name: string) => {
    if (!confirm(`Delete author record for "${name}"?`)) return;
    try {
      await deleteDoc(doc(db, "authors", authorId));
      showToast("Author Deleted", `Removed author ${name}.`, "info");
      onRefreshData();
    } catch (err) {
      showToast("Delete Failed", "Could not delete author.", "error");
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const slug = categoryName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const catData = {
        name: categoryName,
        slug,
        description: categoryDesc,
        image: categoryImage || "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=600&auto=format&fit=crop&q=80",
        active: true,
        createdAt: new Date().toISOString()
      };

      if (editingCategory) {
        await updateDoc(doc(db, "categories", editingCategory.id), catData);
        showToast("Category Updated", `Updated ${categoryName}.`, "success");
      } else {
        await addDoc(collection(db, "categories"), catData);
        showToast("Category Added", `Added category ${categoryName}.`, "success");
      }
      setShowCategoryModal(false);
      onRefreshData();
    } catch (err) {
      showToast("Save Failed", "Could not save category.", "error");
    }
  };

  const handleDeleteCategory = async (catId: string, name: string) => {
    if (!confirm(`Delete category "${name}"?`)) return;
    try {
      await deleteDoc(doc(db, "categories", catId));
      showToast("Category Deleted", `Removed category ${name}.`, "info");
      onRefreshData();
    } catch (err) {
      showToast("Delete Failed", "Could not remove category.", "error");
    }
  };

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const couponData = {
        code: couponCode.toUpperCase().trim(),
        discountType: "percentage",
        discountValue: Number(couponValue),
        minOrderAmount: Number(couponMinOrder),
        expirationDate: new Date(Date.now() + 90 * 86400000).toISOString(),
        usageLimit: 100,
        usedCount: 0,
        active: true,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, "coupons"), couponData);
      showToast("Coupon Created", `Coupon code ${couponCode.toUpperCase()} activated.`, "success");
      setShowCouponModal(false);
      onRefreshData();
    } catch (err) {
      showToast("Create Failed", "Could not create coupon.", "error");
    }
  };

  const handleDeleteCoupon = async (couponId: string, code: string) => {
    if (!confirm(`Delete coupon promo code "${code}"?`)) return;
    try {
      await deleteDoc(doc(db, "coupons", couponId));
      showToast("Coupon Deleted", `Removed promo code ${code}.`, "info");
      onRefreshData();
    } catch (err) {
      showToast("Delete Failed", "Could not delete coupon.", "error");
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await updateDoc(doc(db, "orders", orderId), {
        orderStatus: newStatus,
        updatedAt: new Date().toISOString()
      });

      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, orderStatus: newStatus } : o))
      );
      showToast("Status Updated", `Order updated to ${newStatus}.`, "success");
    } catch (err) {
      showToast("Update Failed", "Could not update order status.", "error");
    }
  };

  const [resettingOrders, setResettingOrders] = useState(false);

  const handleResetAllOrders = async () => {
    const confirmation = window.confirm(
      "Are you sure you want to RESET all orders from the database?\n\nThis will purge all past and test orders so employees and admin start receiving orders from 0. This cannot be undone."
    );
    if (!confirmation) return;

    setResettingOrders(true);
    try {
      // 1. Delete all docs in orders collection
      const orderDocs = await getDocs(collection(db, "orders"));
      const batches = [];
      let currentBatch = writeBatch(db);
      let count = 0;

      for (const d of orderDocs.docs) {
        currentBatch.delete(d.ref);
        count++;
        if (count % 400 === 0) {
          batches.push(currentBatch.commit());
          currentBatch = writeBatch(db);
        }
      }
      if (count % 400 !== 0) {
        batches.push(currentBatch.commit());
      }
      await Promise.all(batches);

      // 2. Clear delivery collections
      const deliveryCols = ["deliveryAssignments", "deliveryHandoffs", "deliveryEvents"];
      for (const col of deliveryCols) {
        try {
          const snap = await getDocs(collection(db, col));
          for (const d of snap.docs) {
            await deleteDoc(d.ref);
          }
        } catch (e) {
          console.warn(`Clean ${col} notice:`, e);
        }
      }

      // 3. Clear order activity logs
      try {
        const actSnap = await getDocs(collection(db, "activity_logs"));
        for (const d of actSnap.docs) {
          const actData = d.data();
          if (actData.category === "orders" || actData.type?.includes("order") || actData.title?.includes("Order")) {
            await deleteDoc(d.ref);
          }
        }
      } catch (e) {
        console.warn("Clean activity logs notice:", e);
      }

      // 4. Clean employee activity logs
      try {
        const empLogsSnap = await getDocs(collection(db, "employeeActivityLogs"));
        for (const d of empLogsSnap.docs) {
          const data = d.data();
          if (data.orderId || data.action?.toLowerCase().includes("order")) {
            await deleteDoc(d.ref);
          }
        }
      } catch (e) {
        console.warn("Clean employeeActivityLogs notice:", e);
      }

      // 5. Log system reset
      await logActivityEvent("Orders Reset to Zero", "Admin purged order queue. Orders now start from 0.", "system");

      setOrders([]);
      showToast("Orders Reset", "Orders database successfully cleared. Queue starts from 0.", "success");
    } catch (err: any) {
      console.error("Reset orders error:", err);
      showToast("Reset Failed", err.message || "Failed to reset orders.", "error");
    } finally {
      setResettingOrders(false);
    }
  };

  const handleSaveAdminCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUsername.trim()) {
      showToast("Validation Error", "Admin username/email cannot be empty.", "error");
      return;
    }
    if (!adminNewPassword) {
      showToast("Validation Error", "Please enter a new password.", "error");
      return;
    }
    if (adminNewPassword !== adminConfirmPassword) {
      showToast("Validation Error", "Passwords do not match.", "error");
      return;
    }
    if (adminNewPassword.length < 6) {
      showToast("Validation Error", "Password must be at least 6 characters.", "error");
      return;
    }

    setSavingCredentials(true);
    try {
      await updateAdminCredentials(adminUsername.trim(), adminNewPassword, adminFullName.trim());
      showToast("Credentials Saved", "Admin username & password updated. Use these new credentials for future sign-ins.", "success");
      setAdminNewPassword("");
      setAdminConfirmPassword("");
    } catch (err: any) {
      showToast("Update Failed", err?.message || "Could not save new admin credentials.", "error");
    } finally {
      setSavingCredentials(false);
    }
  };

  // Helper for relative time
  const formatTimeAgo = (isoString: string): string => {
    if (!isoString) return "Just now";
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = Math.max(0, now.getTime() - date.getTime());
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 45) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // Calculations & Analytics
  const totalRevenue = orders.reduce((sum, o) => (o.orderStatus !== "cancelled" ? sum + (o.grandTotal || 0) : sum), 0);
  const totalOrdersCount = orders.length;
  const pendingOrdersCount = orders.filter((o) => o.orderStatus === "pending" || o.orderStatus === "processing").length;
  const avgOrderValue = totalOrdersCount > 0 ? Math.round(totalRevenue / totalOrdersCount) : 0;
  const lowStockBooks = books.filter((b) => b.stock <= 5);
  const outOfStockCount = books.filter((b) => b.stock === 0).length;
  const totalStockUnits = books.reduce((sum, b) => sum + b.stock, 0);
  const totalInventoryValuation = books.reduce((sum, b) => sum + (b.discountPrice || b.price) * b.stock, 0);

  // Low Stock Widget Filtering
  const filteredLowStockGridBooks = books.filter((b) => {
    if (b.stock > 5) return false;
    const matchesSearch =
      b.title.toLowerCase().includes(lowStockQuery.toLowerCase()) ||
      b.authorName.toLowerCase().includes(lowStockQuery.toLowerCase()) ||
      b.categoryName.toLowerCase().includes(lowStockQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (lowStockFilter === "out") return b.stock === 0;
    if (lowStockFilter === "critical") return b.stock >= 1 && b.stock <= 3;
    if (lowStockFilter === "low") return b.stock >= 4 && b.stock <= 5;
    return true;
  });

  // Combined Activity Logs & Recent Orders Stream
  const combinedActivities = React.useMemo(() => {
    const list = [...activityLogs];
    orders.forEach((o) => {
      if (!list.some((a) => a.orderId === o.orderId || a.description.includes(o.orderId))) {
        list.push({
          id: `ord-act-${o.id}`,
          title: `New Order #${o.orderId}`,
          description: `${o.customerName} placed order for ${o.items?.length || 1} item(s) totalling ${o.grandTotal?.toLocaleString()} ETB via ${o.paymentMethod?.toUpperCase()}`,
          category: "orders",
          orderId: o.orderId,
          amount: o.grandTotal,
          timestamp: o.createdAt
        });
      }
    });

    if (list.length === 0) {
      list.push({
        id: "sys-init-1",
        title: "Live Telemetry Active",
        description: "JJ Bookstore Admin Console initialized. All sales telemetry set to 0 and waiting for live customer checkouts.",
        category: "system",
        timestamp: new Date().toISOString()
      });
    }

    list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return list;
  }, [activityLogs, orders]);

  const filteredActivities = combinedActivities.filter((act) => {
    const matchesCat = activityCategoryFilter === "all" || act.category === activityCategoryFilter;
    const matchesSearch =
      act.title.toLowerCase().includes(activityQuery.toLowerCase()) ||
      act.description.toLowerCase().includes(activityQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // Top Selling Books
  const topSellingBooks = [...books].sort((a, b) => b.soldCount - a.soldCount).slice(0, 5);

  // Revenue by Payment Method
  const paymentAnalytics = [
    { method: "telebirr", label: "Telebirr", icon: "📱" },
    { method: "cbe_birr", label: "CBE Birr", icon: "🏦" },
    { method: "chapa", label: "Chapa", icon: "💳" },
    { method: "cod", label: "Cash on Delivery", icon: "💵" }
  ].map((p) => {
    const matchingOrders = orders.filter((o) => o.paymentMethod === p.method && o.orderStatus !== "cancelled");
    const rev = matchingOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
    const count = matchingOrders.length;
    const pct = totalRevenue > 0 ? Math.round((rev / totalRevenue) * 100) : 0;
    return { ...p, rev, count, pct };
  });

  // Filtered Books for Inventory
  const filteredBooks = books.filter((b) => {
    const matchesSearch =
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.authorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.ISBN.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCatFilter === "all" || b.categoryId === selectedCatFilter;
    let matchesStock = true;
    if (selectedStockFilter === "low") matchesStock = b.stock > 0 && b.stock <= 5;
    if (selectedStockFilter === "out") matchesStock = b.stock === 0;
    if (selectedStockFilter === "in") matchesStock = b.stock > 5;
    return matchesSearch && matchesCat && matchesStock;
  });

  // Filtered Orders
  const filteredOrders = orders.filter((o) => {
    const matchesQuery =
      o.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerPhone.includes(searchQuery) ||
      o.customerEmail.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedOrderStatusFilter === "all" || o.orderStatus === selectedOrderStatusFilter;
    return matchesQuery && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-sans">
      {/* EXECUTIVE ADMIN HEADER */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-950 text-slate-100 border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-amber-500 text-slate-950 text-[11px] font-extrabold uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
                <Shield className="w-3.5 h-3.5" /> Management Console
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live Telemetry
              </span>
            </div>
            <h1 className="font-serif font-extrabold text-2xl sm:text-3xl text-white tracking-tight">
              JJ Bookstore Executive Operations
            </h1>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Real-time sales stream, inventory alerts, order management, and activity audit feed. All telemetry starts from 0 ETB.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => {
                setEditingBook(null);
                setBookTitle("");
                setBookPrice(350);
                setBookStock(20);
                setBookCover("https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600&auto=format&fit=crop&q=80");
                setShowBookModal(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center gap-2 shadow-lg transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" /> Add Book Title
            </button>

            <button
              onClick={fetchOrders}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs flex items-center gap-2 border border-slate-800 transition-all"
              title="Refresh Analytics & Orders"
            >
              <RefreshCw className={`w-4 h-4 text-amber-400 ${loadingOrders ? "animate-spin" : ""}`} />
            </button>

            <button
              onClick={handleSeedDatabase}
              disabled={seeding}
              className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs flex items-center gap-2 border border-slate-800 transition-all"
            >
              <Zap className={`w-3.5 h-3.5 text-amber-400 ${seeding ? "animate-spin" : ""}`} />
              <span>{seeding ? "Resetting..." : "Reset Data"}</span>
            </button>
          </div>
        </div>

        {/* METRICS QUICK BAR */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-6 mt-6 border-t border-slate-800/80 text-xs">
          <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
            <span className="text-[10px] uppercase text-slate-400 font-bold block">Gross Revenue</span>
            <strong className="text-base text-white font-extrabold block">{totalRevenue.toLocaleString()} <span className="text-[10px] text-amber-400 font-semibold">ETB</span></strong>
            <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" /> Live sales
            </span>
          </div>

          <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
            <span className="text-[10px] uppercase text-slate-400 font-bold block">Total Orders</span>
            <strong className="text-base text-white font-extrabold block">{totalOrdersCount}</strong>
            <span className="text-[10px] text-amber-400 font-semibold">{pendingOrdersCount} pending action</span>
          </div>

          <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
            <span className="text-[10px] uppercase text-slate-400 font-bold block">Average Order</span>
            <strong className="text-base text-white font-extrabold block">{avgOrderValue} <span className="text-[10px] text-amber-400">ETB</span></strong>
            <span className="text-[10px] text-slate-400 font-semibold">Per order</span>
          </div>

          <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
            <span className="text-[10px] uppercase text-slate-400 font-bold block">Inventory Value</span>
            <strong className="text-base text-amber-300 font-extrabold block">{totalInventoryValuation.toLocaleString()} <span className="text-[10px] text-amber-400">ETB</span></strong>
            <span className="text-[10px] text-slate-400 font-semibold">{totalStockUnits} physical copies</span>
          </div>

          <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
            <span className="text-[10px] uppercase text-slate-400 font-bold block">Stock Risk Alerts</span>
            <strong className={`text-base font-extrabold block ${lowStockBooks.length > 0 ? "text-rose-400" : "text-emerald-400"}`}>
              {lowStockBooks.length} titles
            </strong>
            <span className="text-[10px] text-slate-400 font-semibold">&le; 5 units remaining</span>
          </div>

          <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
            <span className="text-[10px] uppercase text-slate-400 font-bold block">Out of Stock</span>
            <strong className={`text-base font-extrabold block ${outOfStockCount > 0 ? "text-rose-500" : "text-emerald-400"}`}>
              {outOfStockCount} titles
            </strong>
            <span className="text-[10px] text-rose-300 font-semibold">0 stock left</span>
          </div>
        </div>
      </div>

      {/* ADMIN TABS NAVIGATION */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-2 sm:gap-6 text-xs sm:text-sm font-bold no-scrollbar">
        {[
          { id: "overview", label: "Executive Dashboard", icon: LayoutDashboard },
          { id: "books", label: `Book Catalog (${books.length})`, icon: BookOpen },
          { id: "orders", label: `Orders (${orders.length})`, icon: ShoppingBag, badge: pendingOrdersCount },
          { id: "authors", label: `Authors (${authors.length})`, icon: Users },
          { id: "categories", label: `Categories (${categories.length})`, icon: Layers },
          { id: "coupons", label: `Promotions (${coupons.length})`, icon: Tag },
          { id: "employees", label: "Staff & Roles", icon: UserCheck },
          { id: "email", label: "Email Service & Test", icon: Mail },
          { id: "security", label: "Security & Admin Login", icon: Shield }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setSearchQuery("");
              }}
              className={`pb-3 px-1 transition-all border-b-2 shrink-0 flex items-center gap-2 ${
                isActive
                  ? "border-amber-600 text-amber-900 font-extrabold"
                  : "border-transparent text-slate-500 hover:text-slate-800 font-semibold"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-amber-600" : "text-slate-400"}`} />
              <span>{tab.label}</span>
              {tab.badge && tab.badge > 0 ? (
                <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black animate-pulse">
                  {tab.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* TAB 1: EXECUTIVE DASHBOARD OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-8">
          {/* REAL-TIME OPERATIONS CSS GRID: LOW STOCK ALERTS & RECENT ACTIVITY FEED */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
            
            {/* WIDGET 1: LOW STOCK ALERTS GRID */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 bg-rose-100 text-rose-800 rounded-2xl shrink-0">
                    <AlertTriangle className="w-5 h-5 text-rose-600" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-slate-900 text-base flex items-center gap-2">
                      Low Stock Alerts Grid
                      <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-extrabold">
                        {lowStockBooks.length} At Risk
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-500">Replenish book titles reaching critical stock thresholds (&le; 5 units)</p>
                  </div>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl shrink-0 text-[11px] font-bold">
                  <button
                    onClick={() => setLowStockFilter("all")}
                    className={`px-2.5 py-1 rounded-xl transition-all ${
                      lowStockFilter === "all" ? "bg-white text-slate-900 shadow-sm font-extrabold" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    All ({lowStockBooks.length})
                  </button>
                  <button
                    onClick={() => setLowStockFilter("out")}
                    className={`px-2.5 py-1 rounded-xl transition-all ${
                      lowStockFilter === "out" ? "bg-rose-500 text-white shadow-sm font-extrabold" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Out ({outOfStockCount})
                  </button>
                  <button
                    onClick={() => setLowStockFilter("critical")}
                    className={`px-2.5 py-1 rounded-xl transition-all ${
                      lowStockFilter === "critical" ? "bg-amber-500 text-slate-950 shadow-sm font-extrabold" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    1-3
                  </button>
                  <button
                    onClick={() => setLowStockFilter("low")}
                    className={`px-2.5 py-1 rounded-xl transition-all ${
                      lowStockFilter === "low" ? "bg-slate-800 text-white shadow-sm font-extrabold" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    4-5
                  </button>
                </div>
              </div>

              {/* Search Bar for Low Stock Grid */}
              {lowStockBooks.length > 0 && (
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={lowStockQuery}
                    onChange={(e) => setLowStockQuery(e.target.value)}
                    placeholder="Search low stock items by title, author or category..."
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-rose-400"
                  />
                </div>
              )}

              {/* Low Stock Items Grid */}
              {filteredLowStockGridBooks.length === 0 ? (
                <div className="text-center py-10 px-4 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 space-y-2">
                  <CheckCircle className="w-9 h-9 text-emerald-500 mx-auto" />
                  <p className="font-bold text-xs text-slate-800">Inventory Levels Healthy!</p>
                  <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                    {lowStockBooks.length === 0
                      ? "All titles in your catalogue currently have more than 5 stock units available."
                      : "No low stock books match your search or filter selection."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-h-[460px] overflow-y-auto pr-1">
                  {filteredLowStockGridBooks.map((b) => {
                    const isOut = b.stock === 0;
                    const addVal = customRestockQty[b.id] || 10;

                    return (
                      <div
                        key={b.id}
                        className={`p-3.5 rounded-2xl border transition-all space-y-3 ${
                          isOut ? "bg-rose-50/50 border-rose-200 shadow-sm" : "bg-slate-50/80 border-slate-200"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <img
                            src={b.coverImage}
                            alt={b.title}
                            className="w-12 h-16 object-cover rounded-lg shadow-sm shrink-0 border border-slate-200"
                          />
                          <div className="space-y-1 min-w-0 flex-1">
                            <strong className="block text-slate-900 font-bold text-xs line-clamp-1">{b.title}</strong>
                            <p className="text-[11px] text-slate-500 line-clamp-1">{b.authorName}</p>
                            <div className="flex items-center gap-1.5 pt-0.5">
                              <span
                                className={`px-2 py-0.5 rounded-full font-extrabold text-[10px] ${
                                  isOut
                                    ? "bg-rose-500 text-white animate-pulse"
                                    : b.stock <= 3
                                    ? "bg-amber-500 text-slate-950"
                                    : "bg-amber-100 text-amber-900"
                                }`}
                              >
                                {isOut ? "Out of Stock (0)" : `${b.stock} units left`}
                              </span>
                              <span className="text-[10px] font-bold text-slate-700">{b.price} ETB</span>
                            </div>
                          </div>
                        </div>

                        {/* Quick Restock Action Bar */}
                        <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-1.5 text-xs">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleQuickRestockCustom(b.id, b.stock, 5, b.title)}
                              className="px-2 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 font-extrabold text-[10px] text-slate-800 transition-all"
                            >
                              +5
                            </button>
                            <button
                              onClick={() => handleQuickRestockCustom(b.id, b.stock, 10, b.title)}
                              className="px-2 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 font-extrabold text-[10px] text-slate-950 transition-all shadow-xs"
                            >
                              +10
                            </button>
                            <button
                              onClick={() => handleQuickRestockCustom(b.id, b.stock, 25, b.title)}
                              className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 font-extrabold text-[10px] text-white transition-all"
                            >
                              +25
                            </button>
                          </div>

                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="1"
                              max="500"
                              value={addVal}
                              onChange={(e) =>
                                setCustomRestockQty({
                                  ...customRestockQty,
                                  [b.id]: Math.max(1, parseInt(e.target.value) || 1)
                                })
                              }
                              className="w-12 px-1.5 py-0.5 rounded-md border border-slate-300 text-[10px] font-bold text-center"
                            />
                            <button
                              onClick={() => handleQuickRestockCustom(b.id, b.stock, addVal, b.title)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[10px] transition-all flex items-center gap-0.5"
                            >
                              <Plus className="w-3 h-3" /> Restock
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* WIDGET 2: RECENT ACTIVITY FEED */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 bg-amber-100 text-amber-900 rounded-2xl shrink-0">
                    <Activity className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-slate-900 text-base flex items-center gap-2">
                      Recent Activity Feed
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    </h3>
                    <p className="text-[11px] text-slate-500">Live operational stream of checkouts, stock restocks, & system logs</p>
                  </div>
                </div>

                {/* Category Filter Pills */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl shrink-0 text-[11px] font-bold overflow-x-auto">
                  <button
                    onClick={() => setActivityCategoryFilter("all")}
                    className={`px-2.5 py-1 rounded-xl transition-all ${
                      activityCategoryFilter === "all" ? "bg-white text-slate-900 shadow-sm font-extrabold" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    All ({combinedActivities.length})
                  </button>
                  <button
                    onClick={() => setActivityCategoryFilter("orders")}
                    className={`px-2.5 py-1 rounded-xl transition-all ${
                      activityCategoryFilter === "orders" ? "bg-blue-600 text-white shadow-sm font-extrabold" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Orders
                  </button>
                  <button
                    onClick={() => setActivityCategoryFilter("inventory")}
                    className={`px-2.5 py-1 rounded-xl transition-all ${
                      activityCategoryFilter === "inventory" ? "bg-amber-500 text-slate-950 shadow-sm font-extrabold" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Stock
                  </button>
                  <button
                    onClick={() => setActivityCategoryFilter("system")}
                    className={`px-2.5 py-1 rounded-xl transition-all ${
                      activityCategoryFilter === "system" ? "bg-slate-800 text-white shadow-sm font-extrabold" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    System
                  </button>
                </div>
              </div>

              {/* Search Bar for Activity Feed */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={activityQuery}
                  onChange={(e) => setActivityQuery(e.target.value)}
                  placeholder="Filter activity audit logs..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Activity Timeline List */}
              {filteredActivities.length === 0 ? (
                <div className="text-center py-10 px-4 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200">
                  <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="font-bold text-xs text-slate-700">No Activity Events Recorded</p>
                  <p className="text-[11px] text-slate-500">No activities match your current category or search query.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                  {filteredActivities.map((act) => {
                    const isOrder = act.category === "orders";
                    const isInventory = act.category === "inventory";
                    const isPromo = act.category === "promo";

                    return (
                      <div
                        key={act.id}
                        className="p-3.5 rounded-2xl bg-slate-50/90 border border-slate-100 flex items-start gap-3.5 hover:bg-slate-100/60 transition-colors"
                      >
                        <div
                          className={`p-2 rounded-xl shrink-0 ${
                            isOrder
                              ? "bg-blue-100 text-blue-700"
                              : isInventory
                              ? "bg-amber-100 text-amber-800"
                              : isPromo
                              ? "bg-rose-100 text-rose-700"
                              : "bg-slate-200 text-slate-800"
                          }`}
                        >
                          {isOrder ? (
                            <ShoppingBag className="w-4 h-4" />
                          ) : isInventory ? (
                            <PackageCheck className="w-4 h-4" />
                          ) : isPromo ? (
                            <Tag className="w-4 h-4" />
                          ) : (
                            <Shield className="w-4 h-4" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0 space-y-0.5">
                          <div className="flex items-center justify-between gap-2">
                            <strong className="text-xs font-bold text-slate-900 block line-clamp-1">{act.title}</strong>
                            <span className="text-[10px] font-bold text-slate-400 shrink-0 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" /> {formatTimeAgo(act.timestamp)}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-600 leading-relaxed">{act.description}</p>

                          <div className="flex items-center gap-2 pt-1">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                                isOrder
                                  ? "bg-blue-50 text-blue-700 border border-blue-200/60"
                                  : isInventory
                                  ? "bg-amber-50 text-amber-800 border border-amber-200/60"
                                  : isPromo
                                  ? "bg-rose-50 text-rose-700 border border-rose-200/60"
                                  : "bg-slate-100 text-slate-700 border border-slate-200"
                              }`}
                            >
                              {act.category}
                            </span>
                            {act.amount ? (
                              <span className="text-[10px] font-extrabold text-slate-900">
                                {act.amount.toLocaleString()} ETB
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* VISUAL ANALYTICS ROW */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Payment Revenue Distribution */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 lg:col-span-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-amber-100 text-amber-900 rounded-xl">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-slate-900 text-base">Revenue by Payment Channel</h3>
                    <p className="text-[11px] text-slate-500">Breakdown of sales revenue across Ethiopian payment gateways</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200/60">
                  {totalRevenue.toLocaleString()} ETB Total
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {paymentAnalytics.map((p) => (
                  <div key={p.method} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                        <span className="text-sm">{p.icon}</span> {p.label}
                      </span>
                      <span className="text-xs font-extrabold text-slate-900">{p.rev.toLocaleString()} ETB</span>
                    </div>

                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-amber-600 h-full transition-all duration-500 rounded-full"
                        style={{ width: `${p.pct}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-[11px] text-slate-500 font-semibold pt-0.5">
                      <span>{p.count} successful order(s)</span>
                      <span className="text-amber-800 font-bold">{p.pct}% share</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Categories Breakdown */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-amber-100 text-amber-900 rounded-xl">
                    <Layers className="w-5 h-5" />
                  </div>
                  <h3 className="font-serif font-bold text-slate-900 text-base">Category Catalog Share</h3>
                </div>
                <span className="text-xs font-bold text-slate-500">{categories.length} Categories</span>
              </div>

              <div className="space-y-3.5 pt-1 text-xs">
                {categories.map((c) => {
                  const catBooks = books.filter((b) => b.categoryId === c.id);
                  const catStock = catBooks.reduce((s, b) => s + b.stock, 0);
                  const pct = totalStockUnits > 0 ? Math.round((catStock / totalStockUnits) * 100) : 0;

                  return (
                    <div key={c.id} className="space-y-1">
                      <div className="flex justify-between font-semibold text-slate-800">
                        <span>{c.name}</span>
                        <span className="font-bold text-slate-900">{catBooks.length} titles ({catStock} pcs)</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-slate-800 h-full transition-all rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* BESTSELLERS LEADERBOARD */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 text-amber-900 rounded-xl">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-slate-900 text-base">Bestsellers Leaderboard</h3>
                  <p className="text-[11px] text-slate-500">Top selling literary titles ranked by copies sold</p>
                </div>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {topSellingBooks.map((b, idx) => (
                <div key={b.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full font-black text-xs flex items-center justify-center shrink-0 ${
                      idx === 0 ? "bg-amber-500 text-slate-950" : idx === 1 ? "bg-slate-200 text-slate-800" : "bg-slate-100 text-slate-600"
                    }`}>
                      #{idx + 1}
                    </span>
                    <img src={b.coverImage} alt={b.title} className="w-9 h-12 object-cover rounded-md shrink-0 shadow-sm" />
                    <div>
                      <strong className="block text-slate-900 font-bold line-clamp-1">{b.title}</strong>
                      <span className="text-[11px] text-slate-500">{b.authorName} • {b.categoryName}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <strong className="block text-amber-800 font-extrabold text-sm">{b.soldCount} Sold</strong>
                    <span className="text-[10px] text-slate-400 font-semibold">{b.price} ETB • {b.stock} left</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RECENT CUSTOMER ORDERS FEED */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif font-bold text-slate-900 text-lg">Recent Customer Orders</h3>
                <p className="text-xs text-slate-500">Live order stream received from Ethiopian customers</p>
              </div>
              <button
                onClick={() => setActiveTab("orders")}
                className="text-xs font-bold text-amber-800 hover:underline flex items-center gap-1"
              >
                View All Orders ({orders.length}) <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase font-bold text-[11px]">
                    <th className="pb-3">Order Ref</th>
                    <th className="pb-3">Customer Contact</th>
                    <th className="pb-3">Region</th>
                    <th className="pb-3">Total Amount</th>
                    <th className="pb-3">Payment</th>
                    <th className="pb-3">Fulfillment Status</th>
                    <th className="pb-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.slice(0, 6).map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3">
                        <strong className="block font-mono text-slate-900 font-bold">{o.orderId}</strong>
                        <span className="text-[10px] text-slate-400">{new Date(o.createdAt).toLocaleDateString()}</span>
                      </td>
                      <td className="py-3">
                        <p className="font-bold text-slate-900">{o.customerName}</p>
                        <p className="text-[10px] text-slate-500">{o.customerPhone}</p>
                      </td>
                      <td className="py-3 font-medium text-slate-700">
                        {o.shippingAddress?.region || "Addis Ababa"}
                      </td>
                      <td className="py-3 font-extrabold text-slate-900">{o.grandTotal} ETB</td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded font-mono font-extrabold uppercase text-[10px] bg-slate-100 text-slate-800">
                          {o.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3">
                        <select
                          value={o.orderStatus}
                          onChange={(e) => handleUpdateOrderStatus(o.id, e.target.value as OrderStatus)}
                          className="px-2.5 py-1 rounded-xl border border-slate-200 bg-white font-bold text-[11px] focus:outline-none focus:border-amber-500"
                        >
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="processing">Processing</option>
                          <option value="shipped">Shipped</option>
                          <option value="out_for_delivery">Out for Delivery</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => setViewingOrder(o)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                          title="View Order Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BOOK INVENTORY CRUD */}
      {activeTab === "books" && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search catalog by book title, author, or ISBN..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Stock Filter Pills */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl shrink-0 overflow-x-auto text-xs">
                <button
                  onClick={() => setSelectedStockFilter("all")}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                    selectedStockFilter === "all" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  All ({books.length})
                </button>
                <button
                  onClick={() => setSelectedStockFilter("low")}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                    selectedStockFilter === "low" ? "bg-amber-500 text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Low Stock ({lowStockBooks.length})
                </button>
                <button
                  onClick={() => setSelectedStockFilter("out")}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                    selectedStockFilter === "out" ? "bg-rose-500 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Out of Stock ({outOfStockCount})
                </button>
              </div>

              <button
                onClick={() => {
                  setEditingBook(null);
                  setBookTitle("");
                  setBookPrice(350);
                  setBookStock(20);
                  setBookCover("https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600&auto=format&fit=crop&q=80");
                  setShowBookModal(true);
                }}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-md flex items-center justify-center gap-2 shrink-0"
              >
                <Plus className="w-4 h-4" /> Add New Book Title
              </button>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pt-2 text-xs border-t border-slate-100">
              <span className="text-slate-400 font-bold shrink-0 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Category:
              </span>
              <button
                onClick={() => setSelectedCatFilter("all")}
                className={`px-3 py-1 rounded-full text-[11px] font-bold shrink-0 ${
                  selectedCatFilter === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                All Categories
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCatFilter(c.id)}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold shrink-0 ${
                    selectedCatFilter === c.id ? "bg-amber-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Book Catalog Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden text-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[11px]">
                  <tr>
                    <th className="p-4">Book Cover & Title</th>
                    <th className="p-4">Author</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Price</th>
                    <th className="p-4">Stock Level</th>
                    <th className="p-4">Copies Sold</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBooks.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 font-bold">
                        No books found matching your current search or filters.
                      </td>
                    </tr>
                  ) : (
                    filteredBooks.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 flex items-center gap-3.5">
                          <img src={b.coverImage} alt={b.title} className="w-10 h-14 object-cover rounded-md shrink-0 shadow-sm" />
                          <div>
                            <strong className="block text-slate-900 font-bold text-sm line-clamp-1">{b.title}</strong>
                            <span className="text-[10px] text-slate-400 font-mono">ISBN: {b.ISBN}</span>
                          </div>
                        </td>
                        <td className="p-4 text-slate-700 font-semibold">{b.authorName}</td>
                        <td className="p-4">
                          <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-900 font-bold text-[10px] border border-amber-200/60">
                            {b.categoryName}
                          </span>
                        </td>
                        <td className="p-4">
                          {b.discountPrice ? (
                            <div>
                              <strong className="text-amber-800 font-extrabold block">{b.discountPrice} ETB</strong>
                              <span className="line-through text-slate-400 text-[10px]">{b.price} ETB</span>
                            </div>
                          ) : (
                            <strong className="text-slate-900 font-extrabold">{b.price} ETB</strong>
                          )}
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                            b.stock === 0
                              ? "bg-rose-100 text-rose-800"
                              : b.stock <= 5
                              ? "bg-amber-100 text-amber-900"
                              : "bg-emerald-100 text-emerald-800"
                          }`}>
                            {b.stock} units
                          </span>
                        </td>
                        <td className="p-4 font-bold text-slate-700">{b.soldCount} copies</td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setEditingBook(b);
                                setBookTitle(b.title);
                                setBookAuthorId(b.authorId);
                                setBookCategoryId(b.categoryId);
                                setBookPrice(b.price);
                                setBookDiscountPrice(b.discountPrice || "");
                                setBookStock(b.stock);
                                setBookCover(b.coverImage);
                                setBookISBN(b.ISBN);
                                setBookPublisher(b.publisher);
                                setBookPages(b.pages);
                                setBookLanguage(b.language);
                                setBookDesc(b.description);
                                setBookFeatured(b.featured);
                                setBookNewArrival(b.newArrival);
                                setShowBookModal(true);
                              }}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                              title="Edit book"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteBook(b.id, b.title)}
                              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700"
                              title="Delete book"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ORDERS MANAGEMENT */}
      {activeTab === "orders" && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif font-bold text-slate-900 text-lg">Customer Orders Queue</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-900">
                    {orders.length} Total Orders
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Real-time synchronization with bookstore order fulfillment and delivery
                </p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={fetchOrders}
                  disabled={loadingOrders}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all"
                  title="Refresh orders from database"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingOrders ? "animate-spin text-amber-600" : ""}`} />
                  <span>Refresh</span>
                </button>

                <button
                  onClick={handleResetAllOrders}
                  disabled={resettingOrders || orders.length === 0}
                  className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 hover:text-rose-800 font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Purge all orders from database to restart from 0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{resettingOrders ? "Clearing Orders..." : "Reset Orders to 0"}</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search orders by Order ID, customer name, phone, or email..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Status Filter Buttons */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl shrink-0 overflow-x-auto text-xs">
                {["all", "pending", "confirmed", "processing", "shipped", "delivered", "cancelled"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setSelectedOrderStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-xl font-bold uppercase text-[10px] transition-all ${
                      selectedOrderStatusFilter === st ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden text-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[11px]">
                  <tr>
                    <th className="p-4">Order ID & Date</th>
                    <th className="p-4">Customer Details</th>
                    <th className="p-4">Shipping Address</th>
                    <th className="p-4">Grand Total</th>
                    <th className="p-4">Payment</th>
                    <th className="p-4">Fulfillment Action</th>
                    <th className="p-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 font-bold">
                        No customer orders matching search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((o) => (
                      <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4">
                          <strong className="block font-mono font-extrabold text-slate-900 text-sm">{o.orderId}</strong>
                          <span className="text-[10px] text-slate-400">{new Date(o.createdAt).toLocaleString()}</span>
                        </td>
                        <td className="p-4">
                          <p className="font-bold text-slate-900">{o.customerName}</p>
                          <p className="text-[10px] text-slate-500">{o.customerPhone}</p>
                          <p className="text-[10px] text-slate-400">{o.customerEmail}</p>
                        </td>
                        <td className="p-4 text-slate-600 max-w-xs truncate">
                          {o.shippingAddress?.streetAddress}, {o.shippingAddress?.region}
                        </td>
                        <td className="p-4 font-extrabold text-slate-900 text-sm">{o.grandTotal} ETB</td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded font-mono font-extrabold uppercase text-[10px] bg-slate-100 text-slate-800 block w-fit">
                            {o.paymentMethod}
                          </span>
                          <span className="text-[10px] text-emerald-700 font-bold uppercase block">{o.paymentStatus}</span>
                          {(o.verifiedReceiptNumber || o.paymentReference) && (
                            <span className="text-[10px] font-mono text-amber-800 font-bold block mt-0.5">
                              Ref: {o.verifiedReceiptNumber || o.paymentReference}
                            </span>
                          )}
                          {o.verifiedByEmployeeName && (
                            <span className="text-[9px] text-slate-500 block">
                              By: {o.verifiedByEmployeeName}
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <select
                            value={o.orderStatus}
                            onChange={(e) => handleUpdateOrderStatus(o.id, e.target.value as OrderStatus)}
                            className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-xs focus:outline-none focus:border-amber-500"
                          >
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="processing">Processing</option>
                            <option value="shipped">Shipped</option>
                            <option value="out_for_delivery">Out for Delivery</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => setViewingOrder(o)}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1 ml-auto"
                          >
                            <Eye className="w-3.5 h-3.5" /> View
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: AUTHORS MANAGEMENT */}
      {activeTab === "authors" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <div>
              <h3 className="font-serif font-bold text-slate-900 text-lg">Author Catalog Profiles</h3>
              <p className="text-xs text-slate-500">Manage literary authors featured across your bookstore</p>
            </div>
            <button
              onClick={() => {
                setEditingAuthor(null);
                setAuthorName("");
                setAuthorBio("");
                setAuthorImage("https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80");
                setShowAuthorModal(true);
              }}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-md flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add Author
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
            {authors.map((a) => {
              const authorBooks = books.filter((b) => b.authorId === a.id);
              return (
                <div key={a.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
                  <div className="flex items-start gap-3.5">
                    <img src={a.image} alt={a.name} className="w-14 h-14 object-cover rounded-2xl shrink-0 shadow" />
                    <div>
                      <strong className="font-serif font-bold text-slate-900 text-base block">{a.name}</strong>
                      <span className="text-[11px] font-bold text-amber-800">{authorBooks.length} Published Books</span>
                      <p className="text-slate-600 text-[11px] line-clamp-3 mt-1 leading-relaxed">{a.bio}</p>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setEditingAuthor(a);
                        setAuthorName(a.name);
                        setAuthorBio(a.bio);
                        setAuthorImage(a.image);
                        setShowAuthorModal(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold"
                    >
                      Edit Profile
                    </button>
                    <button
                      onClick={() => handleDeleteAuthor(a.id, a.name)}
                      className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 5: CATEGORIES MANAGEMENT */}
      {activeTab === "categories" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <div>
              <h3 className="font-serif font-bold text-slate-900 text-lg">Book Categories & Genres</h3>
              <p className="text-xs text-slate-500">Organize literature into accessible customer genres</p>
            </div>
            <button
              onClick={() => {
                setEditingCategory(null);
                setCategoryName("");
                setCategoryDesc("");
                setCategoryImage("https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=600&auto=format&fit=crop&q=80");
                setShowCategoryModal(true);
              }}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-md flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add Category
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
            {categories.map((c) => {
              const catBooks = books.filter((b) => b.categoryId === c.id);
              const catValuation = catBooks.reduce((sum, b) => sum + b.price * b.stock, 0);

              return (
                <div key={c.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
                  <div className="h-28 overflow-hidden relative">
                    <img src={c.image} alt={c.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-4">
                      <strong className="font-serif font-bold text-white text-lg">{c.name}</strong>
                    </div>
                  </div>

                  <div className="p-5 space-y-3">
                    <p className="text-slate-600 text-xs line-clamp-2">{c.description}</p>
                    <div className="flex justify-between font-bold text-[11px] text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span>{catBooks.length} Book Titles</span>
                      <span className="text-amber-800">{catValuation.toLocaleString()} ETB Value</span>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => {
                          setEditingCategory(c);
                          setCategoryName(c.name);
                          setCategoryDesc(c.description);
                          setCategoryImage(c.image);
                          setShowCategoryModal(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(c.id, c.name)}
                        className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 6: COUPONS & PROMOTIONS */}
      {activeTab === "coupons" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <div>
              <h3 className="font-serif font-bold text-slate-900 text-lg">Promotional Coupon Codes</h3>
              <p className="text-xs text-slate-500">Manage store discount vouchers for customer checkouts</p>
            </div>
            <button
              onClick={() => {
                setCouponCode("ETHIOPIA15");
                setCouponValue(15);
                setCouponMinOrder(300);
                setShowCouponModal(true);
              }}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-md flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Create Coupon Code
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden text-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[11px]">
                  <tr>
                    <th className="p-4">Promo Code</th>
                    <th className="p-4">Discount</th>
                    <th className="p-4">Min Order Threshold</th>
                    <th className="p-4">Usage Count</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {coupons.map((cp) => (
                    <tr key={cp.id} className="hover:bg-slate-50">
                      <td className="p-4 font-mono font-extrabold text-amber-900 text-sm">{cp.code}</td>
                      <td className="p-4 font-bold text-slate-900">{cp.discountValue}% OFF</td>
                      <td className="p-4 font-semibold text-slate-700">{cp.minOrderAmount} ETB</td>
                      <td className="p-4 text-slate-600 font-medium">{cp.usedCount} times used</td>
                      <td className="p-4">
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                          ACTIVE
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleDeleteCoupon(cp.id, cp.code)}
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: ADMIN SECURITY / CREDENTIALS */}
      {activeTab === "security" && (
        <div className="max-w-2xl bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="p-3 bg-amber-100 text-amber-900 rounded-2xl">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-slate-900 text-xl">Admin Credentials & Security</h3>
              <p className="text-xs text-slate-500">Update your administrator username/email and password</p>
            </div>
          </div>

          <form onSubmit={handleSaveAdminCredentials} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Administrator Display Name</label>
              <input
                type="text"
                value={adminFullName}
                onChange={(e) => setAdminFullName(e.target.value)}
                placeholder="e.g. Store Administrator"
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 font-semibold text-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Admin Username / Email *</label>
              <input
                type="text"
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
                placeholder="e.g. admin@jjbookstore.com or custom username"
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 font-semibold text-slate-900"
              />
              <p className="text-[11px] text-slate-400 mt-1">Use this username or email to sign into the Admin Console.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block font-bold text-slate-700 mb-1">New Password *</label>
                <div className="relative">
                  <input
                    type={showAdminPassword ? "text" : "password"}
                    value={adminNewPassword}
                    onChange={(e) => setAdminNewPassword(e.target.value)}
                    placeholder="Enter new password..."
                    required
                    className="w-full pl-4 pr-10 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 font-semibold text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                    title={showAdminPassword ? "Hide password" : "Show password"}
                  >
                    {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Confirm New Password *</label>
                <div className="relative">
                  <input
                    type={showAdminPassword ? "text" : "password"}
                    value={adminConfirmPassword}
                    onChange={(e) => setAdminConfirmPassword(e.target.value)}
                    placeholder="Confirm new password..."
                    required
                    className="w-full pl-4 pr-10 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 font-semibold text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                    title={showAdminPassword ? "Hide password" : "Show password"}
                  >
                    {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-[11px] space-y-1">
              <strong className="font-bold flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5 text-amber-700" /> Persistent Credential Update
              </strong>
              <p>When saved, your new username and password will be instantly active for signing into the JJ Bookstore Admin Console.</p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={savingCredentials}
                className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-amber-950 font-extrabold text-xs shadow-md transition-all flex items-center gap-2"
              >
                <UserCheck className="w-4 h-4" />
                <span>{savingCredentials ? "Saving Credentials..." : "Update Admin Credentials"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB: EMAIL SERVICE & DIAGNOSTICS */}
      {activeTab === "email" && (
        <div className="max-w-4xl bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-8">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-100 text-amber-900 rounded-2xl">
                <Mail className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-slate-900 text-xl">Email Service & SMTP Configuration</h3>
                <p className="text-xs text-slate-500">Configure mail server credentials and test live inbox notification delivery</p>
              </div>
            </div>

            <span
              className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border flex items-center gap-1.5 ${
                isSmtpConfigured
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-amber-50 text-amber-800 border-amber-200"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isSmtpConfigured ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
              {isSmtpConfigured ? "SMTP Configured" : "Needs Credentials"}
            </span>
          </div>

          {/* Quick Overview Card */}
          <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <Zap className="w-4 h-4" /> Nodemailer Express SMTP Integration
              </h4>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                Backend API Active
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] uppercase text-slate-400 font-bold block">Active Host</span>
                <span className="font-bold text-slate-200 truncate block">{smtpHost || "Unconfigured"}</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] uppercase text-slate-400 font-bold block">Active Sender User</span>
                <span className="font-bold text-amber-300 truncate block">{smtpUser || "Not set"}</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] uppercase text-slate-400 font-bold block">Admin Recipient</span>
                <span className="font-bold text-slate-200 truncate block">{adminReceiverEmail || "mikiyaswoyne@gmail.com"}</span>
              </div>
            </div>
          </div>

          {/* Provider Presets & Configuration Form */}
          <form onSubmit={handleSaveSmtpSettings} className="border border-slate-200 rounded-2xl p-6 bg-slate-50 space-y-6">
            <div>
              <h4 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-600" /> Configure Mail Provider
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Choose an email provider preset or specify your custom SMTP credentials below.
              </p>
            </div>

            {/* Provider Preset Buttons */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">Select Mail Provider Preset</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: "gmail", label: "Google Gmail", icon: "📧" },
                  { id: "sendgrid", label: "SendGrid", icon: "⚡" },
                  { id: "brevo", label: "Brevo (Sendinblue)", icon: "🚀" },
                  { id: "mailgun", label: "Mailgun", icon: "🎯" },
                  { id: "outlook", label: "Microsoft Outlook", icon: "💼" },
                  { id: "yahoo", label: "Yahoo Mail", icon: "💌" },
                  { id: "custom", label: "Custom SMTP", icon: "⚙️" }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleApplyPreset(item.id as any)}
                    className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 ${
                      smtpPreset === item.id
                        ? "bg-amber-500 text-slate-950 border-amber-600 shadow-sm"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">SMTP Host Server *</label>
                <input
                  type="text"
                  value={smtpHost}
                  onChange={(e) => {
                    setSmtpHost(e.target.value);
                    setSmtpPreset("custom");
                  }}
                  placeholder="e.g. smtp.gmail.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 text-xs font-bold text-slate-900 bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">SMTP Port *</label>
                <input
                  type="number"
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(Number(e.target.value))}
                  placeholder="587 or 465"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 text-xs font-bold text-slate-900 bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Sender Email / Username *</label>
                <input
                  type="text"
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                  placeholder="e.g. mikiyaswoyne@gmail.com or apikey"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 text-xs font-bold text-slate-900 bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  App Password / API Key {hasPassSaved ? "(Key Saved)" : "*"}
                </label>
                <input
                  type="password"
                  value={smtpPass}
                  onChange={(e) => setSmtpPass(e.target.value)}
                  placeholder={hasPassSaved ? "•••••••••••• (Leave blank to keep current)" : "Google App Password or API Key"}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 text-xs font-bold text-slate-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Admin Notification Recipient Email</label>
                <input
                  type="email"
                  value={adminReceiverEmail}
                  onChange={(e) => setAdminReceiverEmail(e.target.value)}
                  placeholder="e.g. mikiyaswoyne@gmail.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 text-xs font-bold text-slate-900 bg-white"
                />
              </div>

              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={smtpSecure}
                    onChange={(e) => setSmtpSecure(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300"
                  />
                  <span>Use SSL Security (Port 465)</span>
                </label>
              </div>
            </div>

            {/* Google Gmail Quick Setup Guide Box */}
            {smtpPreset === "gmail" && (
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 text-xs text-amber-950 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-amber-900">
                  <span>💡</span> How to configure Gmail with App Password:
                </div>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-amber-900/90 font-medium">
                  <li>Enable <strong>2-Step Verification</strong> on your Google Account (<a href="https://myaccount.google.com/security" target="_blank" rel="noreferrer" className="underline font-bold text-amber-800">myaccount.google.com/security</a>).</li>
                  <li>Search for <strong>"App passwords"</strong> in your Google Account search bar.</li>
                  <li>Create a new App Password named <strong>"JJ Bookstore"</strong> and copy the 16-character code.</li>
                  <li>Paste the code into the <strong>App Password</strong> field above and click Save SMTP Settings!</li>
                </ol>
              </div>
            )}

            <button
              type="submit"
              disabled={savingSmtp}
              className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${savingSmtp ? "animate-spin" : ""}`} />
              <span>{savingSmtp ? "Saving Configuration..." : "Save SMTP Settings"}</span>
            </button>
          </form>

          {/* Interactive Test Email Tool */}
          <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50 space-y-4">
            <div>
              <h4 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-600" /> Verify Live Email Delivery
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Send a test email through the configured server endpoint to verify live inbox delivery.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target Recipient Email Address</label>
                <input
                  type="email"
                  value={testTargetEmail}
                  onChange={(e) => setTestTargetEmail(e.target.value)}
                  placeholder="e.g. mikiyaswoyne@gmail.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 text-xs font-bold text-slate-900 bg-white"
                />
              </div>

              <button
                onClick={handleRunEmailTest}
                disabled={testingEmail}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${testingEmail ? "animate-spin" : ""}`} />
                <span>{testingEmail ? "Sending Test Email..." : "Send Test Email Now"}</span>
              </button>
            </div>

            {/* Test Execution Diagnostic Result Banner */}
            {testResult && (
              <div
                className={`p-4 rounded-xl text-xs space-y-2 border ${
                  testResult.success
                    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                    : "bg-rose-50 border-rose-200 text-rose-900"
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-sm">
                  {testResult.success ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                  )}
                  <span>{testResult.message}</span>
                </div>

                {testResult.hint && (
                  <p className="text-[11px] font-medium bg-white/70 p-2.5 rounded-lg border border-slate-200 text-slate-700">
                    💡 <strong>Diagnosis / Setup Requirement:</strong> {testResult.hint}
                  </p>
                )}

                {testResult.details && (
                  <div className="bg-slate-900 text-slate-200 p-3 rounded-lg font-mono text-[10px] space-y-1 overflow-x-auto">
                    <div><strong>Server SMTP Diagnostics Output:</strong></div>
                    <pre>{JSON.stringify(testResult.details, null, 2)}</pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 8: EMPLOYEE & STAFF MANAGEMENT */}
      {activeTab === "employees" && <EmployeeManager />}

      {/* MODAL: VIEW ORDER DETAILS */}
      {viewingOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-xl p-6 space-y-4 my-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <strong className="font-mono text-base font-extrabold text-slate-900">{viewingOrder.orderId}</strong>
                <span className="text-xs text-slate-400 block">{new Date(viewingOrder.createdAt).toLocaleString()}</span>
              </div>
              <button
                onClick={() => setViewingOrder(null)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-2xl space-y-1">
                <span className="font-bold text-slate-900 block">Customer Information:</span>
                <p>{viewingOrder.customerName} ({viewingOrder.customerPhone})</p>
                <p className="text-slate-500">{viewingOrder.customerEmail}</p>
                <p className="text-slate-700 pt-1">
                  <strong>Shipping:</strong> {viewingOrder.shippingAddress?.streetAddress}, {viewingOrder.shippingAddress?.region}
                </p>
              </div>

              {/* Order Verification & Payment Summary Box */}
              <div className="bg-amber-50/70 border border-amber-200/80 p-3 rounded-2xl space-y-1 text-amber-950">
                <span className="font-bold block text-slate-900">Payment & Verification Record:</span>
                <div className="flex justify-between items-center text-[11px]">
                  <span>Method / Status:</span>
                  <span className="font-extrabold uppercase">{viewingOrder.paymentMethod} ({viewingOrder.paymentStatus})</span>
                </div>
                {(viewingOrder.verifiedReceiptNumber || viewingOrder.paymentReference) && (
                  <div className="flex justify-between items-center text-[11px]">
                    <span>Receipt / Ref Number:</span>
                    <strong className="font-mono text-amber-900">{viewingOrder.verifiedReceiptNumber || viewingOrder.paymentReference}</strong>
                  </div>
                )}
                {viewingOrder.verifiedByEmployeeName && (
                  <div className="flex justify-between items-center text-[11px] pt-0.5 border-t border-amber-200/50">
                    <span>Verified By Staff:</span>
                    <strong className="text-slate-900">{viewingOrder.verifiedByEmployeeName}</strong>
                  </div>
                )}
                {viewingOrder.verifiedAt && (
                  <div className="flex justify-between items-center text-[10px] text-slate-500">
                    <span>Verified Date:</span>
                    <span>{new Date(viewingOrder.verifiedAt).toLocaleString()}</span>
                  </div>
                )}
              </div>

              <div>
                <span className="font-bold text-slate-900 block mb-1">Items Purchased:</span>
                <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto border border-slate-100 rounded-xl p-2">
                  {viewingOrder.items.map((it) => (
                    <div key={it.bookId} className="py-2 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <img src={it.coverImage} alt={it.title} className="w-8 h-10 object-cover rounded" />
                        <div>
                          <strong className="block font-bold text-slate-900">{it.title}</strong>
                          <span className="text-slate-400">Qty: {it.quantity} x {it.price} ETB</span>
                        </div>
                      </div>
                      <strong className="font-bold text-slate-900">{it.total} ETB</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-between font-extrabold text-sm">
                <span>Grand Total:</span>
                <span className="text-amber-800">{viewingOrder.grandTotal} ETB</span>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setViewingOrder(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT BOOK */}
      {showBookModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-2xl p-6 space-y-4 my-auto max-h-[90vh] overflow-y-auto">
            <h3 className="font-serif font-bold text-slate-900 text-lg border-b border-slate-100 pb-2">
              {editingBook ? `Edit "${editingBook.title}"` : "Add New Book Title"}
            </h3>

            <form onSubmit={handleSaveBook} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Book Title *</label>
                <input
                  type="text"
                  value={bookTitle}
                  onChange={(e) => setBookTitle(e.target.value)}
                  required
                  placeholder="e.g. Oromay (ኦሮማይ)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 font-semibold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Author</label>
                  <select
                    value={bookAuthorId}
                    onChange={(e) => setBookAuthorId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-medium"
                  >
                    {authors.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={bookCategoryId}
                    onChange={(e) => setBookCategoryId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-medium"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Regular Price (ETB) *</label>
                  <input
                    type="number"
                    value={bookPrice}
                    onChange={(e) => setBookPrice(Number(e.target.value))}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Discount Price (ETB)</label>
                  <input
                    type="number"
                    value={bookDiscountPrice}
                    onChange={(e) => setBookDiscountPrice(e.target.value ? Number(e.target.value) : "")}
                    placeholder="Optional discount price..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Stock Units Available *</label>
                  <input
                    type="number"
                    value={bookStock}
                    onChange={(e) => setBookStock(Number(e.target.value))}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-semibold"
                  />
                </div>
              </div>

              <ImageUploader
                value={bookCover}
                onChange={setBookCover}
                label="Book Cover Image *"
                bookTitle={bookTitle}
                authorName={authors.find((a) => a.id === bookAuthorId)?.name}
                categoryName={categories.find((c) => c.id === bookCategoryId)?.name}
                aspectRatio="book"
              />

              <div>
                <label className="block font-bold text-slate-700 mb-1">Book Synopsis</label>
                <textarea
                  rows={3}
                  value={bookDesc}
                  onChange={(e) => setBookDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bookFeatured}
                    onChange={(e) => setBookFeatured(e.target.checked)}
                    className="accent-amber-600 w-4 h-4"
                  />
                  <span>Mark as Bestseller / Featured</span>
                </label>

                <label className="flex items-center gap-2 font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bookNewArrival}
                    onChange={(e) => setBookNewArrival(e.target.checked)}
                    className="accent-amber-600 w-4 h-4"
                  />
                  <span>Mark as New Arrival</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowBookModal(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-md"
                >
                  Save Book
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT AUTHOR */}
      {showAuthorModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md p-6 space-y-4 my-auto">
            <h3 className="font-serif font-bold text-slate-900 text-lg border-b border-slate-100 pb-2">
              {editingAuthor ? `Edit Author "${editingAuthor.name}"` : "Add Author Profile"}
            </h3>

            <form onSubmit={handleSaveAuthor} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Author Name *</label>
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  required
                  placeholder="e.g. Haddis Alemayehu"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-semibold"
                />
              </div>

              <ImageUploader
                value={authorImage}
                onChange={setAuthorImage}
                label="Author Profile Photo"
                authorName={authorName}
                aspectRatio="avatar"
              />

              <div>
                <label className="block font-bold text-slate-700 mb-1">Biography</label>
                <textarea
                  rows={3}
                  value={authorBio}
                  onChange={(e) => setAuthorBio(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAuthorModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-md"
                >
                  Save Author
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT CATEGORY */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md p-6 space-y-4 my-auto">
            <h3 className="font-serif font-bold text-slate-900 text-lg border-b border-slate-100 pb-2">
              {editingCategory ? `Edit Category "${editingCategory.name}"` : "Add Category"}
            </h3>

            <form onSubmit={handleSaveCategory} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Category Name *</label>
                <input
                  type="text"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  required
                  placeholder="e.g. Amharic Literature"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Banner Image URL</label>
                <input
                  type="url"
                  value={categoryImage}
                  onChange={(e) => setCategoryImage(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={categoryDesc}
                  onChange={(e) => setCategoryDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-md"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD COUPON */}
      {showCouponModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md p-6 space-y-4 my-auto">
            <h3 className="font-serif font-bold text-slate-900 text-lg border-b border-slate-100 pb-2">
              Create Promotional Coupon Code
            </h3>

            <form onSubmit={handleSaveCoupon} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Coupon Code *</label>
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  required
                  placeholder="e.g. ETHIOPIA15"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono font-bold text-amber-900 uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Discount % *</label>
                  <input
                    type="number"
                    value={couponValue}
                    onChange={(e) => setCouponValue(Number(e.target.value))}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Min Order (ETB) *</label>
                  <input
                    type="number"
                    value={couponMinOrder}
                    onChange={(e) => setCouponMinOrder(Number(e.target.value))}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-semibold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCouponModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-md"
                >
                  Activate Coupon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
