import React, { useState } from "react";
import {
  BookOpen,
  Search,
  ShoppingBag,
  Heart,
  User as UserIcon,
  ShieldAlert,
  Menu,
  X,
  LogOut,
  Sparkles,
  LayoutDashboard
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { useWishlist } from "../../context/WishlistContext";

interface HeaderProps {
  onOpenSearch: () => void;
  onOpenCart: () => void;
  onNavigate: (page: string, params?: Record<string, string>) => void;
  activePage: string;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSearch,
  onOpenCart,
  onNavigate,
  activePage
}) => {
  const { currentUser, userProfile, isAdmin, isEmployee, logoutUser } = useAuth();
  const { totalItemCount } = useCart();
  const { wishlistIds } = useWishlist();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-[#16120e] text-stone-100 shadow-xl border-b border-amber-950/60 backdrop-blur-md">
      {/* Top Banner Ticker */}
      <div className="bg-gradient-to-r from-stone-950 via-[#271d15] to-stone-950 text-stone-300 text-xs py-2 px-4 border-b border-amber-900/30">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-4">
          <p className="flex items-center gap-2 mx-auto sm:mx-0 font-medium tracking-wide">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse shrink-0" />
            <span>Fast Express Delivery in Addis Ababa & Regions • Use promo code <strong className="text-amber-400 underline font-semibold tracking-wider">WELCOME15</strong> for 15% Off!</span>
          </p>
          <div className="hidden sm:flex items-center gap-5 text-amber-300/90 text-[11px] font-semibold tracking-wider uppercase">
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>ETB (የኢትዮጵያ ብር)</span>
            <span className="text-amber-200/40">|</span>
            <span>Support: +251 938 014 055</span>
          </div>
        </div>
      </div>

      {/* Main Header Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        {/* Logo */}
        <button
          onClick={() => {
            onNavigate("home");
            setMobileMenuOpen(false);
          }}
          className="flex items-center gap-3.5 text-left group"
        >
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-stone-950 flex items-center justify-center font-bold shadow-lg shadow-amber-950/60 group-hover:from-amber-300 group-hover:to-amber-500 transition-all duration-300 transform group-hover:scale-105">
            <BookOpen className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <span className="font-serif font-extrabold text-xl sm:text-2xl tracking-tight text-white block leading-none">
              JJ Book<span className="text-amber-400 font-serif italic font-normal ml-1">Shopping</span>
            </span>
            <span className="text-[10px] tracking-[0.2em] uppercase text-amber-300/70 font-semibold block mt-1">
              Ethiopia's Premier Literary House
            </span>
          </div>
        </button>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1.5 font-medium text-sm text-stone-300">
          <button
            onClick={() => onNavigate("home")}
            className={`px-4 py-2 rounded-xl transition-all duration-200 ${
              activePage === "home"
                ? "bg-amber-900/40 text-amber-300 font-semibold border border-amber-700/40 shadow-inner"
                : "hover:bg-amber-950/50 hover:text-white"
            }`}
          >
            Home
          </button>
          <button
            onClick={() => onNavigate("shop")}
            className={`px-4 py-2 rounded-xl transition-all duration-200 ${
              activePage === "shop"
                ? "bg-amber-900/40 text-amber-300 font-semibold border border-amber-700/40 shadow-inner"
                : "hover:bg-amber-950/50 hover:text-white"
            }`}
          >
            Shop Books
          </button>
          <button
            onClick={() => onNavigate("categories")}
            className={`px-4 py-2 rounded-xl transition-all duration-200 ${
              activePage === "categories"
                ? "bg-amber-900/40 text-amber-300 font-semibold border border-amber-700/40 shadow-inner"
                : "hover:bg-amber-950/50 hover:text-white"
            }`}
          >
            Categories
          </button>
          <button
            onClick={() => onNavigate("authors")}
            className={`px-4 py-2 rounded-xl transition-all duration-200 ${
              activePage === "authors"
                ? "bg-amber-900/40 text-amber-300 font-semibold border border-amber-700/40 shadow-inner"
                : "hover:bg-amber-950/50 hover:text-white"
            }`}
          >
            Authors
          </button>
        </nav>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Search trigger */}
          <button
            onClick={onOpenSearch}
            className="p-2.5 rounded-xl bg-stone-900/80 hover:bg-stone-800 text-stone-200 transition-all flex items-center gap-2 border border-stone-800 hover:border-amber-700/40 shadow-sm"
            title="Search catalog..."
          >
            <Search className="w-4 h-4 text-amber-400" />
            <span className="hidden lg:inline text-xs font-medium text-stone-300">Search books...</span>
          </button>

          {/* Wishlist Button */}
          <button
            onClick={() => onNavigate("account", { tab: "wishlist" })}
            className="relative p-2.5 rounded-xl bg-stone-900/80 hover:bg-stone-800 text-stone-200 transition-all border border-stone-800 hover:border-amber-700/40 shadow-sm"
            title="Wishlist"
          >
            <Heart className="w-4 h-4 text-amber-400" />
            {wishlistIds.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-md">
                {wishlistIds.length}
              </span>
            )}
          </button>

          {/* Cart Button */}
          <button
            onClick={onOpenCart}
            className="relative px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-stone-950 font-bold transition-all duration-200 flex items-center gap-2 shadow-lg shadow-amber-950/60 transform hover:-translate-y-0.5 active:translate-y-0"
            title="Shopping Cart"
          >
            <ShoppingBag className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden sm:inline text-xs font-extrabold uppercase tracking-wider">Cart</span>
            {totalItemCount > 0 && (
              <span className="bg-stone-950 text-amber-300 text-[11px] font-extrabold px-2 py-0.5 rounded-full border border-amber-400/40">
                {totalItemCount}
              </span>
            )}
          </button>

          {/* Account / Admin Menu */}
          <div className="relative">
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="p-2.5 rounded-xl bg-amber-900/60 hover:bg-amber-800/80 text-amber-100 transition-colors flex items-center gap-2 border border-amber-800/40"
            >
              <UserIcon className="w-5 h-5 text-amber-300" />
              {currentUser && (
                <span className="hidden sm:inline text-xs font-semibold max-w-[100px] truncate">
                  {userProfile?.fullName || currentUser.email?.split("@")[0]}
                </span>
              )}
            </button>

            {/* Dropdown Menu */}
            {userDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-amber-950 border border-amber-800/80 rounded-2xl shadow-2xl py-2 z-50 text-amber-100 text-sm animate-in fade-in slide-in-from-top-2">
                {currentUser ? (
                  <>
                    <div className="px-4 py-3 border-b border-amber-900/60">
                      <p className="font-bold text-white truncate">{userProfile?.fullName || "User Account"}</p>
                      <p className="text-xs text-amber-300/80 truncate">{currentUser.email}</p>
                      <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-900 text-amber-300 text-[10px] font-semibold uppercase tracking-wider">
                        Role: {userProfile?.role || "customer"}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        onNavigate("account");
                        setUserDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-amber-900/60 flex items-center gap-2"
                    >
                      <UserIcon className="w-4 h-4 text-amber-400" />
                      <span>My Account & Orders</span>
                    </button>

                    {(isEmployee || isAdmin) && (
                      <button
                        onClick={() => {
                          onNavigate("employee");
                          setUserDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-amber-900/60 flex items-center gap-2 text-emerald-300 font-semibold"
                      >
                        <BookOpen className="w-4 h-4 text-emerald-400" />
                        <span>Employee Panel</span>
                      </button>
                    )}

                    {isAdmin && (
                      <button
                        onClick={() => {
                          onNavigate("admin");
                          setUserDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-amber-900/60 flex items-center gap-2 text-amber-300 font-semibold"
                      >
                        <LayoutDashboard className="w-4 h-4 text-amber-400" />
                        <span>Admin Dashboard</span>
                      </button>
                    )}

                    <div className="border-t border-amber-900/60 my-1"></div>

                    <button
                      onClick={() => {
                        logoutUser();
                        setUserDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-rose-950/60 text-rose-300 flex items-center gap-2 mt-1"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Log Out</span>
                    </button>
                  </>
                ) : (
                  <>
                    <div className="px-4 py-3 border-b border-amber-900/60">
                      <p className="font-bold text-white">Welcome to JJ Bookstore</p>
                      <p className="text-xs text-amber-300/80">Sign in to track orders & wishlists</p>
                    </div>

                    <button
                      onClick={() => {
                        onNavigate("auth");
                        setUserDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-amber-900/60 flex items-center gap-2 font-medium"
                    >
                      <UserIcon className="w-4 h-4 text-amber-400" />
                      <span>Sign In / Register</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2.5 rounded-xl bg-amber-900/60 text-amber-200 border border-amber-800/40"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-amber-950 border-t border-amber-900/60 px-4 py-4 space-y-2 animate-in slide-in-from-top-2">
          <button
            onClick={() => {
              onNavigate("home");
              setMobileMenuOpen(false);
            }}
            className={`w-full text-left px-4 py-3 rounded-xl font-medium ${
              activePage === "home" ? "bg-amber-800 text-amber-200" : "text-amber-100 hover:bg-amber-900/50"
            }`}
          >
            Home
          </button>
          <button
            onClick={() => {
              onNavigate("shop");
              setMobileMenuOpen(false);
            }}
            className={`w-full text-left px-4 py-3 rounded-xl font-medium ${
              activePage === "shop" ? "bg-amber-800 text-amber-200" : "text-amber-100 hover:bg-amber-900/50"
            }`}
          >
            Shop Books
          </button>
          <button
            onClick={() => {
              onNavigate("categories");
              setMobileMenuOpen(false);
            }}
            className={`w-full text-left px-4 py-3 rounded-xl font-medium ${
              activePage === "categories" ? "bg-amber-800 text-amber-200" : "text-amber-100 hover:bg-amber-900/50"
            }`}
          >
            Categories
          </button>
          <button
            onClick={() => {
              onNavigate("authors");
              setMobileMenuOpen(false);
            }}
            className={`w-full text-left px-4 py-3 rounded-xl font-medium ${
              activePage === "authors" ? "bg-amber-800 text-amber-200" : "text-amber-100 hover:bg-amber-900/50"
            }`}
          >
            Authors
          </button>
          {isAdmin && (
            <button
              onClick={() => {
                onNavigate("admin");
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-4 py-3 rounded-xl font-bold bg-amber-500 text-amber-950 flex items-center gap-2"
            >
              <LayoutDashboard className="w-5 h-5" />
              <span>Admin Management Dashboard</span>
            </button>
          )}
        </div>
      )}
    </header>
  );
};
