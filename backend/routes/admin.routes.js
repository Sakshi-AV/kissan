const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Category = require('../models/Category');
const FarmerVerification = require('../models/FarmerVerification');
const Report = require('../models/Report');
const ActivityLog = require('../models/ActivityLog');
const Notification = require('../models/Notification');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('admin'));

// @route   GET /api/admin/dashboard
// @desc    Get system-wide overview statistics, revenue, and charts
// @access  Private (Admin)
router.get('/dashboard', async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalFarmers = await User.countDocuments({ role: 'farmer' });
    const totalCustomers = await User.countDocuments({ role: 'customer' });
    const totalProducts = await Product.countDocuments();
    const totalOrders = await Order.countDocuments();
    const pendingVerifications = await FarmerVerification.countDocuments({ status: 'pending' });
    const pendingReports = await Report.countDocuments({ status: 'pending' });

    // Calculate revenue
    const orders = await Order.find({ status: { $ne: 'cancelled' } });
    const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    // Chart.js monthly trends for the last 6 months
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyRev = {};
    const monthlyOrderCount = {};
    const currentDate = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const key = `${months[d.getMonth()]}`;
      monthlyRev[key] = 0;
      monthlyOrderCount[key] = 0;
    }

    orders.forEach((o) => {
      const m = months[new Date(o.createdAt).getMonth()];
      if (monthlyRev[m] !== undefined) {
        monthlyRev[m] += o.totalAmount;
        monthlyOrderCount[m] += 1;
      }
    });

    const recentOrders = await Order.find()
      .populate('customer', 'name email phone')
      .sort({ createdAt: -1 })
      .limit(6);

    const recentLogs = await ActivityLog.find()
      .populate('user', 'name role email')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalFarmers,
        totalCustomers,
        totalProducts,
        totalOrders,
        totalRevenue,
        pendingVerifications,
        pendingReports,
      },
      chartData: {
        labels: Object.keys(monthlyRev),
        revenue: Object.values(monthlyRev),
        orderCounts: Object.values(monthlyOrderCount),
      },
      recentOrders,
      recentLogs,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/admin/users
// @desc    List all users with optional role and search filter
// @access  Private (Admin)
router.get('/users', async (req, res, next) => {
  try {
    const { role, search } = req.query;
    const filter = {};
    if (role && role !== 'all') filter.role = role;
    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { phone: new RegExp(search, 'i') },
      ];
    }

    const users = await User.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: users.length, users });
  } catch (error) {
    next(error);
  }
});

// @route   PATCH /api/admin/users/:id/status
// @desc    Toggle user status between 'active' and 'restricted'
// @access  Private (Admin)
router.patch('/users/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['active', 'restricted'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.role === 'admin' && user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot restrict your own admin account' });
    }

    user.status = status;
    await user.save();

    await ActivityLog.create({
      user: req.user._id,
      action: 'USER_STATUS_CHANGE',
      details: `User ${user.email} changed to ${status}`,
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      user,
      message: `User status changed to ${status}`,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/admin/verifications
// @desc    List farmer verification applications
// @access  Private (Admin)
router.get('/verifications', async (req, res, next) => {
  try {
    const verifications = await FarmerVerification.find()
      .populate('farmer', 'name email phone avatar farmerProfile')
      .sort({ createdAt: -1 });

    res.json({ success: true, verifications });
  } catch (error) {
    next(error);
  }
});

// @route   PATCH /api/admin/verifications/:id
// @desc    Approve or reject farmer verification
// @access  Private (Admin)
router.patch('/verifications/:id', async (req, res, next) => {
  try {
    const { status, adminNotes } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be approved or rejected' });
    }

    const verification = await FarmerVerification.findById(req.params.id).populate('farmer');
    if (!verification) {
      return res.status(404).json({ success: false, message: 'Verification application not found' });
    }

    verification.status = status;
    verification.adminNotes = adminNotes || '';
    verification.reviewedBy = req.user._id;
    verification.reviewedAt = new Date();
    await verification.save();

    // Update farmer user record
    const isApproved = status === 'approved';
    await User.findByIdAndUpdate(verification.farmer._id, {
      'farmerProfile.isVerified': isApproved,
      'farmerProfile.verificationStatus': status,
      'farmerProfile.verificationNotes': adminNotes || '',
    });

    // Notify farmer
    await Notification.create({
      recipient: verification.farmer._id,
      title: isApproved ? 'Verification Approved! 🎉' : 'Verification Update',
      message: isApproved
        ? 'Congratulations! Your farm has been verified. You now have the Verified Farmer badge on your profile and listings.'
        : `Your verification request was reviewed: ${adminNotes || 'Please check your submitted details and re-apply.'}`,
      type: 'verification',
      link: '/farmer-dashboard.html#profile',
    });

    // Audit log
    await ActivityLog.create({
      user: req.user._id,
      action: 'FARMER_VERIFICATION_REVIEW',
      details: `Farmer ${verification.farmer.email} verification set to ${status}`,
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      verification,
      message: `Farmer verification has been ${status}`,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/admin/products
// @desc    List all products for moderation
// @access  Private (Admin)
router.get('/products', async (req, res, next) => {
  try {
    const products = await Product.find()
      .populate('category', 'name slug')
      .populate('farmer', 'name email farmerProfile')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: products.length, products });
  } catch (error) {
    next(error);
  }
});

// @route   PATCH /api/admin/products/:id/moderation
// @desc    Moderate product status ('active', 'hidden', 'flagged')
// @access  Private (Admin)
router.patch('/products/:id/moderation', async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['active', 'hidden', 'flagged'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid moderation status' });
    }

    const product = await Product.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    await ActivityLog.create({
      user: req.user._id,
      action: 'PRODUCT_MODERATION',
      details: `Product "${product.name}" status changed to ${status}`,
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      product,
      message: `Product status set to ${status}`,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/admin/orders
// @desc    List all orders platform-wide
// @access  Private (Admin)
router.get('/orders', async (req, res, next) => {
  try {
    const orders = await Order.find()
      .populate('customer', 'name email phone')
      .populate('items.farmer', 'name email')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: orders.length, orders });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/admin/reports
// @desc    List reported products / complaints
// @access  Private (Admin)
router.get('/reports', async (req, res, next) => {
  try {
    const reports = await Report.find()
      .populate('reporter', 'name email')
      .populate('reportedProduct', 'name images price')
      .populate('reportedUser', 'name email role')
      .sort({ createdAt: -1 });

    res.json({ success: true, reports });
  } catch (error) {
    next(error);
  }
});

// @route   PATCH /api/admin/reports/:id
// @desc    Resolve or dismiss complaint report
// @access  Private (Admin)
router.patch('/reports/:id', async (req, res, next) => {
  try {
    const { status, actionTaken } = req.body;
    if (!['resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid report status' });
    }

    const report = await Report.findByIdAndUpdate(
      req.params.id,
      { status, actionTaken: actionTaken || '' },
      { new: true }
    );

    res.json({ success: true, report, message: `Report marked as ${status}` });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/admin/logs
// @desc    Get audit trail activity logs
// @access  Private (Admin)
router.get('/logs', async (req, res, next) => {
  try {
    const logs = await ActivityLog.find()
      .populate('user', 'name email role')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ success: true, count: logs.length, logs });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
