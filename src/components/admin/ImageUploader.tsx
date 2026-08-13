import React, { useState, useRef } from "react";
import { Upload, Link as LinkIcon, Sparkles, X, Image as ImageIcon, Check } from "lucide-react";
import { generateBookCoverSvg } from "../../lib/sampleData";

interface ImageUploaderProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  bookTitle?: string;
  authorName?: string;
  categoryName?: string;
  aspectRatio?: "book" | "square" | "avatar";
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  value,
  onChange,
  label = "Cover Image",
  bookTitle = "",
  authorName = "",
  categoryName = "Amharic Literature",
  aspectRatio = "book"
}) => {
  const [activeTab, setActiveTab] = useState<"upload" | "url" | "generate">("upload");
  const [isDragging, setIsDragging] = useState(false);
  const [urlInput, setUrlInput] = useState(value);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Amharic Cover Customizer State
  const [amharicTitle, setAmharicTitle] = useState(bookTitle || "የመጽሐፍ ርዕስ");
  const [englishTitle, setEnglishTitle] = useState(bookTitle ? bookTitle.replace(/[^a-zA-Z0-9 ]/g, "") || "Book Title" : "Book Title");
  const [coverAuthor, setCoverAuthor] = useState(authorName || "ደራሲ");
  const [selectedGradientIndex, setSelectedGradientIndex] = useState(0);

  const gradients: Array<{[key: string]: any}> = [
    { name: "Vintage Amber & Brown", colors: ["#451a03", "#78350f"], accent: "#F59E0B", symbol: "📜" },
    { name: "Deep Navy & Slate", colors: ["#0f172a", "#1e293b"], accent: "#38BDF8", symbol: "✒️" },
    { name: "Royal Purple", colors: ["#1e1b4b", "#312e81"], accent: "#818CF8", symbol: "🔑" },
    { name: "Emerald Forest", colors: ["#064e3b", "#047857"], accent: "#34D399", symbol: "🧭" },
    { name: "Rose Crimson", colors: ["#881337", "#9f1239"], accent: "#FB7185", symbol: "✊" },
    { name: "Imperial Gold & Green", colors: ["#14532d", "#15803d"], accent: "#FACC15", symbol: "👑" },
  ];

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Please upload a valid image file (PNG, JPG, WEBP, or SVG).");
      return;
    }

    setIsProcessing(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (!result) {
        setIsProcessing(false);
        return;
      }

      // If SVG or small file, use directly; otherwise compress via Canvas
      if (file.type === "image/svg+xml" || file.size < 300000) {
        onChange(result);
        setIsProcessing(false);
      } else {
        const img = new Image();
        img.src = result;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round((width * MAX_HEIGHT) / height);
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.85);
            onChange(compressedDataUrl);
          } else {
            onChange(result);
          }
          setIsProcessing(false);
        };
        img.onerror = () => {
          onChange(result);
          setIsProcessing(false);
        };
      }
    };

    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const handleApplyUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput.trim()) {
      onChange(urlInput.trim());
    }
  };

  const handleGenerateAmharicCover = () => {
    const theme = gradients[selectedGradientIndex];
    const svgDataUrl = generateBookCoverSvg(
      amharicTitle || bookTitle || "የመጽሐፍ ርዕስ",
      englishTitle || "Book Title",
      coverAuthor || authorName || "ደራሲ",
      categoryName || "Amharic Literature",
      theme.colors,
      theme.accent,
      theme.symbol
    );
    onChange(svgDataUrl);
  };

  const aspectClasses = {
    book: "aspect-[2/3] w-28 sm:w-32",
    square: "aspect-square w-28 sm:w-32",
    avatar: "aspect-square w-24 rounded-full"
  }[aspectRatio];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block font-bold text-slate-700 text-xs">{label}</label>
        {value && (
          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
            <Check className="w-3 h-3" /> Image Loaded
          </span>
        )}
      </div>

      {/* Main Container */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs space-y-3">
        {/* Mode Selector Tabs */}
        <div className="flex bg-slate-200/70 p-1 rounded-xl text-[11px] font-bold text-slate-600">
          <button
            type="button"
            onClick={() => setActiveTab("upload")}
            className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeTab === "upload" ? "bg-white text-slate-900 shadow-sm" : "hover:text-slate-900"
            }`}
          >
            <Upload className="w-3.5 h-3.5 text-amber-600" /> Upload File
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("url")}
            className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeTab === "url" ? "bg-white text-slate-900 shadow-sm" : "hover:text-slate-900"
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5 text-sky-600" /> Image URL
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("generate")}
            className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeTab === "generate" ? "bg-white text-slate-900 shadow-sm" : "hover:text-slate-900"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600" /> Design Amharic Cover
          </button>
        </div>

        {/* TAB 1: UPLOAD FILE DRAG & DROP */}
        {activeTab === "upload" && (
          <div>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                isDragging
                  ? "border-amber-500 bg-amber-50/80 scale-[1.01]"
                  : "border-slate-300 hover:border-amber-400 hover:bg-white"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileInputChange}
                className="hidden"
              />
              <div className="w-10 h-10 mx-auto rounded-full bg-amber-100/80 flex items-center justify-center text-amber-700 mb-2">
                <Upload className="w-5 h-5" />
              </div>
              <p className="font-bold text-slate-800">
                {isProcessing ? "Processing & Optimizing Image..." : "Click to browse or drag & drop cover image"}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">Supports PNG, JPG, WEBP, or SVG cover files</p>
            </div>
          </div>
        )}

        {/* TAB 2: IMAGE URL */}
        {activeTab === "url" && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/cover-image.jpg"
                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 bg-white font-mono text-[11px]"
              />
              <button
                type="button"
                onClick={handleApplyUrl}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shrink-0"
              >
                Apply URL
              </button>
            </div>
            <p className="text-[10px] text-slate-500">Paste any direct web link to a book cover photo.</p>
          </div>
        )}

        {/* TAB 3: GENERATE AMHARIC COVER */}
        {activeTab === "generate" && (
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Amharic Title (ርዕስ)</label>
                <input
                  type="text"
                  value={amharicTitle}
                  onChange={(e) => setAmharicTitle(e.target.value)}
                  placeholder="ፍቅር እስከ መቃብር"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">English Subtitle</label>
                <input
                  type="text"
                  value={englishTitle}
                  onChange={(e) => setEnglishTitle(e.target.value)}
                  placeholder="Fiqir Eske Mequabir"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Author (ደራሲ)</label>
                <input
                  type="text"
                  value={coverAuthor}
                  onChange={(e) => setCoverAuthor(e.target.value)}
                  placeholder="ሀዲስ ዓለማየሁ"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Theme Palette</label>
                <select
                  value={selectedGradientIndex}
                  onChange={(e) => setSelectedGradientIndex(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium bg-white"
                >
                  {gradients.map((g, idx) => (
                    <option key={idx} value={idx}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGenerateAmharicCover}
              className="w-full py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold rounded-xl shadow-sm flex items-center justify-center gap-1.5 text-xs"
            >
              <Sparkles className="w-4 h-4" /> Generate Custom Vector Cover
            </button>
          </div>
        )}

        {/* LIVE PREVIEW AREA */}
        {value ? (
          <div className="pt-2 border-t border-slate-200/80 flex items-center gap-4">
            <div className={`relative shrink-0 rounded-lg overflow-hidden border border-slate-300 shadow-md bg-slate-900 ${aspectClasses}`}>
              <img src={value} alt="Cover Preview" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => onChange("")}
                className="absolute top-1 right-1 p-1 bg-black/70 hover:bg-red-600 text-white rounded-full transition-colors"
                title="Remove Cover Image"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 space-y-1">
              <p className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-amber-600" /> Active Cover Image
              </p>
              <p className="text-[11px] text-slate-500 line-clamp-2 break-all font-mono">
                {value.startsWith("data:") ? "Custom Image Uploaded (Base64 / Vector)" : value}
              </p>
              <button
                type="button"
                onClick={() => onChange("")}
                className="text-[11px] text-red-600 hover:text-red-700 font-bold underline pt-1"
              >
                Remove / Upload Different Cover
              </button>
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-slate-400 italic text-center pt-1">
            No cover image set yet. Upload a file above or generate a cover.
          </p>
        )}
      </div>
    </div>
  );
};
