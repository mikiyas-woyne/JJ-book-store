import React, { useState, useEffect } from "react";
import {
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
  updateDoc,
  setDoc,
  addDoc
} from "firebase/firestore";
import { db, cleanFirestoreData } from "../../lib/firebase";
import {
  Book,
  Order,
  OrderStatus,
  Employee,
  EmployeeActivityLog,
  InventoryTransaction
} from "../../types";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../ui/Toast";
import {
  LayoutDashboard,
  ClipboardCheck,
  Package,
  Box,
  Truck,
  PackageSearch,
  PhoneCall,
  History,
  User,
  QrCode,
  RefreshCw,
  AlertTriangle,
  Clock,
  CheckCircle2,
  BookOpen,
  Menu,
  X,
  ChevronRight,
  TrendingUp,
  DollarSign,
  Search,
  Layers,
  ArrowUpRight,
  Sparkles,
  Phone,
  Home
} from "lucide-react";
import { OrderWorkflowModal } from "./OrderWorkflowModal";
import { BarcodeScannerModal } from "./BarcodeScannerModal";

type TabType =
  | "dashboard"
  | "orders"
  | "prepare"
  | "ready"
  | "deliveries"
  | "inventory"
  | "customers"
  | "activity"
  | "profile";

export const EmployeePanel: React.FC<{
  books: Book[];
  onRefreshData: () => void;
  onNavigateHome?: () => void;
}> = ({ books, onRefreshData, onNavigateHome }) => {
  const { currentUser, userProfile, hasPermission } = useAuth();
  const { showToast } = useToast();

  // Navigation & Mobile Drawer State
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Collections State
  const [orders, setOrders] = useState<Order[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [activityLogs, setActivityLogs] = useState<EmployeeActivityLog[]>([]);
  const [inventoryLogs, setInventoryLogs] = useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");

  // Workflow Modal State
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [modalMode, setModalMode] = useState<"verify" | "prepare" | "pack" | "assign" | "deliver" | "return">("verify");
  const [isWorkflowModalOpen, setIsWorkflowModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Customer Notes State
  const [customerCommNote, setCustomerCommNote] = useState("");
  const [commOrderId, setCommOrderId] = useState("");

  useEffect(() => {
    setLoading(true);

    // Realtime Orders
    const qOrders = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const unsubOrders = onSnapshot(
      qOrders,
      (snap) => {
        const list: Order[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Order));
        setOrders(list);
        setLoading(false);
      },
      (err) => {
        console.warn("Orders error in EmployeePanel:", err);
        setLoading(false);
      }
    );

    // Realtime Employees
    const unsubEmp = onSnapshot(
      collection(db, "employees"),
      (snap) => {
        const list: Employee[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Employee));
        setEmployees(list);
      },
      (err) => console.warn("Employees error in EmployeePanel:", err)
    );

    // Realtime Activity Logs
    const qLogs = query(collection(db, "employeeActivityLogs"), orderBy("timestamp", "desc"));
    const unsubLogs = onSnapshot(
      qLogs,
      (snap) => {
        const list: EmployeeActivityLog[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() } as EmployeeActivityLog));
        setActivityLogs(list);
      },
      (err) => console.warn("Activity logs error in EmployeePanel:", err)
    );

    // Realtime Inventory Logs
    const qInv = query(collection(db, "inventoryTransactions"), orderBy("createdAt", "desc"));
    const unsubInv = onSnapshot(
      qInv,
      (snap) => {
        const list: InventoryTransaction[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() } as InventoryTransaction));
        setInventoryLogs(list);
      },
      (err) => console.warn("Inventory logs error in EmployeePanel:", err)
    );

    return () => {
      unsubOrders();
      unsubEmp();
      unsubLogs();
      unsubInv();
    };
  }, []);

  const currentEmployee: Employee = employees.find((e) => e.uid === currentUser?.uid) || {
    id: currentUser?.uid || "emp-guest",
    uid: currentUser?.uid || "emp-guest",
    fullName: userProfile?.fullName || "JJ Store Operations Staff",
    email: currentUser?.email || "staff@jjbookstore.com",
    phone: userProfile?.phone || "+251 911 000 000",
    role: "staff",
    assignedRoles: ["order_processor", "delivery_coordinator", "inventory_staff"],
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
      "customer_service"
    ],
    active: true,
    ordersProcessedCount: 0,
    deliveriesCompletedCount: 0,
    failedDeliveriesCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const logActivity = async (action: string, description: string, orderId?: string) => {
    try {
      const now = new Date().toISOString();
      await addDoc(collection(db, "employeeActivityLogs"), cleanFirestoreData({
        employeeId: currentEmployee?.uid || "staff-01",
        employeeName: currentEmployee?.fullName || "Staff",
        action,
        orderId: orderId || "",
        description,
        timestamp: now
      }));
    } catch (err) {
      console.warn("Failed to record activity log:", err);
    }
  };

  const handleUpdateOrderStatus = async (
    orderId: string,
    newStatus: OrderStatus,
    note: string,
    metadata?: Record<string, any>
  ) => {
    try {
      const now = new Date().toISOString();
      const orderRef = doc(db, "orders", orderId);
      const existingOrder = orders.find((o) => o.id === orderId);

      const statusHistory = existingOrder?.statusHistory || [];
      const updatedHistory = [
        ...statusHistory,
        {
          status: newStatus,
          timestamp: now,
          note,
          employeeId: currentEmployee?.uid,
          employeeName: currentEmployee?.fullName
        }
      ];

      const updateData: any = {
        orderStatus: newStatus,
        updatedAt: now,
        statusHistory: updatedHistory,
        lastActionByEmployeeId: currentEmployee?.uid || "staff-01",
        lastActionByEmployeeName: currentEmployee?.fullName || "Store Staff",
        ...metadata
      };

      await updateDoc(orderRef, cleanFirestoreData(updateData));

      // Safely increment employee performance counter in Firestore
      if (currentEmployee?.id && employees.some((e) => e.id === currentEmployee.id)) {
        const empRef = doc(db, "employees", currentEmployee.id);
        if (newStatus === "delivered") {
          await setDoc(empRef, {
            deliveriesCompletedCount: (currentEmployee.deliveriesCompletedCount || 0) + 1
          }, { merge: true });
        } else if (newStatus === "delivery_failed") {
          await setDoc(empRef, {
            failedDeliveriesCount: (currentEmployee.failedDeliveriesCount || 0) + 1
          }, { merge: true });
        } else if (newStatus === "confirmed" || newStatus === "processing" || newStatus === "packed") {
          await setDoc(empRef, {
            ordersProcessedCount: (currentEmployee.ordersProcessedCount || 0) + 1
          }, { merge: true });
        }
      }

      await logActivity(
        `order_status_${newStatus}`,
        `Updated order ${existingOrder?.orderId || orderId} status to '${newStatus}'. Note: ${note}`,
        orderId
      );

      showToast(`Order status updated to "${newStatus.replace(/_/g, " ")}"`, "success");
    } catch (err: any) {
      console.error("Error updating order status:", err);
      showToast("Failed to update status: " + (err?.message || err), "error");
    }
  };

  const handleAddCustomerNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commOrderId || !customerCommNote.trim()) return;

    try {
      const now = new Date().toISOString();
      await addDoc(collection(db, "customerCommunications"), cleanFirestoreData({
        orderId: commOrderId,
        employeeId: currentEmployee?.uid || "staff-01",
        employeeName: currentEmployee?.fullName || "Store Staff",
        note: customerCommNote.trim(),
        channel: "phone",
        timestamp: now
      }));

      await logActivity("customer_communication", `Added call note for order ${commOrderId}: ${customerCommNote}`);
      setCustomerCommNote("");
      showToast("Customer communication note recorded!", "success");
    } catch (err) {
      showToast("Failed to record note", "error");
    }
  };

  const openWorkflow = (order: Order, mode: "verify" | "prepare" | "pack" | "assign" | "deliver" | "return") => {
    setSelectedOrder(order);
    setModalMode(mode);
    setIsWorkflowModalOpen(true);
  };

  // Operational Counts
  const pendingOrders = orders.filter((o) => o.orderStatus === "pending");
  const confirmedOrders = orders.filter((o) => o.orderStatus === "confirmed");
  const processingOrders = orders.filter((o) => o.orderStatus === "processing");
  const packedOrders = orders.filter((o) => o.orderStatus === "packed");
  const readyOrders = orders.filter((o) => o.orderStatus === "ready_for_delivery");
  const assignedOrders = orders.filter((o) => o.orderStatus === "assigned" || o.orderStatus === "handed_to_delivery" || o.orderStatus === "out_for_delivery");
  const deliveredOrders = orders.filter((o) => o.orderStatus === "delivered");
  const failedDeliveries = orders.filter((o) => o.orderStatus === "delivery_failed");
  const lowStockBooks = books.filter((b) => b.stock <= 5);

  // Operational Statistics Calculations
  const ordersAwaitingAction = pendingOrders.length + confirmedOrders.length + processingOrders.length + packedOrders.length + readyOrders.length;
  const totalVolumeProcessed = orders.filter((o) => o.orderStatus !== "pending" && o.orderStatus !== "cancelled").length;
  const totalPendingCODAmount = assignedOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
  const totalDeliveredRevenue = deliveredOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);

  // Navigation Links Definition
  const navGroups = [
    {
      title: "Main",
      items: [
        {
          id: "dashboard" as TabType,
          label: "Dashboard Overview",
          icon: LayoutDashboard,
          badge: null
        }
      ]
    },
    {
      title: "Order Processing",
      items: [
        {
          id: "orders" as TabType,
          label: "Order Verification",
          icon: ClipboardCheck,
          badge: pendingOrders.length,
          permission: "view_orders"
        },
        {
          id: "prepare" as TabType,
          label: "Book Picking Checklist",
          icon: PackageSearch,
          badge: confirmedOrders.length + processingOrders.length,
          permission: "process_orders"
        },
        {
          id: "ready" as TabType,
          label: "Packaging & Labeling",
          icon: Box,
          badge: packedOrders.length + readyOrders.length,
          permission: "pack_orders"
        }
      ]
    },
    {
      title: "Logistics & Delivery",
      items: [
        {
          id: "deliveries" as TabType,
          label: "Delivery Management",
          icon: Truck,
          badge: assignedOrders.length,
          permission: "update_delivery_status"
        }
      ]
    },
    {
      title: "Stock & Inventory",
      items: [
        {
          id: "inventory" as TabType,
          label: "Inventory & Stock",
          icon: Package,
          badge: lowStockBooks.length > 0 ? `${lowStockBooks.length} alert` : null,
          badgeColor: "bg-amber-500 text-slate-950 font-bold",
          permission: "manage_inventory"
        }
      ]
    },
    {
      title: "Support & Logs",
      items: [
        {
          id: "customers" as TabType,
          label: "Customer Call Logs",
          icon: PhoneCall,
          badge: null,
          permission: "customer_service"
        },
        {
          id: "activity" as TabType,
          label: "Audit Logs",
          icon: History,
          badge: null
        },
        {
          id: "profile" as TabType,
          label: "My Staff Profile",
          icon: User,
          badge: null
        }
      ]
    }
  ];

  const handleNavClick = (tabId: TabType) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* TOP MOBILE & TABLET HEADER */}
      <header className="bg-slate-950 border-b border-slate-800 sticky top-0 z-30 px-4 py-3 flex items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl bg-slate-900 text-amber-400 border border-slate-800 hover:bg-slate-800 transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black flex items-center justify-center shadow-lg shadow-amber-500/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif font-extrabold text-sm sm:text-base text-white tracking-wide">
                  JJ Book Shopping
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-extrabold uppercase tracking-wider">
                  Employee Panel
                </span>
              </div>
              <p className="text-[10px] text-slate-400 truncate max-w-[200px] sm:max-w-none">
                {currentEmployee?.fullName} • <span className="text-amber-400 font-semibold">{currentEmployee?.zone || "Central Hub"}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Right Header Action Controls */}
        <div className="flex items-center gap-2">
          {onNavigateHome && (
            <button
              onClick={onNavigateHome}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-950/40 border border-emerald-500 transition-all active:scale-95 cursor-pointer"
              title="Finished operations - Return to bookstore store homepage"
            >
              <Home className="w-4 h-4" />
              <span>Done (Go to Home)</span>
            </button>
          )}

          <button
            onClick={() => setIsScannerOpen(true)}
            className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95"
          >
            <QrCode className="w-4 h-4" />
            <span className="hidden md:inline">Barcode / ISBN</span>
          </button>

          <button
            onClick={onRefreshData}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs border border-slate-800 transition-colors"
            title="Refresh Orders Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {onNavigateHome && (
            <button
              onClick={onNavigateHome}
              className="p-2.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-200 hover:text-white border border-rose-800/80 transition-all cursor-pointer shadow-md active:scale-95 flex items-center justify-center shrink-0"
              title="Close Employee Panel - Exit to store home"
              aria-label="Close Employee Panel"
            >
              <X className="w-5 h-5 stroke-[2.5]" />
            </button>
          )}
        </div>
      </header>

      {/* OPERATIONAL STATISTICS OVERVIEW BAR */}
      <section className="bg-slate-950/80 border-b border-slate-800/80 px-4 sm:px-6 py-3.5">
        <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Stat 1: Orders Awaiting Action */}
          <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800/80 flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                Orders Awaiting Action
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-xl sm:text-2xl font-black text-amber-400">{ordersAwaitingAction}</span>
                <span className="text-[11px] text-slate-400 font-medium">pending stage</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          {/* Stat 2: Daily Processing Volume */}
          <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800/80 flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                Processing Volume
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-xl sm:text-2xl font-black text-blue-400">{totalVolumeProcessed}</span>
                <span className="text-[11px] text-slate-400 font-medium">orders handled</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          {/* Stat 3: Active Deliveries & COD */}
          <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800/80 flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                Active Field COD
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-lg sm:text-xl font-black text-emerald-400">
                  ETB {totalPendingCODAmount.toLocaleString()}
                </span>
                <span className="text-[10px] text-emerald-300 font-bold">({assignedOrders.length} routes)</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>

          {/* Stat 4: Inventory Low Stock Alerts */}
          <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800/80 flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                Low Stock Alerts
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className={`text-xl sm:text-2xl font-black ${lowStockBooks.length > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                  {lowStockBooks.length}
                </span>
                <span className="text-[11px] text-slate-400 font-medium">titles ≤ 5 copies</span>
              </div>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              lowStockBooks.length > 0
                ? "bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse"
                : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
            }`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
        </div>
      </section>

      {/* MAIN TWO-COLUMN BODY CONTAINER (DESKTOP SIDEBAR + DYNAMIC VIEW) */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 gap-6 relative">
        {/* MOBILE DRAWER BACKDROP */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* SIDEBAR NAVIGATION (DESKTOP & MOBILE SLIDE-OUT) */}
        <aside
          className={`
            fixed lg:static top-0 bottom-0 left-0 z-50
            w-72 sm:w-80 lg:w-64 bg-slate-950 lg:bg-transparent
            border-r border-slate-800 lg:border-none p-4 lg:p-0
            transform transition-transform duration-300 ease-in-out
            overflow-y-auto flex flex-col justify-between shrink-0
            ${mobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0"}
          `}
        >
          <div className="space-y-6">
            {/* Mobile Sidebar Header Title */}
            <div className="flex items-center justify-between lg:hidden pb-3 border-b border-slate-800">
              <span className="font-serif font-bold text-base text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-400" />
                <span>Employee Navigation</span>
              </span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Nav Menu Groups */}
            <nav className="space-y-5">
              {navGroups.map((group, idx) => (
                <div key={idx} className="space-y-1.5">
                  <h4 className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-500">
                    {group.title}
                  </h4>
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      if (item.permission && !hasPermission(item.permission as any)) {
                        return null;
                      }

                      const Icon = item.icon;
                      const isActive = activeTab === item.id;

                      return (
                        <button
                          key={item.id}
                          onClick={() => handleNavClick(item.id)}
                          className={`
                            w-full px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all
                            flex items-center justify-between gap-2 text-left group
                            ${
                              isActive
                                ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 font-black"
                                : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                            }
                          `}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Icon
                              className={`w-4 h-4 shrink-0 ${
                                isActive ? "text-slate-950" : "text-slate-400 group-hover:text-amber-400"
                              }`}
                            />
                            <span className="truncate">{item.label}</span>
                          </div>

                          {item.badge !== null && item.badge !== undefined && (
                            <span
                              className={`
                                px-2 py-0.5 rounded-full text-[10px] font-black shrink-0
                                ${
                                  isActive
                                    ? "bg-slate-950 text-amber-400"
                                    : item.badgeColor || "bg-slate-800 text-amber-400 border border-slate-700"
                                }
                              `}
                            >
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </div>

          {/* Sidebar Footer Employee Info Card */}
          <div className="pt-4 border-t border-slate-800 mt-6 space-y-2">
            <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-xs space-y-1">
              <span className="text-[10px] font-black uppercase text-amber-400 block">Current Staff User</span>
              <p className="font-bold text-white truncate">{currentEmployee.fullName}</p>
              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/80">
                <span>Handled Orders</span>
                <span className="font-bold text-emerald-400">{currentEmployee.ordersProcessedCount || 0}</span>
              </div>
            </div>

            {onNavigateHome && (
              <button
                onClick={onNavigateHome}
                className="w-full px-3.5 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 hover:text-emerald-200 border border-emerald-500/30 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>Done • Back to Home</span>
              </button>
            )}
          </div>
        </aside>

        {/* DYNAMIC CONTENT AREA */}
        <main className="flex-1 min-w-0">
          {/* TAB 1: OPERATIONAL DASHBOARD */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              {/* Telemetry Stage Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase">1. Verify</span>
                  <div className="text-xl font-black text-amber-400">{pendingOrders.length}</div>
                  <span className="text-[10px] text-amber-300/70 block truncate">Awaiting review</span>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase">2. Picking</span>
                  <div className="text-xl font-black text-blue-400">{confirmedOrders.length + processingOrders.length}</div>
                  <span className="text-[10px] text-blue-300/70 block truncate">In warehouse</span>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase">3. Packing</span>
                  <div className="text-xl font-black text-indigo-400">{packedOrders.length + readyOrders.length}</div>
                  <span className="text-[10px] text-indigo-300/70 block truncate">Boxes labeled</span>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase">4. Delivery</span>
                  <div className="text-xl font-black text-amber-500">{assignedOrders.length}</div>
                  <span className="text-[10px] text-amber-300/70 block truncate">On field routes</span>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase">5. Delivered</span>
                  <div className="text-xl font-black text-emerald-400">{deliveredOrders.length}</div>
                  <span className="text-[10px] text-emerald-300/70 block truncate">Fulfilled orders</span>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase">6. Issues</span>
                  <div className="text-xl font-black text-rose-400">{failedDeliveries.length}</div>
                  <span className="text-[10px] text-rose-300/70 block truncate">Delivery issues</span>
                </div>
              </div>

              {/* Action Queue & Low Stock Widgets */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 bg-slate-950 p-5 sm:p-6 rounded-3xl border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="font-serif font-bold text-base text-white flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-400" />
                      <span>Immediate Action Orders Queue ({ordersAwaitingAction})</span>
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {orders
                      .filter((o) => o.orderStatus === "pending" || o.orderStatus === "confirmed" || o.orderStatus === "ready_for_delivery")
                      .slice(0, 6)
                      .map((ord) => (
                        <div
                          key={ord.id}
                          className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-amber-500/30 transition-all"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-amber-400 font-mono text-xs sm:text-sm">{ord.orderId}</span>
                              <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] uppercase font-bold border border-slate-700">
                                {ord.orderStatus.replace(/_/g, " ")}
                              </span>
                            </div>
                            <p className="text-xs text-white font-bold">{ord.customerName} ({ord.customerPhone})</p>
                            <p className="text-[11px] text-slate-400">
                              {ord.items.length} items • ETB {ord.grandTotal.toLocaleString()} • {ord.shippingAddress.subcity || ord.shippingAddress.city}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            {ord.orderStatus === "pending" && (
                              <button
                                onClick={() => openWorkflow(ord, "verify")}
                                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-md"
                              >
                                Verify Order
                              </button>
                            )}
                            {ord.orderStatus === "confirmed" && (
                              <button
                                onClick={() => openWorkflow(ord, "prepare")}
                                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs shadow-md"
                              >
                                Pick Books
                              </button>
                            )}
                            {ord.orderStatus === "ready_for_delivery" && (
                              <button
                                onClick={() => openWorkflow(ord, "assign")}
                                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md"
                              >
                                Assign Driver
                              </button>
                            )}
                          </div>
                        </div>
                      ))}

                    {ordersAwaitingAction === 0 && (
                      <p className="text-xs text-slate-400 py-8 text-center font-medium">
                        ✨ All customer orders processed and assigned! Great job team!
                      </p>
                    )}
                  </div>
                </div>

                {/* Low Stock Sidebar Alert Widget */}
                <div className="lg:col-span-4 bg-slate-950 p-5 sm:p-6 rounded-3xl border border-slate-800 space-y-4">
                  <h3 className="font-serif font-bold text-base text-white flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span>Low Stock Warehouse Alerts ({lowStockBooks.length})</span>
                  </h3>

                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {lowStockBooks.map((bk) => (
                      <div key={bk.id} className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <img src={bk.coverImage} alt={bk.title} className="w-8 h-10 object-cover rounded-md shrink-0" />
                          <div className="min-w-0">
                            <h5 className="font-bold text-xs text-white truncate">{bk.title}</h5>
                            <span className="text-[10px] text-amber-400 font-extrabold block">Stock: {bk.stock} left</span>
                          </div>
                        </div>

                        <button
                          onClick={() => setActiveTab("inventory")}
                          className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-bold text-[10px] border border-amber-500/30 shrink-0"
                        >
                          Restock
                        </button>
                      </div>
                    ))}

                    {lowStockBooks.length === 0 && (
                      <p className="text-xs text-slate-400 py-8 text-center font-medium">
                        All bookstore catalog titles have sufficient warehouse stock reserves.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ORDER VERIFICATION */}
          {activeTab === "orders" && (
            <div className="bg-slate-950 p-5 sm:p-6 rounded-3xl border border-slate-800 space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h2 className="font-serif font-bold text-xl text-white">Stage 1: Order Verification</h2>
                  <p className="text-xs text-slate-400">Verify customer address, confirm phone availability, and validate payment method</p>
                </div>

                <div className="w-full sm:w-64 relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search Order ID or Name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingOrders.map((ord) => (
                  <div key={ord.id} className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-amber-400 text-sm">{ord.orderId}</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-extrabold border border-amber-500/30">
                        Awaiting Verification
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <p className="font-bold text-white">{ord.customerName}</p>
                      <p className="text-slate-400">{ord.customerPhone} • {ord.customerEmail}</p>
                      <p className="text-slate-300 font-medium">{ord.shippingAddress.streetAddress}, {ord.shippingAddress.city}</p>
                      
                      <div className="pt-2 flex flex-wrap gap-2 text-[10px]">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold uppercase">
                          {ord.paymentMethod}
                        </span>
                        {(ord.verifiedReceiptNumber || ord.paymentReference) && (
                          <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono font-bold">
                            Ref #: {ord.verifiedReceiptNumber || ord.paymentReference}
                          </span>
                        )}
                        {ord.verifiedByEmployeeName && (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-bold flex items-center gap-1">
                            Verified by: {ord.verifiedByEmployeeName}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                      <span className="font-black text-amber-400">ETB {ord.grandTotal.toLocaleString()}</span>
                      <button
                        onClick={() => openWorkflow(ord, "verify")}
                        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-md"
                      >
                        Verify & Confirm Order
                      </button>
                    </div>
                  </div>
                ))}

                {pendingOrders.length === 0 && (
                  <div className="col-span-full py-12 text-center text-slate-400 space-y-2">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                    <p className="font-serif font-bold text-lg text-white">All new orders verified!</p>
                    <p className="text-xs text-slate-400">New customer orders will appear here automatically in real time.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: COLLECTING BOOKS CHECKLIST */}
          {activeTab === "prepare" && (
            <div className="bg-slate-950 p-5 sm:p-6 rounded-3xl border border-slate-800 space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <h2 className="font-serif font-bold text-xl text-white">Stage 2: Warehouse Book Picking Checklist</h2>
                <p className="text-xs text-slate-400">Locate shelf positions (e.g. Shelf A-12), verify book titles, and mark items picked</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[...confirmedOrders, ...processingOrders].map((ord) => (
                  <div key={ord.id} className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-amber-400 text-sm">{ord.orderId}</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-extrabold border border-blue-500/30">
                        {ord.orderStatus.toUpperCase()}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Items to Collect ({ord.items.length})</span>
                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {ord.items.map((it, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                            <span className="text-white truncate max-w-[200px] font-semibold">{it.title}</span>
                            <span className="font-black text-amber-400">Qty: {it.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-xs text-slate-400 font-medium">Shelf Pick Checklist</span>
                      <button
                        onClick={() => openWorkflow(ord, "prepare")}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs shadow-md"
                      >
                        Start Picking Checklist
                      </button>
                    </div>
                  </div>
                ))}

                {confirmedOrders.length === 0 && processingOrders.length === 0 && (
                  <div className="col-span-full py-12 text-center text-slate-400 space-y-2">
                    <PackageSearch className="w-10 h-10 text-blue-400 mx-auto" />
                    <p className="font-serif font-bold text-lg text-white">No pending book picking checklists!</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: PACKING & READY FOR DELIVERY */}
          {activeTab === "ready" && (
            <div className="bg-slate-950 p-5 sm:p-6 rounded-3xl border border-slate-800 space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <h2 className="font-serif font-bold text-xl text-white">Stage 3: Packaging & Box Barcode Labeling</h2>
                <p className="text-xs text-slate-400">Record package box barcode IDs, container weight, and stage for delivery dispatch</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[...packedOrders, ...readyOrders].map((ord) => (
                  <div key={ord.id} className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-amber-400 text-sm">{ord.orderId}</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold border border-emerald-500/30">
                        {ord.orderStatus.replace(/_/g, " ").toUpperCase()}
                      </span>
                    </div>

                    <p className="text-xs text-white font-bold">{ord.customerName} • {ord.shippingAddress.subcity || ord.shippingAddress.city}</p>

                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                      <button
                        onClick={() => openWorkflow(ord, "pack")}
                        className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs"
                      >
                        Package Barcode
                      </button>
                      <button
                        onClick={() => openWorkflow(ord, "assign")}
                        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-md"
                      >
                        Assign Driver
                      </button>
                    </div>
                  </div>
                ))}

                {packedOrders.length === 0 && readyOrders.length === 0 && (
                  <div className="col-span-full py-12 text-center text-slate-400 space-y-2">
                    <Box className="w-10 h-10 text-indigo-400 mx-auto" />
                    <p className="font-serif font-bold text-lg text-white">No orders currently waiting for packaging!</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: DELIVERIES PANEL (MY DELIVERIES & FIELD DRIVER WORKSPACE) */}
          {activeTab === "deliveries" && (
            <div className="bg-slate-950 p-5 sm:p-6 rounded-3xl border border-slate-800 space-y-6">
              <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="font-serif font-bold text-xl text-white">Stage 4: Delivery Driver Dispatch & COD Collection</h2>
                  <p className="text-xs text-slate-400">Mobile dispatch interface for field delivery personnel to collect cash and confirm deliveries</p>
                </div>

                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs font-black">
                  <Truck className="w-4 h-4 text-amber-400" />
                  <span>Field Active: {assignedOrders.length}</span>
                </div>
              </div>

              <div className="space-y-4">
                {assignedOrders.map((ord) => (
                  <div key={ord.id} className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                      <div>
                        <span className="font-mono font-bold text-amber-400 text-base">{ord.orderId}</span>
                        <p className="text-xs font-bold text-white mt-0.5">{ord.customerName}</p>
                      </div>

                      <a
                        href={`tel:${ord.customerPhone}`}
                        className="px-3.5 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-extrabold text-xs flex items-center gap-2 active:scale-95 transition-all"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Call {ord.customerPhone}</span>
                      </a>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                        <span className="text-[10px] text-slate-400 uppercase font-black block">Delivery Address</span>
                        <p className="font-bold text-white">{ord.shippingAddress.streetAddress}</p>
                        <p className="text-slate-400">{ord.shippingAddress.subcity || ord.shippingAddress.city}, {ord.shippingAddress.region}</p>
                      </div>

                      <div className="p-3 bg-amber-950/40 rounded-2xl border border-amber-800/40 space-y-1 sm:text-right">
                        <span className="text-[10px] text-amber-400 uppercase font-black block">COD Cash Collection</span>
                        <p className="font-black text-amber-300 text-base">ETB {ord.grandTotal.toLocaleString()}</p>
                        <p className="text-[10px] text-slate-400 font-medium">Payment Method: {ord.paymentMethod.toUpperCase()}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                      <button
                        onClick={() => openWorkflow(ord, "return")}
                        className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                      >
                        Return to Store
                      </button>

                      <button
                        onClick={() => openWorkflow(ord, "deliver")}
                        className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-950/50 flex items-center gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Record Delivery / COD Result</span>
                      </button>
                    </div>
                  </div>
                ))}

                {assignedOrders.length === 0 && (
                  <div className="py-12 text-center text-slate-400 space-y-2">
                    <Truck className="w-10 h-10 text-amber-400 mx-auto" />
                    <p className="font-serif font-bold text-lg text-white">No active deliveries on field routes!</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: INVENTORY & STOCK */}
          {activeTab === "inventory" && (
            <div className="bg-slate-950 p-5 sm:p-6 rounded-3xl border border-slate-800 space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <h2 className="font-serif font-bold text-xl text-white">Warehouse Inventory & Stock Reserves</h2>
                <p className="text-xs text-slate-400">Look up bookstore titles, check stock counts, and view restocking alerts</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {books.map((bk) => (
                  <div key={bk.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img src={bk.coverImage} alt={bk.title} className="w-10 h-14 object-cover rounded-lg border border-slate-700 shrink-0" />
                      <div className="min-w-0">
                        <h5 className="font-bold text-xs text-white truncate">{bk.title}</h5>
                        <p className="text-[10px] text-slate-400 truncate">{bk.authorName}</p>
                        <span className={`text-[10px] font-black block mt-1 ${bk.stock <= 5 ? "text-amber-400" : "text-emerald-400"}`}>
                          Stock: {bk.stock} copies
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 7: CUSTOMER SERVICE & NOTES */}
          {activeTab === "customers" && (
            <div className="bg-slate-950 p-5 sm:p-6 rounded-3xl border border-slate-800 space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <h2 className="font-serif font-bold text-xl text-white">Customer Service Call Logs</h2>
                <p className="text-xs text-slate-400">Record phone call notes, track customer requests, and log delivery updates</p>
              </div>

              <form onSubmit={handleAddCustomerNote} className="space-y-4 max-w-xl">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Select Order ID</label>
                  <select
                    value={commOrderId}
                    onChange={(e) => setCommOrderId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="">-- Choose Order --</option>
                    {orders.map((o) => (
                      <option key={o.id} value={o.orderId}>
                        {o.orderId} - {o.customerName} ({o.customerPhone})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Call Note / Staff Response</label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Called customer to confirm delivery address. Customer requested delivery after 2 PM."
                    value={customerCommNote}
                    onChange={(e) => setCustomerCommNote(e.target.value)}
                    className="w-full p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-md"
                >
                  Record Call Log
                </button>
              </form>
            </div>
          )}

          {/* TAB 8: AUDIT LOG */}
          {activeTab === "activity" && (
            <div className="bg-slate-950 p-5 sm:p-6 rounded-3xl border border-slate-800 space-y-4">
              <h2 className="font-serif font-bold text-xl text-white">Operational Activity Audit Trail</h2>
              <div className="divide-y divide-slate-800 max-h-96 overflow-y-auto pr-2 text-xs">
                {activityLogs.map((log) => (
                  <div key={log.id} className="py-3 flex items-start justify-between gap-4">
                    <div>
                      <span className="font-bold text-amber-400">{log.employeeName}</span>
                      <p className="text-slate-300 mt-0.5">{log.description}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 9: MY PROFILE */}
          {activeTab === "profile" && (
            <div className="bg-slate-950 p-5 sm:p-6 rounded-3xl border border-slate-800 space-y-6 max-w-2xl">
              <h2 className="font-serif font-bold text-xl text-white">Staff Profile & Operational Scope</h2>
              <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-3 text-xs">
                <div>
                  <p className="text-white font-extrabold text-base">{currentEmployee?.fullName}</p>
                  <p className="text-slate-400">{currentEmployee?.email}</p>
                </div>
                <div className="pt-2 border-t border-slate-800 flex flex-wrap gap-2">
                  {currentEmployee?.assignedRoles?.map((r) => (
                    <span key={r} className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[10px] border border-amber-500/30">
                      {r.replace(/_/g, " ").toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Workflow Modal */}
      <OrderWorkflowModal
        order={selectedOrder}
        mode={modalMode}
        onClose={() => setIsWorkflowModalOpen(false)}
        onUpdateOrderStatus={handleUpdateOrderStatus}
        employees={employees}
        currentEmployee={currentEmployee}
        onNavigateHome={onNavigateHome}
      />

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanResult={(scanned) => {
          showToast(`Scanned code: ${scanned}`, "info");
        }}
      />
    </div>
  );
};
