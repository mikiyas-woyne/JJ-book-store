import React, { useState, useEffect } from "react";
import { collection, getDocs, onSnapshot } from "firebase/firestore";
import { db } from "./lib/firebase";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { CartProvider, useCart } from "./context/CartContext";
import { WishlistProvider } from "./context/WishlistContext";
import { ToastProvider, useToast } from "./components/ui/Toast";
import { Header } from "./components/layout/Header";
import { Footer } from "./components/layout/Footer";
import { MobileBottomNav } from "./components/layout/MobileBottomNav";
import { BookGrid } from "./components/books/BookGrid";
import { BookDetailsModal } from "./components/books/BookDetailsModal";
import { CartDrawer } from "./components/cart/CartDrawer";
import { CheckoutModal } from "./components/checkout/CheckoutModal";
import { SearchModal } from "./components/search/SearchModal";
import { AuthModal } from "./components/auth/AuthModal";
import { UserAccountView } from "./components/account/UserAccountView";
import { AdminDashboard } from "./components/admin/AdminDashboard";
import { EmployeePanel } from "./components/employee/EmployeePanel";
import { LibraryEnvironmentHero } from "./components/home/LibraryEnvironmentHero";
import { BookDiscoveryShelf } from "./components/home/BookDiscoveryShelf";
import { LibraryCategories } from "./components/home/LibraryCategories";
import { AboutModal } from "./components/info/AboutModal";
import { ContactModal } from "./components/info/ContactModal";
import { Book, Author, Category, Coupon, Order } from "./types";
import { seedBookstoreData } from "./lib/seed";
import {
  INITIAL_BOOKS,
  INITIAL_AUTHORS,
  INITIAL_CATEGORIES,
  INITIAL_COUPONS,
  getValidBookCover
} from "./lib/sampleData";
import {
  BookOpen,
  Sparkles,
  ArrowRight,
  Filter,
  CheckCircle2,
  TrendingUp,
  Star,
  Users,
  Layers,
  Award
} from "lucide-react";

function MainAppContent() {
  const { showToast } = useToast();
  const { addToCart } = useCart();
  const { currentUser } = useAuth();

  // Pending Auth Intent & Notice State
  const [pendingAuthAction, setPendingAuthAction] = useState<{
    type: "buy_now" | "checkout" | "account";
    book?: Book;
    quantity?: number;
    tab?: string;
  } | null>(null);
  const [authNoticeReason, setAuthNoticeReason] = useState<string | null>(null);

  // Navigation State
  const [activePage, setActivePage] = useState<
    "home" | "shop" | "categories" | "authors" | "account" | "admin" | "employee" | "auth"
  >("home");
  const [accountTab, setAccountTab] = useState<string>("orders");

  // Data Collections State
  const [books, setBooks] = useState<Book[]>(INITIAL_BOOKS);
  const [authors, setAuthors] = useState<Author[]>(INITIAL_AUTHORS);
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [coupons, setCoupons] = useState<Coupon[]>(INITIAL_COUPONS);
  const [loadingData, setLoadingData] = useState(true);

  // Modals & Drawers State
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);

  // Shop Filters State
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [selectedAuthorId, setSelectedAuthorId] = useState<string>("all");
  const [selectedSort, setSelectedSort] = useState<string>("newest");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<number>(1000);

  // Initial Load & Realtime Listeners
  const loadStoreData = () => {
    setLoadingData(true);
    let unsubBooks = () => {};
    let unsubAuthors = () => {};
    let unsubCategories = () => {};

    try {
      unsubBooks = onSnapshot(
        collection(db, "books"),
        (snap) => {
          if (!snap.empty) {
            const list: Book[] = [];
            snap.forEach((d) => {
              const bookData = d.data() as Book;
              list.push({
                ...bookData,
                id: d.id,
                coverImage: getValidBookCover(bookData)
              });
            });
            setBooks(list);
          }
          setLoadingData(false);
        },
        (err) => {
          console.warn("Books snapshot notice:", err.message);
          setLoadingData(false);
        }
      );

      unsubAuthors = onSnapshot(
        collection(db, "authors"),
        (snap) => {
          if (!snap.empty) {
            const list: Author[] = [];
            snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Author));
            setAuthors(list);
          }
        },
        (err) => console.warn("Authors snapshot notice:", err.message)
      );

      unsubCategories = onSnapshot(
        collection(db, "categories"),
        (snap) => {
          if (!snap.empty) {
            const list: Category[] = [];
            snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Category));
            setCategories(list);
          }
        },
        (err) => console.warn("Categories snapshot notice:", err.message)
      );

      (async () => {
        try {
          const booksSnap = await getDocs(collection(db, "books"));
          const hasRealAmharicBooks = booksSnap.docs.some(
            (docSnap) => docSnap.id === "book-yetoqolefebet-kulf" || docSnap.id === "book-fiqir-eske-mequabir"
          );
          const hasOldSvgCovers = booksSnap.docs.some((docSnap) => {
            const cover = docSnap.data().coverImage;
            return typeof cover === "string" && cover.startsWith("data:image/svg");
          });

          if (booksSnap.empty || !hasRealAmharicBooks || hasOldSvgCovers) {
            console.log("Seeding Firestore with real book photographic covers...");
            await seedBookstoreData(true);
          }
        } catch (seedErr) {
          console.warn("Firestore seed check notice:", seedErr);
        }
      })();
    } catch (err) {
      console.warn("Firestore listener setup notice:", err);
      setLoadingData(false);
    }

    return () => {
      unsubBooks();
      unsubAuthors();
      unsubCategories();
    };
  };

  useEffect(() => {
    loadStoreData();
  }, []);

  const handleNavigate = (page: string, params?: Record<string, string>) => {
    if (page === "auth") {
      setAuthNoticeReason(null);
      setIsAuthOpen(true);
      return;
    }
    if (page === "about") {
      setIsAboutOpen(true);
      return;
    }
    if (page === "contact") {
      setIsContactOpen(true);
      return;
    }
    if (page === "account") {
      if (!currentUser) {
        setPendingAuthAction({ type: "account", tab: params?.tab || "orders" });
        setAuthNoticeReason("Please sign in or create an account to view your account dashboard & orders.");
        setIsAuthOpen(true);
        showToast("Sign In Required", "Please sign in or create an account to access your account.", "info");
        return;
      }
      if (params?.tab) {
        setAccountTab(params.tab);
      }
    }
    setActivePage(page as any);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBuyNow = (book: Book, quantity: number) => {
    if (!currentUser) {
      setPendingAuthAction({ type: "buy_now", book, quantity });
      setAuthNoticeReason(`Please sign in or create an account to purchase "${book.title}". You will continue directly to checkout after signing in.`);
      setSelectedBook(null);
      setIsAuthOpen(true);
      showToast("Sign In Required", "Please sign in or create an account before buying books.", "info");
      return;
    }
    addToCart(book, quantity);
    setSelectedBook(null);
    setIsCheckoutOpen(true);
  };

  const handleProceedToCheckout = () => {
    if (!currentUser) {
      setPendingAuthAction({ type: "checkout" });
      setAuthNoticeReason("Please sign in or create an account to complete your book purchase. You will return directly to checkout after signing in.");
      setIsCartOpen(false);
      setIsAuthOpen(true);
      showToast("Sign In Required", "Please sign in or create an account before checking out.", "info");
      return;
    }
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  useEffect(() => {
    if (currentUser && pendingAuthAction) {
      const action = pendingAuthAction;
      setPendingAuthAction(null);
      setAuthNoticeReason(null);
      setIsAuthOpen(false);

      if (action.type === "buy_now" && action.book) {
        addToCart(action.book, action.quantity || 1);
        setIsCheckoutOpen(true);
        showToast(
          "Signed In Successfully",
          `Welcome, ${currentUser.displayName || currentUser.email}! Resuming checkout for "${action.book.title}".`,
          "success"
        );
      } else if (action.type === "checkout") {
        setIsCheckoutOpen(true);
        showToast(
          "Signed In Successfully",
          `Welcome, ${currentUser.displayName || currentUser.email}! Continuing to secure checkout...`,
          "success"
        );
      } else if (action.type === "account") {
        setActivePage("account");
        if (action.tab) setAccountTab(action.tab);
        showToast(
          "Signed In Successfully",
          `Welcome, ${currentUser.displayName || currentUser.email}! Opened your account area.`,
          "success"
        );
      }
    }
  }, [currentUser, pendingAuthAction]);

  const filteredBooks = books.filter((b) => {
    if (!b.active) return false;
    if (selectedCategoryId !== "all" && b.categoryId !== selectedCategoryId) return false;
    if (selectedAuthorId !== "all" && b.authorId !== selectedAuthorId) return false;
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      const matchTitle = b.title.toLowerCase().includes(q);
      const matchAuthor = b.authorName.toLowerCase().includes(q);
      const matchCat = b.categoryName.toLowerCase().includes(q);
      const matchDesc = b.description ? b.description.toLowerCase().includes(q) : false;
      if (!matchTitle && !matchAuthor && !matchCat && !matchDesc) return false;
    }
    const price = b.discountPrice || b.price;
    if (price > maxPrice) return false;
    return true;
  });

  const sortedBooks = [...filteredBooks].sort((a, b) => {
    const priceA = a.discountPrice || a.price;
    const priceB = b.discountPrice || b.price;

    if (selectedSort === "price-low") return priceA - priceB;
    if (selectedSort === "price-high") return priceB - priceA;
    if (selectedSort === "rating") return b.ratingAverage - a.ratingAverage;
    if (selectedSort === "bestselling") return b.soldCount - a.soldCount;
    // Sort alphabetically by title, ignoring case (A→Z)
    if (selectedSort === "title-az") return a.title.localeCompare(b.title);
    // Sort alphabetically by title, ignoring case, reversed (Z→A)
    if (selectedSort === "title-za") return b.title.localeCompare(a.title);
    return new Date(b.createdAt || "").getTime() - new Date(a.createdAt || "").getTime();
  });

  return (
    <div className="min-h-screen bg-[#fffdf7] flex flex-col text-slate-800 font-sans antialiased">
      {/* Header Navigation */}
      <Header
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenCart={() => setIsCartOpen(true)}
        onNavigate={handleNavigate}
        onOpenAbout={() => setIsAboutOpen(true)}
        onOpenContact={() => setIsContactOpen(true)}
        activePage={activePage}
      />

      {/* Main Page Area */}
      <main className="flex-1 pb-16 md:pb-0">
        {/* PAGE 1: HOME PAGE */}
        {activePage === "home" && (
          <div className="space-y-0 pb-12">
            {/* 1. CINEMATIC LIBRARY ENVIRONMENT HERO WITH 3D BOOK */}
            <LibraryEnvironmentHero
              books={books}
              onSelectBook={(bk) => setSelectedBook(bk)}
            />

            {/* 2. INTERACTIVE HORIZONTAL BOOK DISCOVERY SHELF */}
            <BookDiscoveryShelf
              books={books}
              onSelectBook={(bk) => setSelectedBook(bk)}
              onNavigateShop={() => handleNavigate("shop")}
              onOrderNow={(bk) => handleBuyNow(bk, 1)}
            />
          </div>
        )}

        {/* PAGE 2: SHOP CATALOG PAGE */}
        {activePage === "shop" && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
            {/* Header & Controls Bar */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-indigo-100 pb-6">
              <div>
                <h1 className="font-serif font-extrabold text-2xl sm:text-3xl text-slate-900 flex items-center gap-3">
                  <span>Digital Library Catalog</span>
                  <span className="text-xs font-sans font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-1 rounded-full">
                    {sortedBooks.length} Available
                  </span>
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Browse authentic Ethiopian literature, historical works, and global titles with instant ordering
                </p>
              </div>

              {/* Controls & Filter Bar */}
              <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                <select
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className="px-3.5 py-2 rounded-xl border border-indigo-100 bg-white text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500"
                >
                  <option value="all">All Categories ({categories.length})</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedAuthorId}
                  onChange={(e) => setSelectedAuthorId(e.target.value)}
                  className="px-3.5 py-2 rounded-xl border border-indigo-100 bg-white text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500"
                >
                  <option value="all">All Authors ({authors.length})</option>
                  {authors.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedSort}
                  onChange={(e) => setSelectedSort(e.target.value)}
                  className="px-3.5 py-2 rounded-xl border border-indigo-100 bg-white text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500"
                >
                  <option value="newest">Newest Titles</option>
                  <option value="bestselling">Most Popular</option>
                  <option value="rating">Highest Rated</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="title-az">Title: A to Z</option>
                  <option value="title-za">Title: Z to A</option>
                </select>
              </div>
            </div>

            {/* Quick Category Pills Bar */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              <button
                onClick={() => setSelectedCategoryId("all")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                  selectedCategoryId === "all"
                    ? "bg-amber-500 text-stone-950 shadow-md"
                    : "bg-white text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 border border-indigo-100"
                }`}
              >
                All Genres ({books.length})
              </button>
              {categories.map((cat) => {
                const count = books.filter((b) => b.categoryId === cat.id).length;
                const isSelected = selectedCategoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategoryId(cat.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-amber-500 text-stone-950 shadow-md"
                        : "bg-white text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 border border-indigo-100"
                    }`}
                  >
                    <span>{cat.name}</span>
                    {count > 0 && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? "bg-indigo-950/10 text-indigo-950" : "bg-slate-100 text-slate-500"}`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Active Filter Tags Row (if filtered) */}
            {(selectedCategoryId !== "all" || selectedAuthorId !== "all" || searchQuery.trim() !== "") && (
              <div className="flex flex-wrap items-center gap-2 pt-1 pb-1">
                  <span className="text-xs text-slate-500 font-medium">Active Filters:</span>

                {selectedCategoryId !== "all" && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-950/80 border border-amber-800/60 text-amber-300 text-xs font-semibold">
                    Category: {categories.find((c) => c.id === selectedCategoryId)?.name || selectedCategoryId}
                    <button
                      onClick={() => setSelectedCategoryId("all")}
                      className="text-amber-400 hover:text-white font-bold ml-1"
                    >
                      ×
                    </button>
                  </span>
                )}

                {selectedAuthorId !== "all" && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-950/80 border border-amber-800/60 text-amber-300 text-xs font-semibold">
                    Author: {authors.find((a) => a.id === selectedAuthorId)?.name || selectedAuthorId}
                    <button
                      onClick={() => setSelectedAuthorId("all")}
                      className="text-amber-400 hover:text-white font-bold ml-1"
                    >
                      ×
                    </button>
                  </span>
                )}

                {searchQuery.trim() !== "" && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-950/80 border border-amber-800/60 text-amber-300 text-xs font-semibold">
                    Search: &ldquo;{searchQuery}&rdquo;
                    <button
                      onClick={() => setSearchQuery("")}
                      className="text-amber-400 hover:text-white font-bold ml-1"
                    >
                      ×
                    </button>
                  </span>
                )}

                <button
                  onClick={() => {
                    setSelectedCategoryId("all");
                    setSelectedAuthorId("all");
                    setSearchQuery("");
                  }}
                  className="text-xs font-bold text-amber-400 hover:text-amber-300 underline ml-2"
                >
                  Clear All
                </button>
              </div>
            )}

            {/* Book Catalog Grid */}
            <BookGrid
              books={sortedBooks}
              loading={loadingData}
              onSelectBook={(bk) => setSelectedBook(bk)}
              onResetFilters={() => {
                setSelectedCategoryId("all");
                setSelectedAuthorId("all");
                setSearchQuery("");
              }}
            />
          </div>
        )}

        {/* PAGE 3: CATEGORIES LIST */}
        {activePage === "categories" && (
          <LibraryCategories
            categories={categories}
            onSelectCategory={(catId) => {
              setSelectedCategoryId(catId);
              handleNavigate("shop");
            }}
          />
        )}

        {/* PAGE 4: AUTHORS LIST */}
        {activePage === "authors" && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
            <div className="space-y-1">
              <h1 className="font-serif font-extrabold text-2xl sm:text-3xl text-slate-900">
                Featured Authors
              </h1>
              <p className="text-xs text-slate-500">Discover literary authors and their works</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {authors.map((auth) => (
                <div
                  key={auth.id}
                  onClick={() => {
                    setSelectedAuthorId(auth.id);
                    handleNavigate("shop");
                  }}
                  className="p-6 rounded-3xl bookshop-card hover:border-indigo-300 cursor-pointer transition-all space-y-4 group"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={auth.image}
                      alt={auth.name}
                      className="w-16 h-16 rounded-full object-cover border-2 border-amber-400 group-hover:scale-105 transition-transform"
                    />
                    <div>
                      <h3 className="font-serif font-bold text-slate-900 text-base group-hover:text-indigo-700">
                        {auth.name}
                      </h3>
                      <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                        Author
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                    {auth.bio}
                  </p>

                  <div className="pt-2 border-t border-indigo-100 flex items-center justify-between text-xs font-bold text-indigo-600">
                    <span>View Books by {auth.name.split(" ")[0]}</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PAGE 5: USER ACCOUNT DASHBOARD */}
        {activePage === "account" && (
          <UserAccountView
            initialTab={accountTab}
            books={books}
            onSelectBook={(b) => setSelectedBook(b)}
            onNavigate={handleNavigate}
          />
        )}

        {/* PAGE 6: ADMIN DASHBOARD */}
        {activePage === "admin" && (
          <AdminDashboard
            books={books}
            authors={authors}
            categories={categories}
            coupons={coupons}
            onRefreshData={loadStoreData}
          />
        )}

        {/* PAGE 7: EMPLOYEE PANEL */}
        {activePage === "employee" && (
          <EmployeePanel
            books={books}
            onRefreshData={loadStoreData}
            onNavigateHome={() => handleNavigate("home")}
          />
        )}
      </main>

      {/* Footer */}
      <Footer onNavigate={handleNavigate} />

      {/* Mobile Sticky Navigation */}
      <MobileBottomNav
        activePage={activePage}
        onNavigate={handleNavigate}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenCart={() => setIsCartOpen(true)}
      />

      {/* Modals & Drawers */}
      <BookDetailsModal
        book={selectedBook}
        onClose={() => setSelectedBook(null)}
        onBuyNow={handleBuyNow}
        relatedBooks={books.filter((b) => b.categoryId === selectedBook?.categoryId && b.id !== selectedBook?.id)}
        onSelectBook={(bk) => setSelectedBook(bk)}
      />

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onProceedToCheckout={handleProceedToCheckout}
      />

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onOrderCompleted={(order) => {
          handleNavigate("account", { tab: "orders" });
        }}
      />

      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        books={books}
        onSelectBook={(bk) => setSelectedBook(bk)}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => {
          setIsAuthOpen(false);
          setAuthNoticeReason(null);
        }}
        reasonNotice={authNoticeReason}
      />

      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
        onExploreShop={() => handleNavigate("shop")}
      />

      <ContactModal
        isOpen={isContactOpen}
        onClose={() => setIsContactOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            <MainAppContent />
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
