import React, { useState, useEffect } from "react";
import { Star, CheckCircle, MessageSquare, Plus, User } from "lucide-react";
import { collection, query, where, getDocs, addDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { Review } from "../../types";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../ui/Toast";

interface BookReviewsProps {
  bookId: string;
}

export const BookReviews: React.FC<BookReviewsProps> = ({ bookId }) => {
  const { currentUser, userProfile } = useAuth();
  const { showToast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchReviews = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, "reviews"),
          where("bookId", "==", bookId)
        );
        const snap = await getDocs(q);
        const list: Review[] = [];
        snap.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as Review);
        });
        setReviews(list);
      } catch (err) {
        console.error("Error fetching reviews:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [bookId]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      showToast("Please Sign In", "You must be signed in to submit a review.", "info");
      return;
    }

    if (!comment.trim()) {
      showToast("Review Empty", "Please type your review comment.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const newReviewData: Omit<Review, "id"> = {
        bookId,
        userId: currentUser.uid,
        userName: userProfile?.fullName || currentUser.displayName || "Verified Reader",
        userPhoto: userProfile?.photoURL,
        rating,
        comment,
        verifiedPurchase: true,
        status: "approved",
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, "reviews"), newReviewData);
      const createdReview: Review = { id: docRef.id, ...newReviewData };
      setReviews((prev) => [createdReview, ...prev]);
      setComment("");
      setShowForm(false);
      showToast("Review Submitted", "Thank you for reviewing this book!", "success");
    } catch (err) {
      console.error("Error submitting review:", err);
      showToast("Submission Failed", "Could not submit review.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  return (
    <div className="space-y-6 pt-6 border-t border-slate-100">
      {/* Rating Overview Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-amber-50/60 p-5 rounded-2xl border border-amber-900/10">
        <div>
          <h4 className="font-serif font-bold text-slate-900 text-lg flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-amber-700" />
            <span>Customer Ratings & Reviews</span>
          </h4>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex text-amber-400">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-4 h-4 ${
                    star <= Math.round(avgRating) ? "fill-amber-400 text-amber-400" : "text-slate-300"
                  }`}
                />
              ))}
            </div>
            <span className="font-bold text-slate-800 text-sm">{avgRating.toFixed(1)} out of 5</span>
            <span className="text-slate-500 text-xs">({reviews.length} total reviews)</span>
          </div>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2.5 rounded-xl bg-amber-950 text-amber-100 hover:bg-amber-900 text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
        >
          <Plus className="w-4 h-4 text-amber-400" />
          <span>Write a Review</span>
        </button>
      </div>

      {/* Review Submission Form */}
      {showForm && (
        <form onSubmit={handleSubmitReview} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
          <h5 className="font-bold text-slate-900 text-sm">Write Your Verified Book Review</h5>
          
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Your Rating:</label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setRating(s)}
                  className="p-1 hover:scale-110 transition-transform"
                >
                  <Star
                    className={`w-6 h-6 ${
                      s <= rating ? "fill-amber-400 text-amber-400" : "text-slate-300"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Your Thoughts & Review:</label>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What did you think of the characters, plot, or key takeaways?"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-amber-500"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold text-xs shadow-sm"
            >
              {submitting ? "Posting..." : "Post Review"}
            </button>
          </div>
        </form>
      )}

      {/* Reviews List */}
      {loading ? (
        <div className="text-center py-6 text-slate-400 text-xs">Loading customer reviews...</div>
      ) : reviews.length === 0 ? (
        <div className="p-6 text-center bg-slate-50 rounded-2xl border border-slate-100 text-slate-500 text-xs">
          No reviews yet. Be the first to review this book!
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <div key={r.id} className="p-4 rounded-2xl border border-slate-100 bg-white space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-xs">
                    {r.userPhoto ? (
                      <img src={r.userPhoto} alt={r.userName} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <User className="w-4 h-4 text-amber-800" />
                    )}
                  </div>
                  <div>
                    <h6 className="font-bold text-slate-900 text-xs">{r.userName}</h6>
                    {r.verifiedPurchase && (
                      <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Verified Purchase
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center text-amber-400 text-xs">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-3.5 h-3.5 ${
                        star <= r.rating ? "fill-amber-400 text-amber-400" : "text-slate-200"
                      }`}
                    />
                  ))}
                </div>
              </div>

              <p className="text-slate-700 text-xs leading-relaxed">{r.comment}</p>
              <p className="text-[10px] text-slate-400">
                {new Date(r.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric"
                })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
