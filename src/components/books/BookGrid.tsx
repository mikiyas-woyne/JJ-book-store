import React from "react";
import { BookCard } from "./BookCard";
import { Book } from "../../types";
import { BookX } from "lucide-react";

interface BookGridProps {
  books: Book[];
  loading?: boolean;
  onSelectBook: (book: Book) => void;
  emptyMessage?: string;
}

export const BookGrid: React.FC<BookGridProps> = ({
  books,
  loading = false,
  onSelectBook,
  emptyMessage = "No books found matching your current filter criteria."
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
        {Array.from({ length: 8 }).map((_, idx) => (
          <div
            key={idx}
            className="bg-white rounded-2xl p-4 border border-slate-100 animate-pulse flex flex-col gap-3"
          >
            <div className="aspect-[3/4] bg-slate-200 rounded-xl w-full" />
            <div className="h-4 bg-slate-200 rounded w-1/3" />
            <div className="h-5 bg-slate-200 rounded w-5/6" />
            <div className="h-4 bg-slate-200 rounded w-1/2" />
            <div className="h-8 bg-slate-200 rounded w-full mt-2" />
          </div>
        ))}
      </div>
    );
  }

  if (books.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-200 max-w-lg mx-auto my-8">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center mb-4">
          <BookX className="w-8 h-8" />
        </div>
        <h3 className="font-serif font-bold text-slate-800 text-lg">No Books Found</h3>
        <p className="text-slate-500 text-sm mt-1 mb-6">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
      {books.map((book) => (
        <BookCard key={book.id} book={book} onSelectBook={onSelectBook} />
      ))}
    </div>
  );
};
