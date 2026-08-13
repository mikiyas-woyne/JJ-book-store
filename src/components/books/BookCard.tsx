import React, { memo } from "react";
import { Star, ShoppingBag, Heart, Eye } from "lucide-react";
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
      showToast(`Added to Cart`, `"${book.title}" was added to your shopping cart.`, "success");
    }
  };

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleWishlist(book.id);
    if (!isFavorited) {
      showToast(`Added to Wishlist`, `Saved "${book.title}" to your favorites.`, "info");
    }
  };

  const hasDiscount = book.discountPrice && book.discountPrice < book.price;
  const discountPercent = hasDiscount
    ? Math.round(((book.price - book.discountPrice!) / book.price) * 100)
    : 0;

  return (
    <div
      onClick={() => onSelectBook(book)}
      className="group relative bg-white rounded-2xl border border-stone-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.04)] sm:hover:shadow-[0_12px_32px_rgba(0,0,0,0.12)] sm:hover:border-amber-600/40 transition-all duration-300 flex flex-col overflow-hidden cursor-pointer h-full active:scale-[0.98] sm:hover:-translate-y-1 touch-manipulation"
    >
      {/* Cover Image Container */}
      <div className="relative aspect-[3/4] w-full bg-stone-100 overflow-hidden">
        <img
          src={book.coverImage}
          alt={book.title}
          className="w-full h-full object-cover sm:group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={(e) => {
            const target = e.currentTarget;
            target.onerror = null;
            target.src = getValidBookCover(book);
          }}
        />

        {/* Badges Overlay */}
        <div className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 flex flex-col gap-1 z-10">
          {hasDiscount && (
            <span className="bg-rose-600 text-white font-extrabold text-[10px] sm:text-[11px] px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full shadow-md tracking-wider">
              -{discountPercent}% OFF
            </span>
          )}
          {book.featured && (
            <span className="bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 font-bold text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider shadow-md">
              Featured
            </span>
          )}
        </div>

        {/* Wishlist Button */}
        <button
          onClick={handleToggleWishlist}
          className={`absolute top-2.5 right-2.5 sm:top-3 sm:right-3 p-2 rounded-full backdrop-blur-md transition-all z-10 min-w-[36px] min-h-[36px] flex items-center justify-center ${
            isFavorited
              ? "bg-rose-600 text-white shadow-md"
              : "bg-stone-900/40 text-stone-100 hover:bg-stone-900/70"
          }`}
          title={isFavorited ? "Remove from wishlist" : "Add to wishlist"}
        >
          <Heart className={`w-4 h-4 ${isFavorited ? "fill-white" : ""}`} />
        </button>

        {/* Quick View Hover Overlay (Desktop) */}
        <div className="hidden sm:flex absolute inset-0 bg-stone-950/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 items-center justify-center p-4">
          <span className="px-4 py-2 bg-white/95 backdrop-blur-md rounded-xl text-stone-900 text-xs font-bold shadow-xl flex items-center gap-2 border border-stone-200">
            <Eye className="w-4 h-4 text-amber-600" />
            <span>Quick View</span>
          </span>
        </div>
      </div>

      {/* Book Info Body */}
      <div className="p-3 sm:p-4 flex flex-col flex-1 justify-between gap-2">
        <div>
          {/* Category Pill */}
          <span className="text-[9px] sm:text-[10px] font-bold tracking-wider uppercase text-amber-900 bg-amber-50/80 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md inline-block mb-1 border border-amber-200/60 truncate max-w-full">
            {book.categoryName}
          </span>

          {/* Title */}
          <h3 className="font-serif font-bold text-stone-900 text-sm sm:text-base leading-snug group-hover:text-amber-900 transition-colors line-clamp-2">
            {book.title}
          </h3>

          {/* Author Name */}
          <p className="text-[11px] sm:text-xs text-stone-500 font-medium mt-0.5 line-clamp-1">
            by <span className="text-stone-800 font-semibold">{book.authorName}</span>
          </p>

          {/* Rating Stars */}
          <div className="flex items-center gap-1 mt-1.5 text-xs">
            <div className="flex items-center text-amber-500">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="font-bold text-stone-800 ml-1 text-xs">{book.ratingAverage.toFixed(1)}</span>
            </div>
            <span className="text-stone-400 font-medium text-[10px] sm:text-xs">({book.reviewCount})</span>
          </div>
        </div>

        {/* Price & Action Row */}
        <div className="pt-2.5 border-t border-stone-100 flex items-center justify-between gap-1.5 mt-auto">
          <div className="min-w-0">
            <div className="flex items-baseline gap-1 flex-wrap">
              <span className="font-serif font-extrabold text-stone-900 text-base sm:text-lg">
                {book.discountPrice || book.price} <span className="text-[10px] sm:text-xs font-sans font-bold text-amber-800">ETB</span>
              </span>
              {hasDiscount && (
                <span className="text-[10px] sm:text-xs text-stone-400 line-through">
                  {book.price}
                </span>
              )}
            </div>
            {/* Stock Indicator */}
            {book.stock <= 5 ? (
              <p className="text-[9px] sm:text-[10px] text-rose-600 font-bold mt-0.5 truncate">Only {book.stock} left!</p>
            ) : (
              <p className="text-[9px] sm:text-[10px] text-emerald-600 font-medium mt-0.5 truncate">In Stock ({book.stock})</p>
            )}
          </div>

          {/* Add to Cart Button */}
          <button
            onClick={handleAddToCart}
            disabled={book.stock <= 0}
            className={`p-2 sm:p-2.5 rounded-xl font-bold transition-all shadow-sm flex items-center justify-center shrink-0 min-w-[36px] min-h-[36px] ${
              book.stock <= 0
                ? "bg-stone-200 text-stone-400 cursor-not-allowed"
                : "bg-stone-900 hover:bg-amber-600 text-amber-300 hover:text-stone-950 active:scale-95 border border-stone-800"
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

