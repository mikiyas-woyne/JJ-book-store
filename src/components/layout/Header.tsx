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
  onOpenAbout?: () => void;
  onOpenContact?: () => void;
  activePage: string;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSearch,
  onOpenCart,
  onNavigate,
  onOpenAbout,
  onOpenContact,
  activePage
}) => {
  const { currentUser, userProfile, isAdmin, isEmployee, logoutUser } = useAuth();
  const { totalItemCount } = useCart();
  const { wishlistIds } = useWishlist();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 text-slate-800 shadow-sm border-b border-indigo-100 backdrop-blur-md">
      {/* Top Banner Ticker */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-600 text-indigo-50 text-xs py-2 px-4 border-b border-indigo-500/30">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-4">
          <p className="flex items-center gap-2 mx-auto sm:mx-0 font-medium tracking-wide">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse shrink-0" />
            <span>Fast Express Delivery in Addis Ababa & Regions • Use promo code <strong className="text-amber-200 underline font-semibold tracking-wider">WELCOME15</strong> for 15% Off!</span>
          </p>
          <div className="hidden sm:flex items-center gap-5 text-indigo-100 text-[11px] font-semibold tracking-wider uppercase">
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>ETB (የኢትዮጵያ ብር)</span>
            <span className="text-indigo-200/50">|</span>
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
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white flex items-center justify-center font-bold shadow-lg shadow-indigo-200 group-hover:from-indigo-500 group-hover:to-violet-500 transition-all duration-300 transform group-hover:scale-105">
            <BookOpen className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <span className="font-serif font-extrabold text-xl sm:text-2xl tracking-tight text-slate-900 block leading-none">
              JJ Book<span className="text-indigo-600 font-serif italic font-normal ml-1">Shopping</span>
            </span>
            <span className="text-[10px] tracking-[0.2em] uppercase text-slate-400 font-semibold block mt-1">
              Ethiopia's Premier Literary House
            </span>
          </div>
        </button>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1.5 font-medium text-sm text-slate-600">
          <button
            onClick={() => onNavigate("home")}
            className={`px-4 py-2 rounded-xl transition-all duration-200 ${
              activePage === "home"
                ? "bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100 shadow-inner"
                : "hover:bg-indigo-50 hover:text-indigo-700"
            }`}
          >
            Home
          </button>
          <button
            onClick={() => onNavigate("shop")}
            className={`px-4 py-2 rounded-xl transition-all duration-200 ${
              activePage === "shop"
                ? "bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100 shadow-inner"
                : "hover:bg-indigo-50 hover:text-indigo-700"
            }`}
          >
            Shop Books
          </button>
          <button
            onClick={() => onNavigate("categories")}
            className={`px-4 py-2 rounded-xl transition-all duration-200 ${
              activePage === "categories"
                ? "bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100 shadow-inner"
                : "hover:bg-indigo-50 hover:text-indigo-700"
            }`}
          >
            Categories
          </button>
          <button
            onClick={() => onNavigate("authors")}
            className={`px-4 py-2 rounded-xl transition-all duration-200 ${
              activePage === "authors"
                ? "bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100 shadow-inner"
                : "hover:bg-indigo-50 hover:text-indigo-700"
            }`}
          >
            Authors
          </button>
          {onOpenAbout && (
            <button
              onClick={onOpenAbout}
              className="px-3.5 py-2 rounded-xl hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 transition-all duration-200"
            >
              About
            </button>
          )}
          {onOpenContact && (
            <button
              onClick={onOpenContact}
              className="px-3.5 py-2 rounded-xl hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 transition-all duration-200"
            >
              Contact
            </button>
          )}
        </nav>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Search trigger */}
          <button
            onClick={onOpenSearch}
            className="p-2.5 rounded-xl bg-white hover:bg-indigo-50 text-slate-700 transition-all flex items-center gap-2 border border-slate-200 hover:border-indigo-200 shadow-sm"
            title="Search catalog..."
          >
            <Search className="w-4 h-4 text-indigo-600" />
            <span className="hidden lg:inline text-xs font-medium text-slate-600">Search books...</span>
          </button>

          {/* Wishlist Button */}
          <button
            onClick={() => onNavigate("account", { tab: "wishlist" })}
            className="relative p-2.5 rounded-xl bg-white hover:bg-rose-50 text-slate-700 transition-all border border-slate-200 hover:border-rose-200 shadow-sm"
            title="Wishlist"
          >
            <Heart className="w-4 h-4 text-rose-500" />
            {wishlistIds.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-md">
                {wishlistIds.length}
              </span>
            )}
          </button>

          {/* Cart Button */}
          <button
            onClick={onOpenCart}
            className="relative px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold transition-all duration-200 flex items-center gap-2 shadow-lg shadow-indigo-200 transform hover:-translate-y-0.5 active:translate-y-0"
            title="Shopping Cart"
          >
            <ShoppingBag className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden sm:inline text-xs font-extrabold uppercase tracking-wider">Cart</span>
            {totalItemCount > 0 && (
              <span className="bg-white text-indigo-700 text-[11px] font-extrabold px-2 py-0.5 rounded-full border border-indigo-100">
                {totalItemCount}
              </span>
            )}
          </button>

          {/* Account / Admin Menu */}
          <div className="relative">
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors flex items-center gap-2 border border-indigo-100"
            >
              {userProfile?.photoURL || currentUser?.photoURL ? (
                <img
                  src={userProfile?.photoURL || currentUser?.photoURL || ""}
                  alt={userProfile?.fullName || "Google User Profile"}
                  className="w-6 h-6 rounded-full object-cover border border-amber-400/60 shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <UserIcon className="w-5 h-5 text-indigo-600" />
              )}
              {currentUser && (
                <span className="hidden sm:inline text-xs font-semibold max-w-[100px] truncate">
                  {userProfile?.fullName || currentUser.displayName || currentUser.email?.split("@")[0]}
                </span>
              )}
            </button>

            {/* Dropdown Menu */}
            {userDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-indigo-100 rounded-2xl shadow-2xl py-2 z-50 text-slate-700 text-sm animate-in fade-in slide-in-from-top-2">
                {currentUser ? (
                  <>
                    <div className="px-4 py-3 border-b border-amber-900/60 flex items-center gap-3">
                      {userProfile?.photoURL || currentUser?.photoURL ? (
                        <img
                          src={userProfile?.photoURL || currentUser?.photoURL || ""}
                          alt="Google Profile"
                          className="w-10 h-10 rounded-full object-cover border-2 border-amber-400 shrink-0 shadow-md"
                          referrerPolicy="no-referrer"
                        />
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-white truncate">{userProfile?.fullName || currentUser.displayName || "User Account"}</p>
                        <p className="text-xs text-amber-300/80 truncate">{currentUser.email}</p>
                        <div className="mt-1 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-900 text-amber-300 text-[10px] font-semibold uppercase tracking-wider">
                          Role: {userProfile?.role || "customer"}
                        </div>
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
          {onOpenAbout && (
            <button
              onClick={() => {
                onOpenAbout();
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-4 py-3 rounded-xl font-medium text-amber-100 hover:bg-amber-900/50"
            >
              About JJ Bookstore
            </button>
          )}
          {onOpenContact && (
            <button
              onClick={() => {
                onOpenContact();
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-4 py-3 rounded-xl font-medium text-amber-100 hover:bg-amber-900/50"
            >
              Contact & Support
            </button>
          )}
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
