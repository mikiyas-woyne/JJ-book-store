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
      className="group relative bg-white rounded-2xl border border-slate-200 hover:border-amber-400 shadow-sm hover:shadow-xl transition-all duration-300 p-4 sm:p-5 flex flex-col sm:flex-row gap-4 sm:gap-6 items-start sm:items-center cursor-pointer"
    >
      {/* Book Cover Thumbnail */}
      <div className="relative w-28 sm:w-32 aspect-[3/4] shrink-0 rounded-xl overflow-hidden shadow-md border border-slate-200 bg-slate-100">
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

        {/* Subtle Spine Shadow */}
        <div className="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-black/40 via-black/10 to-transparent pointer-events-none" />

        {/* Discount Badge */}
        {hasDiscount && (
          <span className="absolute top-2 left-2 bg-rose-600 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full shadow-sm">
            -{discountPercent}%
          </span>
        )}

        {/* Quick View Button */}
        <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="p-2 bg-white text-slate-900 rounded-full shadow-lg">
            <Eye className="w-4 h-4 text-amber-600" />
          </span>
        </div>
      </div>

      {/* Book Information */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold tracking-wider uppercase text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200/60">
            {book.categoryName || "Literature"}
          </span>
          {book.language && (
            <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
              {book.language === "amharic" || book.language === "Amharic" ? "🇪🇹 Amharic" : "🌍 English"}
            </span>
          )}
          {book.featured && (
            <span className="text-[10px] font-extrabold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300">
              ★ Featured
            </span>
          )}
        </div>

        <div>
          <h3 className="font-serif font-bold text-slate-900 text-base sm:text-lg group-hover:text-amber-800 transition-colors line-clamp-1">
            {book.title}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 flex items-center gap-1.5 mt-0.5">
            <Feather className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>by <strong className="text-slate-800 font-semibold">{book.authorName}</strong></span>
          </p>
        </div>

        {book.description && (
          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed hidden sm:block">
            {book.description}
          </p>
        )}

        {/* Rating and Stock Meta */}
        <div className="flex flex-wrap items-center gap-4 text-xs pt-1">
          <div className="flex items-center gap-1 text-amber-500 font-bold">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span className="text-slate-900">{book.ratingAverage.toFixed(1)}</span>
            <span className="text-slate-400 font-normal">({book.reviewCount} reviews)</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${book.stock > 5 ? "bg-emerald-500" : book.stock > 0 ? "bg-amber-500" : "bg-rose-500"}`} />
            <span className={`text-xs ${book.stock > 5 ? "text-emerald-700 font-medium" : book.stock > 0 ? "text-amber-700 font-bold" : "text-rose-600 font-bold"}`}>
              {book.stock > 5 ? `In Stock (${book.stock})` : book.stock > 0 ? `Only ${book.stock} Left!` : "Out of Stock"}
            </span>
          </div>

          {book.pages && (
            <span className="text-slate-400 text-xs hidden md:inline">
              {book.pages} pages
            </span>
          )}
        </div>
      </div>

      {/* Pricing & CTA Controls */}
      <div className="w-full sm:w-auto shrink-0 flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
        <div className="text-left sm:text-right">
          <div className="flex items-baseline gap-1.5">
            <span className="font-serif font-extrabold text-slate-900 text-xl sm:text-2xl">
              {book.discountPrice || book.price}
            </span>
            <span className="text-xs font-bold text-amber-600">ETB</span>
          </div>
          {hasDiscount && (
            <span className="text-xs text-slate-400 line-through block">
              {book.price} ETB
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleWishlist}
            className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
              isFavorited
                ? "bg-rose-50 border-rose-300 text-rose-600 shadow-sm"
                : "bg-slate-50 border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50"
            }`}
            title={isFavorited ? "In Wishlist" : "Add to Wishlist"}
          >
            <Heart className={`w-4 h-4 ${isFavorited ? "fill-rose-600" : ""}`} />
          </button>

          <button
            onClick={handleAddToCart}
            disabled={book.stock <= 0}
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer ${
              book.stock <= 0
                ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-amber-200"
            }`}
          >
            <ShoppingBag className="w-4 h-4 text-slate-950" />
            <span>Add to Cart</span>
          </button>
        </div>
      </div>
    </div>
  );
});

BookListItem.displayName = "BookListItem";
