import { useState, useEffect, useRef } from 'react';
import { Star, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import StarRating from './StarRating';
import useAuthStore from '../store/authStore';
import { getProductReviews, createReview } from '../services/api';
import { toast } from 'react-toastify';

const ReviewSection = ({ productId, onReviewsChanged }) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const latestFetchIdRef = useRef(0);
  const { user } = useAuthStore();

  useEffect(() => {
    fetchReviews();
  }, [productId]);

  const fetchReviews = async () => {
    const fetchId = ++latestFetchIdRef.current;
    try {
      const { data } = await getProductReviews(productId);
      if (fetchId === latestFetchIdRef.current) {
        setReviews(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (fetchId === latestFetchIdRef.current) {
        setLoading(false);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }
    if (!comment.trim()) {
      toast.error('Please write a review');
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await createReview(productId, { rating, comment });
      setReviews((prev) => {
        const filtered = prev.filter((r) => r._id !== data._id);
        return [data, ...filtered];
      });
      onReviewsChanged?.({
        averageRating: data.productRating?.averageRating,
        totalReviews: data.productRating?.totalReviews,
      });
      setRating(0);
      setComment('');
      setShowForm(false);
      toast.success('Review submitted!');
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to submit review';
      if (/already reviewed/i.test(message)) {
        toast.info(message);
        await fetchReviews();
      } else {
        toast.error(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : 0;

  const ratingDist = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
    pct: reviews.length > 0
      ? Math.round((reviews.filter((r) => r.rating === star).length / reviews.length) * 100)
      : 0,
  }));

  return (
    <div>
      {/* Summary Row */}
      <div className="flex flex-col md:flex-row gap-8 mb-8">
        {/* Average Rating */}
        <div className="text-center md:text-left">
          <div className="text-5xl font-bold text-dark-navy">{avgRating}</div>
          <StarRating rating={Math.round(avgRating)} readonly size={20} />
          <p className="text-sm text-muted-text mt-1 m-0">{reviews.length} reviews</p>
        </div>

        {/* Rating Bars */}
        <div className="flex-1 space-y-2">
          {ratingDist.map((d) => (
            <div key={d.star} className="flex items-center gap-3 text-sm">
              <span className="w-12 text-muted-text">{d.star} star</span>
              <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent-orange rounded-full transition-all"
                  style={{ width: `${d.pct}%` }}
                ></div>
              </div>
              <span className="w-8 text-muted-text text-right">{d.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Write Review Button */}
      {user && !showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="mb-6 border-2 border-primary-green text-primary-green font-medium py-2.5 px-6 rounded-xl hover:bg-primary-green hover:text-white transition-all"
        >
          Write a Review
        </button>
      )}
      {!user && (
        <p className="text-sm text-muted-text mb-6">
          <a href="/login" className="text-primary-green font-semibold hover:underline">Sign in</a> to write a review.
        </p>
      )}

      {/* Review Form */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-rose-50 border border-rose-100 rounded-2xl p-6 mb-6 overflow-hidden"
          >
            <h4 className="font-bold text-dark-navy mt-0 mb-4">Write Your Review</h4>
            <div className="mb-4">
              <label className="block text-sm font-medium text-dark-navy mb-2">Your Rating</label>
              <StarRating rating={rating} onRate={setRating} size={28} />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-dark-navy mb-2">Your Review</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                placeholder="Share your experience with this product..."
                className="w-full border border-card-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-green focus:border-transparent outline-none resize-none text-sm"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="bg-primary-green text-white font-medium py-2.5 px-6 rounded-xl hover:bg-fuchsia-600 transition-colors disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Review'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-muted-text font-medium py-2.5 px-6 rounded-xl hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Reviews List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse flex gap-4 p-4">
              <div className="w-10 h-10 bg-gray-200 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/4" />
                <div className="h-3 bg-gray-200 rounded w-1/6" />
                <div className="h-4 bg-gray-200 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-8 text-muted-text">
          <p className="text-3xl mb-2">💬</p>
          <p className="m-0">No reviews yet. Be the first to share your thoughts!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review, i) => (
            <motion.div
              key={review._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              className="border border-card-border rounded-xl p-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-rose-50 rounded-full flex items-center justify-center flex-shrink-0">
                  <User size={18} className="text-primary-green" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-dark-navy text-sm">{review.userId?.name || 'User'}</span>
                    <span className="text-xs text-muted-text">
                      {new Date(review.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'short', day: 'numeric',
                      })}
                    </span>
                  </div>
                  <StarRating rating={review.rating} readonly size={14} />
                  <p className="text-sm text-dark-navy mt-2 mb-0 leading-relaxed">{review.comment}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReviewSection;
