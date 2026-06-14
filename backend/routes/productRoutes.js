const express = require('express');
const router = express.Router();
const {
  getProducts,
  searchProducts,
  getFeaturedProducts,
  getDeals,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getMyProducts,
  getPriceHistory,
  importProductsExcel,
} = require('../controllers/productController');
const { protect, authorize } = require('../middleware/authMiddleware');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// Public routes (order matters — put specific before :id)
router.get('/search', searchProducts);
router.get('/featured', getFeaturedProducts);
router.get('/deals', getDeals);
router.get('/my-store', protect, authorize('manager'), getMyProducts);
router.post('/import-excel', protect, authorize('manager', 'admin'), upload.single('file'), importProductsExcel);

router.route('/')
  .get(getProducts)
  .post(protect, authorize('manager', 'admin'), createProduct);

router.route('/:id')
  .get(getProductById)
  .put(protect, authorize('manager', 'admin'), updateProduct)
  .delete(protect, authorize('manager', 'admin'), deleteProduct);

router.get('/:id/price-history', protect, authorize('manager', 'admin'), getPriceHistory);

module.exports = router;

