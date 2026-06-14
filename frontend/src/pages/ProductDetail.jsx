import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Star, ShoppingCart, Heart, Share2, Minus, Plus, Store, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import { getProductById, getProducts } from '../services/api';
import ProductCard from '../components/ProductCard';
import ReviewSection from '../components/ReviewSection';
import useCartStore from '../store/cartStore';
import useWishlistStore from '../store/wishlistStore';
import useAuthStore from '../store/authStore';
import useCurrencyStore from '../store/currencyStore';
import { toast } from 'react-toastify';

const ProductDetail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('description');

  const { addItem } = useCartStore();
  const { addProduct, removeProduct, isInWishlist } = useWishlistStore();
  const { user } = useAuthStore();
  const { getProductPrice, convertPrice, formatPrice } = useCurrencyStore();

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const res = await getProductById(id);
        setProduct(res.data);
        setSelectedImage(0);
        setQuantity(1);
        if (res.data.categoryId?._id) {
          const relRes = await getProducts({ category: res.data.categoryId._id, limit: 4 });
          setRelated(relRes.data.products.filter((p) => p._id !== id));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
    window.scrollTo(0, 0);
  }, [id]);

  const handleAddToCart = async () => {
    try {
      await addItem(product, quantity);
      toast.success(`${product.name} added to cart!`);
    } catch (err) {
      toast.error('Failed to add to cart');
    }
  };

  const handleToggleWishlist = async () => {
    if (!user) {
      toast.info('Sign in to use wishlist');
      return;
    }
    try {
      if (isInWishlist(product._id)) {
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

  const handleReviewsChanged = (stats) => {
    if (!stats || !product) return;
    setProduct((prev) => prev ? {
      ...prev,
      averageRating: stats.averageRating ?? prev.averageRating,
      totalReviews: stats.totalReviews ?? prev.totalReviews,
    } : prev);
  };

  if (loading) {
    return (
      <div className="base-container py-8">
        <div className="animate-pulse grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="aspect-square bg-gray-200 rounded-2xl" />
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/3" />
            <div className="h-8 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded w-1/4" />
            <div className="h-10 bg-gray-200 rounded w-1/2" />
            <div className="h-32 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="base-container py-20 text-center">
        <p className="text-5xl mb-4">😢</p>
        <h2 className="text-2xl font-bold text-dark-navy mb-2">Product Not Found</h2>
        <Link to="/shop" className="text-primary-green hover:underline">Back to Shop</Link>
      </div>
    );
  }

  const wishlisted = user && isInWishlist(product._id);

  return (
    <div className="base-container py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-text mb-6 flex-wrap">
        <Link to="/" className="hover:text-primary-green">Home</Link><span>/</span>
        <Link to="/shop" className="hover:text-primary-green">Shop</Link><span>/</span>
        {product.categoryId && (
          <><Link to={`/shop?category=${product.categoryId._id}`} className="hover:text-primary-green">{product.categoryId.name}</Link><span>/</span></>
        )}
        <span className="text-dark-navy font-medium truncate max-w-[200px]">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12">
        {/* Gallery */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
          <div className="bg-white border border-card-border rounded-2xl overflow-hidden mb-4">
            <img src={product.images[selectedImage] || 'https://via.placeholder.com/600'} alt={product.name} className="w-full aspect-square object-cover" />
          </div>
          {product.images.length > 1 && (
            <div className="flex gap-3">
              {product.images.map((img, i) => (
                <button key={i} onClick={() => setSelectedImage(i)}
                  className={`w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${selectedImage === i ? 'border-primary-green shadow-md' : 'border-card-border hover:border-gray-300'}`}>
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </motion.div>

        {/* Product Info */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
          {product.storeId && (
            <Link to={`/store/${product.storeId._id}`} className="inline-flex items-center gap-2 text-sm text-muted-text hover:text-primary-green mb-3 transition-colors">
              <Store size={14} />{product.storeId.name}
            </Link>
          )}
          <h1 className="text-2xl md:text-3xl font-bold text-dark-navy mt-0 mb-3">{product.name}</h1>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-full">
              <Star size={14} className="fill-accent-orange text-accent-orange" />
              <span className="text-sm font-bold text-dark-navy">{product.averageRating}</span>
            </div>
            <span className="text-sm text-muted-text">({product.totalReviews} reviews)</span>
            {product.categoryId && (
              <span className="text-xs bg-gray-100 text-muted-text px-2.5 py-1 rounded-full">{product.categoryId.name}</span>
            )}
          </div>

          {/* Price */}
          <div className="bg-emerald-50 rounded-xl p-4 mb-6">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-dark-navy">{getProductPrice(product)}</span>
              {product.mrp > product.price && (
                <>
                  <span className="text-lg text-muted-text line-through">{formatPrice(convertPrice(product.mrp))}</span>
                  <span className="bg-red-100 text-red-600 text-sm font-bold px-2.5 py-0.5 rounded-full">Save {product.discount}%</span>
                </>
              )}
            </div>
            <p className="text-sm text-muted-text mt-1 mb-0">
              per {product.unit} · {product.stock > 0 ? <span className="text-primary-green font-medium">In Stock ({product.stock})</span> : <span className="text-red-500 font-medium">Out of Stock</span>}
            </p>
          </div>

          {/* Quantity */}
          <div className="flex items-center gap-4 mb-6">
            <span className="text-sm font-medium text-dark-navy">Quantity:</span>
            <div className="flex items-center border border-card-border rounded-lg overflow-hidden">
              <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="w-10 h-10 flex items-center justify-center hover:bg-gray-50"><Minus size={16} /></button>
              <span className="w-12 h-10 flex items-center justify-center border-x border-card-border font-semibold text-sm">{quantity}</span>
              <button onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))} className="w-10 h-10 flex items-center justify-center hover:bg-gray-50"><Plus size={16} /></button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3 mb-6">
            <button onClick={handleAddToCart} className="flex-1 bg-primary-green hover:bg-emerald-600 text-white font-semibold py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2">
              <ShoppingCart size={20} /> Add to Cart
            </button>
            <button onClick={handleToggleWishlist}
              className={`w-12 h-12 border rounded-xl flex items-center justify-center transition-all ${wishlisted ? 'bg-red-50 border-red-200 text-red-500' : 'border-card-border hover:bg-red-50 hover:border-red-200 hover:text-red-500'}`}>
              <Heart size={20} className={wishlisted ? 'fill-red-500' : ''} />
            </button>
            <button className="w-12 h-12 border border-card-border rounded-xl flex items-center justify-center hover:bg-blue-50 hover:border-blue-200 hover:text-blue-500 transition-all">
              <Share2 size={20} />
            </button>
          </div>

          {/* Store Info */}
          {product.storeId && (
            <div className="bg-white border border-card-border rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center"><Store size={18} className="text-primary-green" /></div>
                <div>
                  <Link to={`/store/${product.storeId._id}`} className="font-semibold text-dark-navy hover:text-primary-green transition-colors text-sm">{product.storeId.name}</Link>
                  {product.storeId.city && <p className="text-xs text-muted-text m-0 flex items-center gap-1"><MapPin size={10} /> {product.storeId.city}</p>}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="mb-12">
        <div className="flex border-b border-card-border mb-6 gap-0.5">
          {['description', 'reviews', 'details'].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`py-3 px-6 text-sm font-medium capitalize transition-all border-b-2 ${activeTab === tab ? 'border-primary-green text-primary-green' : 'border-transparent text-muted-text hover:text-dark-navy'}`}>
              {tab === 'reviews' ? `Reviews (${product.totalReviews})` : tab}
            </button>
          ))}
        </div>
        <div className="bg-white border border-card-border rounded-2xl p-6">
          {activeTab === 'description' && <p className="text-dark-navy leading-relaxed m-0">{product.description}</p>}
          {activeTab === 'reviews' && <ReviewSection productId={product._id} onReviewsChanged={handleReviewsChanged} />}
          {activeTab === 'details' && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[
                { label: 'Unit', value: product.unit },
                { label: 'Stock', value: product.stock },
                { label: 'Category', value: product.categoryId?.name || 'N/A' },
                { label: 'Store', value: product.storeId?.name || 'N/A' },
              ].map((d) => (
                <div key={d.label} className="bg-gray-50 rounded-lg p-3">
                  <span className="text-muted-text">{d.label}</span>
                  <p className="font-semibold text-dark-navy mt-1 mb-0">{d.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold text-dark-navy mb-6 mt-0">Related Products</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {related.slice(0, 4).map((p) => <ProductCard key={p._id} product={p} />)}
          </div>
        </section>
      )}
    </div>
  );
};

export default ProductDetail;
