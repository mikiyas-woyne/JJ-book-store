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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-white text-slate-800 rounded-3xl border border-slate-200 shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-amber-200">
            <BookOpen className="w-6 h-6 text-slate-950" />
          </div>
          <div>
            <h2 className="font-serif font-extrabold text-2xl text-slate-900">
              About JJ Book Shopping
            </h2>
            <p className="text-xs text-amber-700 font-bold tracking-wider uppercase">
              Ethiopia's Premier Bookstore
            </p>
          </div>
        </div>

        {/* Story Body */}
        <div className="space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed font-sans">
          <p>
            Welcome to <strong className="text-slate-900 font-bold">JJ Book Shopping</strong>. Our mission is to make book discovery effortless, inspiring, and delightful for every reader across Ethiopia and beyond.
          </p>

          <p>
            Founded in Addis Ababa, JJ Book Shopping brings together timeless Amharic classics, Ge'ez historical literature, academic texts, and global international bestsellers across fiction, technology, business, and personal growth.
          </p>

          {/* Key Pillars Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/70 space-y-1">
              <div className="flex items-center gap-2 text-amber-900 font-serif font-bold text-sm">
                <MapPin className="w-4 h-4 text-amber-600" />
                <span>Nationwide Express Delivery</span>
              </div>
              <p className="text-xs text-slate-600">
                Same-day doorstep delivery across Addis Ababa and reliable express shipping to all regional cities.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/70 space-y-1">
              <div className="flex items-center gap-2 text-amber-900 font-serif font-bold text-sm">
                <Award className="w-4 h-4 text-amber-600" />
                <span>100% Verified Authentic Titles</span>
              </div>
              <p className="text-xs text-slate-600">
                Directly sourced from trusted Ethiopian authors, local presses, and international publishing houses.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" /> Crafted for Readers Across Ethiopia
          </span>

          <button
            onClick={() => {
              onClose();
              onExploreShop();
            }}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider transition-all shadow-md shadow-amber-200 cursor-pointer"
          >
            Explore Book Catalog
          </button>
        </div>
      </div>
    </div>
  );
};
