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
      className="group relative bg-white hover:bg-white rounded-2xl border border-slate-200 hover:border-amber-400 shadow-sm hover:shadow-xl hover:shadow-amber-500/10 transition-all duration-300 flex flex-col overflow-hidden cursor-pointer h-full active:scale-[0.98] sm:hover:-translate-y-1.5 touch-manipulation select-none"
    >
      {/* Cover Image Container */}
      <div className="relative aspect-[3/4.1] w-full bg-slate-100 overflow-hidden">
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

        {/* Subtle Spine Depth Shadow */}
        <div className="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-black/40 via-black/15 to-transparent pointer-events-none z-10" />

        {/* Spine Crease Line */}
        <div className="absolute left-3 top-0 bottom-0 w-[1px] bg-white/30 pointer-events-none z-10" />

        {/* Badges Overlay */}
        <div className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 flex flex-col gap-1.5 z-10 pointer-events-none">
          {hasDiscount && (
            <span className="bg-rose-600 text-white font-extrabold text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full shadow-md tracking-wider">
              -{discountPercent}% OFF
            </span>
          )}
          {book.featured && (
            <span className="bg-amber-400 text-slate-950 font-black text-[9px] sm:text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm border border-amber-300">
              ★ Featured
            </span>
          )}
        </div>

        {/* Wishlist Button */}
        <button
          onClick={handleToggleWishlist}
          className={`absolute top-2.5 right-2.5 sm:top-3 sm:right-3 p-2 rounded-full backdrop-blur-md transition-all z-20 min-w-[34px] min-h-[34px] flex items-center justify-center cursor-pointer ${
            isFavorited
              ? "bg-rose-600 text-white shadow-md scale-105"
              : "bg-white/90 text-slate-600 hover:text-rose-600 hover:bg-white border border-slate-200/80 shadow-sm"
          }`}
          title={isFavorited ? "Remove from wishlist" : "Add to wishlist"}
        >
          <Heart className={`w-3.5 h-3.5 ${isFavorited ? "fill-white text-white" : ""}`} />
        </button>

        {/* Quick View Hover Overlay (Desktop) */}
        <div className="hidden sm:flex absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 items-center justify-center p-4 z-20 pointer-events-none">
          <span className="px-3.5 py-1.5 bg-white text-slate-900 rounded-xl text-xs font-bold shadow-xl flex items-center gap-1.5 transition-transform group-hover:scale-105">
            <Eye className="w-3.5 h-3.5 text-amber-600" />
            <span>Quick View</span>
          </span>
        </div>
      </div>

      {/* Book Info Body */}
      <div className="p-3.5 sm:p-4 flex flex-col flex-1 justify-between gap-2.5">
        <div>
          {/* Category & Language Header */}
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-[9px] sm:text-[10px] font-bold tracking-wider uppercase text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60 truncate max-w-[130px]">
              {book.categoryName || "Literature"}
            </span>

            {book.language && (
              <span className="text-[9px] sm:text-[10px] text-slate-500 font-semibold shrink-0">
                {book.language === "amharic" || book.language === "Amharic" ? "🇪🇹 አማርኛ" : "🇬🇧 English"}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="font-serif font-bold text-slate-900 text-sm sm:text-base leading-snug group-hover:text-amber-800 transition-colors line-clamp-2">
            {book.title}
          </h3>

          {/* Author Name */}
          <p className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-1 line-clamp-1">
            <Feather className="w-3 h-3 text-amber-600 shrink-0" />
            <span>by <strong className="text-slate-700 font-semibold">{book.authorName}</strong></span>
          </p>

          {/* Rating Stars */}
          <div className="flex items-center gap-1 mt-2 text-xs">
            <div className="flex items-center text-amber-500">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="font-bold text-slate-800 ml-1 text-xs">{book.ratingAverage.toFixed(1)}</span>
            </div>
            <span className="text-slate-400 font-medium text-[10px] sm:text-xs">({book.reviewCount})</span>
          </div>
        </div>

        {/* Price & Action Row */}
        <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-1.5 mt-auto">
          <div className="min-w-0">
            <div className="flex items-baseline gap-1 flex-wrap">
              <span className="font-serif font-extrabold text-slate-900 text-base sm:text-lg">
                {book.discountPrice || book.price} <span className="text-[10px] sm:text-xs font-sans font-bold text-amber-600">ETB</span>
              </span>
              {hasDiscount && (
                <span className="text-[10px] sm:text-xs text-slate-400 line-through">
                  {book.price}
                </span>
              )}
            </div>
            {/* Stock Indicator */}
            {book.stock <= 5 && book.stock > 0 ? (
              <p className="text-[9px] sm:text-[10px] text-amber-700 font-bold mt-0.5 truncate flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Only {book.stock} left!
              </p>
            ) : book.stock > 5 ? (
              <p className="text-[9px] sm:text-[10px] text-emerald-700 font-medium mt-0.5 truncate flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                In Stock ({book.stock})
              </p>
            ) : (
              <p className="text-[9px] sm:text-[10px] text-rose-600 font-medium mt-0.5 truncate flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                Out of Stock
              </p>
            )}
          </div>

          {/* Add to Cart Button */}
          <button
            onClick={handleAddToCart}
            disabled={book.stock <= 0}
            className={`p-2.5 rounded-xl font-bold transition-all shadow-md flex items-center justify-center shrink-0 min-w-[38px] min-h-[38px] cursor-pointer ${
              book.stock <= 0
                ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 active:scale-95 shadow-amber-200"
            }`}
            title="Add to Cart"
          >
            <ShoppingBag className="w-4 h-4 text-slate-950" />
          </button>
        </div>
      </div>
    </div>
  );
});

BookCard.displayName = "BookCard";
