const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const { protect } = require('../middleware/auth');

// Generate JWT token helper
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'kissan_cart_super_secret_jwt_key_2026_agro_market', {
    expiresIn: '30d',
  });
};

// @route   POST /api/auth/register
// @desc    Register a new customer or farmer
// @access  Public
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, role, phone, address, farmName, farmAddress, city, state, pincode } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide name, email, and password' });
    }

    // Role security check: prevent direct admin registration!
    const selectedRole = role === 'farmer' ? 'farmer' : 'customer';

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists' });
    }

    const userData = {
      name,
      email: email.toLowerCase(),
      password,
      role: selectedRole,
      phone: phone || '',
      address: {
        street: address || '',
        city: city || '',
        state: state || '',
        pincode: pincode || '',
      },
    };

    if (selectedRole === 'farmer') {
      userData.farmerProfile = {
        farmName: farmName || `${name}'s Farm`,
        farmLocation: {
          address: farmAddress || address || '',
          city: city || '',
          state: state || '',
          pincode: pincode || '',
          coordinates: { lat: 12.9716, lng: 77.5946 },
        },
        bio: 'Dedicated local farmer committed to fresh, sustainable agricultural produce.',
        isVerified: false,
        verificationStatus: 'none',
      };
    }

    const user = await User.create(userData);
    const token = generateToken(user._id);

    // Audit log
    await ActivityLog.create({
      user: user._id,
      action: 'USER_REGISTERED',
      details: `New ${selectedRole} account created for ${user.email}`,
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      token,
      user,
      message: 'Account registered successfully',
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (user.status === 'restricted') {
      return res.status(403).json({ success: false, message: 'Account is suspended or restricted by admin' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = generateToken(user._id);

    // Audit log
    await ActivityLog.create({
      user: user._id,
      action: 'USER_LOGIN',
      details: `${user.role.toUpperCase()} logged in: ${user.email}`,
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      token,
      user,
      message: 'Login successful',
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/auth/me
// @desc    Get current logged in user
// @access  Private
router.get('/me', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/auth/profile
// @desc    Update profile
// @access  Private
router.put('/profile', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const { name, phone, address, farmerProfile } = req.body;

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (address) {
      user.address = {
        street: address.street ?? user.address.street,
        city: address.city ?? user.address.city,
        state: address.state ?? user.address.state,
        pincode: address.pincode ?? user.address.pincode,
      };
    }

    if (user.role === 'farmer' && farmerProfile) {
      user.farmerProfile = {
        ...user.farmerProfile.toObject(),
        farmName: farmerProfile.farmName ?? user.farmerProfile.farmName,
        bio: farmerProfile.bio ?? user.farmerProfile.bio,
        experienceYears: farmerProfile.experienceYears ?? user.farmerProfile.experienceYears,
        cropsSpecialization: farmerProfile.cropsSpecialization ?? user.farmerProfile.cropsSpecialization,
        farmLocation: {
          address: farmerProfile.farmLocation?.address ?? user.farmerProfile.farmLocation.address,
          city: farmerProfile.farmLocation?.city ?? user.farmerProfile.farmLocation.city,
          state: farmerProfile.farmLocation?.state ?? user.farmerProfile.farmLocation.state,
          pincode: farmerProfile.farmLocation?.pincode ?? user.farmerProfile.farmLocation.pincode,
          coordinates: {
            lat: farmerProfile.farmLocation?.coordinates?.lat ?? user.farmerProfile.farmLocation.coordinates.lat,
            lng: farmerProfile.farmLocation?.coordinates?.lng ?? user.farmerProfile.farmLocation.coordinates.lng,
          },
        },
      };
    }

    await user.save();

    res.json({
      success: true,
      user,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
