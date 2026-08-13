import React, { useState } from "react";
import { Search, X, BookOpen, Star, ArrowRight } from "lucide-react";
import { Book } from "../../types";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  books: Book[];
  onSelectBook: (book: Book) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  books,
  onSelectBook
}) => {
  const [query, setQuery] = useState("");

  if (!isOpen) return null;

  const filtered = query.trim()
    ? books.filter(
        (b) =>
          b.title.toLowerCase().includes(query.toLowerCase()) ||
          b.authorName.toLowerCase().includes(query.toLowerCase()) ||
          b.categoryName.toLowerCase().includes(query.toLowerCase()) ||
          b.ISBN.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-md flex items-start justify-center p-4 sm:p-10 animate-in fade-in">
      <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-2xl overflow-hidden flex flex-col my-auto">
        {/* Search Input Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center gap-3 bg-slate-50">
          <Search className="w-6 h-6 text-amber-600 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, author, ISBN, or category..."
            autoFocus
            className="w-full bg-transparent text-slate-900 font-serif font-bold text-base sm:text-lg focus:outline-none placeholder:text-slate-400 placeholder:font-sans"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-1 rounded-full text-slate-400 hover:bg-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold"
          >
            Esc
          </button>
        </div>

        {/* Quick Search Recommendations / Results */}
        <div className="p-5 max-h-[60vh] overflow-y-auto space-y-4">
          {!query.trim() ? (
            <div className="space-y-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Popular Search Terms
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                {["Fiqir Eske Mequabir", "Haddis Alemayehu", "Atomic Habits", "Oromay", "Amharic Literature", "Clean Code", "Steve Jobs"].map((term) => (
                  <button
                    key={term}
                    onClick={() => setQuery(term)}
                    className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 font-medium border border-amber-900/10 transition-colors"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              No bookstore items match "{query}". Try searching by author name or category.
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Search Results ({filtered.length})
              </p>
              {filtered.map((b) => (
                <div
                  key={b.id}
                  onClick={() => {
                    onSelectBook(b);
                    onClose();
                  }}
                  className="p-3 rounded-2xl hover:bg-amber-50/80 border border-transparent hover:border-amber-300 cursor-pointer transition-all flex items-center justify-between gap-4 group"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={b.coverImage}
                      alt={b.title}
                      className="w-12 h-16 object-cover rounded-xl shrink-0"
                    />
                    <div>
                      <h4 className="font-serif font-bold text-slate-900 text-sm group-hover:text-amber-900">
                        {b.title}
                      </h4>
                      <p className="text-xs text-slate-500">by {b.authorName} • {b.categoryName}</p>
                      <div className="flex items-center gap-1 text-[11px] text-amber-500 font-bold mt-0.5">
                        <Star className="w-3 h-3 fill-amber-400" />
                        <span>{b.ratingAverage.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-extrabold text-slate-900 text-sm">
                      {b.discountPrice || b.price} ETB
                    </span>
                    <ArrowRight className="w-4 h-4 text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity ml-auto mt-1" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
