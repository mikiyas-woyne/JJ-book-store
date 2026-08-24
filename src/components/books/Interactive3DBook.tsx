import React, { useState, useEffect } from "react";
import { Book } from "../../types";
import { getValidBookCover } from "../../lib/sampleData";
import { RotateCw, BookOpen, Layers, Eye, Sparkles, ChevronRight, ChevronLeft, Move } from "lucide-react";

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
        {/* Polished Table Surface Spotlight & Reflection Plane */}
        <div className="absolute bottom-0 inset-x-8 h-24 bg-gradient-to-t from-amber-500/10 via-amber-700/5 to-transparent pointer-events-none rounded-[100%] blur-2xl transform translate-y-4" />

        {/* Ambient Table Plinth Contact Ring */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[240px] sm:w-[280px] h-10 bg-radial from-amber-950/70 via-black/80 to-transparent rounded-full blur-md pointer-events-none" />

        {/* Realistic Ground Contact Shadow cast by the 3D Book */}
        <div
          className="absolute bottom-5 left-1/2 -translate-x-1/2 w-[180px] sm:w-[210px] h-7 bg-black/90 rounded-[100%] blur-lg transition-all duration-200 pointer-events-none"
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
            className="absolute inset-0 rounded-l-md bg-[#1d140e] border-l-2 border-amber-900/60 shadow-2xl z-0"
            style={{
              transform: "translateZ(-18px)",
              backgroundImage: "linear-gradient(135deg, #2b1c13 0%, #170e08 100%)",
            }}
          >
            {/* Back Cover Gold Foil Line */}
            <div className="absolute inset-3 border border-amber-500/20 rounded-sm pointer-events-none" />
          </div>

          {/* PAGE BLOCK THICKNESS - RIGHT SIDE */}
          <div
            className="absolute top-1.5 right-0 bottom-1.5 w-[32px] bg-[#fdfbf7] border-y border-stone-300 shadow-inner z-10"
            style={{
              transform: "rotateY(90deg) translateX(16px)",
              transformOrigin: "right center",
              backgroundImage:
                "repeating-linear-gradient(90deg, #eae3d8, #eae3d8 1px, #fdfbf7 1px, #fdfbf7 3px)",
            }}
          >
            <div className="absolute top-1/2 -translate-y-1/2 left-0 w-full h-1 bg-amber-900/30" />
          </div>

          {/* PAGE BLOCK THICKNESS - BOTTOM SIDE */}
          <div
            className="absolute bottom-0 left-2 right-2 h-[32px] bg-[#fdfbf7] border-x border-stone-300 shadow-inner z-10"
            style={{
              transform: "rotateX(-90deg) translateY(16px)",
              transformOrigin: "bottom center",
              backgroundImage:
                "repeating-linear-gradient(0deg, #eae3d8, #eae3d8 1px, #fdfbf7 1px, #fdfbf7 3px)",
            }}
          />

          {/* PAGE BLOCK THICKNESS - TOP SIDE */}
          <div
            className="absolute top-0 left-2 right-2 h-[32px] bg-[#fdfbf7] border-x border-stone-300 shadow-inner z-10"
            style={{
              transform: "rotateX(90deg) translateY(-16px)",
              transformOrigin: "top center",
              backgroundImage:
                "repeating-linear-gradient(0deg, #eae3d8, #eae3d8 1px, #fdfbf7 1px, #fdfbf7 3px)",
            }}
          />

          {/* LEFT SPINE (3D Side) */}
          <div
            className="absolute top-0 left-0 bottom-0 w-[36px] bg-gradient-to-r from-stone-950 via-[#2f1b11] to-stone-900 rounded-l-sm shadow-2xl z-20 flex flex-col items-center justify-between py-4 border-r border-amber-600/30"
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
            className={`absolute inset-0 bg-[#fbf9f4] rounded-r-md p-4 text-stone-900 shadow-inner z-15 border border-stone-300 transition-opacity duration-300 ${
              isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
            style={{ transform: "translateZ(1px)" }}
          >
            <div className="h-full flex flex-col justify-between border border-stone-300/60 p-3 rounded bg-[#fdfcfa]">
              <div>
                <span className="text-[8px] font-bold text-amber-900 uppercase tracking-widest block mb-1">
                  Ex Libris • JJ Bookstore
                </span>
                <h4 className="font-serif font-extrabold text-xs text-stone-900 leading-tight">
                  {book.title}
                </h4>
                <p className="text-[10px] text-stone-600 font-serif italic mt-0.5">
                  by {book.authorName}
                </p>
                <div className="w-8 h-[1px] bg-amber-800/40 my-2" />
                <p className="text-[9px] text-stone-700 leading-relaxed font-serif line-clamp-5">
                  {book.description ||
                    "A masterpiece of Ethiopian literature capturing culture, history, and human devotion."}
                </p>
              </div>
              <div className="text-[8px] text-stone-500 font-mono text-center border-t border-stone-200 pt-1">
                Page 1 of {book.pages || 280}
              </div>
            </div>
          </div>

          {/* DYNAMIC ANIMATED TURNING PAGE LEAF */}
          {isFlippingPage && (
            <div
              className="absolute inset-0 bg-[#fbf9f4] rounded-r-md shadow-2xl z-25 p-4 border border-stone-300 animate-page-flip origin-left pointer-events-none"
              style={{ transformStyle: "preserve-3d" }}
            >
              <div className="h-full border border-stone-200 p-2 text-[8px] font-serif text-stone-600 opacity-60">
                Turning page...
              </div>
            </div>
          )}

          {/* FRONT COVER (Opens / Closes) */}
          <div
            className={`absolute inset-0 rounded-r-md overflow-hidden bg-stone-950 shadow-2xl border-r-2 border-t border-amber-600/40 transition-transform duration-700 ease-in-out z-20 ${
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
            <div className="absolute inset-0 bg-gradient-to-tr from-stone-950/50 via-transparent to-white/30 pointer-events-none" />

            {/* Spine Crease Line */}
            <div className="absolute top-0 bottom-0 left-3 w-[2px] bg-black/40 shadow-[1px_0_2px_rgba(255,255,255,0.25)] pointer-events-none" />

            {/* Gold Embossed Ribbon Corner */}
            <div className="absolute top-3 right-3 px-2 py-0.5 bg-amber-500 text-stone-950 text-[9px] font-extrabold uppercase tracking-widest rounded-sm shadow-md border border-amber-300">
              {book.currency || "ETB"} {book.discountPrice || book.price}
            </div>
          </div>
        </div>
      </div>

      {/* FLOATING BRASS & MAHOGANY 3D CONTROL BAR */}
      <div className="mt-1 flex flex-col items-center gap-2">
        <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 bg-stone-950/80 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-amber-600/30 shadow-xl">
          {onPrevBook && (
            <button
              onClick={onPrevBook}
              className="p-1.5 hover:bg-amber-950/80 rounded-xl text-amber-300 transition-colors"
              title="Previous Book"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
              autoRotate
                ? "bg-amber-600 text-stone-950 shadow-md shadow-amber-900/50 font-extrabold"
                : "hover:bg-amber-950/80 text-amber-200"
            }`}
            title="Toggle 3D Auto Orbit"
          >
            <RotateCw className={`w-3.5 h-3.5 ${autoRotate ? "animate-spin" : ""}`} />
            <span>Orbit</span>
          </button>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
              isOpen
                ? "bg-amber-400 text-stone-950 shadow-md shadow-amber-900/50 font-extrabold"
                : "hover:bg-amber-950/80 text-amber-200"
            }`}
            title="Open Book Cover"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>{isOpen ? "Close" : "Open Cover"}</span>
          </button>

          <button
            onClick={handleTurnPage}
            className="px-3 py-1.5 hover:bg-amber-950/80 text-amber-200 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors"
            title="Flip Page"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Turn Page</span>
          </button>

          <button
            onClick={() => setIsInspected(!isInspected)}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
              isInspected
                ? "bg-amber-400 text-stone-950 font-extrabold"
                : "hover:bg-amber-950/80 text-amber-200"
            }`}
            title="Inspect Zoom"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Zoom</span>
          </button>

          {onNextBook && (
            <button
              onClick={onNextBook}
              className="p-1.5 hover:bg-amber-950/80 rounded-xl text-amber-300 transition-colors"
              title="Next Book"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        <p className="text-[11px] text-amber-200/70 text-center font-sans tracking-wide">
          Click & drag to rotate 3D volume • Press <span className="text-amber-300 font-semibold">Open Cover</span> to preview inside
        </p>
      </div>
    </div>
  );
};

