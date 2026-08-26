import React, { useState } from "react";
import { X, Mail, Lock, User as UserIcon, Sparkles, LogIn, Eye, EyeOff, Copy, Check, ShieldAlert } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../ui/Toast";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  reasonNotice?: string | null;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, reasonNotice }) => {
  const { loginWithEmail, registerWithEmail, loginWithGoogle, resetPassword } = useAuth();
  const { showToast } = useToast();

  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  const [showDomainNotice, setShowDomainNotice] = useState(false);
  const [googleEmailInput, setGoogleEmailInput] = useState("");
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentDomain = typeof window !== "undefined" ? window.location.hostname : "";

  const copyDomainToClipboard = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(currentDomain);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showToast("Domain Copied!", `Copied ${currentDomain} to clipboard.`, "info");
    }
  };

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

  const handleGoogleSignIn = async (directEmailOverride?: string) => {
    setLoading(true);

    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      setLoading(false);
      showToast(
        "Google Sign-In Unavailable Here",
        "This preview window is blocking Google's sign-in popup. You can sign in with email/password instead.",
        "error"
      );
    }, 10000);

    try {
      await loginWithGoogle(directEmailOverride);
      if (timedOut) return;
      clearTimeout(timeoutId);
      showToast("Google Sign-In Successful", "Welcome to JJ Book Shopping!", "success");
      onClose();
    } catch (err: any) {
      if (timedOut) return;
      clearTimeout(timeoutId);
      console.error("Google auth error:", err);
      if (
        err?.code === "auth/popup-closed-by-user" ||
        err?.code === "auth/cancelled-popup-request"
      ) {
        showToast("Sign-In Cancelled", "The Google sign-in popup was closed.", "info");
      } else if (err?.code === "auth/unauthorized-domain" || err?.code === "auth/network-request-failed") {
        setShowDomainNotice(true);
        showToast("Domain Authorization Needed", "Preview domain not yet authorized in Firebase Console.", "error");
      } else if (err?.code === "auth/operation-not-allowed") {
        showToast("Google Auth Disabled", "Please enable Google Sign-In in Firebase Console.", "error");
      } else {
        showToast("Google Sign-In Failed", err?.message || "Unable to complete Google Sign-In.", "error");
      }
    } finally {
      if (!timedOut) setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden max-h-[92vh] flex flex-col my-auto">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div>
            <h3 className="font-serif font-extrabold text-lg sm:text-xl text-slate-900">
              {mode === "login" && "Sign In to JJ Bookstore"}
              {mode === "register" && "Create Customer Account"}
              {mode === "forgot" && "Reset Password"}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Unlock order tracking, wishlists & reviews</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-200 text-slate-500 cursor-pointer">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto">
          {reasonNotice && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center gap-2.5 animate-fadeIn">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="leading-relaxed">{reasonNotice}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {mode === "register" && (
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="ሙሉ ስም ያስገቡ (Enter Full Name)"
                    required
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 bg-white"
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
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 bg-white"
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
                      className="text-amber-700 hover:underline font-semibold cursor-pointer"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 font-medium bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 p-0.5 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors cursor-pointer"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-sm shadow-md shadow-amber-200 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <LogIn className="w-4 h-4 text-slate-950" />
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
                onClick={() => handleGoogleSignIn()}
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all flex items-center justify-center gap-2.5 shadow-sm bg-white active:scale-98 disabled:opacity-50 cursor-pointer"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>

              {showDomainNotice && (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2.5 animate-fadeIn">
                  <div className="flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-amber-950">Firebase Domain Authorization Required</p>
                      <p className="text-[11px] text-amber-800 mt-0.5">
                        Firebase blocks popup sign-ins until this domain is added to Authorized Domains in your Firebase Console.
                      </p>
                    </div>
                  </div>

                  <div className="bg-white/80 p-2 rounded-xl border border-amber-200/80 flex items-center justify-between gap-2">
                    <code className="text-[11px] font-mono text-amber-900 truncate flex-1">{currentDomain}</code>
                    <button
                      type="button"
                      onClick={copyDomainToClipboard}
                      className="px-2 py-1 bg-amber-800 hover:bg-amber-900 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors shrink-0 cursor-pointer"
                    >
                      {copied ? <Check className="w-3 h-3 text-green-300" /> : <Copy className="w-3 h-3" />}
                      <span>{copied ? "Copied!" : "Copy Domain"}</span>
                    </button>
                  </div>

                  <div className="pt-1 border-t border-amber-200/60 space-y-2">
                    <p className="text-[11px] font-bold text-amber-950">⚡ Instant Preview Google Sign-In:</p>
                    <div className="flex gap-1.5">
                      <input
                        type="email"
                        value={googleEmailInput}
                        onChange={(e) => setGoogleEmailInput(e.target.value)}
                        placeholder="Enter Google Email (e.g. mikiyaswoyne@gmail.com)"
                        className="flex-1 px-3 py-1.5 rounded-xl border border-amber-300 bg-white text-xs focus:outline-none focus:border-amber-600"
                      />
                      <button
                        type="button"
                        onClick={() => handleGoogleSignIn(googleEmailInput.trim() || "mikiyaswoyne@gmail.com")}
                        className="px-3 py-1.5 bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs rounded-xl transition-all shrink-0 cursor-pointer"
                      >
                        Sign In
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Switch Mode Footer */}
          <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
            {mode === "login" ? (
              <p>
                Don't have an account?{" "}
                <button
                  onClick={() => setMode("register")}
                  className="font-bold text-amber-700 hover:underline cursor-pointer"
                >
                  Register now
                </button>
              </p>
            ) : (
              <p>
                Already registered?{" "}
                <button
                  onClick={() => setMode("login")}
                  className="font-bold text-amber-700 hover:underline cursor-pointer"
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
