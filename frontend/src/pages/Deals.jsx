import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getDeals } from '../services/api';
import ProductCard from '../components/ProductCard';

const Deals = () => {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDeals = async () => {
      try {
        const res = await getDeals();
        setDeals(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDeals();
  }, []);

  return (
    <div>
      {/* Banner */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 py-10">
        <div className="base-container text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="text-5xl mb-4 block">🔥</span>
            <h1 className="text-3xl md:text-4xl font-bold text-white mt-0 mb-2">Deals of the Day</h1>
            <p className="text-white/80 m-0 text-lg">Grab these incredible offers before they expire!</p>
          </motion.div>
        </div>
      </div>

      {/* Products */}
      <div className="base-container py-10">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white border border-card-border rounded-2xl overflow-hidden animate-pulse">
                <div className="aspect-square bg-gray-200" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                  <div className="h-5 bg-gray-200 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : deals.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {deals.map((product, i) => (
              <motion.div
                key={product._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
              >
                <ProductCard product={product} />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-5xl mb-4">😊</p>
            <h3 className="text-xl font-bold text-dark-navy mb-2 mt-0">No Deals Right Now</h3>
            <p className="text-muted-text">Check back later for exciting offers!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Deals;
