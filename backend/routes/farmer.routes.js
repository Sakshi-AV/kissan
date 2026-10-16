const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Order = require('../models/Order');
const Review = require('../models/Review');
const User = require('../models/User');
const FarmerVerification = require('../models/FarmerVerification');
const Notification = require('../models/Notification');
const { protect, authorize } = require('../middleware/auth');

// All routes here require farmer role
router.use(protect);
router.use(authorize('farmer'));

// @route   GET /api/farmer/dashboard
// @desc    Get dashboard metrics, charts, and recent activity for the farmer
// @access  Private (Farmer)
router.get('/dashboard', async (req, res, next) => {
  try {
    const farmerId = req.user._id;

    // 1. Products metrics
    const totalProducts = await Product.countDocuments({ farmer: farmerId });
    const activeProducts = await Product.countDocuments({ farmer: farmerId, status: 'active', isAvailable: true });
    const lowStockProducts = await Product.countDocuments({
      farmer: farmerId,
      status: 'active',
      availableQuantity: { $lte: 5 },
    });

    // 2. Orders metrics
    const orders = await Order.find({ 'items.farmer': farmerId })
      .populate('customer', 'name phone email')
      .sort({ createdAt: -1 });

    let pendingOrdersCount = 0;
    let acceptedOrdersCount = 0;
    let deliveredOrdersCount = 0;
    let totalEarnings = 0;

    // Monthly earnings map for Chart.js (last 6 months)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlySales = {};
    const currentDate = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const key = `${months[d.getMonth()]}`;
      monthlySales[key] = 0;
    }

    orders.forEach((order) => {
      // Find items relevant to this farmer
      const farmerItems = order.items.filter((item) => item.farmer.toString() === farmerId.toString());

      farmerItems.forEach((item) => {
        if (item.farmerStatus === 'pending') pendingOrdersCount++;
        if (['accepted', 'in_transit'].includes(item.farmerStatus)) acceptedOrdersCount++;
        if (item.farmerStatus === 'delivered') {
          deliveredOrdersCount++;
          const itemRev = item.price * item.quantity;
          totalEarnings += itemRev;

          const orderMonth = months[new Date(order.createdAt).getMonth()];
          if (monthlySales[orderMonth] !== undefined) {
            monthlySales[orderMonth] += itemRev;
          }
        }
      });
    });

    // 3. Recent 5 orders
    const recentOrders = orders.slice(0, 5).map((order) => {
      const relevantItems = order.items.filter((i) => i.farmer.toString() === farmerId.toString());
      return {
        _id: order._id,
        orderNumber: order.orderNumber,
        customerName: order.customer ? order.customer.name : 'Customer',
        customerPhone: order.customer ? order.customer.phone : '',
        shippingAddress: order.shippingAddress,
        status: order.status,
        createdAt: order.createdAt,
        items: relevantItems,
        farmerTotal: relevantItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
      };
    });

    // 4. Verification status
    const verification = await FarmerVerification.findOne({ farmer: farmerId });

    res.json({
      success: true,
      stats: {
        totalProducts,
        activeProducts,
        lowStockProducts,
        pendingOrdersCount,
        acceptedOrdersCount,
        deliveredOrdersCount,
        totalEarnings,
      },
      chartData: {
        labels: Object.keys(monthlySales),
        data: Object.values(monthlySales),
      },
      recentOrders,
      verificationStatus: req.user.farmerProfile?.verificationStatus || 'none',
      isVerified: req.user.farmerProfile?.isVerified || false,
      verificationApplication: verification || null,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/farmer/products
// @desc    Get all products belonging to this farmer
// @access  Private (Farmer)
router.get('/products', async (req, res, next) => {
  try {
    const products = await Product.find({ farmer: req.user._id })
      .populate('category', 'name slug')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      products,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/farmer/orders
// @desc    Get all orders containing items from this farmer
// @access  Private (Farmer)
router.get('/orders', async (req, res, next) => {
  try {
    const orders = await Order.find({ 'items.farmer': req.user._id })
      .populate('customer', 'name phone email')
      .populate('items.product', 'name unit')
      .sort({ createdAt: -1 });

    const formattedOrders = orders.map((order) => {
      const myItems = order.items.filter((i) => i.farmer.toString() === req.user._id.toString());
      return {
        _id: order._id,
        orderNumber: order.orderNumber,
        customer: order.customer,
        shippingAddress: order.shippingAddress,
        overallStatus: order.status,
        createdAt: order.createdAt,
        items: myItems,
        orderSubtotal: myItems.reduce((acc, i) => acc + i.price * i.quantity, 0),
      };
    });

    res.json({
      success: true,
      orders: formattedOrders,
    });
  } catch (error) {
    next(error);
  }
});

// @route   PATCH /api/farmer/orders/:orderId/items/:itemId/status
// @desc    Update order item fulfillment status (accept, reject, in_transit, delivered)
// @access  Private (Farmer)
router.patch('/orders/:orderId/items/:itemId/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    const allowed = ['accepted', 'rejected', 'in_transit', 'delivered'];

    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    const order = await Order.findById(req.params.orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const item = order.items.id(req.params.itemId);
    if (!item || item.farmer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized to update this order item' });
    }

    item.farmerStatus = status;

    // Check if all items in the order have reached delivered or accepted
    const allStatuses = order.items.map((i) => i.farmerStatus);
    if (allStatuses.every((s) => s === 'delivered')) {
      order.status = 'delivered';
      order.deliveredAt = new Date();
      order.paymentStatus = 'paid';
    } else if (allStatuses.every((s) => ['accepted', 'in_transit', 'delivered'].includes(s))) {
      order.status = 'processing';
    }

    await order.save();

    // Notify customer about order progress
    await Notification.create({
      recipient: order.customer,
      title: `Order Update: ${item.name}`,
      message: `Your item "${item.name}" from order ${order.orderNumber} is now ${status.replace('_', ' ')}.`,
      type: 'order',
      link: '/customer-dashboard.html#orders',
    });

    res.json({
      success: true,
      message: `Order item updated to ${status}`,
      order,
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/farmer/verification
// @desc    Submit farmer verification request
// @access  Private (Farmer)
router.post('/verification', async (req, res, next) => {
  try {
    const { farmName, farmAddress, idProofType, idProofNumber, documentUrl, farmSizeAcres, organicCertified } = req.body;

    if (!farmName || !farmAddress || !idProofType || !idProofNumber) {
      return res.status(400).json({ success: false, message: 'Please provide all verification details' });
    }

    // Mask ID proof number for privacy protection (e.g. XXXX-XXXX-1234)
    const masked = idProofNumber.length > 4 ? `XXXX-XXXX-${idProofNumber.slice(-4)}` : 'XXXX-XXXX';

    let verification = await FarmerVerification.findOne({ farmer: req.user._id });
    if (verification) {
      verification.farmName = farmName;
      verification.farmAddress = farmAddress;
      verification.idProofType = idProofType;
      verification.idProofNumberMasked = masked;
      verification.documentUrl = documentUrl || verification.documentUrl;
      verification.farmSizeAcres = farmSizeAcres || verification.farmSizeAcres;
      verification.organicCertified = Boolean(organicCertified);
      verification.status = 'pending';
      await verification.save();
    } else {
      verification = await FarmerVerification.create({
        farmer: req.user._id,
        farmName,
        farmAddress,
        idProofType,
        idProofNumberMasked: masked,
        documentUrl: documentUrl || '',
        farmSizeAcres: farmSizeAcres || 1,
        organicCertified: Boolean(organicCertified),
        status: 'pending',
      });
    }

    // Update user profile status
    await User.findByIdAndUpdate(req.user._id, {
      'farmerProfile.verificationStatus': 'pending',
      'farmerProfile.farmName': farmName,
    });

    res.json({
      success: true,
      verification,
      message: 'Verification request submitted successfully. Administrator will review shortly.',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
