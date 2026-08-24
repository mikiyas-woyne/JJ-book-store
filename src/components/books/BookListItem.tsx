import React, { memo } from "react";
import { Star, ShoppingBag, Heart, Eye, BookOpen, Check, Feather } from "lucide-react";
import { Book } from "../../types";
import { getValidBookCover } from "../../lib/sampleData";
import { useCart } from "../../context/CartContext";
import { useWishlist } from "../../context/WishlistContext";
import { useToast } from "../ui/Toast";

interface BookListItemProps {
  book: Book;
  onSelectBook: (book: Book) => void;
}

export const BookListItem: React.FC<BookListItemProps> = memo(({ book, onSelectBook }) => {
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
      className="group relative bg-gradient-to-r from-stone-900/90 via-stone-900/80 to-stone-950/90 rounded-2xl border border-amber-950/40 hover:border-amber-500/50 shadow-md hover:shadow-xl hover:shadow-amber-950/30 transition-all duration-300 p-4 sm:p-5 flex flex-col sm:flex-row gap-4 sm:gap-6 items-start sm:items-center cursor-pointer"
    >
      {/* Book Cover Thumbnail with Spine Shadow */}
      <div className="relative w-28 sm:w-32 aspect-[3/4] shrink-0 rounded-xl overflow-hidden shadow-lg border border-amber-900/30 bg-stone-950">
        <img
          src={book.coverImage}
          alt={book.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={(e) => {
            const target = e.currentTarget;
            target.onerror = null;
            target.src = getValidBookCover(book);
          }}
        />

        {/* Book Spine Realistic Shadow */}
        <div className="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-black/60 via-black/20 to-transparent pointer-events-none" />

        {/* Discount Badge */}
        {hasDiscount && (
          <span className="absolute top-2 left-2 bg-rose-600 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full shadow-md">
            -{discountPercent}%
          </span>
        )}

        {/* Quick View Button */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="p-2 bg-amber-500 text-stone-950 rounded-full shadow-lg">
            <Eye className="w-4 h-4" />
          </span>
        </div>
      </div>

      {/* Book Information */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold tracking-wider uppercase text-amber-300 bg-amber-950/80 px-2.5 py-0.5 rounded-md border border-amber-800/50">
            {book.categoryName || "Literature"}
          </span>
          {book.language && (
            <span className="text-[10px] font-medium text-stone-400 bg-stone-800/60 px-2 py-0.5 rounded-md border border-stone-700/50">
              {book.language === "amharic" || book.language === "Amharic" ? "🇪🇹 Amharic" : "🌍 English"}
            </span>
          )}
          {book.featured && (
            <span className="text-[10px] font-extrabold text-amber-400 bg-amber-900/40 px-2 py-0.5 rounded-md border border-amber-600/40">
              ★ Featured
            </span>
          )}
        </div>

        <div>
          <h3 className="font-serif font-bold text-white text-base sm:text-lg group-hover:text-amber-300 transition-colors line-clamp-1">
            {book.title}
          </h3>
          <p className="text-xs sm:text-sm text-stone-400 flex items-center gap-1.5 mt-0.5">
            <Feather className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>by <strong className="text-stone-200 font-semibold">{book.authorName}</strong></span>
          </p>
        </div>

        {book.description && (
          <p className="text-xs text-stone-400 line-clamp-2 leading-relaxed hidden sm:block">
            {book.description}
          </p>
        )}

        {/* Rating and Stock Meta */}
        <div className="flex flex-wrap items-center gap-4 text-xs pt-1">
          <div className="flex items-center gap-1 text-amber-400">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span className="font-bold text-white">{book.ratingAverage.toFixed(1)}</span>
            <span className="text-stone-500">({book.reviewCount} reviews)</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${book.stock > 5 ? "bg-emerald-400" : book.stock > 0 ? "bg-amber-400" : "bg-rose-400"}`} />
            <span className={`text-xs ${book.stock > 5 ? "text-emerald-400 font-medium" : book.stock > 0 ? "text-amber-400 font-bold" : "text-rose-400 font-bold"}`}>
              {book.stock > 5 ? `In Stock (${book.stock})` : book.stock > 0 ? `Only ${book.stock} Left!` : "Out of Stock"}
            </span>
          </div>

          {book.pages && (
            <span className="text-stone-500 text-xs hidden md:inline">
              {book.pages} pages
            </span>
          )}
        </div>
      </div>

      {/* Pricing & CTA Controls */}
      <div className="w-full sm:w-auto shrink-0 flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-stone-800/80">
        <div className="text-left sm:text-right">
          <div className="flex items-baseline gap-1.5">
            <span className="font-serif font-extrabold text-amber-300 text-xl sm:text-2xl">
              {book.discountPrice || book.price}
            </span>
            <span className="text-xs font-bold text-amber-400">ETB</span>
          </div>
          {hasDiscount && (
            <span className="text-xs text-stone-500 line-through block">
              {book.price} ETB
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleWishlist}
            className={`p-2.5 rounded-xl border transition-all ${
              isFavorited
                ? "bg-rose-950/80 border-rose-500/80 text-rose-400"
                : "bg-stone-800/80 border-stone-700/60 text-stone-400 hover:text-white hover:border-stone-500"
            }`}
            title={isFavorited ? "In Wishlist" : "Add to Wishlist"}
          >
            <Heart className={`w-4 h-4 ${isFavorited ? "fill-rose-400" : ""}`} />
          </button>

          <button
            onClick={handleAddToCart}
            disabled={book.stock <= 0}
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all shadow-md active:scale-95 ${
              book.stock <= 0
                ? "bg-stone-800 text-stone-500 cursor-not-allowed border border-stone-700"
                : "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 shadow-amber-950/50"
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Add to Cart</span>
          </button>
        </div>
      </div>
    </div>
  );
});

BookListItem.displayName = "BookListItem";
