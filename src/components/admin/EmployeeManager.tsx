import React, { useState, useEffect } from "react";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  addDoc
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import {
  Employee,
  EmployeeRole,
  EmployeePermission,
  EmployeeActivityLog,
  UserProfile
} from "../../types";
import { useToast } from "../ui/Toast";
import {
  Users,
  UserPlus,
  Shield,
  CheckCircle2,
  XCircle,
  Edit3,
  Key,
  TrendingUp,
  PackageCheck,
  Truck,
  Activity,
  Search,
  Filter,
  Phone,
  Mail,
  UserCheck,
  AlertTriangle,
  FileText
} from "lucide-react";

const ALL_ROLES: { id: EmployeeRole; label: string; desc: string }[] = [
  { id: "order_processor", label: "Order Processor", desc: "Confirms, checks stock, collects items, and prepares orders" },
  { id: "delivery_coordinator", label: "Delivery Coordinator", desc: "Assigns orders to drivers, manages dispatch & handoffs" },
  { id: "inventory_staff", label: "Inventory Manager", desc: "Manages stock, logs incoming books, records damaged/missing items" },
  { id: "customer_service", label: "Customer Service", desc: "Handles customer inquiries, notes, and order issues" },
  { id: "delivery_personnel", label: "Delivery Driver", desc: "Mobile 'My Deliveries' panel, COD collection, marks delivery/failure" }
];

const ALL_PERMISSIONS: { id: EmployeePermission; label: string; category: string }[] = [
  { id: "view_orders", label: "View All Orders", category: "Orders" },
  { id: "confirm_orders", label: "Confirm / Reject Orders", category: "Orders" },
  { id: "process_orders", label: "Collect & Process Items", category: "Orders" },
  { id: "pack_orders", label: "Pack & Label Packages", category: "Orders" },
  { id: "assign_deliveries", label: "Assign Delivery Drivers", category: "Delivery" },
  { id: "view_delivery_addresses", label: "View Customer Addresses", category: "Delivery" },
  { id: "update_delivery_status", label: "Update Delivery Status & COD", category: "Delivery" },
  { id: "manage_inventory", label: "Manage Inventory & Stock", category: "Inventory" },
  { id: "view_customers", label: "View Customer Profiles", category: "Support" },
  { id: "customer_service", label: "Log Customer Notes", category: "Support" },
  { id: "manage_reviews", label: "Moderate Reviews", category: "Support" }
];

export const EmployeeManager: React.FC = () => {
  const { showToast } = useToast();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [activityLogs, setActivityLogs] = useState<EmployeeActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Form Fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [assignedRoles, setAssignedRoles] = useState<EmployeeRole[]>(["order_processor"]);
  const [permissions, setPermissions] = useState<EmployeePermission[]>([
    "view_orders",
    "confirm_orders",
    "process_orders"
  ]);
  const [zone, setZone] = useState("Addis Ababa - Central");
  const [activeStatus, setActiveStatus] = useState(true);

  // Selected Employee Performance View
  const [selectedPerfEmp, setSelectedPerfEmp] = useState<Employee | null>(null);

  useEffect(() => {
    setLoading(true);
    // Realtime Employees Listener
    const unsubEmp = onSnapshot(
      collection(db, "employees"),
      (snap) => {
        const list: Employee[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Employee));
        setEmployees(list);
        setLoading(false);
      },
      (err) => {
        console.warn("Employees realtime error:", err);
        setLoading(false);
      }
    );

    // Realtime Activity Logs Listener
    const qLogs = query(collection(db, "employeeActivityLogs"), orderBy("timestamp", "desc"));
    const unsubLogs = onSnapshot(
      qLogs,
      (snap) => {
        const list: EmployeeActivityLog[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() } as EmployeeActivityLog));
        setActivityLogs(list);
      },
      (err) => console.warn("Employee logs realtime error:", err)
    );

    return () => {
      unsubEmp();
      unsubLogs();
    };
  }, []);

  const handleOpenAddModal = () => {
    setEditingEmployee(null);
    setFullName("");
    setEmail("");
    setPhone("+251 ");
    setAssignedRoles(["order_processor"]);
    setPermissions(["view_orders", "confirm_orders", "process_orders"]);
    setZone("Addis Ababa - Central");
    setActiveStatus(true);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setFullName(emp.fullName);
    setEmail(emp.email);
    setPhone(emp.phone || "+251 ");
    setAssignedRoles(emp.assignedRoles || []);
    setPermissions(emp.permissions || []);
    setZone(emp.zone || "Addis Ababa - Central");
    setActiveStatus(emp.active);
    setIsModalOpen(true);
  };

  const handleToggleRole = (r: EmployeeRole) => {
    if (assignedRoles.includes(r)) {
      setAssignedRoles(assignedRoles.filter((item) => item !== r));
    } else {
      setAssignedRoles([...assignedRoles, r]);
      // Auto enable default permissions for role
      if (r === "delivery_personnel") {
        const addPerms: EmployeePermission[] = ["view_orders", "view_delivery_addresses", "update_delivery_status"];
        setPermissions(Array.from(new Set([...permissions, ...addPerms])));
      } else if (r === "inventory_staff") {
        setPermissions(Array.from(new Set([...permissions, "manage_inventory"])));
      } else if (r === "delivery_coordinator") {
        setPermissions(Array.from(new Set([...permissions, "view_orders", "assign_deliveries"])));
      }
    }
  };

  const handleTogglePermission = (p: EmployeePermission) => {
    if (permissions.includes(p)) {
      setPermissions(permissions.filter((item) => item !== p));
    } else {
      setPermissions([...permissions, p]);
    }
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      showToast("Please provide employee name and email", "error");
      return;
    }

    try {
      const now = new Date().toISOString();
      const uid = editingEmployee ? editingEmployee.uid : `emp-${Date.now()}`;

      const empData: Partial<Employee> = {
        uid,
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        role: "staff",
        assignedRoles,
        permissions,
        active: activeStatus,
        zone,
        updatedAt: now
      };

      if (editingEmployee) {
        await updateDoc(doc(db, "employees", editingEmployee.id), empData);
        // Sync user role doc
        await setDoc(
          doc(db, "users", editingEmployee.uid),
          {
            role: "staff",
            assignedRoles,
            permissions,
            fullName: fullName.trim(),
            updatedAt: now
          },
          { merge: true }
        );
        showToast(`Employee "${fullName}" updated successfully`, "success");
      } else {
        const newEmp: Employee = {
          id: uid,
          uid,
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          role: "staff",
          assignedRoles,
          permissions,
          active: activeStatus,
          zone,
          ordersProcessedCount: 0,
          deliveriesCompletedCount: 0,
          failedDeliveriesCount: 0,
          createdAt: now,
          updatedAt: now
        };
        await setDoc(doc(db, "employees", uid), newEmp);
        await setDoc(
          doc(db, "users", uid),
          {
            uid,
            fullName: fullName.trim(),
            email: email.trim().toLowerCase(),
            phone: phone.trim(),
            role: "staff",
            assignedRoles,
            permissions,
            status: activeStatus ? "active" : "suspended",
            createdAt: now,
            updatedAt: now
          },
          { merge: true }
        );

        // Record activity log
        await addDoc(collection(db, "employeeActivityLogs"), {
          employeeId: "admin",
          employeeName: "System Administrator",
          action: "created_employee",
          description: `Created new staff account for ${fullName} (${assignedRoles.join(", ")})`,
          timestamp: now
        });

        showToast(`Staff account for "${fullName}" created successfully! Credentials ready.`, "success");
      }

      setIsModalOpen(false);
    } catch (err: any) {
      console.error("Save employee error:", err);
      showToast("Failed to save employee profile: " + (err?.message || err), "error");
    }
  };

  const handleToggleActive = async (emp: Employee) => {
    try {
      const nextState = !emp.active;
      await updateDoc(doc(db, "employees", emp.id), {
        active: nextState,
        updatedAt: new Date().toISOString()
      });
      await setDoc(
        doc(db, "users", emp.uid),
        { status: nextState ? "active" : "suspended" },
        { merge: true }
      );
      showToast(
        `Staff member ${emp.fullName} is now ${nextState ? "Active" : "Deactivated"}`,
        nextState ? "success" : "info"
      );
    } catch (err) {
      showToast("Error updating status", "error");
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const matchesQuery =
      emp.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.phone.includes(searchQuery);

    if (!matchesQuery) return false;
    if (roleFilter !== "all") {
      return emp.assignedRoles?.includes(roleFilter as EmployeeRole);
    }
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="font-serif font-extrabold text-2xl text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-amber-600" />
            <span>Employee & Staff Role Management</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Configure operational roles, granular permissions, zone assignments, and performance logs.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="px-5 py-3 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-amber-900/20 active:scale-95 transition-all"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add New Employee</span>
        </button>
      </div>

      {/* Summary KPI Widgets */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[11px] font-bold uppercase text-slate-400">Total Staff</span>
          <div className="text-2xl font-extrabold text-slate-900">{employees.length}</div>
          <span className="text-[10px] text-emerald-600 font-semibold">Active Profiles</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[11px] font-bold uppercase text-slate-400">Order Processors</span>
          <div className="text-2xl font-extrabold text-blue-600">
            {employees.filter((e) => e.assignedRoles?.includes("order_processor")).length}
          </div>
          <span className="text-[10px] text-slate-500">Handling order prep</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[11px] font-bold uppercase text-slate-400">Delivery Personnel</span>
          <div className="text-2xl font-extrabold text-amber-600">
            {employees.filter((e) => e.assignedRoles?.includes("delivery_personnel")).length}
          </div>
          <span className="text-[10px] text-slate-500">On-field delivery drivers</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[11px] font-bold uppercase text-slate-400">Inventory Staff</span>
          <div className="text-2xl font-extrabold text-indigo-600">
            {employees.filter((e) => e.assignedRoles?.includes("inventory_staff")).length}
          </div>
          <span className="text-[10px] text-slate-500">Stock & Audit handlers</span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search staff by name, email or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 text-xs bg-white focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold bg-white text-slate-800 focus:outline-none w-full"
          >
            <option value="all">All Operational Roles</option>
            {ALL_ROLES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Employee List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEmployees.map((emp) => (
          <div
            key={emp.id}
            className={`rounded-3xl border bg-white shadow-sm p-6 space-y-5 transition-all ${
              emp.active ? "border-slate-200 hover:shadow-md" : "border-slate-300 opacity-60 bg-slate-50"
            }`}
          >
            {/* Top Employee Card Info */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-white font-extrabold text-lg flex items-center justify-center shadow-md">
                  {emp.fullName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{emp.fullName}</h3>
                  <p className="text-xs text-slate-500">{emp.email}</p>
                  <span className="text-[10px] text-slate-400 block mt-0.5">{emp.phone}</span>
                </div>
              </div>

              <span
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  emp.active ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
                }`}
              >
                {emp.active ? "Active" : "Disabled"}
              </span>
            </div>

            {/* Assigned Roles Tags */}
            <div className="space-y-1.5 border-t border-b border-slate-100 py-3">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Assigned Operational Roles</span>
              <div className="flex flex-wrap gap-1.5">
                {emp.assignedRoles?.map((r) => {
                  const roleObj = ALL_ROLES.find((item) => item.id === r);
                  return (
                    <span
                      key={r}
                      className="px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-900 font-bold text-[10px]"
                    >
                      {roleObj?.label || r}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Performance Snapshot */}
            <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
              <div>
                <span className="text-[10px] text-slate-400 block">Processed</span>
                <span className="font-extrabold text-slate-800 text-xs">{emp.ordersProcessedCount || 0}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Delivered</span>
                <span className="font-extrabold text-emerald-600 text-xs">{emp.deliveriesCompletedCount || 0}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Failed</span>
                <span className="font-extrabold text-rose-600 text-xs">{emp.failedDeliveriesCount || 0}</span>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                onClick={() => setSelectedPerfEmp(emp)}
                className="text-amber-700 hover:text-amber-800 font-bold text-xs flex items-center gap-1"
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Performance</span>
              </button>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleToggleActive(emp)}
                  className={`p-2 rounded-xl text-xs font-bold transition-colors ${
                    emp.active ? "text-rose-600 hover:bg-rose-50" : "text-emerald-600 hover:bg-emerald-50"
                  }`}
                  title={emp.active ? "Deactivate Account" : "Activate Account"}
                >
                  {emp.active ? <XCircle className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                </button>

                <button
                  onClick={() => handleOpenEditModal(emp)}
                  className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
                  title="Edit Roles & Permissions"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredEmployees.length === 0 && !loading && (
          <div className="col-span-full text-center py-12 bg-white rounded-3xl border border-dashed border-slate-300">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-serif font-bold text-slate-700">No employee accounts found</p>
            <p className="text-xs text-slate-400 mt-1">Click "Add New Employee" to create operational staff logins.</p>
          </div>
        )}
      </div>

      {/* Employee Activity Log Stream Section */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-serif font-bold text-lg text-slate-900 flex items-center gap-2">
          <Activity className="w-5 h-5 text-amber-600" />
          <span>Operational Staff Activity Audit Log</span>
        </h3>

        <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto pr-2">
          {activityLogs.slice(0, 15).map((log) => (
            <div key={log.id} className="py-3 flex items-start justify-between gap-4 text-xs">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">{log.employeeName}</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold">
                    {log.action}
                  </span>
                </div>
                <p className="text-slate-600">{log.description}</p>
              </div>
              <span className="text-[10px] text-slate-400 shrink-0">
                {new Date(log.timestamp).toLocaleString()}
              </span>
            </div>
          ))}

          {activityLogs.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-6">No recent employee activities logged yet.</p>
          )}
        </div>
      </div>

      {/* Performance Detail Drawer / Modal */}
      {selectedPerfEmp && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-6 border border-slate-200 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 font-bold flex items-center justify-center">
                  {selectedPerfEmp.fullName.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{selectedPerfEmp.fullName}</h3>
                  <p className="text-xs text-slate-500">Performance & Accountability Audit</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPerfEmp(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-center space-y-1">
                <span className="text-[10px] font-bold text-amber-800 uppercase">Orders Processed</span>
                <div className="text-2xl font-extrabold text-amber-950">
                  {selectedPerfEmp.ordersProcessedCount || 0}
                </div>
              </div>
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-center space-y-1">
                <span className="text-[10px] font-bold text-emerald-800 uppercase">Deliveries Completed</span>
                <div className="text-2xl font-extrabold text-emerald-950">
                  {selectedPerfEmp.deliveriesCompletedCount || 0}
                </div>
              </div>
              <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 text-center space-y-1">
                <span className="text-[10px] font-bold text-rose-800 uppercase">Failed Deliveries</span>
                <div className="text-2xl font-extrabold text-rose-950">
                  {selectedPerfEmp.failedDeliveriesCount || 0}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-xs uppercase text-slate-400 tracking-wider">
                Assigned Operational Roles
              </h4>
              <div className="flex flex-wrap gap-2">
                {selectedPerfEmp.assignedRoles?.map((r) => (
                  <span
                    key={r}
                    className="px-3 py-1 rounded-xl bg-slate-100 text-slate-800 font-bold text-xs border border-slate-200"
                  >
                    {r}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-xs uppercase text-slate-400 tracking-wider">
                Granular System Permissions ({selectedPerfEmp.permissions?.length || 0})
              </h4>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                {selectedPerfEmp.permissions?.map((p) => (
                  <div key={p} className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-100">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="font-medium text-slate-700 truncate">{p}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedPerfEmp(null)}
                className="px-6 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Employee Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-6 border border-slate-200 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="font-serif font-extrabold text-xl text-slate-900">
                {editingEmployee ? "Edit Employee Account" : "Create New Employee Profile"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} className="space-y-6">
              {/* Basic Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Abebe Bikila"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Address (Login)</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. abebe@jjbookstore.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+251 911 000 000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Zone</label>
                  <select
                    value={zone}
                    onChange={(e) => setZone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none"
                  >
                    <option value="Addis Ababa - Central">Addis Ababa - Central</option>
                    <option value="Addis Ababa - Bole">Addis Ababa - Bole / Kirkos</option>
                    <option value="Addis Ababa - Yeka / Arada">Addis Ababa - Yeka / Arada</option>
                    <option value="Addis Ababa - Nifas Silk / Kolfe">Addis Ababa - Nifas Silk / Kolfe</option>
                    <option value="Regional Freight Zone">Regional Freight Zone</option>
                  </select>
                </div>
              </div>

              {/* Operational Roles Checkboxes */}
              <div className="space-y-2">
                <label className="block text-xs font-extrabold uppercase text-amber-800 tracking-wider">
                  1. Assign Operational Roles
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ALL_ROLES.map((r) => {
                    const isChecked = assignedRoles.includes(r.id);
                    return (
                      <div
                        key={r.id}
                        onClick={() => handleToggleRole(r.id)}
                        className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                          isChecked
                            ? "border-amber-500 bg-amber-50/70 shadow-sm"
                            : "border-slate-200 bg-slate-50 hover:bg-white"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
                        />
                        <div>
                          <p className="font-bold text-slate-900 text-xs">{r.label}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">{r.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Granular Permissions Checkboxes */}
              <div className="space-y-2">
                <label className="block text-xs font-extrabold uppercase text-amber-800 tracking-wider">
                  2. Granular Permissions (RBAC)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ALL_PERMISSIONS.map((p) => {
                    const isChecked = permissions.includes(p.id);
                    return (
                      <label
                        key={p.id}
                        className={`p-2.5 rounded-xl border text-xs cursor-pointer flex items-center gap-2 transition-all ${
                          isChecked
                            ? "bg-emerald-50 border-emerald-300 text-emerald-950 font-bold"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-white"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleTogglePermission(p.id)}
                          className="rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="truncate">{p.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Active Account Switch */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <h4 className="font-bold text-xs text-slate-900">Account Status</h4>
                  <p className="text-[11px] text-slate-500">Allow staff login to Employee Workspace</p>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveStatus(!activeStatus)}
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-colors ${
                    activeStatus ? "bg-emerald-600 text-white" : "bg-slate-300 text-slate-700"
                  }`}
                >
                  {activeStatus ? "Active (Enabled)" : "Disabled (Suspended)"}
                </button>
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs shadow-lg shadow-amber-900/20 active:scale-95 transition-all"
                >
                  {editingEmployee ? "Update Employee Profile" : "Save & Activate Employee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
