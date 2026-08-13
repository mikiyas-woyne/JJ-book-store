import React, { useState } from "react";
import { Camera, QrCode, Scan, X, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanResult: (scannedText: string) => void;
  title?: string;
  expectedItem?: string;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScanResult,
  title = "QR / Barcode ISBN Scanner",
  expectedItem
}) => {
  const [manualCode, setManualCode] = useState("");
  const [isSimulatingScan, setIsSimulatingScan] = useState(false);
  const [scannedFeedback, setScannedFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    const text = manualCode.trim();
    setScannedFeedback(text);
    setTimeout(() => {
      onScanResult(text);
      setManualCode("");
      setScannedFeedback(null);
      onClose();
    }, 600);
  };

  const handleSimulateQuickScan = (codeToScan: string) => {
    setIsSimulatingScan(true);
    setScannedFeedback(codeToScan);
    setTimeout(() => {
      setIsSimulatingScan(false);
      onScanResult(codeToScan);
      setScannedFeedback(null);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-extrabold text-base text-white">{title}</h3>
              <p className="text-[11px] text-slate-400">Scan book ISBN or package barcode</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder View */}
        <div className="relative aspect-square w-full rounded-2xl bg-black border-2 border-slate-800 overflow-hidden flex flex-col items-center justify-center space-y-4">
          {/* Animated Scanning Laser Line */}
          <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_15px_#f59e0b] animate-bounce top-1/3"></div>

          <Scan className={`w-16 h-16 text-amber-400/60 ${isSimulatingScan ? "animate-spin" : "animate-pulse"}`} />

          <p className="text-xs text-slate-400 text-center px-6">
            Align camera viewfinder over the QR code or Barcode sticker
          </p>

          {expectedItem && (
            <div className="px-3 py-1 rounded-full bg-slate-800 text-amber-300 text-[11px] font-mono border border-slate-700">
              Target: {expectedItem}
            </div>
          )}

          {scannedFeedback && (
            <div className="absolute inset-0 bg-emerald-950/90 flex flex-col items-center justify-center p-4 text-emerald-300 space-y-2 animate-in fade-in">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 animate-bounce" />
              <p className="font-bold text-sm">Code Detected!</p>
              <p className="text-xs font-mono bg-black/40 px-3 py-1 rounded-lg border border-emerald-500/30">
                {scannedFeedback}
              </p>
            </div>
          )}
        </div>

        {/* Simulated Quick Action Shortcuts */}
        <div className="space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Simulated Scanner Shortcuts
          </span>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleSimulateQuickScan("ISBN-978-99944-0-123-4")}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-mono text-xs border border-slate-700 transition-colors"
            >
              Scan Amharic Title ISBN
            </button>
            <button
              onClick={() => handleSimulateQuickScan("PKG-JJ-2026-88421")}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 font-mono text-xs border border-slate-700 transition-colors"
            >
              Scan Package Barcode
            </button>
          </div>
        </div>

        {/* Manual Code Input */}
        <form onSubmit={handleManualSubmit} className="space-y-2 border-t border-slate-800 pt-4">
          <label className="block text-xs font-bold text-slate-300">Or Type Barcode / ISBN Manually</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="e.g. 978-99944-0-123-4 or PKG-1002"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
            >
              Verify
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
