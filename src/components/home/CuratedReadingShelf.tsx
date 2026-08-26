import React, { useState, useEffect, useRef } from "react";
import { Book } from "../../types";
import {
  CURATED_SHELF_BOOKS,
  CuratedShelfBook,
  mapCuratedToStoreBook
} from "../../lib/curatedShelfData";
import { useCart } from "../../context/CartContext";
import { useWishlist } from "../../context/WishlistContext";
import { useToast } from "../ui/Toast";
import {
  Star,
  ShoppingBag,
  Heart,
  X,
  BookOpen,
  Sparkles,
  ArrowRight,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Share2,
  Info
} from "lucide-react";

interface CuratedReadingShelfProps {
  books: Book[];
  onSelectBook: (book: Book) => void;
  onNavigateShop?: () => void;
  onOrderNow?: (book: Book) => void;
}

export const CuratedReadingShelf: React.FC<CuratedReadingShelfProps> = ({
  books,
  onSelectBook,
  onNavigateShop,
  onOrderNow,
}) => {
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { showToast } = useToast();

  const [selectedIndex, setSelectedIndex] = useState<number>(6);
  const [isOpenedView, setIsOpenedView] = useState(false);
  const [shelfTheme, setShelfTheme] = useState<"light" | "studio">("light");
  const [activeTab, setActiveTab] = useState<"motion" | "gallery" | "pricing">("motion");
  const [collectionType, setCollectionType] = useState<"the-reading-hour" | "ethiopian-classics">("the-reading-hour");

  const containerRef = useRef<HTMLDivElement>(null);

  const displayBooks: CuratedShelfBook[] = collectionType === "the-reading-hour"
    ? CURATED_SHELF_BOOKS.slice(0, 12)
    : [
        ...CURATED_SHELF_BOOKS.filter((b) => b.titleAmharic),
        ...CURATED_SHELF_BOOKS.filter((b) => !b.titleAmharic)
      ].slice(0, 12);

  const activeBook = displayBooks[selectedIndex] || displayBooks[0];
  const storeMappedBook = activeBook ? mapCuratedToStoreBook(activeBook, books) : null;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : displayBooks.length - 1));
      } else if (e.key === "ArrowRight") {
        setSelectedIndex((prev) => (prev < displayBooks.length - 1 ? prev + 1 : 0));
      } else if (e.key === "Escape" && isOpenedView) {
        setIsOpenedView(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpenedView, displayBooks.length]);

  const handleOpenBookModal = (shelfBook: CuratedShelfBook) => {
    setIsOpenedView(true);
  };

  const handleOrderNow = (shelfBook?: CuratedShelfBook) => {
    const targetBook = shelfBook ? mapCuratedToStoreBook(shelfBook, books) : storeMappedBook;
    if (!targetBook) return;
    setIsOpenedView(false);
    if (onOrderNow) {
      onOrderNow(targetBook);
    } else {
      addToCart(targetBook, 1);
      onSelectBook(targetBook);
    }
  };

  const handleQuickAdd = (shelfBook: CuratedShelfBook, e: React.MouseEvent) => {
    e.stopPropagation();
    const mapped = mapCuratedToStoreBook(shelfBook, books);
    if (!mapped) return;
    const success = addToCart(mapped, 1);
    if (success) {
      showToast("Added to Cart", `"${mapped.title}" added to your bag.`, "success");
    }
  };

  const isFavorited = storeMappedBook ? isInWishlist(storeMappedBook.id) : false;

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!storeMappedBook) return;
    toggleWishlist(storeMappedBook.id);
    showToast(isFavorited ? "Removed from Wishlist" : "Added to Wishlist", `"${storeMappedBook.title}"`, "info");
  };

  return (
    <section
      ref={containerRef}
      className="relative w-full min-h-[780px] lg:min-h-[850px] overflow-hidden flex flex-col justify-between select-none shadow-sm transition-colors duration-700 bg-gradient-to-b from-white via-amber-50/40 to-slate-50 border-b border-slate-200"
    >
      {/* 1. CINEMATIC LIGHTING ROOM BACKGROUND */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
        {/* Soft studio light rays */}
        <div className="absolute -top-10 -left-20 w-[600px] sm:w-[800px] h-[900px] bg-gradient-to-br from-amber-200/30 via-yellow-100/20 to-transparent transform -rotate-12 blur-3xl pointer-events-none" />

        {/* Ambient Warm Center Glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-radial from-amber-200/20 via-orange-100/10 to-transparent blur-3xl" />
      </div>

      {/* 2. TOP FLOATING PILL NAVBAR */}
      <div className="relative z-30 max-w-6xl mx-auto w-full px-4 pt-6 sm:pt-8 flex items-center justify-between">
        {/* Left: Collection Selector */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCollectionType(prev => prev === "the-reading-hour" ? "ethiopian-classics" : "the-reading-hour")}
            className="text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 px-3.5 py-1.5 rounded-full border border-amber-200/80 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>{collectionType === "the-reading-hour" ? "Switch to Ethiopian Classics" : "Switch to The Reading Hour"}</span>
          </button>
        </div>

        {/* Center Pill Navbar */}
        <div className="inline-flex items-center p-1 rounded-full bg-white border border-slate-200 shadow-md space-x-1">
          <button
            onClick={() => setActiveTab("motion")}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeTab === "motion"
                ? "bg-amber-500 text-slate-950 shadow-sm font-extrabold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Motion
          </button>
          <button
            onClick={() => {
              setActiveTab("gallery");
              if (onNavigateShop) onNavigateShop();
            }}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeTab === "gallery"
                ? "bg-amber-500 text-slate-950 shadow-sm font-extrabold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Gallery
          </button>
          <button
            onClick={() => setActiveTab("pricing")}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeTab === "pricing"
                ? "bg-amber-500 text-slate-950 shadow-sm font-extrabold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Pricing
          </button>
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 flex items-center justify-center font-black text-[10px] shadow-sm ml-1">
            JJ
          </div>
        </div>

        {/* Right: Browse Catalog Link */}
        <div className="flex items-center gap-2">
          {onNavigateShop && (
            <button
              onClick={onNavigateShop}
              className="text-xs font-bold text-slate-700 hover:text-amber-800 bg-white px-3.5 py-1.5 rounded-full border border-slate-200 shadow-sm hover:border-amber-300 transition-all flex items-center gap-1 cursor-pointer"
            >
              <span>Explore All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 3. HEADLINE TYPOGRAPHY */}
      <div className="relative z-30 max-w-4xl mx-auto w-full px-4 text-center mt-4 sm:mt-6 mb-2 space-y-2">
        <h1 className="font-serif font-extrabold text-3xl sm:text-5xl lg:text-6xl text-slate-900 tracking-tight leading-tight">
          {collectionType === "the-reading-hour" ? "The Reading Hour" : "የንባብ ሰዓት"}
        </h1>
        <p className="font-serif text-slate-600 text-sm sm:text-base max-w-xl mx-auto italic tracking-wide">
          {collectionType === "the-reading-hour"
            ? "Twelve books on building, growing, and living, as pulled from the shelf, the keepers."
            : "አሥራ ሁለት ታላላቅ የኢትዮጵያና የዓለም ጥበብ መጻሕፍት፤ በመደርደሪያው ላይ እንደተሰደሩ።"}
        </p>

        {/* Click prompt */}
        <div className="flex items-center justify-center gap-2 pt-1 text-xs text-amber-800 font-medium">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span>Click any book spine to pull it forward or inspect details</span>
        </div>
      </div>

      {/* 4. THE 3D STANDING BOOKSHELF */}
      <div className="relative z-20 w-full max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 my-auto pt-6 pb-2">
        <div className="relative flex items-end justify-center w-full min-h-[340px] sm:min-h-[380px] lg:min-h-[420px] pb-6 [perspective:1400px]">
          {/* Books Row Container */}
          <div className="flex items-end justify-center gap-1 sm:gap-2 lg:gap-2.5 w-full max-w-6xl overflow-x-auto pb-4 pt-8 px-4 scrollbar-none [transform-style:preserve-3d]">
            {displayBooks.map((book, idx) => {
              const isSelected = idx === selectedIndex;
              const isLeftOfSelected = idx < selectedIndex;
              const isRightOfSelected = idx > selectedIndex;
              const distanceFromSelected = Math.abs(idx - selectedIndex);

              const heightClass =
                idx % 4 === 0
                  ? "h-[270px] sm:h-[310px] lg:h-[340px]"
                  : idx % 3 === 0
                  ? "h-[285px] sm:h-[325px] lg:h-[355px]"
                  : idx % 2 === 0
                  ? "h-[275px] sm:h-[315px] lg:h-[345px]"
                  : "h-[290px] sm:h-[330px] lg:h-[360px]";

              // Center Book (Front-facing Hardback Cover)
              if (isSelected) {
                return (
                  <div
                    key={book.id}
                    onClick={() => handleOpenBookModal(book)}
                    className="group relative z-40 flex-shrink-0 cursor-pointer transition-all duration-500 ease-out mx-2 sm:mx-4 transform hover:scale-[1.03] active:scale-[0.98]"
                    style={{
                      transform: "translateZ(30px)",
                    }}
                  >
                    <div
                      className="relative w-[150px] sm:w-[190px] lg:w-[225px] h-[270px] sm:h-[310px] lg:h-[345px] rounded-r-md rounded-l-sm bg-white border border-slate-300 shadow-[0_20px_45px_rgba(0,0,0,0.15),-8px_8px_25px_rgba(245,158,11,0.1)] overflow-hidden transition-all group-hover:shadow-[0_25px_55px_rgba(245,158,11,0.25)]"
                    >
                      <img
                        src={book.coverImage}
                        alt={book.title}
                        className="w-full h-full object-cover select-none"
                        loading="eager"
                        onError={(e) => {
                          const target = e.currentTarget;
                          target.onerror = null;
                          target.src = "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1442957271i/368593.jpg";
                        }}
                      />

                      {/* Spine Crease Shadow */}
                      <div className="absolute top-0 bottom-0 left-0 w-3.5 bg-gradient-to-r from-black/50 via-black/20 to-transparent border-r border-black/15 pointer-events-none" />
                      <div className="absolute inset-0 bg-gradient-to-tr from-black/20 via-transparent to-white/20 pointer-events-none" />
                      <div className="absolute inset-0 border border-white/30 rounded-r-md rounded-l-sm pointer-events-none" />
                      <div className="absolute top-0.5 bottom-0.5 -right-2.5 w-2.5 bg-gradient-to-r from-stone-100 via-stone-200 to-stone-300 rounded-r-sm shadow-inner pointer-events-none" />
                    </div>

                    {/* Book Contact Shadow */}
                    <div className="w-[90%] h-4 bg-slate-900/30 rounded-full blur-md mt-1.5 mx-auto transition-all group-hover:scale-95" />

                    {/* Inspect Badge */}
                    <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full whitespace-nowrap shadow-md flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      <span>Inspect Details</span>
                    </div>
                  </div>
                );
              }

              // Angled Spine Books
              const rotateY = isLeftOfSelected ? 30 : -30;
              const skewY = isLeftOfSelected ? -2 : 2;
              const translateX = isLeftOfSelected ? `${(6 - idx) * 2}px` : `-${(idx - 6) * 2}px`;
              const zIndex = 30 - distanceFromSelected;

              return (
                <div
                  key={book.id}
                  onClick={() => setSelectedIndex(idx)}
                  className={`group relative flex-shrink-0 cursor-pointer transition-all duration-300 ease-out hover:-translate-y-4 hover:brightness-110 select-none ${heightClass}`}
                  style={{
                    width: "36px",
                    maxWidth: "42px",
                    minWidth: "28px",
                    zIndex,
                    transform: `rotateY(${rotateY}deg) skewY(${skewY}deg) translateX(${translateX})`,
                    transformOrigin: isLeftOfSelected ? "bottom right" : "bottom left",
                  }}
                >
                  <div
                    className="relative w-full h-full rounded-t-sm shadow-[0_10px_25px_rgba(0,0,0,0.2),-2px_2px_8px_rgba(0,0,0,0.15)] flex flex-col justify-between py-4 px-1 text-center overflow-hidden border-t border-b border-black/30"
                    style={{
                      backgroundColor: book.spineColor || "#1e293b",
                      color: book.spineTextColor || "#ffffff",
                    }}
                  >
                    <div className="w-full h-1.5 opacity-60 bg-white/25 rounded-sm mb-2" />
                    <div className="my-auto flex items-center justify-center [writing-mode:vertical-rl] transform rotate-180 select-none">
                      <span className="font-serif font-black text-[10px] sm:text-xs tracking-wider uppercase whitespace-nowrap drop-shadow-sm">
                        {book.title.split("(")[0].trim()}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-center [writing-mode:vertical-rl] transform rotate-180 opacity-80">
                      <span className="font-sans font-bold text-[8px] tracking-tight uppercase whitespace-nowrap">
                        {book.author.split(" ")[0]}
                      </span>
                    </div>
                    <div className="w-full h-1 opacity-60 bg-amber-400/60 rounded-sm mt-1" />
                    <div className="absolute inset-0 bg-gradient-to-r from-white/20 via-transparent to-black/30 pointer-events-none" />
                  </div>
                  <div className="w-[120%] h-3 bg-slate-900/25 rounded-full blur-sm -mt-1 -ml-1 transition-all group-hover:scale-110" />
                </div>
              );
            })}
          </div>

          {/* Clean Light Oak Shelf Surface */}
          <div className="absolute bottom-0 left-0 right-0 h-6 sm:h-8 bg-gradient-to-r from-[#fef3c7] via-[#fde68a] to-[#fef3c7] rounded-t-md border-t-2 border-amber-400/80 shadow-[0_-6px_20px_rgba(245,158,11,0.15),inset_0_1px_3px_rgba(255,255,255,0.8)] pointer-events-none" />
        </div>
      </div>

      {/* 5. BOTTOM BOOK INFO & DIRECT ORDER BAR */}
      <div className="relative z-30 max-w-5xl mx-auto w-full px-4 pb-6 pt-2">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          {/* Active Book Highlights */}
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="w-12 h-16 rounded-lg overflow-hidden shadow-md border border-amber-300 flex-shrink-0 hidden sm:block">
              <img
                src={activeBook.coverImage}
                alt={activeBook.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">
                  Book {selectedIndex + 1} of 12
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-xs text-slate-600 font-semibold">{activeBook.category}</span>
              </div>
              <h4 className="font-serif font-extrabold text-lg text-slate-900">
                {activeBook.title}
              </h4>
              <p className="text-xs text-slate-500">
                By <strong className="text-amber-800">{activeBook.author}</strong> — {activeBook.pages} pages
              </p>
            </div>
          </div>

          {/* Pricing & Store Actions */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <div className="text-right mr-2">
              <div className="font-serif font-extrabold text-xl text-slate-900">
                {activeBook.discountPrice || activeBook.price} <span className="text-xs font-sans font-bold text-amber-600">ETB</span>
              </div>
              {activeBook.discountPrice && (
                <div className="text-xs text-slate-400 line-through">
                  {activeBook.price} ETB
                </div>
              )}
            </div>

            <button
              onClick={() => handleOpenBookModal(activeBook)}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Info className="w-3.5 h-3.5 text-amber-600" />
              <span>Details</span>
            </button>

            <button
              onClick={(e) => handleQuickAdd(activeBook, e)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-slate-950" />
              <span>ADD TO CART</span>
            </button>
          </div>
        </div>
      </div>

      {/* FULL BOOK INSPECTION MODAL */}
      {isOpenedView && activeBook && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
          <div className="relative w-full max-w-4xl bg-white text-slate-800 rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-10 overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => setIsOpenedView(false)}
              className="absolute top-4 right-4 p-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Left Column: Book Cover Artwork */}
              <div className="lg:col-span-5 flex flex-col items-center">
                <div className="relative w-[200px] sm:w-[240px] aspect-[1/1.45] rounded-2xl overflow-hidden shadow-2xl border-2 border-amber-300">
                  <img
                    src={activeBook.coverImage}
                    alt={activeBook.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    In Stock ({activeBook.stock} available)
                  </span>
                </div>
              </div>

              {/* Right Column: Book Details */}
              <div className="lg:col-span-7 space-y-5">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold uppercase tracking-wider">
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    <span>THE READING HOUR • {activeBook.category}</span>
                  </div>

                  <h3 className="font-serif font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">
                    {activeBook.title}
                  </h3>

                  <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-slate-600">
                    <span>By <strong className="text-amber-800 font-serif font-bold text-base">{activeBook.author}</strong></span>
                    <span className="text-slate-300">•</span>
                    <span>{activeBook.pages} pages</span>
                    <span className="text-slate-300">•</span>
                    <div className="flex items-center gap-1 text-amber-600 font-bold">
                      <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                      <span>{activeBook.rating.toFixed(1)}</span>
                      <span className="text-slate-400 font-normal">({activeBook.reviews} reviews)</span>
                    </div>
                  </div>
                </div>

                {/* Key Quote */}
                {activeBook.quote && (
                  <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80">
                    <p className="font-serif italic text-amber-900 text-sm leading-relaxed">
                      "{activeBook.quote}"
                    </p>
                    <p className="text-[10px] text-amber-700 font-bold uppercase tracking-wider mt-2">
                      — {activeBook.quoteAttribution}
                    </p>
                  </div>
                )}

                {/* Synopsis */}
                <p className="text-slate-600 text-xs sm:text-sm leading-relaxed font-sans">
                  {activeBook.synopsis}
                </p>

                {/* Pricing & Actions */}
                <div className="pt-4 border-t border-slate-100 space-y-4">
                  <div className="flex items-baseline gap-3">
                    <span className="font-serif font-extrabold text-3xl text-slate-900 tracking-tight">
                      {activeBook.discountPrice || activeBook.price} <span className="text-sm font-sans font-bold text-amber-600">ETB</span>
                    </span>
                    {activeBook.discountPrice && (
                      <span className="text-sm text-slate-400 line-through">
                        {activeBook.price} ETB
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => handleOrderNow(activeBook)}
                      className="flex-1 min-w-[140px] px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>ORDER NOW</span>
                    </button>

                    <button
                      onClick={(e) => handleQuickAdd(activeBook, e)}
                      className="flex-1 min-w-[140px] px-6 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs uppercase tracking-wider border border-slate-200 transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                    >
                      <span>ADD TO CART</span>
                    </button>

                    <button
                      onClick={handleToggleWishlist}
                      className={`p-3.5 rounded-2xl border transition-colors cursor-pointer ${
                        isFavorited
                          ? "bg-rose-600 border-rose-500 text-white shadow-md"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:text-rose-600 hover:bg-rose-50"
                      }`}
                      title="Wishlist"
                    >
                      <Heart className={`w-4 h-4 ${isFavorited ? "fill-white" : ""}`} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
