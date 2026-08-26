import React, { useState } from "react";
import { BookOpen, Phone, Mail, MapPin, Send, ShieldCheck, Truck, CreditCard, HeartHandshake, Sparkles } from "lucide-react";

export const Footer: React.FC<{ onNavigate: (page: string) => void }> = ({ onNavigate }) => {
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (newsletterEmail.trim()) {
      setSubscribed(true);
      setNewsletterEmail("");
    }
  };

  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Value Proposition Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pb-12 border-b border-slate-800">
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Fast Delivery Across Ethiopia</h4>
              <p className="text-xs text-slate-400">Same-day in Addis Ababa • Regional parcels</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Flexible Local Payment Gateways</h4>
              <p className="text-xs text-slate-400">Telebirr, CBE Birr, Chapa & COD</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Authentic & Verified Books</h4>
              <p className="text-xs text-slate-400">100% genuine titles directly from publishers</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <HeartHandshake className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Dedicated Customer Care</h4>
              <p className="text-xs text-slate-400">Mon - Sat: 8:30 AM - 8:00 PM EAT</p>
            </div>
          </div>
        </div>

        {/* Footer Main Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 py-12">
          {/* Brand Col */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-amber-500/20">
                <BookOpen className="w-6 h-6 text-slate-950" />
              </div>
              <span className="font-extrabold text-2xl tracking-tight text-white font-serif">
                JJ Book<span className="text-amber-400 font-serif italic font-normal ml-1">Shopping</span>
              </span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
              Ethiopia's premier online bookstore. We connect readers with rich Ethiopian literature, history, academic textbooks, international bestsellers, and children's storybooks.
            </p>
            
            {/* Accepted Local Payment Methods */}
            <div className="pt-2">
              <p className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Accepted Ethiopian Payment Methods:</span>
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-lg bg-sky-950 text-sky-300 border border-sky-800 font-medium">Telebirr (ቴሌብር)</span>
                <span className="px-2.5 py-1 rounded-lg bg-purple-950 text-purple-300 border border-purple-800 font-medium">CBE Birr (ሲቢኢ)</span>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-800 font-medium">Chapa Payment</span>
                <span className="px-2.5 py-1 rounded-lg bg-amber-950 text-amber-300 border border-amber-800 font-medium">Cash on Delivery (COD)</span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 font-medium">Bank Transfer</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="font-bold text-white text-base font-serif border-b border-slate-800 pb-2">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <button onClick={() => onNavigate("home")} className="hover:text-amber-400 transition-colors cursor-pointer">Home Page</button>
              </li>
              <li>
                <button onClick={() => onNavigate("shop")} className="hover:text-amber-400 transition-colors cursor-pointer">Browse Catalog</button>
              </li>
              <li>
                <button onClick={() => onNavigate("categories")} className="hover:text-amber-400 transition-colors cursor-pointer">Book Categories</button>
              </li>
              <li>
                <button onClick={() => onNavigate("authors")} className="hover:text-amber-400 transition-colors cursor-pointer">Featured Authors</button>
              </li>
              <li>
                <button onClick={() => onNavigate("account")} className="hover:text-amber-400 transition-colors cursor-pointer">My Order History</button>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-3">
            <h4 className="font-bold text-white text-base font-serif border-b border-slate-800 pb-2">Store Contact</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-1" />
                <span>Bole Medhaniallem, JJ Bookstore Building, Addis Ababa, Ethiopia</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-amber-400 shrink-0" />
                <span>+251 938 014 055</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-amber-400 shrink-0" />
                <span>orders@jjbookshopping.com</span>
              </li>
            </ul>
          </div>

          {/* Newsletter Subscribe */}
          <div className="space-y-3">
            <h4 className="font-bold text-white text-base font-serif border-b border-slate-800 pb-2">Book Club Newsletter</h4>
            <p className="text-xs text-slate-400">Subscribe to receive new book arrivals, special discount codes, and local literary events.</p>
            {subscribed ? (
              <div className="p-3 rounded-xl bg-emerald-950 text-emerald-300 border border-emerald-800 text-xs font-semibold">
                ✓ Thank you for subscribing to JJ Book Club!
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="space-y-2">
                <input
                  type="email"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="Enter your email address..."
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                />
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Subscribe Now</span>
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Footer Bottom Copyright */}
        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} JJ Book Shopping. All rights reserved.</p>
          <p className="flex items-center gap-2">
            <span>Addis Ababa, Ethiopia</span>
            <span>•</span>
            <span>ETB Ethiopian Birr Currency</span>
          </p>
        </div>
      </div>
    </footer>
  );
};
