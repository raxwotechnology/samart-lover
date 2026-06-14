const https = require('https');
const http = require('http');

// Cache exchange rate for 1 hour
let cachedRate = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour
const FALLBACK_RATE = 320; // Fallback USD to LKR rate

/**
 * Fetch live USD→LKR exchange rate from a free API
 * Uses exchangerate-api.com open endpoint (no key needed, 1500 req/month)
 */
const fetchLiveRate = () => {
  return new Promise((resolve) => {
    const url = 'https://open.er-api.com/v6/latest/USD';

    const req = https.get(url, { timeout: 5000 }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.result === 'success' && parsed.rates?.LKR) {
            resolve(parsed.rates.LKR);
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      });
    });

    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
  });
};

/**
 * Get the current USD to LKR exchange rate (cached)
 * @returns {Promise<number>} Exchange rate
 */
const getExchangeRate = async () => {
  const now = Date.now();

  // Return cached rate if still valid
  if (cachedRate && now - cacheTimestamp < CACHE_DURATION) {
    return cachedRate;
  }

  // Try to fetch live rate
  const liveRate = await fetchLiveRate();

  if (liveRate) {
    cachedRate = liveRate;
    cacheTimestamp = now;
    console.log(`Exchange rate updated: 1 USD = ${liveRate} LKR`);
    return liveRate;
  }

  // Use cached rate if available, otherwise fallback
  if (cachedRate) {
    console.log(`Using cached exchange rate: 1 USD = ${cachedRate} LKR`);
    return cachedRate;
  }

  console.log(`Using fallback exchange rate: 1 USD = ${FALLBACK_RATE} LKR`);
  return FALLBACK_RATE;
};

/**
 * Convert amount between currencies
 * @param {number} amount - The amount to convert
 * @param {string} from - Source currency ('LKR' or 'USD')
 * @param {string} to - Target currency ('LKR' or 'USD')
 * @returns {Promise<number>} Converted amount
 */
const convertCurrency = async (amount, from, to) => {
  if (from === to) return amount;

  const rate = await getExchangeRate();

  if (from === 'USD' && to === 'LKR') {
    return parseFloat((amount * rate).toFixed(2));
  }

  if (from === 'LKR' && to === 'USD') {
    return parseFloat((amount / rate).toFixed(2));
  }

  return amount;
};

/**
 * Format price with currency symbol
 * @param {number} amount
 * @param {string} currency - 'LKR' or 'USD'
 * @returns {string} Formatted price
 */
const formatPrice = (amount, currency = 'LKR') => {
  if (currency === 'USD') {
    return `$${amount.toFixed(2)}`;
  }
  return `Rs. ${amount.toFixed(2)}`;
};

module.exports = {
  getExchangeRate,
  convertCurrency,
  formatPrice,
  FALLBACK_RATE,
};
