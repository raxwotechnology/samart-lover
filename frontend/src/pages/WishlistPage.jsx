import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingCart, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import useWishlistStore from '../store/wishlistStore';
import useCartStore from '../store/cartStore';
import useAuthStore from '../store/authStore';
import useCurrencyStore from '../store/currencyStore';
import { toast } from 'react-toastify';

const WishlistPage = () => {
  const { products, loading, fetchWishlist, removeProduct } = useWishlistStore();
  const { addItem } = useCartStore();
  const { user } = useAuthStore();
  const { getProductPrice, convertPrice, formatPrice } = useCurrencyStore();

  useEffect(() => {
    if (user) fetchWishlist();
  }, [user]);

  const handleMoveToCart = async (product) => {
    try {
      await addItem(product);
      await removeProduct(product._id);
      toast.success(`${product.name} moved to cart!`);
    } catch (err) {
      toast.error('Failed to add to cart');
    }
  };

  const handleRemove = async (product) => {
    await removeProduct(product._id);
    toast.info(`${product.name} removed from wishlist`);
  };

  if (!user) {
    return (
      <div className="base-container py-20 text-center">
        <Heart size={48} className="text-muted-text mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-dark-navy mb-2 mt-0">Sign in to view your Wishlist</h2>
        <Link to="/login" className="text-primary-green font-semibold hover:underline">Sign In</Link>
      </div>
    );
  }

  if (products.length === 0 && !loading) {
    return (
      <div className="base-container py-20 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="w-24 h-24 bg-red-50 rounded-full mx-auto mb-6 flex items-center justify-center">
            <Heart size={40} className="text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-dark-navy mb-2 mt-0">Your wishlist is empty</h2>
          <p className="text-muted-text mb-6">Save your favorite items here for later.</p>
          <Link to="/shop" className="bg-primary-green text-white font-semibold py-3 px-8 rounded-full hover:bg-emerald-600 transition-all inline-block shadow-lg shadow-emerald-200">
            Browse Products
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="base-container py-8">
      <h1 className="text-2xl md:text-3xl font-bold text-dark-navy mt-0 mb-6">
        My Wishlist <span className="text-muted-text font-normal text-lg">({products.length} items)</span>
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {products.map((product, i) => (
          <motion.div
            key={product._id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.4 }}
            className="bg-white border border-card-border rounded-2xl overflow-hidden hover:shadow-lg transition-all"
          >
            <Link to={`/product/${product._id}`}>
              <div className="relative aspect-square overflow-hidden bg-gray-50">
                <img
                  src={product.images?.[0] || 'https://via.placeholder.com/400'}
                  alt={product.name}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                {product.discount > 0 && (
                  <span className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                    -{product.discount}%
                  </span>
                )}
              </div>
            </Link>
            <div className="p-4">
              <Link to={`/product/${product._id}`}>
                <h3 className="font-semibold text-dark-navy text-sm mb-2 mt-0 hover:text-primary-green transition-colors line-clamp-2">
                  {product.name}
                </h3>
              </Link>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg font-bold text-dark-navy">{getProductPrice(product)}</span>
                {product.mrp > product.price && (
                  <span className="text-xs text-muted-text line-through">{formatPrice(convertPrice(product.mrp))}</span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleMoveToCart(product)}
                  className="flex-1 bg-primary-green text-white text-sm font-medium py-2 rounded-lg hover:bg-emerald-600 transition-colors flex items-center justify-center gap-1.5"
                >
                  <ShoppingCart size={14} /> Add to Cart
                </button>
                <button
                  onClick={() => handleRemove(product)}
                  className="w-10 h-10 border border-card-border rounded-lg flex items-center justify-center hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default WishlistPage;
