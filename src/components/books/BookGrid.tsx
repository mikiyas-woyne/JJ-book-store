import React, { useState } from "react";
import { BookCard } from "./BookCard";
import { BookListItem } from "./BookListItem";
import { Book } from "../../types";
import { BookX, LayoutGrid, List, Sparkles } from "lucide-react";

interface BookGridProps {
  books: Book[];
  loading?: boolean;
  onSelectBook: (book: Book) => void;
  emptyMessage?: string;
  onResetFilters?: () => void;
  showViewToggle?: boolean;
}

export const BookGrid: React.FC<BookGridProps> = ({
  books,
  loading = false,
  onSelectBook,
  emptyMessage = "No books found matching your current filter criteria.",
  onResetFilters,
  showViewToggle = true,
}) => {
  const [layoutMode, setLayoutMode] = useState<"grid" | "list">("grid");

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-5">
        {Array.from({ length: 10 }).map((_, idx) => (
          <div
            key={idx}
            className="bg-white rounded-2xl p-4 border border-slate-200 animate-pulse flex flex-col gap-3 shadow-sm"
          >
            <div className="aspect-[3/4] bg-slate-100 rounded-xl w-full" />
            <div className="h-4 bg-slate-100 rounded w-1/3" />
            <div className="h-5 bg-slate-200 rounded w-5/6" />
            <div className="h-4 bg-slate-100 rounded w-1/2" />
            <div className="h-8 bg-slate-200 rounded w-full mt-2" />
          </div>
        ))}
      </div>
    );
  }

  if (books.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-300 max-w-lg mx-auto my-8 space-y-4 shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center border border-amber-200">
          <BookX className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h3 className="font-serif font-bold text-slate-900 text-lg">No Books Found</h3>
          <p className="text-slate-500 text-sm">{emptyMessage}</p>
        </div>
        {onResetFilters && (
          <button
            onClick={onResetFilters}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            Reset Filters & View All
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header bar: Counter and Grid/List toggle */}
      {showViewToggle && (
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-amber-50 text-amber-700 text-xs font-extrabold border border-amber-200">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            </span>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Showing <strong className="text-slate-900 font-extrabold text-sm">{books.length}</strong> Titles
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setLayoutMode("grid")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                layoutMode === "grid"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="Card Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">Grid</span>
            </button>

            <button
              onClick={() => setLayoutMode("list")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                layoutMode === "list"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="Detailed List View"
            >
              <List className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">List</span>
            </button>
          </div>
        </div>
      )}

      {/* Book Catalog Layout */}
      {layoutMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-5">
          {books.map((book) => (
            <BookCard key={book.id} book={book} onSelectBook={onSelectBook} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {books.map((book) => (
            <BookListItem key={book.id} book={book} onSelectBook={onSelectBook} />
          ))}
        </div>
      )}
    </div>
  );
};
