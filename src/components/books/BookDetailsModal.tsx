import React, { useState } from "react";
import {
  X,
  Star,
  ShoppingBag,
  Heart,
  BookOpen,
  Calendar,
  Globe,
  FileText,
  Building,
  CheckCircle2,
  Share2,
  Sparkles
} from "lucide-react";
import { Book } from "../../types";
import { getValidBookCover } from "../../lib/sampleData";
import { useCart } from "../../context/CartContext";
import { useWishlist } from "../../context/WishlistContext";
import { BookReviews } from "./BookReviews";
import { useToast } from "../ui/Toast";

interface BookDetailsModalProps {
  book: Book | null;
  onClose: () => void;
  onBuyNow: (book: Book, quantity: number) => void;
  relatedBooks: Book[];
  onSelectBook: (book: Book) => void;
}

export const BookDetailsModal: React.FC<BookDetailsModalProps> = ({
  book,
  onClose,
  onBuyNow,
  relatedBooks,
  onSelectBook
}) => {
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { showToast } = useToast();
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<"description" | "details" | "reviews">("description");

  if (!book) return null;

  const isFavorited = isInWishlist(book.id);
  const hasDiscount = book.discountPrice && book.discountPrice < book.price;
  const savings = hasDiscount ? book.price - book.discountPrice! : 0;

  const handleAddToCart = () => {
    const success = addToCart(book, quantity);
    if (success) {
      showToast("Added to Cart", `${quantity}x "${book.title}" added to your cart.`, "success");
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: book.title,
        text: `Check out ${book.title} on JJ Book Shopping!`,
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      showToast("Link Copied", "Book URL copied to clipboard.", "info");
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden max-h-[92vh] flex flex-col my-auto">
        {/* Sticky Header with Close */}
        <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200/80 px-3 py-1 rounded-full uppercase tracking-wider">
              {book.categoryName}
            </span>
            {book.featured && (
              <span className="text-xs font-black text-slate-950 bg-amber-400 px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 border border-amber-300 shadow-sm">
                <Sparkles className="w-3 h-3" /> Bestseller
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="p-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
              title="Share Book"
            >
              <Share2 className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-8 overflow-y-auto space-y-8">
          {/* Main Book Overview Row */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-10">
            {/* Left Column: Cover Image */}
            <div className="md:col-span-5 flex flex-col items-center">
              <div className="relative w-full max-w-[280px] aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl border border-slate-200 group">
                <img
                  src={book.coverImage}
                  alt={book.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.onerror = null;
                    target.src = getValidBookCover(book);
                  }}
                />
                {hasDiscount && (
                  <div className="absolute top-4 left-4 bg-rose-600 text-white text-xs font-extrabold px-3 py-1 rounded-full shadow-lg">
                    SAVE {savings} ETB
                  </div>
                )}
              </div>

              {/* Publisher & ISBN pill */}
              <div className="mt-4 text-center text-xs text-slate-500 space-y-1">
                <p><strong className="text-slate-700">ISBN:</strong> {book.ISBN}</p>
                <p><strong className="text-slate-700">Language:</strong> {book.language}</p>
              </div>
            </div>

            {/* Right Column: Title, Price, Buy Actions */}
            <div className="md:col-span-7 space-y-4">
              <div>
                <h1 className="font-serif font-extrabold text-2xl sm:text-3xl text-slate-900 leading-tight">
                  {book.title}
                </h1>
                <p className="text-sm font-semibold text-amber-800 mt-1">
                  Author: <span className="text-slate-800 font-bold underline cursor-pointer">{book.authorName}</span>
                </p>

                {/* Rating & Review Summary */}
                <div className="flex items-center gap-2 mt-2 text-sm">
                  <div className="flex items-center text-amber-500">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= Math.round(book.ratingAverage)
                            ? "fill-amber-400 text-amber-400"
                            : "text-slate-200"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="font-bold text-slate-900">{book.ratingAverage.toFixed(1)}</span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-600 text-xs font-medium">({book.reviewCount} customer reviews)</span>
                </div>
              </div>

              {/* Price Box */}
              <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex items-center justify-between shadow-sm">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-serif font-extrabold text-slate-900">
                      {book.discountPrice || book.price}{" "}
                      <span className="text-sm font-bold text-amber-700 font-sans">ETB</span>
                    </span>
                    {hasDiscount && (
                      <span className="text-sm text-slate-400 line-through">
                        {book.price} ETB
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-amber-900 font-medium mt-0.5">
                    Inclusive of 15% Ethiopian VAT Tax
                  </p>
                </div>

                {/* Stock Tag */}
                <div>
                  {book.stock > 0 ? (
                    <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      In Stock ({book.stock})
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold">
                      Out of Stock
                    </span>
                  )}
                </div>
              </div>

              {/* Quantity Selector */}
              <div className="flex items-center gap-4 py-2">
                <span className="text-xs font-bold text-slate-700">Quantity:</span>
                <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 overflow-hidden">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 hover:bg-slate-200 active:bg-slate-300 font-bold text-slate-700 text-base flex items-center justify-center transition-colors cursor-pointer"
                    aria-label="Decrease quantity"
                  >
                    -
                  </button>
                  <span className="px-4 py-2 text-sm font-bold text-slate-900 bg-white min-w-[36px] text-center">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(Math.min(book.stock, quantity + 1))}
                    className="w-10 h-10 hover:bg-slate-200 active:bg-slate-300 font-bold text-slate-700 text-base flex items-center justify-center transition-colors cursor-pointer"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  onClick={handleAddToCart}
                  disabled={book.stock <= 0}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-sm transition-all shadow-md shadow-amber-200 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  <ShoppingBag className="w-5 h-5 text-slate-950" />
                  <span>Add to Cart</span>
                </button>

                <button
                  onClick={() => {
                    onBuyNow(book, quantity);
                    onClose();
                  }}
                  disabled={book.stock <= 0}
                  className="w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4 text-amber-400" />
                  <span>Order Now (Direct)</span>
                </button>
              </div>

              {/* Wishlist Toggle */}
              <button
                onClick={() => {
                  toggleWishlist(book.id);
                  showToast(
                    isFavorited ? "Removed from Wishlist" : "Added to Wishlist",
                    `"${book.title}" updated in your saved items.`,
                    "info"
                  );
                }}
                className={`w-full py-2.5 rounded-xl border text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                  isFavorited
                    ? "bg-rose-50 text-rose-700 border-rose-200"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                <Heart className={`w-4 h-4 ${isFavorited ? "fill-rose-600 text-rose-600" : ""}`} />
                <span>{isFavorited ? "In Wishlist (Saved)" : "Add to Favorites / Wishlist"}</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="border-t border-slate-200 pt-6">
            <div className="flex border-b border-slate-200 gap-6 text-sm font-bold">
              <button
                onClick={() => setActiveTab("description")}
                className={`pb-3 transition-colors border-b-2 cursor-pointer ${
                  activeTab === "description"
                    ? "border-amber-600 text-amber-800"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                Book Overview & Synopsis
              </button>
              <button
                onClick={() => setActiveTab("details")}
                className={`pb-3 transition-colors border-b-2 cursor-pointer ${
                  activeTab === "details"
                    ? "border-amber-600 text-amber-800"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                Specifications
              </button>
              <button
                onClick={() => setActiveTab("reviews")}
                className={`pb-3 transition-colors border-b-2 cursor-pointer ${
                  activeTab === "reviews"
                    ? "border-amber-600 text-amber-800"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                Customer Reviews ({book.reviewCount})
              </button>
            </div>

            {/* Tab Contents */}
            <div className="py-6">
              {activeTab === "description" && (
                <div className="prose prose-slate max-w-none text-slate-700 text-sm leading-relaxed space-y-4">
                  <p>{book.description}</p>
                </div>
              )}

              {activeTab === "details" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
                    <Building className="w-5 h-5 text-amber-600" />
                    <div>
                      <span className="text-slate-400 font-semibold block">Publisher</span>
                      <strong className="text-slate-800">{book.publisher}</strong>
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-amber-600" />
                    <div>
                      <span className="text-slate-400 font-semibold block">Publication Date</span>
                      <strong className="text-slate-800">{book.publicationDate}</strong>
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
                    <FileText className="w-5 h-5 text-amber-600" />
                    <div>
                      <span className="text-slate-400 font-semibold block">Page Count</span>
                      <strong className="text-slate-800">{book.pages} pages</strong>
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
                    <Globe className="w-5 h-5 text-amber-600" />
                    <div>
                      <span className="text-slate-400 font-semibold block">Language</span>
                      <strong className="text-slate-800">{book.language}</strong>
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
                    <BookOpen className="w-5 h-5 text-amber-600" />
                    <div>
                      <span className="text-slate-400 font-semibold block">ISBN Identifier</span>
                      <strong className="text-slate-800">{book.ISBN}</strong>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "reviews" && <BookReviews bookId={book.id} />}
            </div>
          </div>

          {/* Related Books Section */}
          {relatedBooks.length > 0 && (
            <div className="border-t border-slate-200 pt-8">
              <h4 className="font-serif font-bold text-slate-900 text-lg mb-4">
                You May Also Like
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {relatedBooks.slice(0, 4).map((rel) => (
                  <div
                    key={rel.id}
                    onClick={() => onSelectBook(rel)}
                    className="p-3 rounded-2xl bg-white border border-slate-200 hover:border-amber-400 hover:shadow-md cursor-pointer transition-all group"
                  >
                    <img
                      src={rel.coverImage}
                      alt={rel.title}
                      className="w-full aspect-[3/4] object-cover rounded-xl mb-2"
                    />
                    <h5 className="font-serif font-bold text-slate-900 text-xs line-clamp-1 group-hover:text-amber-800">
                      {rel.title}
                    </h5>
                    <p className="text-[11px] text-slate-500 font-semibold">{rel.discountPrice || rel.price} ETB</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
