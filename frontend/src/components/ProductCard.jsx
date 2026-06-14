import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, ShoppingCart, Heart } from 'lucide-react';
import useCartStore from '../store/cartStore';
import useWishlistStore from '../store/wishlistStore';
import useAuthStore from '../store/authStore';
import useCurrencyStore from '../store/currencyStore';
import { toast } from 'react-toastify';

const ProductCard = ({ product }) => {
  const [hovered, setHovered] = useState(false);
  const { addItem } = useCartStore();
  const { addProduct, removeProduct, isInWishlist } = useWishlistStore();
  const { user } = useAuthStore();
  const { getProductPrice, getProductPriceRaw, formatPrice, exchangeRate, currency } = useCurrencyStore();

  const mainImage = product.images?.[0] || 'https://via.placeholder.com/400x400?text=Beauty+Product';
  const hoverImage = product.images?.[1] || mainImage;
  const displayImage = hovered ? hoverImage : mainImage;
  const storeName = product.storeId?.name || 'Smartlover Boutique';
  const categoryName = product.categoryId?.name || 'No category';
  const wishlisted = user && isInWishlist(product._id);

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await addItem(product, 1);
      toast.success(`${product.name} added to cart!`);
    } catch (err) {
      toast.error('Failed to add to cart');
    }
  };

  const handleToggleWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast.info('Sign in to use wishlist');
      return;
    }
    try {
      if (wishlisted) {
        await removeProduct(product._id);
        toast.info('Removed from wishlist');
      } else {
        await addProduct(product._id);
        toast.success('Added to wishlist!');
      }
    } catch (err) {
      toast.error('Wishlist error');
    }
  };

  return (
    <Link to={`/product/${product._id}`} className="block group">
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="bg-white border border-card-border rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-rose-300"
      >
        <div className="relative overflow-hidden bg-rose-50/40 aspect-square">
          <img src={displayImage} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
          {product.discount > 0 && (
            <span className="absolute top-3 left-3 bg-rose-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">-{product.discount}%</span>
          )}
          {product.isFeatured && (
            <span className="absolute top-3 right-12 bg-zinc-900 text-white text-xs font-bold px-2.5 py-1 rounded-full">Featured</span>
          )}
          <button onClick={handleToggleWishlist}
            className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-sm ${
              wishlisted ? 'bg-red-50 text-red-500' : 'bg-white/80 text-muted-text hover:text-red-500 hover:bg-red-50'
            }`}
          >
            <Heart size={16} className={wishlisted ? 'fill-red-500' : ''} />
          </button>
        </div>
        <div className="p-4">
          <p className="text-xs text-muted-text m-0 mb-1 truncate">{storeName} · {categoryName}</p>
          <h3 className="font-semibold text-dark-navy text-sm mb-2 mt-0 leading-snug line-clamp-2 min-h-[2.5rem] group-hover:text-primary-green transition-colors">{product.name}</h3>
          <div className="flex items-center gap-1 mb-2">
            <Star size={14} className="fill-accent-orange text-accent-orange" />
            <span className="text-xs font-semibold text-dark-navy">{product.averageRating}</span>
            <span className="text-xs text-muted-text">({product.totalReviews})</span>
          </div>
          <div className="flex items-center justify-between mt-auto">
            <div>
              <span className="text-lg font-bold text-dark-navy">{getProductPrice(product)}</span>
              {product.mrp > product.price && (
                <span className="text-xs text-muted-text line-through ml-1.5">
                  {currency === 'USD' ? `$${(product.mrp / exchangeRate).toFixed(2)}` : `Rs. ${product.mrp.toFixed(2)}`}
                </span>
              )}
              <span className="text-xs text-muted-text ml-1">/ {product.unit}</span>
            </div>
            <button onClick={handleAddToCart}
              className="w-9 h-9 bg-primary-green hover:bg-fuchsia-700 text-white rounded-full flex items-center justify-center transition-colors shadow-md shadow-rose-200"
            >
              <ShoppingCart size={16} />
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
