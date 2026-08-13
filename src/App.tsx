import React, { useState, useEffect } from "react";
import { collection, getDocs, onSnapshot } from "firebase/firestore";
import { db } from "./lib/firebase";
import { AuthProvider } from "./context/AuthContext";
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

  // Shop Filters State
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [selectedAuthorId, setSelectedAuthorId] = useState<string>("all");
  const [selectedSort, setSelectedSort] = useState<string>("newest");
  const [maxPrice, setMaxPrice] = useState<number>(1000);

  // Initial Load & Realtime Listeners
  const loadStoreData = async () => {
    setLoadingData(true);
    try {
      // Auto seed if empty or outdated
      const booksSnap = await getDocs(collection(db, "books"));
      const hasRealAmharicBooks = booksSnap.docs.some(
        (docSnap) => docSnap.id === "book-yetoqolefebet-kulf" || docSnap.id === "book-fiqir-eske-mequabir"
      );

      if (booksSnap.empty || !hasRealAmharicBooks) {
        console.log("Seeding Firestore with real Amharic books...");
        await seedBookstoreData(true);
      }

      // Realtime Books Listener
      const unsubBooks = onSnapshot(
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
        },
        (err) => console.warn("Books snapshot error:", err)
      );

      // Fetch Authors
      const unsubAuthors = onSnapshot(
        collection(db, "authors"),
        (snap) => {
          if (!snap.empty) {
            const list: Author[] = [];
            snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Author));
            setAuthors(list);
          }
        },
        (err) => console.warn("Authors snapshot error:", err)
      );

      // Fetch Categories
      const unsubCategories = onSnapshot(
        collection(db, "categories"),
        (snap) => {
          if (!snap.empty) {
            const list: Category[] = [];
            snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Category));
            setCategories(list);
          }
        },
        (err) => console.warn("Categories snapshot error:", err)
      );

      return () => {
        unsubBooks();
        unsubAuthors();
        unsubCategories();
      };
    } catch (err) {
      console.error("Error loading store data:", err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    loadStoreData();
  }, []);

  const handleNavigate = (page: string, params?: Record<string, string>) => {
    if (page === "auth") {
      setIsAuthOpen(true);
      return;
    }
    if (page === "account" && params?.tab) {
      setAccountTab(params.tab);
    }
    setActivePage(page as any);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBuyNow = (book: Book, quantity: number) => {
    addToCart(book, quantity);
    setSelectedBook(null);
    setIsCheckoutOpen(true);
  };

  // Filter & Sort Logic for Shop Page
  const filteredBooks = books.filter((b) => {
    if (!b.active) return false;
    if (selectedCategoryId !== "all" && b.categoryId !== selectedCategoryId) return false;
    if (selectedAuthorId !== "all" && b.authorId !== selectedAuthorId) return false;
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
    // default: newest
    return new Date(b.createdAt || "").getTime() - new Date(a.createdAt || "").getTime();
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800 font-sans antialiased">
      {/* Header Navigation */}
      <Header
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenCart={() => setIsCartOpen(true)}
        onNavigate={handleNavigate}
        activePage={activePage}
      />

      {/* Main Page Area */}
      <main className="flex-1 pb-16 md:pb-0">
        {/* PAGE 1: HOME PAGE */}
        {activePage === "home" && (
          <div className="space-y-16 pb-16">
            {/* Hero Banner Section */}
            <section className="relative bg-gradient-to-br from-amber-950 via-amber-900 to-amber-950 text-amber-50 py-16 sm:py-24 overflow-hidden border-b border-amber-900/40">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                <div className="lg:col-span-7 space-y-6">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold uppercase tracking-wider">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Ethiopia's Premier Online Bookstore</span>
                  </div>

                  <h1 className="font-serif font-extrabold text-3xl sm:text-5xl lg:text-6xl text-white tracking-tight leading-tight">
                    Discover Timeless <span className="text-amber-400">Literature & Stories</span>
                  </h1>

                  <p className="text-amber-100/80 text-sm sm:text-base leading-relaxed max-w-xl">
                    Explore modern Amharic classics, historical Ethiopian archives, international bestsellers, self-development, business, and children's books with fast delivery across Addis Ababa and all Ethiopian regions.
                  </p>

                  <div className="flex flex-wrap items-center gap-4 pt-2">
                    <button
                      onClick={() => handleNavigate("shop")}
                      className="px-7 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-amber-950 font-extrabold text-sm shadow-xl shadow-amber-950/50 transition-all flex items-center gap-2 active:scale-95"
                    >
                      <span>Explore Catalog</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleNavigate("categories")}
                      className="px-6 py-3.5 rounded-2xl bg-amber-900/60 hover:bg-amber-800/80 text-amber-100 font-bold text-sm border border-amber-700/50 transition-colors"
                    >
                      Browse Categories
                    </button>
                  </div>

                  {/* Highlights */}
                  <div className="pt-6 border-t border-amber-900/60 grid grid-cols-3 gap-4 text-xs">
                    <div>
                      <strong className="block text-amber-300 font-extrabold text-base">500+</strong>
                      <span className="text-amber-200/70">Verified Titles</span>
                    </div>
                    <div>
                      <strong className="block text-amber-300 font-extrabold text-base">24 Hours</strong>
                      <span className="text-amber-200/70">Addis Delivery</span>
                    </div>
                    <div>
                      <strong className="block text-amber-300 font-extrabold text-base">Telebirr & COD</strong>
                      <span className="text-amber-200/70">Local Payments</span>
                    </div>
                  </div>
                </div>

                {/* Hero Showcase Images */}
                <div className="lg:col-span-5 relative">
                  <div className="relative z-10 rounded-3xl overflow-hidden shadow-2xl border-4 border-amber-900/40 transform lg:rotate-2 hover:rotate-0 transition-transform duration-500 bg-white">
                    <img
                      src="https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80"
                      alt="Ethiopian Bookstore"
                      className="w-full aspect-[4/3] object-cover"
                    />
                    <div className="p-4 bg-amber-950 text-white flex items-center justify-between">
                      <div>
                        <h4 className="font-serif font-bold text-sm">Featured Selection</h4>
                        <p className="text-xs text-amber-300">Amharic Literature & History Masterpieces</p>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-amber-500 text-amber-950 font-bold text-xs">
                        ETB Birr
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Bestseller & Featured Books */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Customer Favorites</span>
                  <h2 className="font-serif font-extrabold text-2xl sm:text-3xl text-slate-900 mt-0.5">
                    Bestselling Books
                  </h2>
                </div>

                <button
                  onClick={() => handleNavigate("shop")}
                  className="text-amber-800 hover:text-amber-900 font-bold text-xs flex items-center gap-1"
                >
                  <span>View All Books</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <BookGrid
                books={books.filter((b) => b.featured || b.soldCount > 100).slice(0, 8)}
                loading={loadingData}
                onSelectBook={(bk) => setSelectedBook(bk)}
              />
            </section>

            {/* Category Cards Banner */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
              <div className="text-center max-w-xl mx-auto space-y-2">
                <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Browse Collections</span>
                <h2 className="font-serif font-extrabold text-2xl sm:text-3xl text-slate-900">
                  Book Categories
                </h2>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategoryId(cat.id);
                      handleNavigate("shop");
                    }}
                    className="group relative rounded-3xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl cursor-pointer transition-all bg-white"
                  >
                    <div className="aspect-[4/3] w-full overflow-hidden bg-slate-100">
                      <img
                        src={cat.image}
                        alt={cat.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    </div>
                    <div className="p-4 bg-white space-y-1">
                      <h4 className="font-serif font-bold text-slate-900 text-sm group-hover:text-amber-800 transition-colors">
                        {cat.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 line-clamp-1">{cat.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Spotlight Authors Section */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Literary Legends</span>
                  <h2 className="font-serif font-extrabold text-2xl sm:text-3xl text-slate-900 mt-0.5">
                    Featured Authors
                  </h2>
                </div>

                <button
                  onClick={() => handleNavigate("authors")}
                  className="text-amber-800 font-bold text-xs flex items-center gap-1"
                >
                  <span>View All Authors</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {authors.map((auth) => (
                  <div
                    key={auth.id}
                    onClick={() => {
                      setSelectedAuthorId(auth.id);
                      handleNavigate("shop");
                    }}
                    className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md cursor-pointer text-center space-y-2 group"
                  >
                    <img
                      src={auth.image}
                      alt={auth.name}
                      className="w-20 h-20 rounded-full object-cover mx-auto group-hover:scale-105 transition-transform border-2 border-amber-400"
                    />
                    <h5 className="font-serif font-bold text-slate-900 text-xs line-clamp-1 group-hover:text-amber-800">
                      {auth.name}
                    </h5>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* PAGE 2: SHOP CATALOG PAGE */}
        {activePage === "shop" && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
              <div>
                <h1 className="font-serif font-extrabold text-2xl sm:text-3xl text-slate-900">
                  Book Catalog ({sortedBooks.length})
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Showing available titles in ETB (Ethiopian Birr)
                </p>
              </div>

              {/* Controls & Filter Bar */}
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                {/* Category Selector */}
                <select
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none"
                >
                  <option value="all">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                {/* Author Selector */}
                <select
                  value={selectedAuthorId}
                  onChange={(e) => setSelectedAuthorId(e.target.value)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none"
                >
                  <option value="all">All Authors</option>
                  {authors.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>

                {/* Sort Option */}
                <select
                  value={selectedSort}
                  onChange={(e) => setSelectedSort(e.target.value)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none"
                >
                  <option value="newest">Newest Titles</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="rating">Highest Rated</option>
                  <option value="bestselling">Most Popular</option>
                </select>
              </div>
            </div>

            {/* Book Catalog Grid */}
            <BookGrid
              books={sortedBooks}
              loading={loadingData}
              onSelectBook={(bk) => setSelectedBook(bk)}
            />
          </div>
        )}

        {/* PAGE 3: CATEGORIES LIST */}
        {activePage === "categories" && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
            <div className="space-y-1">
              <h1 className="font-serif font-extrabold text-2xl sm:text-3xl text-slate-900">
                Explore All Book Categories
              </h1>
              <p className="text-xs text-slate-500">Discover genres across fiction, history, Amharic literature, and tech</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategoryId(cat.id);
                    handleNavigate("shop");
                  }}
                  className="group rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-xl overflow-hidden cursor-pointer transition-all flex flex-col"
                >
                  <div className="aspect-[16/9] w-full overflow-hidden bg-slate-100">
                    <img
                      src={cat.image}
                      alt={cat.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-6 space-y-2 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-serif font-bold text-slate-900 text-lg group-hover:text-amber-800 transition-colors">
                        {cat.name}
                      </h3>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        {cat.description}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-amber-800">
                      <span>Browse Category Books</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PAGE 4: AUTHORS LIST */}
        {activePage === "authors" && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
            <div className="space-y-1">
              <h1 className="font-serif font-extrabold text-2xl sm:text-3xl text-slate-900">
                Featured Ethiopian & International Authors
              </h1>
              <p className="text-xs text-slate-500">Read biographies and browse published titles</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {authors.map((auth) => (
                <div
                  key={auth.id}
                  onClick={() => {
                    setSelectedAuthorId(auth.id);
                    handleNavigate("shop");
                  }}
                  className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-xl cursor-pointer transition-all space-y-4 group"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={auth.image}
                      alt={auth.name}
                      className="w-16 h-16 rounded-full object-cover border-2 border-amber-400 group-hover:scale-105 transition-transform"
                    />
                    <div>
                      <h3 className="font-serif font-bold text-slate-900 text-base group-hover:text-amber-800">
                        {auth.name}
                      </h3>
                      <span className="text-xs font-semibold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full">
                        Author
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                    {auth.bio}
                  </p>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-amber-800">
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
        onProceedToCheckout={() => setIsCheckoutOpen(true)}
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
        onClose={() => setIsAuthOpen(false)}
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
