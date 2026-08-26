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
  Sparkles,
  Truck
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
    const newArrivals = books.filter((b) => b.active !== false && b.newArrival === true);
    if (newArrivals.length > 0) return newArrivals;

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
      showToast("Added to Cart", `"${activeBook.title}" added to your shopping cart.`, "success");
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
    <section className="relative w-full min-h-[82vh] bg-library-wood text-slate-800 overflow-hidden flex flex-col justify-between border-b border-slate-200 shadow-sm">
      {/* 1. CINEMATIC SUNLIT STUDIO BACKGROUND LAYERS */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
        {/* Subtle Geometric Texture */}
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:24px_24px]" />

        {/* Cathedral Window Sunbeam Effect */}
        <div className="absolute -top-32 -left-20 w-[650px] h-[850px] bg-gradient-to-br from-amber-200/40 via-yellow-100/30 to-transparent transform -rotate-45 blur-3xl animate-light-beam" />

        {/* Ambient Floating Glows */}
        <div className="absolute top-1/4 left-1/3 w-2.5 h-2.5 rounded-full bg-amber-400/40 blur-[1px] animate-[dustFloat_6s_infinite]" />
        <div className="absolute top-1/3 left-1/2 w-2 h-2 rounded-full bg-orange-300/40 blur-[1px] animate-[dustFloat_9s_infinite_2s]" />
        <div className="absolute top-2/3 left-1/4 w-3 h-3 rounded-full bg-yellow-400/30 blur-[1px] animate-[dustFloat_7s_infinite_4s]" />

        {/* Soft Ambient Lamp Glow */}
        <div className="absolute top-1/3 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-radial from-amber-200/30 via-orange-100/15 to-transparent blur-3xl" />

        {/* Light Oak Table Plinth Surface (Lower 50%) */}
        <div className="absolute bottom-0 inset-x-0 h-[48%] bg-table-top" />
      </div>

      {/* 2. MAIN INTERACTIVE READING STAGE & BOOK SPOTLIGHT */}
      <div className="relative z-20 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12 my-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* LEFT: 3D INTERACTIVE BOOK */}
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

        {/* RIGHT: CURATED BOOK SHOWCASE CARD */}
        {activeBook && (
          <div className="lg:col-span-6 flex flex-col justify-between bookshop-card p-6 sm:p-8 rounded-3xl space-y-5">
            <div className="space-y-4">
              {/* Category Badge & Ethiopian Heritage */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200/80 text-amber-800 text-xs font-bold uppercase tracking-wider shadow-sm">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Featured New Arrival</span>
                </div>

                {/* Ethiopian Flag Badge */}
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-200" title="Ethiopian Literary Heritage">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm" />
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm" />
                  <span className="text-[10px] font-bold text-slate-600 ml-1">Ethiopia</span>
                </div>
              </div>

              {/* Book Switcher Chips */}
              {approvedNewArrivals.length > 1 && (
                <div className="flex items-center gap-2 pt-1 pb-1 overflow-x-auto scrollbar-none">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 whitespace-nowrap">
                    Spotlight ({approvedNewArrivals.length}):
                  </span>
                  {approvedNewArrivals.map((bk, i) => (
                    <button
                      key={bk.id}
                      onClick={() => setCurrentBookIndex(i)}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                        safeIndex === i
                          ? "bg-amber-500 text-slate-950 shadow-md font-extrabold scale-105"
                          : "bg-slate-100 text-slate-600 hover:text-amber-800 hover:bg-amber-50 border border-slate-200"
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
              <div className="flex flex-wrap items-center gap-2.5 text-xs sm:text-sm text-slate-600 font-medium">
                <span>By <strong className="text-amber-800 font-serif font-bold text-base">{activeBook.authorName}</strong></span>
                <span className="text-slate-300">•</span>
                <span className="text-amber-700 font-semibold bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-100">{activeBook.categoryName}</span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-600 font-semibold">{activeBook.language || "Amharic & English"}</span>
                {activeBook.pages && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-500">{activeBook.pages} pages</span>
                  </>
                )}
              </div>

              {/* Rating & Reader Count */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-amber-700 bg-amber-50 px-3 py-1 rounded-xl border border-amber-200/60 font-bold text-sm">
                  <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                  <span>{activeBook.ratingAverage ? activeBook.ratingAverage.toFixed(1) : "5.0"}</span>
                </div>
                <span className="text-xs text-slate-500">
                  ({activeBook.reviewCount || 128} customer reviews)
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-emerald-700 ml-auto font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  In Stock & Verified
                </span>
              </div>

              {/* Book Description */}
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed line-clamp-3 font-sans pt-1">
                {activeBook.description}
              </p>
            </div>

            {/* Price & Primary Store Actions */}
            <div className="pt-4 border-t border-slate-100 space-y-4">
              {/* Ethiopian Birr Pricing */}
              <div className="flex items-baseline gap-3">
                <span className="font-serif font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">
                  {activeBook.discountPrice || activeBook.price} <span className="text-xs font-sans font-bold text-amber-600">ETB</span>
                </span>
                {activeBook.discountPrice && (
                  <span className="text-sm text-slate-400 line-through">
                    {activeBook.price} ETB
                  </span>
                )}
                {activeBook.stock > 0 ? (
                  <span className="text-xs text-emerald-700 font-semibold ml-auto flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    {activeBook.stock} Copies Ready to Ship
                  </span>
                ) : (
                  <span className="text-xs text-rose-600 font-semibold ml-auto">Out of Stock</span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => onSelectBook(activeBook)}
                  className="flex-1 min-w-[130px] px-5 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                >
                  <Eye className="w-4 h-4" />
                  <span>VIEW BOOK</span>
                </button>

                <button
                  onClick={handleAddToCart}
                  className="flex-1 min-w-[140px] px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer shadow-lg shadow-amber-200"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>ADD TO CART</span>
                </button>

                <button
                  onClick={handleToggleWishlist}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                    isFavorited
                      ? "bg-rose-600 border-rose-500 text-white shadow-md shadow-rose-200"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200"
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
