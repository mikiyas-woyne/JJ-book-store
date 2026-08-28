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
  LayoutDashboard,
  ShieldCheck,
  Sparkles
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
    <header className="sticky top-0 z-40 bg-white/95 text-slate-800 shadow-sm border-b border-slate-200/80 backdrop-blur-md">
      {/* Top Banner Ticker */}
      <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-orange-500 text-white text-xs py-2 px-4 shadow-sm">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-4">
          <p className="flex items-center gap-2 mx-auto sm:mx-0 font-medium tracking-wide">
            <Sparkles className="w-3.5 h-3.5 text-yellow-200" />
            <span>Fast Express Delivery in Addis Ababa & Regions • Use code <strong className="bg-white/20 text-white px-2 py-0.5 rounded font-bold tracking-wider">WELCOME15</strong> for 15% Off!</span>
          </p>
          <div className="hidden sm:flex items-center gap-4 text-white/90 text-[11px] font-semibold tracking-wider uppercase">
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse"></span>ETB (የኢትዮጵያ ብር)</span>
            <span className="text-white/40">|</span>
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
          className="flex items-center gap-3 text-left group cursor-pointer"
        >
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 via-amber-400 to-orange-500 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-amber-200 group-hover:scale-105 transition-all duration-300">
            <BookOpen className="w-6 h-6 stroke-[2.2] text-white" />
          </div>
          <div>
            <span className="font-serif font-extrabold text-xl sm:text-2xl tracking-tight text-slate-900 block leading-none">
              JJ Book<span className="text-amber-600 font-serif italic font-normal ml-1">Shopping</span>
            </span>
            <span className="text-[10px] tracking-[0.18em] uppercase text-slate-500 font-bold block mt-1">
              Ethiopia's Premier Bookstore
            </span>
          </div>
        </button>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 font-medium text-sm text-slate-600">
          <button
            onClick={() => onNavigate("home")}
            className={`px-4 py-2 rounded-xl transition-all duration-200 cursor-pointer ${
              activePage === "home"
                ? "bg-amber-50 text-amber-800 font-bold border border-amber-200/70 shadow-sm"
                : "hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            Home
          </button>
          <button
            onClick={() => onNavigate("shop")}
            className={`px-4 py-2 rounded-xl transition-all duration-200 cursor-pointer ${
              activePage === "shop"
                ? "bg-amber-50 text-amber-800 font-bold border border-amber-200/70 shadow-sm"
                : "hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            Shop Books
          </button>
          <button
            onClick={() => onNavigate("categories")}
            className={`px-4 py-2 rounded-xl transition-all duration-200 cursor-pointer ${
              activePage === "categories"
                ? "bg-amber-50 text-amber-800 font-bold border border-amber-200/70 shadow-sm"
                : "hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            Categories
          </button>
          <button
            onClick={() => onNavigate("authors")}
            className={`px-4 py-2 rounded-xl transition-all duration-200 cursor-pointer ${
              activePage === "authors"
                ? "bg-amber-50 text-amber-800 font-bold border border-amber-200/70 shadow-sm"
                : "hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            Authors
          </button>
          {onOpenAbout && (
            <button
              onClick={onOpenAbout}
              className="px-3.5 py-2 rounded-xl hover:bg-slate-100 hover:text-slate-900 text-slate-600 transition-all duration-200 cursor-pointer"
            >
              About
            </button>
          )}
          {onOpenContact && (
            <button
              onClick={onOpenContact}
              className="px-3.5 py-2 rounded-xl hover:bg-slate-100 hover:text-slate-900 text-slate-600 transition-all duration-200 cursor-pointer"
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
            className="p-2.5 rounded-xl bg-slate-50 hover:bg-amber-50 text-slate-700 hover:text-amber-800 transition-all flex items-center gap-2 border border-slate-200 hover:border-amber-300 shadow-sm cursor-pointer"
            title="Search catalog..."
          >
            <Search className="w-4 h-4 text-amber-600" />
            <span className="hidden lg:inline text-xs font-semibold text-slate-600">Search books...</span>
          </button>

          {/* Wishlist Button */}
          <button
            onClick={() => onNavigate("account", { tab: "wishlist" })}
            className="relative p-2.5 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-700 hover:text-rose-600 transition-all border border-slate-200 hover:border-rose-200 shadow-sm cursor-pointer"
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
            className="relative px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold transition-all duration-200 flex items-center gap-2 shadow-md shadow-amber-200/80 transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            title="Shopping Cart"
          >
            <ShoppingBag className="w-4 h-4 text-slate-950 stroke-[2.5]" />
            <span className="hidden sm:inline text-xs font-extrabold uppercase tracking-wider text-slate-950">Cart</span>
            {totalItemCount > 0 && (
              <span className="bg-slate-950 text-amber-300 text-[11px] font-extrabold px-2 py-0.5 rounded-full shadow-sm">
                {totalItemCount}
              </span>
            )}
          </button>

          {/* Account / Admin Menu */}
          <div className="relative">
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-100 hover:bg-amber-50 text-slate-800 transition-colors flex items-center gap-2 border border-slate-200 cursor-pointer"
            >
              {userProfile?.photoURL || currentUser?.photoURL ? (
                <img
                  src={userProfile?.photoURL || currentUser?.photoURL || ""}
                  alt={userProfile?.fullName || "Google User Profile"}
                  className="w-6 h-6 rounded-full object-cover border border-amber-400 shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <UserIcon className="w-5 h-5 text-amber-700" />
              )}
              {currentUser && (
                <span className="hidden sm:inline text-xs font-bold max-w-[100px] truncate text-slate-800">
                  {userProfile?.fullName || currentUser.displayName || currentUser.email?.split("@")[0]}
                </span>
              )}
            </button>

            {/* Dropdown Menu */}
            {userDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-2xl py-2 z-50 text-slate-700 text-sm animate-fadeIn">
                {currentUser ? (
                  <>
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3 bg-slate-50">
                      {userProfile?.photoURL || currentUser?.photoURL ? (
                        <img
                          src={userProfile?.photoURL || currentUser?.photoURL || ""}
                          alt="Profile"
                          className="w-10 h-10 rounded-full object-cover border-2 border-amber-400 shrink-0 shadow-md"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                          <UserIcon className="w-5 h-5" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-900 truncate">{userProfile?.fullName || currentUser.displayName || "User Account"}</p>
                        <p className="text-xs text-slate-500 truncate">{currentUser.email}</p>
                        <div className="mt-1 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold uppercase tracking-wider">
                          Role: {userProfile?.role || "customer"}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        onNavigate("account");
                        setUserDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-amber-50 text-slate-700 hover:text-amber-800 flex items-center gap-2 font-medium cursor-pointer"
                    >
                      <UserIcon className="w-4 h-4 text-amber-600" />
                      <span>My Account & Orders</span>
                    </button>

                    {(isEmployee || isAdmin) && (
                      <button
                        onClick={() => {
                          onNavigate("employee");
                          setUserDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-emerald-50 flex items-center gap-2 text-emerald-700 font-semibold cursor-pointer"
                      >
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>Staff / Employee Panel</span>
                      </button>
                    )}

                    {isAdmin && (
                      <button
                        onClick={() => {
                          onNavigate("admin");
                          setUserDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-amber-50 flex items-center gap-2 text-amber-700 font-semibold cursor-pointer"
                      >
                        <LayoutDashboard className="w-4 h-4 text-amber-600" />
                        <span>Admin Dashboard</span>
                      </button>
                    )}

                    <div className="border-t border-slate-100 my-1"></div>

                    <button
                      onClick={() => {
                        logoutUser();
                        setUserDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-rose-50 text-rose-600 flex items-center gap-2 cursor-pointer font-medium"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Log Out</span>
                    </button>
                  </>
                ) : (
                  <>
                    <div className="px-4 py-3 border-b border-slate-100 bg-amber-50/60">
                      <p className="font-bold text-slate-900">Welcome to JJ Bookstore</p>
                      <p className="text-xs text-slate-500">Sign in to track orders & save favorites</p>
                    </div>

                    <button
                      onClick={() => {
                        onNavigate("auth");
                        setUserDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-amber-50 text-slate-800 hover:text-amber-800 flex items-center gap-2 font-bold cursor-pointer"
                    >
                      <UserIcon className="w-4 h-4 text-amber-600" />
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
            className="md:hidden p-2.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-slate-200 px-4 py-4 space-y-2 shadow-xl animate-fadeIn">
          <button
            onClick={() => {
              onNavigate("home");
              setMobileMenuOpen(false);
            }}
            className={`w-full text-left px-4 py-3 rounded-xl font-bold cursor-pointer ${
              activePage === "home" ? "bg-amber-50 text-amber-800 border border-amber-200" : "text-slate-700 hover:bg-slate-50"
            }`}
          >
            Home
          </button>
          <button
            onClick={() => {
              onNavigate("shop");
              setMobileMenuOpen(false);
            }}
            className={`w-full text-left px-4 py-3 rounded-xl font-bold cursor-pointer ${
              activePage === "shop" ? "bg-amber-50 text-amber-800 border border-amber-200" : "text-slate-700 hover:bg-slate-50"
            }`}
          >
            Shop Books
          </button>
          <button
            onClick={() => {
              onNavigate("categories");
              setMobileMenuOpen(false);
            }}
            className={`w-full text-left px-4 py-3 rounded-xl font-bold cursor-pointer ${
              activePage === "categories" ? "bg-amber-50 text-amber-800 border border-amber-200" : "text-slate-700 hover:bg-slate-50"
            }`}
          >
            Categories
          </button>
          <button
            onClick={() => {
              onNavigate("authors");
              setMobileMenuOpen(false);
            }}
            className={`w-full text-left px-4 py-3 rounded-xl font-bold cursor-pointer ${
              activePage === "authors" ? "bg-amber-50 text-amber-800 border border-amber-200" : "text-slate-700 hover:bg-slate-50"
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
              className="w-full text-left px-4 py-3 rounded-xl font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
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
              className="w-full text-left px-4 py-3 rounded-xl font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
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
              className="w-full text-left px-4 py-3 rounded-xl font-bold bg-amber-500 text-slate-950 flex items-center gap-2 cursor-pointer shadow-sm"
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
