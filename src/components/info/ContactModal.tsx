import React, { useState } from "react";
import { X, Phone, Mail, MapPin, Send, MessageSquare, Clock, CheckCircle2 } from "lucide-react";
import { useToast } from "../ui/Toast";

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose }) => {
  const { showToast } = useToast();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phone || !message) {
      showToast("Missing Information", "Please fill in all contact fields.", "error");
      return;
    }
    setIsSubmitted(true);
    showToast("Message Sent", "Thank you! Our bookstore team will contact you shortly.", "success");
    setTimeout(() => {
      setIsSubmitted(false);
      setFullName("");
      setPhone("");
      setMessage("");
      onClose();
    }, 2000);
  };

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
        <div className="space-y-1">
          <h2 className="font-serif font-extrabold text-2xl text-slate-900">
            Get in Touch with JJ Book Shopping
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Have questions about book orders, bulk purchases, or literary recommendations?
          </p>
        </div>

        {/* Contact Info & Form Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Info Side */}
          <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200 text-xs">
            <h3 className="font-serif font-bold text-amber-800 text-sm">Customer Care Concierge</h3>

            <div className="space-y-3 text-slate-600">
              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-slate-900">Phone & Telegram</p>
                  <p className="text-amber-800 font-semibold">+251 938 014 055</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-slate-900">Email Inquiries</p>
                  <p className="text-amber-800 font-semibold">orders@jjbookshopping.com</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-slate-900">Flagship Bookstore</p>
                  <p className="text-slate-500">Bole Medhaniallem, JJ Bookstore Building, Addis Ababa, Ethiopia</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-slate-900">Store Hours</p>
                  <p className="text-slate-500">Monday – Saturday: 8:30 AM – 8:00 PM EAT</p>
                </div>
              </div>
            </div>
          </div>

          {/* Form Side */}
          {isSubmitted ? (
            <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-200 text-center flex flex-col items-center justify-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-600" />
              <h4 className="font-serif font-bold text-slate-900 text-base">Message Sent Successfully!</h4>
              <p className="text-xs text-slate-600">
                Thank you for contacting JJ Bookstore. We will get back to you shortly.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Abebe Bikila"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+251 9..."
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Message</label>
                <textarea
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Inquire about book availability or orders..."
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Message</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
