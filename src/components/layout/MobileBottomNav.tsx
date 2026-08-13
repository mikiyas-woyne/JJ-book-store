import React from "react";
import {
  Home,
  BookOpen,
  Search,
  ShoppingBag,
  Heart,
  User as UserIcon,
  ShieldCheck,
  LayoutDashboard
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { useWishlist } from "../../context/WishlistContext";

interface MobileBottomNavProps {
  activePage: string;
  onNavigate: (page: string, params?: Record<string, string>) => void;
  onOpenSearch: () => void;
  onOpenCart: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activePage,
  onNavigate,
  onOpenSearch,
  onOpenCart,
}) => {
  const { currentUser, isAdmin, isEmployee } = useAuth();
  const { totalItemCount } = useCart();
  const { wishlistIds } = useWishlist();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#16120e]/95 backdrop-blur-xl border-t border-amber-950/80 px-2 py-1.5 shadow-[0_-8px_24px_rgba(0,0,0,0.5)] flex items-center justify-around text-stone-300 active:touch-manipulation select-none">
      {/* Home */}
      <button
        onClick={() => onNavigate("home")}
        className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-200 min-w-[56px] min-h-[48px] active:scale-95 ${
          activePage === "home"
            ? "text-amber-400 font-extrabold"
            : "text-stone-400 hover:text-stone-200"
        }`}
      >
        <Home className={`w-5 h-5 ${activePage === "home" ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
        <span className="text-[10px] tracking-tight mt-0.5 font-bold">Home</span>
      </button>

      {/* Shop Books */}
      <button
        onClick={() => onNavigate("shop")}
        className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-200 min-w-[56px] min-h-[48px] active:scale-95 ${
          activePage === "shop"
            ? "text-amber-400 font-extrabold"
            : "text-stone-400 hover:text-stone-200"
        }`}
      >
        <BookOpen className={`w-5 h-5 ${activePage === "shop" ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
        <span className="text-[10px] tracking-tight mt-0.5 font-bold">Shop</span>
      </button>

      {/* Quick Search */}
      <button
        onClick={onOpenSearch}
        className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-stone-400 hover:text-stone-200 transition-all duration-200 min-w-[56px] min-h-[48px] active:scale-95"
      >
        <Search className="w-5 h-5 stroke-[1.8]" />
        <span className="text-[10px] tracking-tight mt-0.5 font-bold">Search</span>
      </button>

      {/* Cart (with Badge) */}
      <button
        onClick={onOpenCart}
        className="relative flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-stone-400 hover:text-amber-400 transition-all duration-200 min-w-[56px] min-h-[48px] active:scale-95"
      >
        <div className="relative">
          <ShoppingBag className="w-5 h-5 stroke-[1.8]" />
          {totalItemCount > 0 && (
            <span className="absolute -top-1.5 -right-2 bg-amber-500 text-stone-950 text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-amber-950 shadow-md">
              {totalItemCount > 9 ? "9+" : totalItemCount}
            </span>
          )}
        </div>
        <span className="text-[10px] tracking-tight mt-0.5 font-bold">Cart</span>
      </button>

      {/* Wishlist */}
      <button
        onClick={() => onNavigate("account", { tab: "wishlist" })}
        className={`relative flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-200 min-w-[56px] min-h-[48px] active:scale-95 ${
          activePage === "account"
            ? "text-amber-400 font-extrabold"
            : "text-stone-400 hover:text-stone-200"
        }`}
      >
        <div className="relative">
          <Heart className={`w-5 h-5 ${wishlistIds.length > 0 ? "fill-rose-500 text-rose-500" : "stroke-[1.8]"}`} />
          {wishlistIds.length > 0 && (
            <span className="absolute -top-1.5 -right-2 bg-rose-600 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-md">
              {wishlistIds.length}
            </span>
          )}
        </div>
        <span className="text-[10px] tracking-tight mt-0.5 font-bold">Wishlist</span>
      </button>

      {/* Account / Staff / Admin */}
      <button
        onClick={() => {
          if (isAdmin) {
            onNavigate("admin");
          } else if (isEmployee) {
            onNavigate("employee");
          } else if (currentUser) {
            onNavigate("account");
          } else {
            onNavigate("auth");
          }
        }}
        className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-200 min-w-[56px] min-h-[48px] active:scale-95 ${
          activePage === "account" || activePage === "admin" || activePage === "employee"
            ? "text-amber-400 font-extrabold"
            : "text-stone-400 hover:text-stone-200"
        }`}
      >
        {isAdmin ? (
          <LayoutDashboard className="w-5 h-5 text-amber-400" />
        ) : isEmployee ? (
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
        ) : (
          <UserIcon className="w-5 h-5 stroke-[1.8]" />
        )}
        <span className="text-[10px] tracking-tight mt-0.5 font-bold">
          {isAdmin ? "Admin" : isEmployee ? "Staff" : currentUser ? "Account" : "Sign In"}
        </span>
      </button>
    </nav>
  );
};
