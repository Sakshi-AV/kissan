require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Order = require('../models/Order');

async function updateDB() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/kissan_cart';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB Atlas...');

    // 1. Update Categories
    const catUpdates = [
      { slug: 'pulses-and-legumes', image: '/images/categories/pulses-and-legumes.jpg' },
      { slug: 'seeds', image: '/images/categories/seeds.jpg' },
      { slug: 'fertilizers-and-soil-amendments', image: '/images/categories/fertilizers-and-soil-amendments.jpg' },
      { slug: 'agricultural-tools-and-equipment', image: '/images/categories/agricultural-tools-and-equipment.jpg' },
    ];

    for (const c of catUpdates) {
      const res = await Category.updateOne({ slug: c.slug }, { $set: { image: c.image } });
      console.log('Category update:', c.slug, 'modified:', res.modifiedCount);
    }

    // 2. Update Products
    const prodUpdates = [
      {
        pattern: /Country Tomatoes/i,
        images: [
          'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=800&q=80',
          '/images/products/fresh-country-tomatoes.jpg',
        ],
      },
      {
        pattern: /Finger Millet|Ragi/i,
        images: ['/images/products/organic-ragi-millet.jpg'],
      },
      {
        pattern: /Toor Dal/i,
        images: [
          '/images/products/unpolished-toor-dal.jpg',
          'https://images.unsplash.com/photo-1780478238047-13e4e6c07cba?auto=format&fit=crop&w=800&q=80',
        ],
      },
      {
        pattern: /Peppercorns/i,
        images: [
          '/images/products/tellicherry-black-peppercorns.jpg',
          'https://images.unsplash.com/photo-1755598603006-5cee23c4cb4e?auto=format&fit=crop&w=800&q=80',
        ],
      },
      {
        pattern: /Gir Cow Vedic Ghee|Ghee/i,
        images: ['/images/products/pure-desi-gir-cow-ghee.jpg'],
      },
      {
        pattern: /Tomato Seeds/i,
        images: ['/images/products/heirloom-tomato-seeds.jpg'],
      },
      {
        pattern: /Vermicompost/i,
        images: ['/images/products/bio-enriched-vermicompost.jpg'],
      },
      {
        pattern: /Sickle/i,
        images: ['/images/products/harvesting-sickle.jpg'],
      },
    ];

    for (const pu of prodUpdates) {
      const res = await Product.updateMany({ name: pu.pattern }, { $set: { images: pu.images } });
      console.log('Product update:', pu.pattern, 'matched/modified:', res.matchedCount, res.modifiedCount);
    }

    // 3. Update existing orders
    const orders = await Order.find({});
    for (const order of orders) {
      let changed = false;
      for (const item of order.items) {
        if (/Ghee/i.test(item.name)) {
          item.image = '/images/products/pure-desi-gir-cow-ghee.jpg';
          changed = true;
        } else if (/Ragi|Finger Millet/i.test(item.name)) {
          item.image = '/images/products/organic-ragi-millet.jpg';
          changed = true;
        } else if (/Sickle/i.test(item.name)) {
          item.image = '/images/products/harvesting-sickle.jpg';
          changed = true;
        } else if (/Toor Dal/i.test(item.name)) {
          item.image = '/images/products/unpolished-toor-dal.jpg';
          changed = true;
        } else if (/Peppercorns/i.test(item.name)) {
          item.image = '/images/products/tellicherry-black-peppercorns.jpg';
          changed = true;
        } else if (/Tomato Seeds/i.test(item.name)) {
          item.image = '/images/products/heirloom-tomato-seeds.jpg';
          changed = true;
        } else if (/Vermicompost/i.test(item.name)) {
          item.image = '/images/products/bio-enriched-vermicompost.jpg';
          changed = true;
        }
      }
      if (changed) {
        await order.save();
        console.log('Updated order item images in:', order.orderNumber);
      }
    }

    console.log('✅ ALL DATABASE RECORDS SUCCESSFULLY UPDATED!');
    process.exit(0);
  } catch (err) {
    console.error('Error updating DB:', err);
    process.exit(1);
  }
}

updateDB();
