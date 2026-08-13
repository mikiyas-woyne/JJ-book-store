import React, { useState, useEffect } from "react";
import html2canvas from "html2canvas";
import {
  User as UserIcon,
  ShoppingBag,
  Heart,
  MapPin,
  Clock,
  CheckCircle2,
  Package,
  Truck,
  Camera,
  ChevronDown,
  ChevronUp,
  XCircle,
  Plus
} from "lucide-react";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../context/AuthContext";
import { useWishlist } from "../../context/WishlistContext";
import { useCart } from "../../context/CartContext";
import { Book, Order, OrderStatus } from "../../types";
import { useToast } from "../ui/Toast";

interface UserAccountViewProps {
  initialTab?: string;
  books: Book[];
  onSelectBook: (book: Book) => void;
  onNavigate: (page: string) => void;
}

export const UserAccountView: React.FC<UserAccountViewProps> = ({
  initialTab = "orders",
  books,
  onSelectBook,
  onNavigate
}) => {
  const { currentUser, userProfile, updateUserProfile } = useAuth();
  const { wishlistIds, toggleWishlist } = useWishlist();
  const { addToCart } = useCart();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<"orders" | "profile" | "wishlist" | "addresses">(
    (initialTab as any) || "orders"
  );

  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [downloadingOrderId, setDownloadingOrderId] = useState<string | null>(null);

  const handleDownloadOrderScreenshot = async (order: Order) => {
    const el = document.getElementById(`order-receipt-${order.id}`);
    if (!el) return;
    setDownloadingOrderId(order.id);
    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false
      });
      const imageUri = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = imageUri;
      link.download = `JJ-Bookstore-Receipt-${order.orderId}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast("Screenshot Saved", "Receipt image downloaded successfully.", "success");
    } catch (err) {
      console.error("Screenshot download error:", err);
      showToast("Download Failed", "Could not capture receipt screenshot.", "error");
    } finally {
      setDownloadingOrderId(null);
    }
  };

  // Profile Edit
  const [fullName, setFullName] = useState(userProfile?.fullName || "");
  const [phone, setPhone] = useState(userProfile?.phone || "+251 ");
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setFullName(userProfile.fullName);
      setPhone(userProfile.phone || "+251 ");
    }
  }, [userProfile]);

  // Fetch Orders
  useEffect(() => {
    const fetchUserOrders = async () => {
      setLoadingOrders(true);
      try {
        const q = currentUser?.uid
          ? query(collection(db, "orders"), where("customerId", "==", currentUser.uid))
          : query(collection(db, "orders"));

        const snap = await getDocs(q);
        const list: Order[] = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as Order);
        });

        // Sort by newest
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setOrders(list);
      } catch (err) {
        console.error("Error fetching user orders:", err);
      } finally {
        setLoadingOrders(false);
      }
    };

    fetchUserOrders();
  }, [currentUser]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateUserProfile({ fullName, phone });
      showToast("Profile Updated", "Your contact details have been saved.", "success");
    } catch (err) {
      showToast("Update Error", "Could not save profile changes.", "error");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm("Are you sure you want to cancel this pending order?")) return;

    try {
      await updateDoc(doc(db, "orders", orderId), {
        orderStatus: "cancelled",
        updatedAt: new Date().toISOString()
      });

      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, orderStatus: "cancelled" } : o))
      );
      showToast("Order Cancelled", "Order has been marked as cancelled.", "info");
    } catch (err) {
      showToast("Cancellation Failed", "Could not cancel order.", "error");
    }
  };

  const wishlistBooks = books.filter((b) => wishlistIds.includes(b.id));

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case "pending":
        return <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-bold text-xs">Pending</span>;
      case "confirmed":
        return <span className="px-2.5 py-1 rounded-full bg-sky-100 text-sky-800 font-bold text-xs">Confirmed</span>;
      case "processing":
        return <span className="px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 font-bold text-xs">Processing</span>;
      case "packed":
      case "ready_for_delivery":
        return <span className="px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800 font-bold text-xs">Ready for Dispatch</span>;
      case "assigned":
      case "handed_to_delivery":
      case "out_for_delivery":
        return <span className="px-2.5 py-1 rounded-full bg-amber-200 text-amber-950 font-bold text-xs animate-pulse">Out for Delivery</span>;
      case "delivered":
        return <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs">Delivered</span>;
      case "delivery_failed":
        return <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 font-bold text-xs">Delivery Issue</span>;
      case "returned_to_store":
        return <span className="px-2.5 py-1 rounded-full bg-slate-200 text-slate-800 font-bold text-xs">Returned</span>;
      case "cancelled":
        return <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 font-bold text-xs">Cancelled</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-bold text-xs">{status}</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* User Dashboard Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-amber-950 text-amber-50 shadow-xl border border-amber-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500 text-amber-950 font-bold text-xl flex items-center justify-center shadow-lg">
            {userProfile?.fullName?.charAt(0) || "U"}
          </div>
          <div>
            <h2 className="font-serif font-extrabold text-2xl text-white">
              {userProfile?.fullName || "JJ Bookstore Customer"}
            </h2>
            <p className="text-xs text-amber-300/80">{currentUser?.email || "Guest Customer"}</p>
            <div className="mt-1 flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-900 text-amber-300 text-[10px] font-bold uppercase">
                {userProfile?.role || "Customer"} Account
              </span>
              <span className="text-xs text-amber-200/60">• Member since 2026</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => onNavigate("shop")}
          className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold text-xs shadow-md"
        >
          Browse Book Catalog
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-8 text-sm font-bold">
        <button
          onClick={() => setActiveTab("orders")}
          className={`pb-3 transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === "orders" ? "border-amber-600 text-amber-800" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Package className="w-4 h-4" />
          <span>My Orders & Order Tracker</span>
        </button>

        <button
          onClick={() => setActiveTab("wishlist")}
          className={`pb-3 transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === "wishlist" ? "border-amber-600 text-amber-800" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Heart className="w-4 h-4" />
          <span>Saved Wishlist ({wishlistIds.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("profile")}
          className={`pb-3 transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === "profile" ? "border-amber-600 text-amber-800" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <UserIcon className="w-4 h-4" />
          <span>Account Settings</span>
        </button>
      </div>

      {/* Tab 1: Orders History & Timeline */}
      {activeTab === "orders" && (
        <div className="space-y-6">
          <h3 className="font-serif font-bold text-slate-900 text-lg">Order History & Real-Time Tracking</h3>

          {loadingOrders ? (
            <div className="text-center py-12 text-slate-400 text-xs">Loading order records...</div>
          ) : orders.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-200 space-y-3">
              <ShoppingBag className="w-12 h-12 text-amber-600 mx-auto" />
              <h4 className="font-serif font-bold text-slate-800 text-base">No Orders Placed Yet</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Once you place an order, you will be able to track delivery drivers, view printable receipts, and review books here.
              </p>
              <button
                onClick={() => onNavigate("shop")}
                className="px-5 py-2.5 rounded-xl bg-amber-950 text-amber-100 font-bold text-xs hover:bg-amber-900 inline-block"
              >
                Start Shopping Now
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((ord) => {
                const isExpanded = expandedOrderId === ord.id;
                return (
                  <div
                    key={ord.id}
                    className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4"
                  >
                    {/* Order Header Summary */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                      <div>
                        <div className="flex items-center gap-3">
                          <strong className="font-serif font-extrabold text-slate-900 text-base">
                            Order {ord.orderId}
                          </strong>
                          {getStatusBadge(ord.orderStatus)}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Placed on {new Date(ord.createdAt).toLocaleDateString()} • {ord.items.length} items
                        </p>
                      </div>

                      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                        <span className="font-extrabold text-slate-900 text-base">
                          {ord.grandTotal} ETB
                        </span>
                        <button
                          onClick={() => setExpandedOrderId(isExpanded ? null : ord.id)}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1"
                        >
                          <span>{isExpanded ? "Hide Details" : "Track & Details"}</span>
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Expandable Tracking Timeline & Items */}
                    {isExpanded && (
                      <div className="space-y-6 pt-2 animate-in fade-in">
                        {/* Status Timeline */}
                        <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-900/10 space-y-3">
                          <h5 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-amber-700" /> Real-time Delivery Status Tracker
                          </h5>
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-[11px] font-semibold">
                            <div className={`p-2 rounded-xl border ${ord.orderStatus !== "cancelled" ? "bg-amber-500 text-amber-950 font-bold border-amber-600" : "bg-slate-100 text-slate-400"}`}>
                              1. Order Placed
                            </div>
                            <div className={`p-2 rounded-xl border ${["confirmed", "processing", "shipped", "out_for_delivery", "delivered"].includes(ord.orderStatus) ? "bg-amber-500 text-amber-950 font-bold border-amber-600" : "bg-slate-100 text-slate-400"}`}>
                              2. Confirmed
                            </div>
                            <div className={`p-2 rounded-xl border ${["processing", "shipped", "out_for_delivery", "delivered"].includes(ord.orderStatus) ? "bg-amber-500 text-amber-950 font-bold border-amber-600" : "bg-slate-100 text-slate-400"}`}>
                              3. Processing
                            </div>
                            <div className={`p-2 rounded-xl border ${["shipped", "out_for_delivery", "delivered"].includes(ord.orderStatus) ? "bg-amber-500 text-amber-950 font-bold border-amber-600" : "bg-slate-100 text-slate-400"}`}>
                              4. Out for Delivery
                            </div>
                            <div className={`p-2 rounded-xl border ${ord.orderStatus === "delivered" ? "bg-emerald-600 text-white font-bold border-emerald-700" : "bg-slate-100 text-slate-400"}`}>
                              5. Delivered
                            </div>
                          </div>
                        </div>

                        {/* Official Receipt Card for Screenshot */}
                        <div
                          id={`order-receipt-${ord.id}`}
                          className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3 text-xs"
                        >
                          <div className="border-b border-slate-100 pb-2.5 flex items-center justify-between">
                            <div>
                              <strong className="font-serif font-extrabold text-sm text-slate-900 block">
                                JJ BOOKSTORE SALES RECEIPT
                              </strong>
                              <span className="text-[10px] text-slate-400">Order Ref: {ord.orderId}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-[11px] text-slate-500 font-semibold block">
                                Date: {new Date(ord.createdAt).toLocaleDateString()}
                              </span>
                              <span className="text-[10px] text-emerald-700 font-bold uppercase">
                                {ord.paymentStatus}
                              </span>
                            </div>
                          </div>

                          {/* Items Purchased List */}
                          <div className="space-y-1.5">
                            <h5 className="font-bold text-slate-900 text-xs">Ordered Items:</h5>
                            <div className="space-y-2">
                              {ord.items.map((item) => (
                                <div key={item.bookId} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 text-xs border border-slate-100">
                                  <div className="flex items-center gap-3">
                                    <img src={item.coverImage} alt={item.title} className="w-9 h-11 object-cover rounded-lg" />
                                    <div>
                                      <strong className="block text-slate-900">{item.title}</strong>
                                      <span className="text-slate-500">by {item.authorName} • Qty: {item.quantity}</span>
                                    </div>
                                  </div>
                                  <strong className="text-slate-900">{item.total} ETB</strong>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Totals Summary */}
                          <div className="pt-2 border-t border-slate-100 flex justify-between font-extrabold text-slate-900 text-sm">
                            <span>Grand Total:</span>
                            <span className="text-amber-800">{ord.grandTotal} ETB</span>
                          </div>
                        </div>

                        {/* Order Footer Actions */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
                          <p className="text-slate-500">
                            Payment: <strong className="text-slate-800 uppercase">{ord.paymentMethod}</strong> ({ord.paymentStatus})
                          </p>

                          <div className="flex items-center gap-2">
                            {ord.orderStatus === "pending" && (
                              <button
                                onClick={() => handleCancelOrder(ord.id)}
                                className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs"
                              >
                                Cancel Order
                              </button>
                            )}
                            <button
                              onClick={() => handleDownloadOrderScreenshot(ord)}
                              disabled={downloadingOrderId === ord.id}
                              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
                            >
                              {downloadingOrderId === ord.id ? (
                                <>
                                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  <span>Capturing...</span>
                                </>
                              ) : (
                                <>
                                  <Camera className="w-3.5 h-3.5 text-amber-400" />
                                  <span>Download Screenshot</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Saved Wishlist */}
      {activeTab === "wishlist" && (
        <div className="space-y-6">
          <h3 className="font-serif font-bold text-slate-900 text-lg">My Saved Wishlist Books</h3>

          {wishlistBooks.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-200 space-y-3">
              <Heart className="w-12 h-12 text-rose-500 mx-auto" />
              <h4 className="font-serif font-bold text-slate-800 text-base">Wishlist is Empty</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Save books while browsing to keep track of titles you wish to read later.
              </p>
              <button
                onClick={() => onNavigate("shop")}
                className="px-5 py-2.5 rounded-xl bg-amber-950 text-amber-100 font-bold text-xs hover:bg-amber-900 inline-block"
              >
                Browse Books
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {wishlistBooks.map((bk) => (
                <div key={bk.id} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-4">
                  <img src={bk.coverImage} alt={bk.title} className="w-16 h-20 object-cover rounded-xl shrink-0" />
                  <div className="flex-1 min-w-0 space-y-1">
                    <h4 className="font-serif font-bold text-slate-900 text-xs truncate">{bk.title}</h4>
                    <p className="text-[11px] text-slate-500">{bk.authorName}</p>
                    <p className="font-extrabold text-slate-900 text-xs">{bk.discountPrice || bk.price} ETB</p>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => {
                          addToCart(bk, 1);
                          showToast("Moved to Cart", `Added "${bk.title}" to cart.`, "success");
                        }}
                        className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold text-[11px]"
                      >
                        Add to Cart
                      </button>
                      <button
                        onClick={() => toggleWishlist(bk.id)}
                        className="text-slate-400 hover:text-rose-600 text-[11px] font-semibold"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Account Profile Settings */}
      {activeTab === "profile" && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm max-w-2xl space-y-6">
          <h3 className="font-serif font-bold text-slate-900 text-lg">Update Profile Settings</h3>

          <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 text-sm"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Email Address (Read-only)</label>
              <input
                type="email"
                value={currentUser?.email || ""}
                disabled
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 text-sm"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Phone Number (Ethiopian format)</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+251 938 014 055"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold text-xs shadow-md"
            >
              {savingProfile ? "Saving..." : "Save Profile Details"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
