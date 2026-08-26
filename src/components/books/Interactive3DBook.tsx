import React, { useState, useEffect } from "react";
import { Book } from "../../types";
import { getValidBookCover } from "../../lib/sampleData";
import { RotateCw, BookOpen, Layers, Eye, Sparkles, ChevronRight, ChevronLeft } from "lucide-react";

interface Interactive3DBookProps {
  book: Book;
  onSelectBook: (book: Book) => void;
  onNextBook?: () => void;
  onPrevBook?: () => void;
}

export const Interactive3DBook: React.FC<Interactive3DBookProps> = ({
  book,
  onSelectBook,
  onNextBook,
  onPrevBook,
}) => {
  const [rotationY, setRotationY] = useState(-20);
  const [rotationX, setRotationX] = useState(10);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isFlippingPage, setIsFlippingPage] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [isInspected, setIsInspected] = useState(false);

  // Auto Orbit Effect
  useEffect(() => {
    if (!autoRotate || isDragging || isInspected) return;
    const interval = setInterval(() => {
      setRotationY((prev) => (prev + 0.4) % 360);
    }, 40);
    return () => clearInterval(interval);
  }, [autoRotate, isDragging, isInspected]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setAutoRotate(false);
    setStartX(e.clientX);
    setStartY(e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    setRotationY((prev) => prev + deltaX * 0.5);
    setRotationX((prev) => Math.max(-25, Math.min(30, prev - deltaY * 0.4)));

    setStartX(e.clientX);
    setStartY(e.clientY);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTurnPage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFlippingPage) return;
    setIsFlippingPage(true);
    setTimeout(() => {
      setIsFlippingPage(false);
    }, 800);
  };

  const coverUrl = getValidBookCover(book);

  return (
    <div className="w-full flex flex-col items-center justify-center select-none py-2">
      {/* Interactive 3D Book Stage (Firmly anchored on table surface) */}
      <div
        className="relative w-full h-[360px] sm:h-[400px] flex items-end justify-center perspective-1500 cursor-grab active:cursor-grabbing pb-8"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Warm Studio Spotlight Reflection on Desk */}
        <div className="absolute bottom-0 inset-x-8 h-24 bg-gradient-to-t from-amber-400/20 via-orange-300/10 to-transparent pointer-events-none rounded-[100%] blur-2xl transform translate-y-4" />

        {/* Ambient Plinth Contact Ring */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[240px] sm:w-[280px] h-10 bg-radial from-amber-900/20 via-slate-900/20 to-transparent rounded-full blur-md pointer-events-none" />

        {/* Ground Contact Shadow cast by the 3D Book */}
        <div
          className="absolute bottom-5 left-1/2 -translate-x-1/2 w-[180px] sm:w-[210px] h-7 bg-slate-900/40 rounded-[100%] blur-lg transition-all duration-200 pointer-events-none"
          style={{
            transform: `translateX(-50%) rotateX(85deg) rotateY(${rotationY * 0.15}deg) scale(${
              isInspected ? 1.25 : 1
            })`,
          }}
        />

        {/* The 3D Physical Book */}
        <div
          className={`relative w-[190px] sm:w-[220px] aspect-[1/1.42] transition-transform duration-300 ease-out transform-style-3d ${
            isInspected ? "scale-110 -translate-y-6" : ""
          }`}
          style={{
            transform: `rotateX(${rotationX}deg) rotateY(${rotationY}deg) translateZ(10px)`,
            transformOrigin: "center bottom",
          }}
        >
          {/* BACK COVER */}
          <div
            className="absolute inset-0 rounded-l-md bg-[#241a12] border-l-2 border-amber-800/60 shadow-xl z-0"
            style={{
              transform: "translateZ(-18px)",
              backgroundImage: "linear-gradient(135deg, #2e2016 0%, #1a120c 100%)",
            }}
          >
            {/* Back Cover Gold Foil Line */}
            <div className="absolute inset-3 border border-amber-400/30 rounded-sm pointer-events-none" />
          </div>

          {/* PAGE BLOCK THICKNESS - RIGHT SIDE */}
          <div
            className="absolute top-1.5 right-0 bottom-1.5 w-[32px] bg-[#fefcf8] border-y border-stone-200 shadow-inner z-10"
            style={{
              transform: "rotateY(90deg) translateX(16px)",
              transformOrigin: "right center",
              backgroundImage:
                "repeating-linear-gradient(90deg, #ede7dc, #ede7dc 1px, #fefcf8 1px, #fefcf8 3px)",
            }}
          >
            <div className="absolute top-1/2 -translate-y-1/2 left-0 w-full h-1 bg-amber-500/20" />
          </div>

          {/* PAGE BLOCK THICKNESS - BOTTOM SIDE */}
          <div
            className="absolute bottom-0 left-2 right-2 h-[32px] bg-[#fefcf8] border-x border-stone-200 shadow-inner z-10"
            style={{
              transform: "rotateX(-90deg) translateY(16px)",
              transformOrigin: "bottom center",
              backgroundImage:
                "repeating-linear-gradient(0deg, #ede7dc, #ede7dc 1px, #fefcf8 1px, #fefcf8 3px)",
            }}
          />

          {/* PAGE BLOCK THICKNESS - TOP SIDE */}
          <div
            className="absolute top-0 left-2 right-2 h-[32px] bg-[#fefcf8] border-x border-stone-200 shadow-inner z-10"
            style={{
              transform: "rotateX(90deg) translateY(-16px)",
              transformOrigin: "top center",
              backgroundImage:
                "repeating-linear-gradient(0deg, #ede7dc, #ede7dc 1px, #fefcf8 1px, #fefcf8 3px)",
            }}
          />

          {/* LEFT SPINE (3D Side) */}
          <div
            className="absolute top-0 left-0 bottom-0 w-[36px] bg-gradient-to-r from-stone-900 via-amber-950 to-stone-800 rounded-l-sm shadow-xl z-20 flex flex-col items-center justify-between py-4 border-r border-amber-400/40"
            style={{
              transform: "rotateY(-90deg) translateX(-18px)",
              transformOrigin: "left center",
            }}
          >
            <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest font-serif drop-shadow-sm">
              JJ
            </span>
            <div className="my-auto flex items-center justify-center [writing-mode:vertical-rl] transform rotate-180 tracking-wider text-[11px] font-serif font-black uppercase text-amber-100 whitespace-nowrap overflow-hidden text-ellipsis max-h-[160px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              {book.title}
            </div>
            <Sparkles className="w-3 h-3 text-amber-400" />
          </div>

          {/* INSIDE PAGES (Visible when cover opens) */}
          <div
            className={`absolute inset-0 bg-[#ffffff] rounded-r-md p-4 text-slate-800 shadow-inner z-15 border border-slate-200 transition-opacity duration-300 ${
              isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
            style={{ transform: "translateZ(1px)" }}
          >
            <div className="h-full flex flex-col justify-between border border-amber-200/50 p-3 rounded-lg bg-[#fefcf8]">
              <div>
                <span className="text-[8px] font-bold text-amber-800 uppercase tracking-widest block mb-1">
                  Ex Libris • JJ Bookstore
                </span>
                <h4 className="font-serif font-extrabold text-xs text-slate-900 leading-tight">
                  {book.title}
                </h4>
                <p className="text-[10px] text-amber-800 font-serif italic mt-0.5">
                  by {book.authorName}
                </p>
                <div className="w-8 h-[1px] bg-amber-500/40 my-2" />
                <p className="text-[9px] text-slate-600 leading-relaxed font-serif line-clamp-5">
                  {book.description ||
                    "A masterpiece of Ethiopian literature capturing culture, history, and human devotion."}
                </p>
              </div>
              <div className="text-[8px] text-slate-400 font-mono text-center border-t border-slate-200 pt-1">
                Page 1 of {book.pages || 280}
              </div>
            </div>
          </div>

          {/* ANIMATED TURNING PAGE LEAF */}
          {isFlippingPage && (
            <div
              className="absolute inset-0 bg-[#ffffff] rounded-r-md shadow-2xl z-25 p-4 border border-slate-200 animate-page-flip origin-left pointer-events-none"
              style={{ transformStyle: "preserve-3d" }}
            >
              <div className="h-full border border-slate-200 p-2 text-[8px] font-serif text-slate-500 opacity-60">
                Turning page...
              </div>
            </div>
          )}

          {/* FRONT COVER (Opens / Closes) */}
          <div
            className={`absolute inset-0 rounded-r-md overflow-hidden bg-slate-900 shadow-2xl border-r border-t border-white/20 transition-transform duration-700 ease-in-out z-20 ${
              isOpen ? "-rotate-y-180 origin-left" : ""
            }`}
            style={{
              transformStyle: "preserve-3d",
              transformOrigin: "left center",
            }}
          >
            <img
              src={coverUrl}
              alt={book.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.currentTarget;
                target.onerror = null;
                target.src = getValidBookCover(book);
              }}
            />

            {/* Glossy Reflective Cover Sheen */}
            <div className="absolute inset-0 bg-gradient-to-tr from-black/30 via-transparent to-white/30 pointer-events-none" />

            {/* Spine Crease Line */}
            <div className="absolute top-0 bottom-0 left-3 w-[2px] bg-black/40 shadow-[1px_0_2px_rgba(255,255,255,0.25)] pointer-events-none" />

            {/* Price Ribbon Corner */}
            <div className="absolute top-3 right-3 px-2.5 py-0.5 bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-wider rounded-md shadow-md border border-amber-300">
              {book.discountPrice || book.price} ETB
            </div>
          </div>
        </div>
      </div>

      {/* FLOATING BRIGHT CONTROL BAR */}
      <div className="mt-1 flex flex-col items-center gap-2">
        <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-slate-200 shadow-lg text-slate-700">
          {onPrevBook && (
            <button
              onClick={onPrevBook}
              className="p-1.5 hover:bg-amber-50 rounded-xl text-slate-700 hover:text-amber-800 transition-colors cursor-pointer"
              title="Previous Book"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              autoRotate
                ? "bg-amber-500 text-slate-950 shadow-sm font-extrabold"
                : "hover:bg-slate-100 text-slate-600 hover:text-slate-900"
            }`}
            title="Toggle 3D Auto Orbit"
          >
            <RotateCw className={`w-3.5 h-3.5 ${autoRotate ? "animate-spin" : ""}`} />
            <span>Orbit</span>
          </button>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              isOpen
                ? "bg-amber-500 text-slate-950 shadow-sm font-extrabold"
                : "hover:bg-slate-100 text-slate-600 hover:text-slate-900"
            }`}
            title="Open Book Cover"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>{isOpen ? "Close" : "Open Cover"}</span>
          </button>

          <button
            onClick={handleTurnPage}
            className="px-3 py-1.5 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Flip Page"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Turn Page</span>
          </button>

          <button
            onClick={() => setIsInspected(!isInspected)}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              isInspected
                ? "bg-amber-500 text-slate-950 font-extrabold"
                : "hover:bg-slate-100 text-slate-600 hover:text-slate-900"
            }`}
            title="Inspect Zoom"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Zoom</span>
          </button>

          {onNextBook && (
            <button
              onClick={onNextBook}
              className="p-1.5 hover:bg-amber-50 rounded-xl text-slate-700 hover:text-amber-800 transition-colors cursor-pointer"
              title="Next Book"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        <p className="text-xs text-slate-500 text-center font-sans">
          Click & drag to rotate • Press <strong className="text-amber-700 font-semibold">Open Cover</strong> to read inside
        </p>
      </div>
    </div>
  );
};
