const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const Product = require('../models/Product');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/categories
// @desc    Get all categories with active product count
// @access  Public
router.get('/', async (req, res, next) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ name: 1 });

    // Attach product counts
    const categoriesWithCount = await Promise.all(
      categories.map(async (cat) => {
        const count = await Product.countDocuments({
          category: cat._id,
          status: 'active',
          isAvailable: true,
        });
        return {
          ...cat.toObject(),
          productCount: count,
        };
      })
    );

    res.json({
      success: true,
      categories: categoriesWithCount,
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/categories
// @desc    Create new category
// @access  Private (Admin)
router.post('/', protect, authorize('admin'), async (req, res, next) => {
  try {
    const { name, description, image, icon } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const category = await Category.create({
      name,
      slug,
      description: description || '',
      image: image || '',
      icon: icon || 'leaf',
    });

    res.status(201).json({
      success: true,
      category,
      message: 'Category created successfully',
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/categories/:id
// @desc    Update category
// @access  Private (Admin)
router.put('/:id', protect, authorize('admin'), async (req, res, next) => {
  try {
    const { name, description, image, icon, isActive } = req.body;
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    if (name) {
      category.name = name;
      category.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    }
    if (description !== undefined) category.description = description;
    if (image !== undefined) category.image = image;
    if (icon !== undefined) category.icon = icon;
    if (isActive !== undefined) category.isActive = isActive;

    await category.save();

    res.json({
      success: true,
      category,
      message: 'Category updated successfully',
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/categories/:id
// @desc    Delete category
// @access  Private (Admin)
router.delete('/:id', protect, authorize('admin'), async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const productCount = await Product.countDocuments({ category: category._id });
    if (productCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category with ${productCount} existing products. Mark as inactive instead.`,
      });
    }

    await Category.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
