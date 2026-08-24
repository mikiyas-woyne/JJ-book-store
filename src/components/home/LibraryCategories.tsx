import React from "react";
import { Category } from "../../types";
import { BookOpen, Sparkles, ArrowRight, Layers } from "lucide-react";

interface LibraryCategoriesProps {
  categories: Category[];
  onSelectCategory: (categoryId: string) => void;
}

export const LibraryCategories: React.FC<LibraryCategoriesProps> = ({
  categories,
  onSelectCategory,
}) => {
  // Ensure all 10 required category names are represented
  const requiredCategories = [
    { id: "cat-fiction", name: "Fiction", desc: "Engaging novels, poetry, and storytelling classics." },
    { id: "cat-nonfiction", name: "Non-Fiction", desc: "Biographies, essays, memoirs, and real-world accounts." },
    { id: "cat-tech", name: "Technology", desc: "Modern tech trends, engineering, and digital systems." },
    { id: "cat-cs", name: "Computer Science", desc: "Algorithms, web development, coding, and AI." },
    { id: "cat-business", name: "Business", desc: "Entrepreneurship, economics, finance, and management." },
    { id: "cat-selfdev", name: "Self Development", desc: "Personal growth, productivity, and mindset mastery." },
    { id: "cat-history", name: "History", desc: "Ethiopian heritage, world history, and ancient archives." },
    { id: "cat-religion", name: "Religion", desc: "Spiritual studies, theology, and philosophical wisdom." },
    { id: "cat-education", name: "Education", desc: "Academic textbooks, study guides, and research materials." },
    { id: "cat-amharic", name: "Ethiopian Books", desc: "Amharic literature, Ge'ez texts, and Ethiopian classics." },
  ];

  // Merge loaded categories or fallback to required list
  const displayCategories = requiredCategories.map((req) => {
    const existing = categories.find(
      (c) => c.name.toLowerCase() === req.name.toLowerCase() || c.id === req.id
    );
    return {
      id: existing ? existing.id : req.id,
      name: req.name,
      description: existing ? existing.description : req.desc,
      image: existing
        ? existing.image
        : "https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=800&auto=format&fit=crop&q=80",
    };
  });

  return (
    <section className="relative py-16 bg-[#1a120c] text-stone-100 border-b border-amber-950/60 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950 text-amber-400 border border-amber-800/60 text-xs font-bold uppercase tracking-wider">
            <Layers className="w-3.5 h-3.5" />
            <span>Digital Library Aisles</span>
          </div>

          <h2 className="font-serif font-extrabold text-2xl sm:text-4xl text-white tracking-tight">
            Explore Library Categories
          </h2>

          <p className="text-stone-400 text-xs sm:text-sm leading-relaxed">
            Step into dedicated reading wings curated across literature, science, history, and Ethiopian heritage.
          </p>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {displayCategories.map((cat) => (
            <div
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className="group relative rounded-3xl bg-gradient-to-b from-[#251b13] to-[#1a110a] border border-amber-900/40 hover:border-amber-500/60 p-5 cursor-pointer transition-all duration-300 shadow-md hover:shadow-2xl hover:-translate-y-1.5 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-900/40 border border-amber-700/40 flex items-center justify-center text-amber-400 group-hover:bg-amber-500 group-hover:text-stone-950 transition-colors">
                  <BookOpen className="w-5 h-5" />
                </div>

                <div>
                  <h3 className="font-serif font-bold text-white text-base group-hover:text-amber-300 transition-colors">
                    {cat.name}
                  </h3>
                  <p className="text-[11px] text-stone-400 leading-relaxed mt-1 line-clamp-2">
                    {cat.description}
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-amber-900/30 flex items-center justify-between text-[11px] font-bold text-amber-400">
                <span>Enter Wing</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
