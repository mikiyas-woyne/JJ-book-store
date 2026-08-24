import React from "react";
import { X, BookOpen, Sparkles, MapPin, Award, Heart } from "lucide-react";

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExploreShop: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({
  isOpen,
  onClose,
  onExploreShop,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-[#1c140d] text-stone-100 rounded-3xl border border-amber-900/60 shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-stone-900/80 hover:bg-stone-800 text-stone-300 transition-colors border border-stone-800"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-stone-950 flex items-center justify-center font-bold shadow-lg">
            <BookOpen className="w-7 h-7" />
          </div>
          <div>
            <h2 className="font-serif font-extrabold text-2xl text-white">
              About JJ Book Shopping
            </h2>
            <p className="text-xs text-amber-300 font-semibold tracking-wider uppercase">
              Ethiopia's Premier Digital Literary House
            </p>
          </div>
        </div>

        {/* Story Body */}
        <div className="space-y-4 text-xs sm:text-sm text-stone-300 leading-relaxed font-sans">
          <p>
            Welcome to <strong className="text-amber-300">JJ Book Shopping</strong>. Our mission is to make book discovery feel like walking into a beautiful, quiet modern library where every volume tells a story.
          </p>

          <p>
            Founded in Addis Ababa, Ethiopia, JJ Book Shopping bridges timeless Amharic literature, Ge'ez historical manuscripts, and global bestsellers across fiction, technology, business, and self-development.
          </p>

          {/* Key Pillars Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-4 rounded-2xl bg-stone-900/80 border border-amber-900/40 space-y-1">
              <div className="flex items-center gap-2 text-amber-400 font-serif font-bold text-sm">
                <MapPin className="w-4 h-4" />
                <span>Nationwide Delivery</span>
              </div>
              <p className="text-[11px] text-stone-400">
                24-hour delivery in Addis Ababa and express shipping across all regional states in Ethiopia.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-stone-900/80 border border-amber-900/40 space-y-1">
              <div className="flex items-center gap-2 text-amber-400 font-serif font-bold text-sm">
                <Award className="w-4 h-4" />
                <span>Verified Publishers</span>
              </div>
              <p className="text-[11px] text-stone-400">
                100% authentic print editions directly sourced from top Ethiopian authors & international presses.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-amber-900/50 flex items-center justify-between">
          <span className="text-[11px] text-stone-400 flex items-center gap-1">
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" /> Crafted for Ethiopian Readers
          </span>

          <button
            onClick={() => {
              onClose();
              onExploreShop();
            }}
            className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold text-xs uppercase tracking-wider transition-all shadow-md"
          >
            Explore Library Catalog
          </button>
        </div>
      </div>
    </div>
  );
};
