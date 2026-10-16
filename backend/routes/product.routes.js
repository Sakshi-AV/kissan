const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Category = require('../models/Category');
const Review = require('../models/Review');
const Order = require('../models/Order');
const Report = require('../models/Report');
const Notification = require('../models/Notification');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/products
// @desc    Get all products with search, filters, sorting & pagination
// @access  Public
router.get('/', async (req, res, next) => {
  try {
    const {
      keyword,
      category,
      minPrice,
      maxPrice,
      isOrganic,
      isAvailable,
      location,
      sortBy,
      farmerId,
      page = 1,
      limit = 12,
    } = req.query;

    const query = { status: 'active' };

    // Search keyword
    if (keyword && keyword.trim()) {
      const regex = new RegExp(keyword.trim(), 'i');
      query.$or = [{ name: regex }, { description: regex }];
    }

    // Category filter
    if (category && category !== 'all') {
      if (category.match(/^[0-9a-fA-F]{24}$/)) {
        query.category = category;
      } else {
        const cat = await Category.findOne({ slug: category });
        if (cat) query.category = cat._id;
      }
    }

    // Farmer filter
    if (farmerId && farmerId.match(/^[0-9a-fA-F]{24}$/)) {
      query.farmer = farmerId;
    }

    // Price range
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // Organic filter
    if (isOrganic === 'true') {
      query.isOrganic = true;
    }

    // Availability filter
    if (isAvailable !== undefined) {
      if (isAvailable === 'true') {
        query.isAvailable = true;
        query.availableQuantity = { $gt: 0 };
      }
    }

    // Location filter
    if (location && location.trim()) {
      const locRegex = new RegExp(location.trim(), 'i');
      query.$or = [
        ...(query.$or || []),
        { 'farmLocation.city': locRegex },
        { 'farmLocation.state': locRegex },
        { 'farmLocation.address': locRegex },
      ];
    }

    // Sorting
    let sort = { createdAt: -1 }; // default newest
    if (sortBy === 'price_asc') sort = { price: 1 };
    else if (sortBy === 'price_desc') sort = { price: -1 };
    else if (sortBy === 'rating') sort = { ratingAverage: -1 };
    else if (sortBy === 'newest') sort = { createdAt: -1 };

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 12;
    const skip = (pageNum - 1) * limitNum;

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .populate('category', 'name slug icon')
      .populate('farmer', 'name farmerProfile avatar')
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    res.json({
      success: true,
      count: products.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1,
      products,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/products/featured
// @desc    Get featured products
// @access  Public
router.get('/featured', async (req, res, next) => {
  try {
    const featured = await Product.find({ status: 'active', isAvailable: true, availableQuantity: { $gt: 0 } })
      .populate('category', 'name slug icon')
      .populate('farmer', 'name farmerProfile avatar')
      .sort({ ratingAverage: -1, createdAt: -1 })
      .limit(8);

    const newest = await Product.find({ status: 'active', isAvailable: true, availableQuantity: { $gt: 0 } })
      .populate('category', 'name slug icon')
      .populate('farmer', 'name farmerProfile avatar')
      .sort({ createdAt: -1 })
      .limit(8);

    res.json({
      success: true,
      featured,
      newest,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/products/:id
// @desc    Get single product details with related products
// @access  Public
router.get('/:id', async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('category', 'name slug icon')
      .populate('farmer', 'name email phone avatar farmerProfile');

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Get related products from the same category
    const related = await Product.find({
      category: product.category._id,
      _id: { $ne: product._id },
      status: 'active',
      isAvailable: true,
    })
      .populate('farmer', 'name farmerProfile')
      .limit(4);

    res.json({
      success: true,
      product,
      related,
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/products
// @desc    Create a product (Farmer only)
// @access  Private (Farmer)
router.post('/', protect, authorize('farmer'), async (req, res, next) => {
  try {
    const {
      name,
      description,
      category,
      price,
      unit,
      availableQuantity,
      images,
      farmLocation,
      harvestDate,
      isOrganic,
    } = req.body;

    if (!name || !description || !category || !price || !unit || availableQuantity === undefined) {
      return res.status(400).json({ success: false, message: 'Please provide all required product details' });
    }

    // Check category exists
    const categoryDoc = await Category.findById(category);
    if (!categoryDoc) {
      return res.status(400).json({ success: false, message: 'Invalid category specified' });
    }

    // Inherit farm location from farmer profile if not explicitly specified
    const locationData = farmLocation || {
      address: req.user.farmerProfile?.farmLocation?.address || req.user.address?.street || 'Farm Location',
      city: req.user.farmerProfile?.farmLocation?.city || req.user.address?.city || 'Bengaluru',
      state: req.user.farmerProfile?.farmLocation?.state || req.user.address?.state || 'Karnataka',
      pincode: req.user.farmerProfile?.farmLocation?.pincode || req.user.address?.pincode || '560001',
      coordinates: req.user.farmerProfile?.farmLocation?.coordinates || { lat: 12.9716, lng: 77.5946 },
    };

    const product = await Product.create({
      name,
      description,
      category,
      farmer: req.user._id,
      price: Number(price),
      unit,
      availableQuantity: Number(availableQuantity),
      images: Array.isArray(images) && images.length > 0 ? images : ['https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80'],
      farmLocation: locationData,
      harvestDate: harvestDate || Date.now(),
      isOrganic: Boolean(isOrganic),
      isAvailable: Number(availableQuantity) > 0,
    });

    res.status(201).json({
      success: true,
      product,
      message: 'Product listed successfully',
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/products/:id
// @desc    Update a product (Farmer owner or Admin)
// @access  Private (Farmer or Admin)
router.put('/:id', protect, async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Check ownership
    const isOwner = product.farmer.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to modify this product' });
    }

    const {
      name,
      description,
      category,
      price,
      unit,
      availableQuantity,
      images,
      farmLocation,
      harvestDate,
      isOrganic,
      isAvailable,
      status,
    } = req.body;

    if (name) product.name = name;
    if (description) product.description = description;
    if (category) product.category = category;
    if (price !== undefined) product.price = Number(price);
    if (unit) product.unit = unit;
    if (availableQuantity !== undefined) {
      product.availableQuantity = Number(availableQuantity);
      product.isAvailable = Number(availableQuantity) > 0;
    }
    if (images && Array.isArray(images) && images.length > 0) product.images = images;
    if (farmLocation) product.farmLocation = farmLocation;
    if (harvestDate) product.harvestDate = harvestDate;
    if (isOrganic !== undefined) product.isOrganic = Boolean(isOrganic);
    if (isAvailable !== undefined) product.isAvailable = Boolean(isAvailable);
    if (status && isAdmin) product.status = status; // Admin moderation

    await product.save();

    res.json({
      success: true,
      product,
      message: 'Product updated successfully',
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/products/:id
// @desc    Delete a product (Farmer owner or Admin)
// @access  Private
router.delete('/:id', protect, async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const isOwner = product.farmer.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this product' });
    }

    await Product.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/products/:id/reviews
// @desc    Get all reviews for a product
// @access  Public
router.get('/:id/reviews', async (req, res, next) => {
  try {
    const reviews = await Review.find({ product: req.params.id })
      .populate('customer', 'name avatar')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      reviews,
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/products/:id/reviews
// @desc    Add review for a product
// @access  Private (Customer)
router.post('/:id/reviews', protect, authorize('customer'), async (req, res, next) => {
  try {
    const { rating, comment } = req.body;
    const productId = req.params.id;

    if (!rating || !comment) {
      return res.status(400).json({ success: false, message: 'Rating and comment are required' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Check if customer already reviewed
    const existingReview = await Review.findOne({ product: productId, customer: req.user._id });
    if (existingReview) {
      return res.status(400).json({ success: false, message: 'You have already submitted a review for this product' });
    }

    // Check if customer has placed an order containing this product
    const eligibleOrder = await Order.findOne({
      customer: req.user._id,
      'items.product': productId,
    });

    if (!eligibleOrder) {
      return res.status(403).json({
        success: false,
        message: 'Only verified customers who ordered this product can submit a review',
      });
    }

    const review = await Review.create({
      product: productId,
      customer: req.user._id,
      rating: Number(rating),
      comment,
    });

    // Recompute product rating average
    const allReviews = await Review.find({ product: productId });
    const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

    product.ratingAverage = Number(avgRating.toFixed(1));
    product.ratingCount = allReviews.length;
    await product.save();

    // Notify farmer of new review
    await Notification.create({
      recipient: product.farmer,
      title: 'New Customer Review',
      message: `A customer rated your product "${product.name}" with ${rating} stars: "${comment.substring(0, 50)}..."`,
      type: 'review',
      link: `/product-details.html?id=${product._id}`,
    });

    res.status(201).json({
      success: true,
      review,
      ratingAverage: product.ratingAverage,
      ratingCount: product.ratingCount,
      message: 'Review submitted successfully',
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/products/:id/report
// @desc    Report a product
// @access  Private
router.post('/:id/report', protect, async (req, res, next) => {
  try {
    const { reason, description } = req.body;
    if (!reason || !description) {
      return res.status(400).json({ success: false, message: 'Reason and description are required' });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const report = await Report.create({
      reporter: req.user._id,
      reportedProduct: product._id,
      reportedUser: product.farmer,
      reason,
      description,
    });

    res.status(201).json({
      success: true,
      report,
      message: 'Product report submitted to moderators for review',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
