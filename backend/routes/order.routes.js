const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const Notification = require('../models/Notification');
const ActivityLog = require('../models/ActivityLog');
const { protect, authorize } = require('../middleware/auth');

// Generate unique order number
const generateOrderNumber = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `KC-${dateStr}-${randomSuffix}`;
};

// @route   POST /api/orders
// @desc    Place a new order with stock validation and inventory deduction
// @access  Private (Customer)
router.post('/', protect, authorize('customer'), async (req, res, next) => {
  try {
    const { items, shippingAddress, paymentMethod = 'cod' } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty. Please add items.' });
    }

    if (
      !shippingAddress ||
      !shippingAddress.fullName ||
      !shippingAddress.phone ||
      !shippingAddress.addressLine ||
      !shippingAddress.city ||
      !shippingAddress.state ||
      !shippingAddress.pincode
    ) {
      return res.status(400).json({
        success: false,
        message: 'Complete shipping address and contact details are required',
      });
    }

    // Step 1: Validate stock for all items
    const productDocs = [];
    let subtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product || item.productId);
      if (!product || product.status !== 'active') {
        return res.status(400).json({
          success: false,
          message: `Product "${item.name || 'Unknown'}" is unavailable`,
        });
      }

      const qty = parseInt(item.quantity, 10);
      if (qty <= 0) {
        return res.status(400).json({ success: false, message: 'Quantity must be at least 1' });
      }

      if (product.availableQuantity < qty) {
        return res.status(400).json({
          success: false,
          message: `Insufficient inventory for "${product.name}". Only ${product.availableQuantity} ${product.unit} available.`,
        });
      }

      productDocs.push({ product, qty });
      const itemSubtotal = product.price * qty;
      subtotal += itemSubtotal;

      validatedItems.push({
        product: product._id,
        name: product.name,
        price: product.price,
        unit: product.unit,
        quantity: qty,
        image: product.images[0] || '',
        farmer: product.farmer,
        farmerStatus: 'pending',
      });
    }

    const shippingFee = subtotal > 500 ? 0 : 40;
    const totalAmount = subtotal + shippingFee;
    const orderNumber = generateOrderNumber();

    // Step 2: Deduct inventory and update availability
    for (const { product, qty } of productDocs) {
      product.availableQuantity -= qty;
      if (product.availableQuantity === 0) {
        product.isAvailable = false;
      }
      await product.save();

      // Check if low inventory threshold reached
      if (product.availableQuantity <= 5) {
        await Notification.create({
          recipient: product.farmer,
          title: 'Low Stock Alert',
          message: `Product "${product.name}" is running low on stock (${product.availableQuantity} ${product.unit} remaining).`,
          type: 'inventory',
          link: '/farmer-dashboard.html#inventory',
        });
      }
    }

    // Step 3: Create Order document
    const order = await Order.create({
      orderNumber,
      customer: req.user._id,
      items: validatedItems,
      shippingAddress: {
        fullName: shippingAddress.fullName,
        phone: shippingAddress.phone,
        addressLine: shippingAddress.addressLine,
        city: shippingAddress.city,
        state: shippingAddress.state,
        pincode: shippingAddress.pincode,
        landmark: shippingAddress.landmark || '',
      },
      paymentMethod,
      paymentStatus: 'pending',
      subtotal,
      shippingFee,
      totalAmount,
      status: 'pending',
    });

    // Step 4: Clear user cart
    await Cart.findOneAndUpdate({ customer: req.user._id }, { items: [] });

    // Step 5: Notify Farmers
    const farmerIds = [...new Set(validatedItems.map((i) => i.farmer.toString()))];
    for (const farmerId of farmerIds) {
      await Notification.create({
        recipient: farmerId,
        title: 'New Order Received!',
        message: `You have received a new order ${orderNumber}. Please check your orders dashboard to accept and fulfill.`,
        type: 'order',
        link: '/farmer-dashboard.html#orders',
      });
    }

    // Step 6: Notify Customer
    await Notification.create({
      recipient: req.user._id,
      title: 'Order Confirmed',
      message: `Your order ${orderNumber} has been placed successfully for ₹${totalAmount}.`,
      type: 'order',
      link: '/customer-dashboard.html#orders',
    });

    // Step 7: Activity Log
    await ActivityLog.create({
      user: req.user._id,
      action: 'ORDER_PLACED',
      details: `Order ${orderNumber} placed for ₹${totalAmount}`,
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      order,
      message: 'Order placed successfully! Cash on delivery selected.',
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/orders/my-orders
// @desc    Get logged in customer's orders
// @access  Private (Customer)
router.get('/my-orders', protect, authorize('customer'), async (req, res, next) => {
  try {
    const orders = await Order.find({ customer: req.user._id })
      .populate('items.product', 'name images unit')
      .populate('items.farmer', 'name farmerProfile phone')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      orders,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/orders/:id
// @desc    Get order details by ID
// @access  Private
router.get('/:id', protect, async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer', 'name email phone')
      .populate('items.product', 'name images unit')
      .populate('items.farmer', 'name farmerProfile phone');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Authorization check: must be customer owner, or farmer with an item in order, or admin
    const isCustomerOwner = order.customer._id.toString() === req.user._id.toString();
    const isFarmerInvolved = order.items.some(
      (item) => item.farmer && item.farmer._id.toString() === req.user._id.toString()
    );
    const isAdmin = req.user.role === 'admin';

    if (!isCustomerOwner && !isFarmerInvolved && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Access denied for this order' });
    }

    res.json({
      success: true,
      order,
    });
  } catch (error) {
    next(error);
  }
});

// @route   PATCH /api/orders/:id/cancel
// @desc    Cancel order (Customer or Admin) and restore inventory
// @access  Private
router.patch('/:id/cancel', protect, async (req, res, next) => {
  try {
    const { reason } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const isCustomer = order.customer.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isCustomer && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Unauthorized to cancel this order' });
    }

    if (order.status === 'delivered' || order.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel order with status: ${order.status}`,
      });
    }

    // Restore inventory
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { availableQuantity: item.quantity },
        $set: { isAvailable: true },
      });
    }

    order.status = 'cancelled';
    order.cancellationReason = reason || 'Cancelled by user';
    order.cancelledBy = req.user._id;
    await order.save();

    // Notify customer
    await Notification.create({
      recipient: order.customer,
      title: 'Order Cancelled',
      message: `Your order ${order.orderNumber} has been cancelled.`,
      type: 'order',
      link: '/customer-dashboard.html#orders',
    });

    res.json({
      success: true,
      order,
      message: 'Order cancelled successfully and inventory restored',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
