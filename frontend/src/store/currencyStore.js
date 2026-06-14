import { create } from 'zustand';

const useCurrencyStore = create((set, get) => ({
  currency: localStorage.getItem('smartlover_currency') || 'LKR',
  exchangeRate: parseFloat(localStorage.getItem('smartlover_rate')) || 320,
  lastFetched: parseInt(localStorage.getItem('smartlover_rate_ts')) || 0,

  setCurrency: (currency) => {
    localStorage.setItem('smartlover_currency', currency);
    set({ currency });
  },

  toggleCurrency: () => {
    const newCurrency = get().currency === 'LKR' ? 'USD' : 'LKR';
    localStorage.setItem('smartlover_currency', newCurrency);
    set({ currency: newCurrency });
  },

  setExchangeRate: (rate) => {
    const now = Date.now();
    localStorage.setItem('smartlover_rate', rate.toString());
    localStorage.setItem('smartlover_rate_ts', now.toString());
    set({ exchangeRate: rate, lastFetched: now });
  },

  // Fetch live exchange rate from backend
  fetchRate: async () => {
    const now = Date.now();
    const lastFetched = get().lastFetched;
    // Only fetch if older than 30 minutes
    if (now - lastFetched < 30 * 60 * 1000) return;

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/currency/rate`);
      const data = await res.json();
      if (data.rate) {
        get().setExchangeRate(data.rate);
      }
    } catch (err) {
      console.error('Failed to fetch exchange rate:', err);
    }
  },

  /**
   * Convert a price (stored in LKR) to the selected currency
   * @param {number} priceLKR - Price in LKR
   * @param {number|null} priceUSD - Pre-calculated USD price (optional)
   * @returns {number} Converted price
   */
  convertPrice: (priceLKR, priceUSD = null) => {
    const { currency, exchangeRate } = get();
    if (currency === 'USD') {
      // Use pre-calculated USD price if available
      if (priceUSD && priceUSD > 0) return priceUSD;
      return parseFloat((priceLKR / exchangeRate).toFixed(2));
    }
    return priceLKR;
  },

  /**
   * Format price with currency symbol
   * @param {number} amount - Amount to format
   * @returns {string} Formatted price string
   */
  formatPrice: (amount) => {
    const { currency } = get();
    if (currency === 'USD') {
      return `$${amount.toFixed(2)}`;
    }
    return `Rs. ${amount.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  },

  /**
   * Get the price display for a product
   * @param {object} product - Product object with price, priceLKR, priceUSD fields
   * @returns {string} Formatted price string
   */
  getProductPrice: (product) => {
    const { currency, exchangeRate } = get();
    if (currency === 'USD') {
      const price = product.priceUSD || parseFloat((product.price / exchangeRate).toFixed(2));
      return `$${price.toFixed(2)}`;
    }
    const price = product.priceLKR || product.price;
    return `Rs. ${price.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  },

  /**
   * Get raw numeric price for a product in selected currency
   */
  getProductPriceRaw: (product) => {
    const { currency, exchangeRate } = get();
    if (currency === 'USD') {
      return product.priceUSD || parseFloat((product.price / exchangeRate).toFixed(2));
    }
    return product.priceLKR || product.price;
  },

  /**
   * Get currency symbol
   */
  getSymbol: () => {
    return get().currency === 'USD' ? '$' : 'Rs.';
  },
}));

export default useCurrencyStore;
