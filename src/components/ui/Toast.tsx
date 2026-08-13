import React, { createContext, useContext, useState } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

type ToastType = "success" | "error" | "info";

interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
}

interface ToastContextType {
  showToast: (title: string, description?: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (title: string, description?: string, type: ToastType = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, description, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 max-w-md w-full px-4 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-xl border bg-white text-slate-800 ${
                toast.type === "success"
                  ? "border-emerald-200 bg-emerald-50/90 text-emerald-950"
                  : toast.type === "error"
                  ? "border-rose-200 bg-rose-50/90 text-rose-950"
                  : "border-amber-200 bg-amber-50/90 text-amber-950"
              }`}
            >
              {toast.type === "success" && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />}
              {toast.type === "error" && <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />}
              {toast.type === "info" && <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />}
              <div className="flex-1 text-sm">
                <p className="font-semibold text-slate-900">{toast.title}</p>
                {toast.description && <p className="text-slate-600 mt-0.5">{toast.description}</p>}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-slate-600 p-0.5 rounded-md hover:bg-slate-200/50"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
};
