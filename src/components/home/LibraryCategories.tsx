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
    <section className="relative py-16 bg-slate-50 text-slate-800 border-b border-slate-200 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold uppercase tracking-wider shadow-sm">
            <Layers className="w-3.5 h-3.5 text-amber-600" />
            <span>Digital Library Aisles</span>
          </div>

          <h2 className="font-serif font-extrabold text-2xl sm:text-4xl text-slate-900 tracking-tight">
            Explore Bookstore Categories
          </h2>

          <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
            Step into dedicated aisles curated across literature, sciences, history, technology, and authentic Ethiopian heritage.
          </p>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {displayCategories.map((cat) => (
            <div
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className="group relative rounded-3xl bg-white border border-slate-200 hover:border-amber-400 p-5 cursor-pointer transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-700 group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors shadow-sm">
                  <BookOpen className="w-5 h-5" />
                </div>

                <div>
                  <h3 className="font-serif font-bold text-slate-900 text-base group-hover:text-amber-800 transition-colors">
                    {cat.name}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed mt-1 line-clamp-2">
                    {cat.description}
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-amber-700">
                <span>Browse Category</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
