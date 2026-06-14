const Cart = require('../models/Cart');
const Product = require('../models/Product');

// @desc    Get user cart
// @route   GET /api/cart
// @access  Private
const getCart = async (req, res, next) => {
  try {
    let cart = await Cart.findOne({ userId: req.user._id })
      .populate('items.productId', 'name price mrp discount unit images stock storeId');

    if (!cart) {
      cart = await Cart.create({ userId: req.user._id, items: [] });
    }

    res.json(cart);
  } catch (error) {
    next(error);
  }
};

// @desc    Add item to cart
// @route   POST /api/cart/add
// @access  Private
const addToCart = async (req, res, next) => {
  try {
    const { productId, quantity, variant } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      res.status(404);
      return next(new Error('Product not found'));
    }

    if (product.stock < quantity) {
      res.status(400);
      return next(new Error('Insufficient stock'));
    }

    let cart = await Cart.findOne({ userId: req.user._id });

    if (!cart) {
      cart = await Cart.create({
        userId: req.user._id,
        items: [
          {
            productId: product._id,
            name: product.name,
            image: product.images[0] || '',
            price: product.price,
            quantity: quantity || 1,
            variant: variant || '',
          },
        ],
      });
    } else {
      const existingItem = cart.items.find(
        (item) => item.productId.toString() === productId
      );

      if (existingItem) {
        existingItem.quantity += quantity || 1;
      } else {
        cart.items.push({
          productId: product._id,
          name: product.name,
          image: product.images[0] || '',
          price: product.price,
          quantity: quantity || 1,
          variant: variant || '',
        });
      }

      await cart.save();
    }

    // Re-populate and return
    cart = await Cart.findOne({ userId: req.user._id })
      .populate('items.productId', 'name price mrp discount unit images stock storeId');

    res.json(cart);
  } catch (error) {
    next(error);
  }
};

// @desc    Update item quantity
// @route   PUT /api/cart/update
// @access  Private
const updateCartItem = async (req, res, next) => {
  try {
    const { productId, quantity } = req.body;

    const cart = await Cart.findOne({ userId: req.user._id });
    if (!cart) {
      res.status(404);
      return next(new Error('Cart not found'));
    }

    const item = cart.items.find(
      (item) => item.productId.toString() === productId
    );

    if (!item) {
      res.status(404);
      return next(new Error('Item not in cart'));
    }

    if (quantity <= 0) {
      cart.items = cart.items.filter(
        (item) => item.productId.toString() !== productId
      );
    } else {
      item.quantity = quantity;
    }

    await cart.save();

    const updatedCart = await Cart.findOne({ userId: req.user._id })
      .populate('items.productId', 'name price mrp discount unit images stock storeId');

    res.json(updatedCart);
  } catch (error) {
    next(error);
  }
};

// @desc    Remove item from cart
// @route   DELETE /api/cart/remove/:productId
// @access  Private
const removeFromCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ userId: req.user._id });
    if (!cart) {
      res.status(404);
      return next(new Error('Cart not found'));
    }

    cart.items = cart.items.filter(
      (item) => item.productId.toString() !== req.params.productId
    );

    await cart.save();

    const updatedCart = await Cart.findOne({ userId: req.user._id })
      .populate('items.productId', 'name price mrp discount unit images stock storeId');

    res.json(updatedCart);
  } catch (error) {
    next(error);
  }
};

// @desc    Clear the cart
// @route   DELETE /api/cart/clear
// @access  Private
const clearCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ userId: req.user._id });
    if (cart) {
      cart.items = [];
      await cart.save();
    }
    res.json({ message: 'Cart cleared' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getCart, addToCart, updateCartItem, removeFromCart, clearCart };
