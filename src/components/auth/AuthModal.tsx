import React, { useState } from "react";
import { X, Mail, Lock, User as UserIcon, Sparkles, LogIn } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../ui/Toast";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const { loginWithEmail, registerWithEmail, loginWithGoogle, resetPassword } = useAuth();
  const { showToast } = useToast();

  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "login") {
        await loginWithEmail(email, password);
        showToast("Welcome Back!", "Successfully signed in to your JJ Bookstore account.", "success");
        onClose();
      } else if (mode === "register") {
        if (!fullName.trim()) {
          showToast("Name Required", "Please enter your full name.", "error");
          setLoading(false);
          return;
        }
        await registerWithEmail(email, password, fullName);
        showToast("Account Created!", "Welcome to JJ Book Shopping family.", "success");
        onClose();
      } else if (mode === "forgot") {
        await resetPassword(email);
        showToast("Password Reset Sent", "Check your email inbox for password reset instructions.", "info");
        setMode("login");
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      showToast("Authentication Failed", err.message || "Please check your credentials.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
      showToast("Google Sign-In Successful", "Logged in via Google account.", "success");
      onClose();
    } catch (err: any) {
      console.error("Google auth error:", err);
      if (
        err?.code === "auth/popup-closed-by-user" ||
        err?.code === "auth/cancelled-popup-request" ||
        err?.message?.includes("popup-closed-by-user")
      ) {
        showToast("Sign-In Cancelled", "Google sign-in window was closed.", "info");
      } else {
        showToast("Google Auth Error", err?.message || "Unable to sign in with Google.", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden my-auto">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 bg-amber-950 text-amber-50 flex items-center justify-between">
          <div>
            <h3 className="font-serif font-bold text-xl text-white">
              {mode === "login" && "Sign In to JJ Bookstore"}
              {mode === "register" && "Create Customer Account"}
              {mode === "forgot" && "Reset Password"}
            </h3>
            <p className="text-xs text-amber-300">Unlock order tracking, wishlists & reviews</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-amber-900 text-amber-300">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {mode === "login" && (
              <div className="bg-amber-50/80 p-3 rounded-2xl border border-amber-200 text-amber-950 space-y-2">
                <span className="font-extrabold text-[10px] uppercase tracking-wider block text-amber-800">
                  Quick Staff & Admin Sign-In
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEmail("employee@jjbookstore.com");
                      setPassword("employee123");
                    }}
                    className="p-2 bg-white rounded-xl border border-amber-300 hover:border-amber-500 font-bold text-[11px] text-amber-900 text-left hover:shadow-sm transition-all"
                  >
                    <span className="block font-black text-emerald-700">👷 Employee Panel</span>
                    <span className="text-[10px] text-slate-500 font-mono">employee@jjbookstore.com</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEmail("admin@jjbookstore.com");
                      setPassword("admin123456");
                    }}
                    className="p-2 bg-white rounded-xl border border-amber-300 hover:border-amber-500 font-bold text-[11px] text-amber-900 text-left hover:shadow-sm transition-all"
                  >
                    <span className="block font-black text-amber-800">👑 Admin Panel</span>
                    <span className="text-[10px] text-slate-500 font-mono">admin@jjbookstore.com</span>
                  </button>
                </div>
              </div>
            )}

            {mode === "register" && (
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Yohannes Haile"
                    required
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block font-bold text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  required
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {mode !== "forgot" && (
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-bold text-slate-700">Password</label>
                  {mode === "login" && (
                    <button
                      type="button"
                      onClick={() => setMode("forgot")}
                      className="text-amber-800 hover:underline font-semibold"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
            >
              <LogIn className="w-4 h-4" />
              <span>
                {loading
                  ? "Authenticating..."
                  : mode === "login"
                  ? "Sign In"
                  : mode === "register"
                  ? "Create Account"
                  : "Send Reset Link"}
              </span>
            </button>
          </form>

          {/* Google Sign-In */}
          {mode !== "forgot" && (
            <>
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-3 text-[11px] text-slate-400 font-semibold uppercase">Or continue with</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>Google Sign-In</span>
              </button>
            </>
          )}

          {/* Switch Mode Footer */}
          <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
            {mode === "login" ? (
              <p>
                Don't have an account?{" "}
                <button
                  onClick={() => setMode("register")}
                  className="font-bold text-amber-800 hover:underline"
                >
                  Register now
                </button>
              </p>
            ) : (
              <p>
                Already registered?{" "}
                <button
                  onClick={() => setMode("login")}
                  className="font-bold text-amber-800 hover:underline"
                >
                  Sign in here
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
