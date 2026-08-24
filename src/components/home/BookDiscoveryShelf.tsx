import React from "react";
import { Book } from "../../types";
import { CuratedReadingShelf } from "./CuratedReadingShelf";

interface BookDiscoveryShelfProps {
  books: Book[];
  onSelectBook: (book: Book) => void;
  onNavigateShop: () => void;
  onOrderNow?: (book: Book) => void;
}

export const BookDiscoveryShelf: React.FC<BookDiscoveryShelfProps> = ({
  books,
  onSelectBook,
  onNavigateShop,
  onOrderNow,
}) => {
  return (
    <CuratedReadingShelf
      books={books}
      onSelectBook={onSelectBook}
      onNavigateShop={onNavigateShop}
      onOrderNow={onOrderNow}
    />
  );
};
