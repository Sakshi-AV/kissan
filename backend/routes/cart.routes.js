const express = require('express');
const router = express.Router();
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/cart
// @desc    Get current user's shopping cart
// @access  Private (Customer)
router.get('/', protect, authorize('customer'), async (req, res, next) => {
  try {
    let cart = await Cart.findOne({ customer: req.user._id }).populate({
      path: 'items.product',
      populate: { path: 'farmer', select: 'name farmerProfile' },
    });

    if (!cart) {
      cart = await Cart.create({ customer: req.user._id, items: [] });
    }

    // Filter out deleted products and compute subtotals
    let validItems = [];
    let subtotal = 0;
    let hasOutOfStock = false;

    for (const item of cart.items) {
      if (item.product && item.product.status === 'active') {
        const isStockAvailable = item.product.availableQuantity >= item.quantity;
        if (!isStockAvailable) hasOutOfStock = true;

        validItems.push({
          _id: item._id,
          product: item.product,
          quantity: item.quantity,
          isStockAvailable,
          itemTotal: item.product.price * item.quantity,
        });
        subtotal += item.product.price * item.quantity;
      }
    }

    // Shipping calculation: Flat ₹40 or free above ₹500
    const shippingFee = subtotal > 500 || subtotal === 0 ? 0 : 40;
    const totalAmount = subtotal + shippingFee;

    res.json({
      success: true,
      cart: {
        _id: cart._id,
        items: validItems,
        itemCount: validItems.reduce((acc, i) => acc + i.quantity, 0),
        subtotal,
        shippingFee,
        totalAmount,
        hasOutOfStock,
      },
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/cart
// @desc    Add product to cart or increment quantity
// @access  Private (Customer)
router.post('/', protect, authorize('customer'), async (req, res, next) => {
  try {
    const { productId, quantity = 1 } = req.body;
    const qty = parseInt(quantity, 10);

    if (!productId || qty <= 0) {
      return res.status(400).json({ success: false, message: 'Valid productId and quantity are required' });
    }

    const product = await Product.findById(productId);
    if (!product || product.status !== 'active' || !product.isAvailable) {
      return res.status(404).json({ success: false, message: 'Product is unavailable or out of stock' });
    }

    let cart = await Cart.findOne({ customer: req.user._id });
    if (!cart) {
      cart = await Cart.create({ customer: req.user._id, items: [] });
    }

    const existingIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId.toString()
    );

    let newQuantity = qty;
    if (existingIndex > -1) {
      newQuantity = cart.items[existingIndex].quantity + qty;
      if (newQuantity > product.availableQuantity) {
        return res.status(400).json({
          success: false,
          message: `Only ${product.availableQuantity} ${product.unit} available in stock`,
        });
      }
      cart.items[existingIndex].quantity = newQuantity;
    } else {
      if (qty > product.availableQuantity) {
        return res.status(400).json({
          success: false,
          message: `Only ${product.availableQuantity} ${product.unit} available in stock`,
        });
      }
      cart.items.push({ product: productId, quantity: qty });
    }

    await cart.save();

    res.json({
      success: true,
      message: 'Item added to cart',
      itemCount: cart.items.reduce((acc, i) => acc + i.quantity, 0),
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/cart/items/:productId
// @desc    Update quantity of specific item
// @access  Private (Customer)
router.put('/items/:productId', protect, authorize('customer'), async (req, res, next) => {
  try {
    const { quantity } = req.body;
    const qty = parseInt(quantity, 10);
    const { productId } = req.params;

    if (qty <= 0) {
      // Remove item if quantity is zero or less
      const cart = await Cart.findOneAndUpdate(
        { customer: req.user._id },
        { $pull: { items: { product: productId } } },
        { new: true }
      );
      return res.json({ success: true, message: 'Item removed from cart', cart });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    if (qty > product.availableQuantity) {
      return res.status(400).json({
        success: false,
        message: `Only ${product.availableQuantity} ${product.unit} available in stock`,
      });
    }

    const cart = await Cart.findOne({ customer: req.user._id });
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }

    const item = cart.items.find((i) => i.product.toString() === productId.toString());
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not in cart' });
    }

    item.quantity = qty;
    await cart.save();

    res.json({ success: true, message: 'Quantity updated successfully' });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/cart/items/:productId
// @desc    Remove an item from cart
// @access  Private (Customer)
router.delete('/items/:productId', protect, authorize('customer'), async (req, res, next) => {
  try {
    const cart = await Cart.findOneAndUpdate(
      { customer: req.user._id },
      { $pull: { items: { product: req.params.productId } } },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Item removed from cart',
      itemCount: cart ? cart.items.length : 0,
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/cart
// @desc    Clear entire cart
// @access  Private (Customer)
router.delete('/', protect, authorize('customer'), async (req, res, next) => {
  try {
    await Cart.findOneAndUpdate({ customer: req.user._id }, { items: [] });
    res.json({ success: true, message: 'Cart cleared' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
