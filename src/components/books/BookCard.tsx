import React, { memo } from "react";
import { Star, ShoppingBag, Heart, Eye, Feather } from "lucide-react";
import { Book } from "../../types";
import { getValidBookCover } from "../../lib/sampleData";
import { useCart } from "../../context/CartContext";
import { useWishlist } from "../../context/WishlistContext";
import { useToast } from "../ui/Toast";

interface BookCardProps {
  book: Book;
  onSelectBook: (book: Book) => void;
}

export const BookCard: React.FC<BookCardProps> = memo(({ book, onSelectBook }) => {
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { showToast } = useToast();

  const isFavorited = isInWishlist(book.id);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    const success = addToCart(book, 1);
    if (success) {
      showToast("Added to Cart", `"${book.title}" was added to your shopping cart.`, "success");
    }
  };

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleWishlist(book.id);
    if (!isFavorited) {
      showToast("Added to Wishlist", `Saved "${book.title}" to your favorites.`, "info");
    }
  };

  const hasDiscount = book.discountPrice && book.discountPrice < book.price;
  const discountPercent = hasDiscount
    ? Math.round(((book.price - book.discountPrice!) / book.price) * 100)
    : 0;

  return (
    <div
      onClick={() => onSelectBook(book)}
      className="group relative bg-[#18120c] hover:bg-[#201810] rounded-2xl border border-amber-950/40 hover:border-amber-500/60 shadow-[0_6px_20px_rgba(0,0,0,0.4)] hover:shadow-[0_18px_40px_rgba(245,158,11,0.18)] transition-all duration-300 flex flex-col overflow-hidden cursor-pointer h-full active:scale-[0.98] sm:hover:-translate-y-1.5 touch-manipulation select-none"
    >
      {/* Cover Image Container */}
      <div className="relative aspect-[3/4.1] w-full bg-stone-950 overflow-hidden">
        <img
          src={book.coverImage}
          alt={book.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={(e) => {
            const target = e.currentTarget;
            target.onerror = null;
            target.src = getValidBookCover(book);
          }}
        />

        {/* Realistic Spine Depth Shadow */}
        <div className="absolute left-0 top-0 bottom-0 w-3.5 bg-gradient-to-r from-black/80 via-black/35 to-transparent pointer-events-none z-10" />

        {/* Realistic Spine Crease Line */}
        <div className="absolute left-3.5 top-0 bottom-0 w-[1px] bg-white/15 pointer-events-none z-10" />

        {/* Realistic Page Edge Highlight (Right Edge) */}
        <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-gradient-to-l from-white/20 to-transparent pointer-events-none z-10" />

        {/* Ambient Bottom Gradient for Title Readability */}
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-stone-950/80 to-transparent pointer-events-none z-10" />

        {/* Badges Overlay */}
        <div className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 flex flex-col gap-1.5 z-10 pointer-events-none">
          {hasDiscount && (
            <span className="bg-rose-600/95 text-white font-extrabold text-[10px] sm:text-[11px] px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-full shadow-lg tracking-wider backdrop-blur-sm border border-rose-400/30">
              -{discountPercent}% OFF
            </span>
          )}
          {book.featured && (
            <span className="bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 font-extrabold text-[9px] sm:text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-md border border-amber-300/40">
              ★ Featured
            </span>
          )}
        </div>

        {/* Wishlist Button */}
        <button
          onClick={handleToggleWishlist}
          className={`absolute top-2.5 right-2.5 sm:top-3 sm:right-3 p-2 rounded-full backdrop-blur-md transition-all z-20 min-w-[34px] min-h-[34px] flex items-center justify-center ${
            isFavorited
              ? "bg-rose-600 text-white shadow-lg scale-105"
              : "bg-stone-950/70 text-stone-300 hover:bg-stone-900/90 hover:text-white border border-white/10 hover:border-amber-400/40"
          }`}
          title={isFavorited ? "Remove from wishlist" : "Add to wishlist"}
        >
          <Heart className={`w-3.5 h-3.5 ${isFavorited ? "fill-white text-white" : ""}`} />
        </button>

        {/* Quick View Hover Overlay (Desktop) */}
        <div className="hidden sm:flex absolute inset-0 bg-stone-950/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 items-center justify-center p-4 z-20 pointer-events-none">
          <span className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-xl text-xs font-extrabold shadow-xl flex items-center gap-1.5 transition-transform group-hover:scale-105">
            <Eye className="w-3.5 h-3.5" />
            <span>Quick View</span>
          </span>
        </div>
      </div>

      {/* Book Info Body */}
      <div className="p-3.5 sm:p-4 flex flex-col flex-1 justify-between gap-2.5">
        <div>
          {/* Category & Language Header */}
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-[9px] sm:text-[10px] font-bold tracking-wider uppercase text-amber-300/90 bg-amber-950/80 px-2 py-0.5 rounded-md border border-amber-800/40 truncate max-w-[130px]">
              {book.categoryName || "Literature"}
            </span>

            {book.language && (
              <span className="text-[9px] sm:text-[10px] text-stone-400 font-medium shrink-0">
                {book.language === "amharic" || book.language === "Amharic" ? "🇪🇹 አማርኛ" : "🇬🇧 English"}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="font-serif font-bold text-stone-100 text-sm sm:text-base leading-snug group-hover:text-amber-300 transition-colors line-clamp-2">
            {book.title}
          </h3>

          {/* Author Name */}
          <p className="text-[11px] sm:text-xs text-stone-400 font-medium mt-1 flex items-center gap-1 line-clamp-1">
            <Feather className="w-3 h-3 text-amber-500/80 shrink-0" />
            <span>by <strong className="text-stone-300 font-semibold">{book.authorName}</strong></span>
          </p>

          {/* Rating Stars */}
          <div className="flex items-center gap-1 mt-2 text-xs">
            <div className="flex items-center text-amber-400">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="font-bold text-white ml-1 text-xs">{book.ratingAverage.toFixed(1)}</span>
            </div>
            <span className="text-stone-500 font-medium text-[10px] sm:text-xs">({book.reviewCount})</span>
          </div>
        </div>

        {/* Price & Action Row */}
        <div className="pt-2.5 border-t border-amber-950/30 flex items-center justify-between gap-1.5 mt-auto">
          <div className="min-w-0">
            <div className="flex items-baseline gap-1 flex-wrap">
              <span className="font-serif font-extrabold text-amber-300 text-base sm:text-lg">
                {book.discountPrice || book.price} <span className="text-[10px] sm:text-xs font-sans font-bold text-amber-400">ETB</span>
              </span>
              {hasDiscount && (
                <span className="text-[10px] sm:text-xs text-stone-500 line-through">
                  {book.price}
                </span>
              )}
            </div>
            {/* Stock Indicator */}
            {book.stock <= 5 && book.stock > 0 ? (
              <p className="text-[9px] sm:text-[10px] text-amber-400 font-bold mt-0.5 truncate flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                Only {book.stock} left!
              </p>
            ) : book.stock > 5 ? (
              <p className="text-[9px] sm:text-[10px] text-emerald-400 font-medium mt-0.5 truncate flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                In Stock ({book.stock})
              </p>
            ) : (
              <p className="text-[9px] sm:text-[10px] text-rose-400 font-medium mt-0.5 truncate flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                Out of Stock
              </p>
            )}
          </div>

          {/* Add to Cart Button */}
          <button
            onClick={handleAddToCart}
            disabled={book.stock <= 0}
            className={`p-2.5 sm:p-2.5 rounded-xl font-bold transition-all shadow-md flex items-center justify-center shrink-0 min-w-[38px] min-h-[38px] ${
              book.stock <= 0
                ? "bg-stone-800 text-stone-500 cursor-not-allowed border border-stone-700"
                : "bg-amber-500 hover:bg-amber-400 text-stone-950 active:scale-95 shadow-amber-950/40"
            }`}
            title="Add to Cart"
          >
            <ShoppingBag className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
});

BookCard.displayName = "BookCard";
