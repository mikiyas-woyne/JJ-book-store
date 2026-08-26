import React, { useState, useMemo } from "react";
import { Book } from "../../types";
import { Interactive3DBook } from "../books/Interactive3DBook";
import { useCart } from "../../context/CartContext";
import { useWishlist } from "../../context/WishlistContext";
import { useToast } from "../ui/Toast";
import {
  Star,
  ShoppingBag,
  Eye,
  Heart,
  Award,
  CheckCircle2,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Flame
} from "lucide-react";

interface LibraryEnvironmentHeroProps {
  books: Book[];
  onSelectBook: (book: Book) => void;
}

export const LibraryEnvironmentHero: React.FC<LibraryEnvironmentHeroProps> = ({
  books,
  onSelectBook,
}) => {
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { showToast } = useToast();

  const [currentBookIndex, setCurrentBookIndex] = useState(0);

  // Filter books that are:
  // 1. Approved/Active by admin (active === true)
  // 2. Marked as new arrival (newArrival === true) or recent
  const approvedNewArrivals = useMemo(() => {
    // Primary: Admin-approved active books marked as newArrival
    const newArrivals = books.filter((b) => b.active !== false && b.newArrival === true);
    if (newArrivals.length > 0) return newArrivals;

    // Fallback: Active books approved by admin
    const activeBooks = books.filter((b) => b.active !== false);
    return activeBooks.slice(0, 6);
  }, [books]);

  // Ensure index stays in range
  const safeIndex = currentBookIndex >= approvedNewArrivals.length ? 0 : currentBookIndex;
  const activeBook = approvedNewArrivals[safeIndex] || books[0];

  const handleNextBook = () => {
    if (approvedNewArrivals.length === 0) return;
    setCurrentBookIndex((prev) => (prev + 1) % approvedNewArrivals.length);
  };

  const handlePrevBook = () => {
    if (approvedNewArrivals.length === 0) return;
    setCurrentBookIndex((prev) => (prev - 1 + approvedNewArrivals.length) % approvedNewArrivals.length);
  };

  const handleAddToCart = () => {
    if (!activeBook) return;
    const success = addToCart(activeBook, 1);
    if (success) {
      showToast("Added to Cart", `"${activeBook.title}" added to your cart.`, "success");
    }
  };

  const isFavorited = activeBook ? isInWishlist(activeBook.id) : false;

  const handleToggleWishlist = () => {
    if (!activeBook) return;
    toggleWishlist(activeBook.id);
    if (!isFavorited) {
      showToast("Wishlist Updated", `Added "${activeBook.title}" to your favorites.`, "info");
    }
  };

  return (
    <section className="relative w-full min-h-[82vh] bg-library-wood text-slate-800 overflow-hidden flex flex-col justify-between border-b border-emerald-100 shadow-sm">
      {/* 1. CINEMATIC LIBRARY ENVIRONMENT BACKGROUND LAYERS */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
        {/* Subtle Bookshelf Silhouette Arch Texture */}
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#86efac_1px,transparent_1px)] [background-size:28px_28px]" />

        {/* Tall Cathedral Library Window Sunbeam Effect */}
        <div className="absolute -top-32 -left-20 w-[650px] h-[850px] bg-gradient-to-br from-amber-200/50 via-emerald-100/30 to-transparent transform -rotate-45 blur-2xl animate-light-beam" />

        {/* Atmospheric Floating Dust Motes */}
        <div className="absolute top-1/4 left-1/3 w-2 h-2 rounded-full bg-amber-300/40 blur-[1px] animate-[dustFloat_6s_infinite]" />
        <div className="absolute top-1/3 left-1/2 w-1.5 h-1.5 rounded-full bg-amber-200/50 blur-[1px] animate-[dustFloat_9s_infinite_2s]" />
        <div className="absolute top-2/3 left-1/4 w-2.5 h-2.5 rounded-full bg-amber-400/30 blur-[1px] animate-[dustFloat_7s_infinite_4s]" />

        {/* Warm Ambient Lamp Glow onto Scene */}
        <div className="absolute top-1/3 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-radial from-emerald-200/25 via-lime-100/20 to-transparent blur-3xl" />

        {/* Polished Mahogany Reading Table Top Surface (Spans lower 55% of the hero) */}
        <div className="absolute bottom-0 inset-x-0 h-[52%] bg-table-top border-t border-emerald-100" />
      </div>

      {/* 2. MAIN INTERACTIVE READING DESK STAGE & BOOK SPOTLIGHT */}
      <div className="relative z-20 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12 my-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* LEFT / CENTER: 3D BOOK FREELY RESTING ON THE MAHOGANY DESK */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center">
          {activeBook ? (
            <Interactive3DBook
              book={activeBook}
              onSelectBook={onSelectBook}
              onNextBook={handleNextBook}
              onPrevBook={handlePrevBook}
            />
          ) : null}
        </div>

        {/* RIGHT: CURATED BOOK SHOWCASE PLAQUE (Blends seamlessly into the library scene) */}
        {activeBook && (
          <div className="lg:col-span-6 flex flex-col justify-between bookshop-card backdrop-blur-md p-6 sm:p-8 rounded-3xl space-y-5">
            <div className="space-y-4">
              {/* Category Badge & New Arrival Status */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold uppercase tracking-wider shadow-inner">
                  <span>New arrival</span>
                </div>

                {/* Ethiopian Flag Heritage Ribbon */}
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200" title="Ethiopian Literary Heritage">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm" />
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm" />
                </div>
              </div>

              {/* Book Switcher Chips if multiple approved new arrivals */}
              {approvedNewArrivals.length > 1 && (
                <div className="flex items-center gap-2 pt-1 pb-2 overflow-x-auto scrollbar-none">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 whitespace-nowrap">
                    New Books ({approvedNewArrivals.length}):
                  </span>
                  {approvedNewArrivals.map((bk, i) => (
                    <button
                      key={bk.id}
                      onClick={() => setCurrentBookIndex(i)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all whitespace-nowrap cursor-pointer ${
                        safeIndex === i
                          ? "bg-amber-400 text-stone-950 shadow-md font-black scale-105"
                          : "bg-white text-slate-600 hover:text-emerald-800 border border-slate-200"
                      }`}
                    >
                      {bk.title.split("(")[0].trim()}
                    </button>
                  ))}
                </div>
              )}

              {/* Book Title */}
              <h1 className="font-serif font-extrabold text-2xl sm:text-3xl lg:text-4xl text-slate-900 tracking-tight leading-snug">
                {activeBook.title}
              </h1>

              {/* Author & Attributes */}
              <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-slate-600 font-medium">
                <span>By <strong className="text-emerald-800 font-serif font-bold text-base">{activeBook.authorName}</strong></span>
                <span className="text-slate-300">•</span>
                <span className="text-amber-600 font-semibold">{activeBook.categoryName}</span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-600">{activeBook.language || "Amharic & English"}</span>
                {activeBook.pages && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-500">{activeBook.pages} pages</span>
                  </>
                )}
              </div>

              {/* Rating & Verified Reader Count */}
              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-1 text-amber-400 bg-amber-950/60 px-2.5 py-1 rounded-lg border border-amber-800/40">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span className="font-bold text-slate-900 text-sm">
                    {activeBook.ratingAverage ? activeBook.ratingAverage.toFixed(1) : "5.0"}
                  </span>
                </div>
                <span className="text-xs text-slate-500">
                  ({activeBook.reviewCount || 128} readers & reviews)
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300 ml-auto font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Verified Admin Listing
                </span>
              </div>

              {/* Book Description */}
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed line-clamp-3 font-sans pt-1">
                {activeBook.description}
              </p>
            </div>

            {/* Price & Primary Store Actions */}
            <div className="pt-4 border-t border-emerald-100 space-y-4">
              {/* Ethiopian Birr Pricing */}
              <div className="flex items-baseline gap-3">
                <span className="font-serif font-extrabold text-2xl sm:text-3xl text-emerald-800 tracking-tight">
                  {activeBook.discountPrice || activeBook.price} <span className="text-xs font-sans font-bold text-amber-600">ETB</span>
                </span>
                {activeBook.discountPrice && (
                  <span className="text-sm text-slate-400 line-through">
                    {activeBook.price} ETB
                  </span>
                )}
                {activeBook.stock > 0 ? (
                  <span className="text-xs text-emerald-400 font-semibold ml-auto flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    In Stock ({activeBook.stock} available)
                  </span>
                ) : (
                  <span className="text-xs text-rose-400 font-semibold ml-auto">Out of Stock</span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => onSelectBook(activeBook)}
                  className="flex-1 min-w-[130px] px-5 py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-600 text-white font-extrabold text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                >
                  <Eye className="w-4 h-4" />
                  <span>VIEW BOOK</span>
                </button>

                <button
                  onClick={handleAddToCart}
                  className="flex-1 min-w-[140px] px-5 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-amber-950 font-extrabold text-xs uppercase tracking-wider border border-amber-300 transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer shadow-lg shadow-amber-100"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>ADD TO CART</span>
                </button>

                <button
                  onClick={handleToggleWishlist}
                  className={`p-3 rounded-2xl border transition-colors cursor-pointer ${
                    isFavorited
                      ? "bg-rose-600 border-rose-500 text-white shadow-lg shadow-rose-950/50"
                      : "bg-white border-slate-200 text-slate-600 hover:text-emerald-800"
                  }`}
                  title="Wishlist"
                >
                  <Heart className={`w-4 h-4 ${isFavorited ? "fill-white" : ""}`} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

    </section>
  );
};
