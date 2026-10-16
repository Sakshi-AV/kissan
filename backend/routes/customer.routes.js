const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Wishlist = require('../models/Wishlist');
const Review = require('../models/Review');
const Product = require('../models/Product');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('customer'));

// @route   GET /api/customer/dashboard
// @desc    Customer dashboard summary metrics & activity
// @access  Private (Customer)
router.get('/dashboard', async (req, res, next) => {
  try {
    const customerId = req.user._id;

    const orders = await Order.find({ customer: customerId }).sort({ createdAt: -1 });
    const totalOrders = orders.length;
    const totalSpent = orders
      .filter((o) => o.status !== 'cancelled')
      .reduce((sum, o) => sum + o.totalAmount, 0);

    const wishlist = await Wishlist.findOne({ customer: customerId });
    const wishlistCount = wishlist ? wishlist.products.length : 0;

    const reviews = await Review.find({ customer: customerId }).populate('product', 'name images price unit');

    res.json({
      success: true,
      stats: {
        totalOrders,
        totalSpent,
        wishlistCount,
        reviewsCount: reviews.length,
      },
      recentOrders: orders.slice(0, 5),
      reviews: reviews.slice(0, 5),
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/customer/wishlist
// @desc    Get user's wishlist
// @access  Private (Customer)
router.get('/wishlist', async (req, res, next) => {
  try {
    let wishlist = await Wishlist.findOne({ customer: req.user._id }).populate({
      path: 'products',
      populate: { path: 'farmer', select: 'name farmerProfile' },
    });

    if (!wishlist) {
      wishlist = await Wishlist.create({ customer: req.user._id, products: [] });
    }

    res.json({
      success: true,
      products: wishlist.products,
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/customer/wishlist/:productId
// @desc    Toggle product in wishlist (add if missing, remove if present)
// @access  Private (Customer)
router.post('/wishlist/:productId', async (req, res, next) => {
  try {
    const { productId } = req.params;

    let wishlist = await Wishlist.findOne({ customer: req.user._id });
    if (!wishlist) {
      wishlist = await Wishlist.create({ customer: req.user._id, products: [] });
    }

    const index = wishlist.products.findIndex((p) => p.toString() === productId);
    let isAdded = false;

    if (index > -1) {
      wishlist.products.splice(index, 1);
      isAdded = false;
    } else {
      wishlist.products.push(productId);
      isAdded = true;
    }

    await wishlist.save();

    res.json({
      success: true,
      isAdded,
      message: isAdded ? 'Added to wishlist' : 'Removed from wishlist',
      count: wishlist.products.length,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/customer/reviews
// @desc    Get customer's submitted reviews
// @access  Private (Customer)
router.get('/reviews', async (req, res, next) => {
  try {
    const reviews = await Review.find({ customer: req.user._id })
      .populate('product', 'name images price unit')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      reviews,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
