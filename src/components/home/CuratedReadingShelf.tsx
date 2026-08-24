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

  // Active selected center book index (Default is 6: The 4-Hour Workweek, matching the screenshot)
  const [selectedIndex, setSelectedIndex] = useState<number>(6);
  const [isOpenedView, setIsOpenedView] = useState(false);
  const [shelfTheme, setShelfTheme] = useState<"library-warm" | "night-study">("library-warm");
  const [activeTab, setActiveTab] = useState<"motion" | "gallery" | "pricing">("motion");
  const [collectionType, setCollectionType] = useState<"the-reading-hour" | "ethiopian-classics">("the-reading-hour");

  const containerRef = useRef<HTMLDivElement>(null);

  // 12 Books exactly configured to match the reference image
  const displayBooks: CuratedShelfBook[] = collectionType === "the-reading-hour"
    ? CURATED_SHELF_BOOKS.slice(0, 12)
    : [
        ...CURATED_SHELF_BOOKS.filter((b) => b.titleAmharic),
        ...CURATED_SHELF_BOOKS.filter((b) => !b.titleAmharic)
      ].slice(0, 12);

  const activeBook = displayBooks[selectedIndex] || displayBooks[0];
  const storeMappedBook = activeBook ? mapCuratedToStoreBook(activeBook, books) : null;

  // Keyboard navigation (Left/Right arrow keys & ESC)
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
      className="relative w-full min-h-[780px] lg:min-h-[850px] overflow-hidden flex flex-col justify-between select-none shadow-2xl transition-colors duration-700 bg-[#24170f]"
    >
      {/* 1. CINEMATIC SUNLIT LIBRARY ROOM BACKGROUND (Matches Reference Image) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
        {/* Base Warm Sepia & Library Wood Gradient */}
        <div
          className={`absolute inset-0 transition-opacity duration-700 ${
            shelfTheme === "library-warm"
              ? "bg-gradient-to-b from-[#2d1b10] via-[#1f130b] to-[#140b06]"
              : "bg-gradient-to-b from-[#111827] via-[#090d16] to-[#030712]"
          }`}
        />

        {/* Arch Window Sunbeam Light Spill from Left (as seen in screenshot) */}
        <div className="absolute -top-10 -left-20 w-[600px] sm:w-[800px] h-[900px] bg-gradient-to-br from-amber-100/20 via-amber-300/10 to-transparent transform -rotate-12 blur-3xl pointer-events-none" />

        {/* Window Pane Shadow Silhouettes on left wall */}
        <div className="absolute top-10 left-6 sm:left-16 w-48 sm:w-72 h-80 sm:h-96 border-4 border-amber-950/30 rounded-t-full opacity-20 pointer-events-none hidden sm:block">
          <div className="w-full h-full grid grid-cols-2 grid-rows-3 border border-amber-950/20" />
        </div>

        {/* Library Bookcase Silhouette on right wall (as seen in screenshot) */}
        <div className="absolute top-8 right-0 w-44 sm:w-64 h-[600px] opacity-25 hidden sm:flex flex-col justify-between border-l-4 border-amber-950/60 bg-stone-950/40 p-3 pointer-events-none">
          <div className="h-4 border-b border-amber-900/60" />
          <div className="h-4 border-b border-amber-900/60" />
          <div className="h-4 border-b border-amber-900/60" />
          <div className="h-4 border-b border-amber-900/60" />
          <div className="h-4 border-b border-amber-900/60" />
        </div>

        {/* Atmospheric Floating Dust Particles Glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-radial from-amber-400/15 via-amber-600/5 to-transparent blur-3xl" />
      </div>

      {/* 2. TOP FLOATING PILL NAVBAR (Matches Screenshot Top Bar) */}
      <div className="relative z-30 max-w-6xl mx-auto w-full px-4 pt-6 sm:pt-8 flex items-center justify-between">
        {/* Left: Collection Selector */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCollectionType(prev => prev === "the-reading-hour" ? "ethiopian-classics" : "the-reading-hour")}
            className="text-[11px] font-bold text-amber-200/80 hover:text-amber-300 bg-stone-900/70 hover:bg-stone-900 px-3 py-1.5 rounded-full border border-amber-800/40 backdrop-blur-md transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>{collectionType === "the-reading-hour" ? "Switch to Ethiopian Classics" : "Switch to The Reading Hour"}</span>
          </button>
        </div>

        {/* Center Pill Navbar: "Motion  Gallery  Pricing  [avatar]" */}
        <div className="inline-flex items-center p-1 rounded-full bg-stone-950/70 border border-stone-700/50 backdrop-blur-xl shadow-xl space-x-1">
          <button
            onClick={() => setActiveTab("motion")}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeTab === "motion"
                ? "bg-white text-stone-950 shadow-md font-extrabold"
                : "text-stone-300 hover:text-white"
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
                ? "bg-white text-stone-950 shadow-md font-extrabold"
                : "text-stone-300 hover:text-white"
            }`}
          >
            Gallery
          </button>
          <button
            onClick={() => setActiveTab("pricing")}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeTab === "pricing"
                ? "bg-white text-stone-950 shadow-md font-extrabold"
                : "text-stone-300 hover:text-white"
            }`}
          >
            Pricing
          </button>
          <div className="w-6 h-6 rounded-full bg-amber-400/90 text-stone-950 flex items-center justify-center font-bold text-[10px] shadow-sm ml-1">
            JJ
          </div>
        </div>

        {/* Right: Theme Toggle Icon */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShelfTheme(prev => prev === "library-warm" ? "night-study" : "library-warm")}
            className="p-2 rounded-full bg-stone-950/70 hover:bg-stone-900 text-stone-300 hover:text-amber-300 border border-stone-700/50 backdrop-blur-xl transition-all cursor-pointer shadow-md"
            title="Toggle Ambient Scene Lighting"
          >
            {shelfTheme === "library-warm" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-400" />}
          </button>
        </div>
      </div>

      {/* 3. HEADLINE TYPOGRAPHY (Matches "The Reading Hour" Screenshot) */}
      <div className="relative z-30 max-w-4xl mx-auto w-full px-4 text-center mt-4 sm:mt-6 mb-2 space-y-2">
        <h1 className="font-serif font-bold italic text-4xl sm:text-5xl lg:text-6xl text-white tracking-tight leading-tight drop-shadow-md">
          {collectionType === "the-reading-hour" ? "The Reading Hour" : "የንባብ ሰዓት"}
        </h1>
        <p className="font-serif text-stone-300/80 text-xs sm:text-sm md:text-base max-w-xl mx-auto italic tracking-wide">
          {collectionType === "the-reading-hour"
            ? "Twelve books on building, growing, and living, as pulled from the shelf, the keepers."
            : "አሥራ ሁለት ታላላቅ የኢትዮጵያና የዓለም ጥበብ መጻሕፍት፤ በመደርደሪያው ላይ እንደተሰደሩ።"}
        </p>

        {/* Subtle click / interactive cursor prompt */}
        <div className="flex items-center justify-center gap-2 pt-1 text-[11px] text-amber-300/70 font-sans">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          <span>Click any book spine to pull it forward or inspect</span>
        </div>
      </div>

      {/* 4. THE 3D STANDING BOOKSHELF (Exact Replica of Screenshot Layout) */}
      <div className="relative z-20 w-full max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 my-auto pt-6 pb-2">
        {/* Wooden Desktop / Shelf Stage */}
        <div className="relative flex items-end justify-center w-full min-h-[340px] sm:min-h-[380px] lg:min-h-[420px] pb-6 [perspective:1400px]">
          
          {/* Books Row Container */}
          <div className="flex items-end justify-center gap-1 sm:gap-2 lg:gap-2.5 w-full max-w-6xl overflow-x-auto pb-4 pt-8 px-4 scrollbar-none [transform-style:preserve-3d]">
            {displayBooks.map((book, idx) => {
              const isSelected = idx === selectedIndex;
              const isLeftOfSelected = idx < selectedIndex;
              const isRightOfSelected = idx > selectedIndex;
              const distanceFromSelected = Math.abs(idx - selectedIndex);

              // Specific spine heights matching the visual rhythm of the screenshot
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
                    {/* Front Hardback Book Volume with Real Book Cover */}
                    <div
                      className="relative w-[150px] sm:w-[190px] lg:w-[225px] h-[270px] sm:h-[310px] lg:h-[345px] rounded-r-md rounded-l-sm bg-stone-900 border border-stone-700/60 shadow-[0_25px_50px_rgba(0,0,0,0.85),-12px_12px_35px_rgba(0,0,0,0.6)] overflow-hidden transition-all group-hover:shadow-[0_30px_60px_rgba(245,158,11,0.25)]"
                    >
                      {/* Authentic Real Book Cover Image */}
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

                      {/* Left Spine Joint Hinge Crease Shadow */}
                      <div className="absolute top-0 bottom-0 left-0 w-3.5 bg-gradient-to-r from-black/80 via-black/40 to-transparent border-r border-black/30 pointer-events-none" />

                      {/* Book Cover Gloss / Sunbeam Lighting Reflection */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-black/30 via-transparent to-white/25 pointer-events-none" />

                      {/* Hardcover Inner Bevel Border */}
                      <div className="absolute inset-0 border border-white/20 rounded-r-md rounded-l-sm pointer-events-none" />

                      {/* Right Edge Page Block (simulates 3D book thickness) */}
                      <div className="absolute top-0.5 bottom-0.5 -right-2.5 w-2.5 bg-gradient-to-r from-stone-200 via-stone-300 to-stone-400 rounded-r-sm shadow-inner pointer-events-none" />
                    </div>

                    {/* Book Contact Shadow on Table */}
                    <div className="w-[90%] h-4 bg-black/90 rounded-full blur-md mt-1.5 mx-auto transition-all group-hover:scale-95" />

                    {/* Quick Pull / Inspect Pill Badge */}
                    <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-amber-400 hover:bg-amber-300 text-stone-950 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full whitespace-nowrap shadow-xl flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      <span>Inspect Details</span>
                    </div>
                  </div>
                );
              }

              // Angled Spine Books (Left of Center & Right of Center)
              // Left books angle with perspective to the right; Right books angle with perspective to the left.
              const rotateY = isLeftOfSelected ? 32 : -32;
              const skewY = isLeftOfSelected ? -2.5 : 2.5;
              const translateX = isLeftOfSelected ? `${(6 - idx) * 2}px` : `-${(idx - 6) * 2}px`;
              const zIndex = 30 - distanceFromSelected;

              return (
                <div
                  key={book.id}
                  onClick={() => setSelectedIndex(idx)}
                  className={`group relative flex-shrink-0 cursor-pointer transition-all duration-300 ease-out hover:-translate-y-4 hover:brightness-125 select-none ${heightClass}`}
                  style={{
                    width: "36px",
                    maxWidth: "42px",
                    minWidth: "28px",
                    zIndex,
                    transform: `rotateY(${rotateY}deg) skewY(${skewY}deg) translateX(${translateX})`,
                    transformOrigin: isLeftOfSelected ? "bottom right" : "bottom left",
                  }}
                >
                  {/* 3D Physical Spine Body */}
                  <div
                    className="relative w-full h-full rounded-t-sm shadow-[0_15px_30px_rgba(0,0,0,0.85),-4px_4px_10px_rgba(0,0,0,0.6)] flex flex-col justify-between py-4 px-1 text-center overflow-hidden border-t border-b border-black/40"
                    style={{
                      backgroundColor: book.spineColor || "#1e293b",
                      color: book.spineTextColor || "#ffffff",
                    }}
                  >
                    {/* Top Spine Band Accent */}
                    <div className="w-full h-1.5 opacity-60 bg-white/20 rounded-sm mb-2" />

                    {/* Vertical Book Spine Title (Read vertically downwards from top to bottom) */}
                    <div className="my-auto flex items-center justify-center [writing-mode:vertical-rl] transform rotate-180 select-none">
                      <span className="font-serif font-black text-[10px] sm:text-xs tracking-wider uppercase whitespace-nowrap drop-shadow-sm">
                        {book.title.split("(")[0].trim()}
                      </span>
                    </div>

                    {/* Bottom Author on Spine */}
                    <div className="mt-2 flex items-center justify-center [writing-mode:vertical-rl] transform rotate-180 opacity-70">
                      <span className="font-sans font-bold text-[8px] tracking-tight uppercase whitespace-nowrap">
                        {book.author.split(" ")[0]}
                      </span>
                    </div>

                    {/* Bottom Gold/Silver Band Foil Accent */}
                    <div className="w-full h-1 opacity-50 bg-amber-400/40 rounded-sm mt-1" />

                    {/* Spine Highlight Sheen Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-r from-white/15 via-transparent to-black/40 pointer-events-none" />
                  </div>

                  {/* Drop Shadow onto wooden shelf */}
                  <div className="w-[120%] h-3 bg-black/90 rounded-full blur-sm -mt-1 -ml-1 transition-all group-hover:scale-110" />
                </div>
              );
            })}
          </div>

          {/* Solid Wooden Shelf / Table Plank at the Bottom (Matches Screenshot Shelf Surface) */}
          <div className="absolute bottom-0 left-0 right-0 h-6 sm:h-8 bg-gradient-to-r from-[#2c1a0e] via-[#452814] to-[#24150b] rounded-t-sm border-t-2 border-amber-600/50 shadow-[0_-10px_25px_rgba(0,0,0,0.8),inset_0_2px_4px_rgba(255,255,255,0.15)] pointer-events-none" />
        </div>
      </div>

      {/* 5. BOTTOM BOOK INFO & DIRECT ORDER BAR */}
      <div className="relative z-30 max-w-5xl mx-auto w-full px-4 pb-6 pt-2">
        <div className="bg-stone-950/80 backdrop-blur-md rounded-2xl border border-amber-800/40 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xl">
          {/* Active Book Highlights */}
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="w-12 h-16 rounded-md overflow-hidden shadow-md border border-amber-500/40 flex-shrink-0 hidden sm:block">
              <img
                src={activeBook.coverImage}
                alt={activeBook.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                  Selected Book ({selectedIndex + 1} of 12)
                </span>
                <span className="text-stone-600">•</span>
                <span className="text-xs text-stone-300 font-semibold">{activeBook.category}</span>
              </div>
              <h4 className="font-serif font-bold text-lg text-white">
                {activeBook.title}
              </h4>
              <p className="text-xs text-stone-400">
                By <strong className="text-amber-300">{activeBook.author}</strong> — {activeBook.pages} pages
              </p>
            </div>
          </div>

          {/* Pricing & Store Actions */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <div className="text-right mr-2">
              <div className="font-serif font-extrabold text-xl text-amber-300">
                {activeBook.discountPrice || activeBook.price} <span className="text-xs font-sans text-amber-400">ETB</span>
              </div>
              {activeBook.discountPrice && (
                <div className="text-[11px] text-stone-500 line-through">
                  {activeBook.price} ETB
                </div>
              )}
            </div>

            <button
              onClick={() => handleOpenBookModal(activeBook)}
              className="px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-200 border border-stone-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Info className="w-3.5 h-3.5 text-amber-400" />
              <span>Details</span>
            </button>

            <button
              onClick={(e) => handleQuickAdd(activeBook, e)}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs uppercase tracking-wider transition-all shadow-lg flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>ADD TO CART</span>
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* FULL BOOK INSPECTION MODAL (When inspecting a book) */}
      {/* ======================================================== */}
      {isOpenedView && activeBook && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
          <div className="relative w-full max-w-4xl bg-gradient-to-b from-[#22150c] via-[#180e07] to-[#120904] rounded-3xl border border-amber-600/40 shadow-2xl p-6 sm:p-10 overflow-y-auto max-h-[90vh]">
            {/* Close Button */}
            <button
              onClick={() => setIsOpenedView(false)}
              className="absolute top-4 right-4 p-2.5 rounded-full bg-stone-900/90 hover:bg-amber-500 text-stone-300 hover:text-stone-950 border border-amber-700/40 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Left Column: Book Artwork & Hardback Rendering */}
              <div className="lg:col-span-5 flex flex-col items-center">
                <div className="relative w-[200px] sm:w-[240px] aspect-[1/1.45] rounded-xl overflow-hidden shadow-[0_25px_50px_rgba(0,0,0,0.9)] border-2 border-amber-500/40">
                  <img
                    src={activeBook.coverImage}
                    alt={activeBook.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-0 bottom-0 left-0 w-3.5 bg-gradient-to-r from-black/70 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-tr from-black/40 via-transparent to-white/20" />
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    In Stock ({activeBook.stock} copies)
                  </span>
                </div>
              </div>

              {/* Right Column: Book Details, Quote & Store Actions */}
              <div className="lg:col-span-7 space-y-5">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-600/40 text-amber-300 text-xs font-bold uppercase tracking-wider">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>THE READING HOUR • {activeBook.category}</span>
                  </div>

                  <h3 className="font-serif font-extrabold text-2xl sm:text-3xl text-white tracking-tight">
                    {activeBook.title}
                  </h3>

                  <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-stone-300">
                    <span>By <strong className="text-amber-300 font-serif font-bold text-base">{activeBook.author}</strong></span>
                    <span className="text-stone-600">•</span>
                    <span>{activeBook.pages} pages</span>
                    <span className="text-stone-600">•</span>
                    <div className="flex items-center gap-1 text-amber-400">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      <span className="font-bold text-white">{activeBook.rating.toFixed(1)}</span>
                      <span className="text-stone-400">({activeBook.reviews} reviews)</span>
                    </div>
                  </div>
                </div>

                {/* Key Quote */}
                {activeBook.quote && (
                  <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-800/30">
                    <p className="font-serif italic text-amber-200/90 text-sm leading-relaxed">
                      "{activeBook.quote}"
                    </p>
                    <p className="text-[10px] text-amber-400/80 font-bold uppercase tracking-wider mt-2">
                      — {activeBook.quoteAttribution}
                    </p>
                  </div>
                )}

                {/* Synopsis */}
                <p className="text-stone-300 text-xs sm:text-sm leading-relaxed font-sans">
                  {activeBook.synopsis}
                </p>

                {/* Pricing & Actions */}
                <div className="pt-4 border-t border-amber-900/50 space-y-4">
                  <div className="flex items-baseline gap-3">
                    <span className="font-serif font-extrabold text-3xl text-amber-300 tracking-tight">
                      {activeBook.discountPrice || activeBook.price} <span className="text-sm font-sans font-bold text-amber-400">ETB</span>
                    </span>
                    {activeBook.discountPrice && (
                      <span className="text-sm text-stone-500 line-through">
                        {activeBook.price} ETB
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => handleOrderNow(activeBook)}
                      className="flex-1 min-w-[140px] px-6 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>ORDER NOW</span>
                    </button>

                    <button
                      onClick={(e) => handleQuickAdd(activeBook, e)}
                      className="flex-1 min-w-[140px] px-6 py-3.5 rounded-2xl bg-amber-900/90 hover:bg-amber-800 text-amber-100 font-black text-xs uppercase tracking-wider border border-amber-600/50 transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                    >
                      <span>ADD TO CART</span>
                    </button>

                    <button
                      onClick={handleToggleWishlist}
                      className={`p-3.5 rounded-2xl border transition-colors cursor-pointer ${
                        isFavorited
                          ? "bg-rose-600 border-rose-500 text-white shadow-lg"
                          : "bg-stone-950/80 border-stone-700 text-stone-300 hover:text-white"
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
