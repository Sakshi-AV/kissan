require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Review = require('../models/Review');
const Wishlist = require('../models/Wishlist');
const FarmerVerification = require('../models/FarmerVerification');
const Notification = require('../models/Notification');
const ActivityLog = require('../models/ActivityLog');

const seedData = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/kissan_cart';
    await mongoose.connect(mongoUri);
    console.log('🌱 Connected to MongoDB for database seeding...');

    // Clear existing collections
    await Promise.all([
      User.deleteMany({}),
      Category.deleteMany({}),
      Product.deleteMany({}),
      Order.deleteMany({}),
      Review.deleteMany({}),
      Wishlist.deleteMany({}),
      FarmerVerification.deleteMany({}),
      Notification.deleteMany({}),
      ActivityLog.deleteMany({}),
    ]);
    console.log('🧹 Cleaned existing database collections.');

    // 1. Seed Categories
    const categoriesData = [
      {
        name: 'Vegetables',
        slug: 'vegetables',
        description: 'Fresh farm-harvested crisp vegetables sourced directly from local producers',
        image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
        icon: 'carrot',
      },
      {
        name: 'Fruits',
        slug: 'fruits',
        description: 'Naturally sweetened, tree-ripened orchard fresh fruits',
        image: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=600&q=80',
        icon: 'apple',
      },
      {
        name: 'Grains and Cereals',
        slug: 'grains-and-cereals',
        description: 'Nutritious unpolished grains, aromatic basmati rice, wheat, and millets',
        image: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=600&q=80',
        icon: 'wheat',
      },
      {
        name: 'Pulses and Legumes',
        slug: 'pulses-and-legumes',
        description: 'Protein-packed unpolished lentils, toor dal, and chickpeas',
        image: '/images/categories/pulses-and-legumes.jpg',
        icon: 'circle-dot',
      },
      {
        name: 'Spices',
        slug: 'spices',
        description: 'Aromatic pure spices, whole peppercorns, cardamom, and fresh turmeric roots',
        image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=600&q=80',
        icon: 'flame',
      },
      {
        name: 'Dairy Products',
        slug: 'dairy-products',
        description: 'Pure A2 farm milk, cultured organic desi ghee, and fresh cottage cheese',
        image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80',
        icon: 'milk',
      },
      {
        name: 'Seeds',
        slug: 'seeds',
        description: 'High-germination heirloom and hybrid agricultural crop seeds',
        image: '/images/categories/seeds.jpg',
        icon: 'sprout',
      },
      {
        name: 'Organic Products',
        slug: 'organic-products',
        description: 'Certified 100% pesticide-free chemical-free agricultural goods',
        image: 'https://images.unsplash.com/photo-1506484381205-f7945653044d?auto=format&fit=crop&w=600&q=80',
        icon: 'badge-check',
      },
      {
        name: 'Fertilizers and Soil Amendments',
        slug: 'fertilizers-and-soil-amendments',
        description: 'Eco-friendly vermicompost, bio-enzymes, and rich organic manure',
        image: '/images/categories/fertilizers-and-soil-amendments.jpg',
        icon: 'flower',
      },
      {
        name: 'Agricultural Tools and Equipment',
        slug: 'agricultural-tools-and-equipment',
        description: 'Durable sickles, hand spades, pruning shears, and garden implements',
        image: '/images/categories/agricultural-tools-and-equipment.jpg',
        icon: 'wrench',
      },
    ];

    const categories = await Category.insertMany(categoriesData);
    console.log(`✅ Seeded ${categories.length} Categories.`);

    const catMap = {};
    categories.forEach((c) => {
      catMap[c.slug] = c._id;
    });

    // 2. Seed Users
    // Admin
    const adminUser = await User.create({
      name: 'Admin Moderator',
      email: 'admin@kissancart.com',
      password: 'admin123',
      role: 'admin',
      phone: '+91 98450 11000',
      address: { street: 'Kisan Bhawan, MG Road', city: 'Bengaluru', state: 'Karnataka', pincode: '560001' },
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80',
    });

    // Farmers
    const farmerRamesh = await User.create({
      name: 'Ramesh Patel',
      email: 'ramesh.farmer@kissancart.com',
      password: 'farmer123',
      role: 'farmer',
      phone: '+91 98765 43210',
      avatar: 'https://images.unsplash.com/photo-1595152772835-219674b2a8a6?auto=format&fit=crop&w=200&q=80',
      address: { street: 'Plot 44, Mandya Rural', city: 'Mandya', state: 'Karnataka', pincode: '571401' },
      farmerProfile: {
        farmName: 'Green Valley Organic Farms',
        farmLocation: {
          address: 'Guthalu Road, Mandya, Karnataka',
          city: 'Mandya',
          state: 'Karnataka',
          pincode: '571401',
          coordinates: { lat: 12.5218, lng: 76.8951 },
        },
        experienceYears: 18,
        bio: 'Third-generation organic farmer specializing in native grain varieties, fresh soil-grown vegetables, and sugarcane.',
        cropsSpecialization: ['Vegetables', 'Grains and Cereals', 'Pulses'],
        isVerified: true,
        verificationStatus: 'approved',
      },
    });

    const farmerSuresh = await User.create({
      name: 'Suresh Gowda',
      email: 'suresh.farmer@kissancart.com',
      password: 'farmer123',
      role: 'farmer',
      phone: '+91 98765 88990',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
      address: { street: 'Tirthahalli Taluk', city: 'Shivamogga', state: 'Karnataka', pincode: '577201' },
      farmerProfile: {
        farmName: 'Sahyadri Orchard & Spices',
        farmLocation: {
          address: 'Western Ghat Foothills, Shivamogga, Karnataka',
          city: 'Shivamogga',
          state: 'Karnataka',
          pincode: '577201',
          coordinates: { lat: 13.9299, lng: 75.5681 },
        },
        experienceYears: 12,
        bio: 'Pesticide-free orchard growing heritage Malabar spices, organic mangoes, and high-quality Gir cow dairy.',
        cropsSpecialization: ['Spices', 'Fruits', 'Dairy Products'],
        isVerified: true,
        verificationStatus: 'approved',
      },
    });

    const farmerAnita = await User.create({
      name: 'Anita Devi',
      email: 'anita.farmer@kissancart.com',
      password: 'farmer123',
      role: 'farmer',
      phone: '+91 98451 22334',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
      address: { street: 'Hunsur Road', city: 'Mysuru', state: 'Karnataka', pincode: '570006' },
      farmerProfile: {
        farmName: 'Kaveri Agro Fields',
        farmLocation: {
          address: 'Biligere Village, Mysuru, Karnataka',
          city: 'Mysuru',
          state: 'Karnataka',
          pincode: '570006',
          coordinates: { lat: 12.2958, lng: 76.6394 },
        },
        experienceYears: 8,
        bio: 'Dedicated progressive woman farmer promoting natural organic inputs, vermicompost, and heirloom seeds.',
        cropsSpecialization: ['Seeds', 'Fertilizers', 'Vegetables'],
        isVerified: false,
        verificationStatus: 'pending',
      },
    });

    // Customers
    const customerPriya = await User.create({
      name: 'Priya Sharma',
      email: 'priya.customer@kissancart.com',
      password: 'customer123',
      role: 'customer',
      phone: '+91 97412 55667',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      address: { street: '12th Main, HAL 2nd Stage, Indiranagar', city: 'Bengaluru', state: 'Karnataka', pincode: '560038' },
    });

    const customerRahul = await User.create({
      name: 'Rahul Verma',
      email: 'rahul.customer@kissancart.com',
      password: 'customer123',
      role: 'customer',
      phone: '+91 98112 33445',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
      address: { street: '4th Block, 80 Feet Road, Koramangala', city: 'Bengaluru', state: 'Karnataka', pincode: '560034' },
    });

    console.log('✅ Seeded Admin, Farmers, and Customer users.');

    // 3. Seed Farmer Verification records
    await FarmerVerification.create({
      farmer: farmerRamesh._id,
      farmName: 'Green Valley Organic Farms',
      farmAddress: 'Guthalu Road, Mandya, Karnataka',
      idProofType: 'land_records',
      idProofNumberMasked: 'XXXX-XXXX-8921',
      documentUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80',
      farmSizeAcres: 6.5,
      organicCertified: true,
      status: 'approved',
      adminNotes: 'Land RTC and NPOP Organic certification verified successfully.',
      reviewedBy: adminUser._id,
      reviewedAt: new Date(),
    });

    await FarmerVerification.create({
      farmer: farmerSuresh._id,
      farmName: 'Sahyadri Orchard & Spices',
      farmAddress: 'Western Ghat Foothills, Shivamogga, Karnataka',
      idProofType: 'kisan_credit_card',
      idProofNumberMasked: 'XXXX-XXXX-4412',
      documentUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80',
      farmSizeAcres: 9.0,
      organicCertified: true,
      status: 'approved',
      adminNotes: 'KCC and spice board cultivation papers checked.',
      reviewedBy: adminUser._id,
      reviewedAt: new Date(),
    });

    await FarmerVerification.create({
      farmer: farmerAnita._id,
      farmName: 'Kaveri Agro Fields',
      farmAddress: 'Biligere Village, Mysuru, Karnataka',
      idProofType: 'aadhaar',
      idProofNumberMasked: 'XXXX-XXXX-3310',
      documentUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80',
      farmSizeAcres: 3.2,
      organicCertified: false,
      status: 'pending',
      adminNotes: '',
    });

    // 4. Seed Products
    const productsData = [
      {
        name: 'Farm Fresh Country Tomatoes (ನಾಟಿ ಟೊಮೆಟೊ)',
        description: 'Juicy, naturally ripened country desi tomatoes freshly picked this morning. Free from chemical wax coatings, rich in lycopene and perfect for curries and rasam.',
        category: catMap['vegetables'],
        farmer: farmerRamesh._id,
        price: 38,
        unit: 'kg',
        availableQuantity: 180,
        images: [
          'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=800&q=80',
          '/images/products/fresh-country-tomatoes.jpg',
        ],
        farmLocation: farmerRamesh.farmerProfile.farmLocation,
        isOrganic: true,
        ratingAverage: 4.8,
        ratingCount: 15,
      },
      {
        name: 'Organic Red Onions (ಕೆಂಪು ಈರುಳ್ಳಿ)',
        description: 'Crisp, pungent organic red onions grown with rich organic compost in Mandya soil. Excellent shelf life and sweet-pungent flavor.',
        category: catMap['vegetables'],
        farmer: farmerRamesh._id,
        price: 45,
        unit: 'kg',
        availableQuantity: 240,
        images: [
          'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1508747703725-719777637510?auto=format&fit=crop&w=800&q=80',
        ],
        farmLocation: farmerRamesh.farmerProfile.farmLocation,
        isOrganic: true,
        ratingAverage: 4.7,
        ratingCount: 12,
      },
      {
        name: 'Farm Harvest Golden Potatoes (ಆಲೂಗಡ್ಡೆ)',
        description: 'Naturally harvested starchy golden potatoes. Cleaned and graded, ideal for roasting, fries, and daily wholesome cooking.',
        category: catMap['vegetables'],
        farmer: farmerAnita._id,
        price: 32,
        unit: 'kg',
        availableQuantity: 300,
        images: [
          'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=800&q=80',
        ],
        farmLocation: farmerAnita.farmerProfile.farmLocation,
        isOrganic: false,
        ratingAverage: 4.5,
        ratingCount: 8,
      },
      {
        name: 'Banganapalli Sweet Mangoes (ಬಂಗನಪಲ್ಲಿ ಮಾವು)',
        description: 'Famous naturally tree-ripened Banganapalli mangoes directly harvested from Shivamogga orchards. Carbide-free, fiberless, sweet and aromatic.',
        category: catMap['fruits'],
        farmer: farmerSuresh._id,
        price: 160,
        unit: 'kg',
        availableQuantity: 95,
        images: [
          'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?auto=format&fit=crop&w=800&q=80',
        ],
        farmLocation: farmerSuresh.farmerProfile.farmLocation,
        isOrganic: true,
        ratingAverage: 4.9,
        ratingCount: 22,
      },
      {
        name: 'Shimla Crisp Mountain Apples (ಸೇಬು)',
        description: 'Crisp, sweet mountain apples direct from partner orchards. Juicy, firm flesh with natural sweetness.',
        category: catMap['fruits'],
        farmer: farmerSuresh._id,
        price: 180,
        unit: 'kg',
        availableQuantity: 40,
        images: [
          'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=800&q=80',
        ],
        farmLocation: farmerSuresh.farmerProfile.farmLocation,
        isOrganic: false,
        ratingAverage: 4.6,
        ratingCount: 7,
      },
      {
        name: 'Aromatic Royal Basmati Rice (ಬಾಸುಮತಿ ಅಕ್ಕಿ)',
        description: 'Long grain, extra aromatic aged basmati paddy, gently milled to preserve essential nutrients and fragrance. Ideal for biryanis and pulao.',
        category: catMap['grains-and-cereals'],
        farmer: farmerRamesh._id,
        price: 110,
        unit: 'kg',
        availableQuantity: 500,
        images: [
          'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80',
        ],
        farmLocation: farmerRamesh.farmerProfile.farmLocation,
        isOrganic: true,
        ratingAverage: 4.9,
        ratingCount: 19,
        },
      {
        name: 'Organic Whole Finger Millet - Ragi (ರಾಗಿ)',
        description: 'Rich in dietary calcium and iron. Traditional rainfed unpolished Ragi grain directly harvested from Mandya farmlands.',
        category: catMap['grains-and-cereals'],
        farmer: farmerRamesh._id,
        price: 55,
        unit: 'kg',
        availableQuantity: 350,
        images: [
          '/images/products/organic-ragi-millet.jpg',
        ],
        farmLocation: farmerRamesh.farmerProfile.farmLocation,
        isOrganic: true,
        ratingAverage: 5.0,
        ratingCount: 14,
      },
      {
        name: 'Native Unpolished Toor Dal (ತೊಗರಿ ಬೇಳೆ)',
        description: 'Chemical-free unpolished yellow pigeon peas (Arhar / Toor Dal). Sun-dried and processed using traditional stone dehusking.',
        category: catMap['pulses-and-legumes'],
        farmer: farmerRamesh._id,
        price: 145,
        unit: 'kg',
        availableQuantity: 120,
        images: [
          '/images/products/unpolished-toor-dal.jpg',
          'https://images.unsplash.com/photo-1780478238047-13e4e6c07cba?auto=format&fit=crop&w=800&q=80',
        ],
        farmLocation: farmerRamesh.farmerProfile.farmLocation,
        isOrganic: true,
        ratingAverage: 4.7,
        ratingCount: 10,
      },
      {
        name: 'Malabar Black Tellicherry Peppercorns (ಕರಿಮೆಣಸು)',
        description: 'Sun-dried bold black peppercorns from Western Ghats pepper vines. High piperine content with robust spicy aroma.',
        category: catMap['spices'],
        farmer: farmerSuresh._id,
        price: 490,
        unit: 'kg',
        availableQuantity: 60,
        images: [
          '/images/products/tellicherry-black-peppercorns.jpg',
          'https://images.unsplash.com/photo-1755598603006-5cee23c4cb4e?auto=format&fit=crop&w=800&q=80',
        ],
        farmLocation: farmerSuresh.farmerProfile.farmLocation,
        isOrganic: true,
        ratingAverage: 4.9,
        ratingCount: 16,
      },
      {
        name: 'Pure Desi Gir Cow Vedic Ghee (ಹಸುವಿನ ತುಪ್ಪ)',
        description: 'Traditional bilona churned cultured A2 Vedic ghee from grass-fed indigenous Gir cows. Golden, granular texture and heavenly aroma.',
        category: catMap['dairy-products'],
        farmer: farmerSuresh._id,
        price: 1250,
        unit: 'litre',
        availableQuantity: 45,
        images: [
          '/images/products/pure-desi-gir-cow-ghee.jpg',
        ],
        farmLocation: farmerSuresh.farmerProfile.farmLocation,
        isOrganic: true,
        ratingAverage: 5.0,
        ratingCount: 28,
      },
      {
        name: 'Heirloom High-Yield Tomato Seeds (ಬೀಜಗಳು)',
        description: 'Certified open-pollinated heirloom seeds with over 92% germination rate. Disease resistant and high-yield potential.',
        category: catMap['seeds'],
        farmer: farmerAnita._id,
        price: 90,
        unit: 'piece',
        availableQuantity: 150,
        images: [
          '/images/products/heirloom-tomato-seeds.jpg',
        ],
        farmLocation: farmerAnita.farmerProfile.farmLocation,
        isOrganic: true,
        ratingAverage: 4.4,
        ratingCount: 5,
      },
      {
        name: 'Premium Bio-Enriched Vermicompost (ಎರೆಹುಳು ಗೊಬ್ಬರ)',
        description: 'Pure earthworm-digested organic manure enriched with beneficial soil microbes and bio-fertilizers. Rejuvenates soil structure.',
        category: catMap['fertilizers-and-soil-amendments'],
        farmer: farmerAnita._id,
        price: 320,
        unit: 'bag',
        availableQuantity: 75,
        images: [
          '/images/products/bio-enriched-vermicompost.jpg',
        ],
        farmLocation: farmerAnita.farmerProfile.farmLocation,
        isOrganic: true,
        ratingAverage: 4.8,
        ratingCount: 9,
      },
      {
        name: 'Forged Carbon Steel Harvesting Sickle (ಕುಡುಗೋಲು)',
        description: 'Hand-forged sharp curved sickle with ergonomic seasoned teakwood handle. Lightweight and durable for harvesting paddy and crops.',
        category: catMap['agricultural-tools-and-equipment'],
        farmer: farmerAnita._id,
        price: 240,
        unit: 'piece',
        availableQuantity: 3, // Low stock demo!
        images: [
          '/images/products/harvesting-sickle.jpg',
        ],
        farmLocation: farmerAnita.farmerProfile.farmLocation,
        isOrganic: false,
        ratingAverage: 4.6,
        ratingCount: 4,
      },
    ];

    const seededProducts = await Product.insertMany(productsData);
    console.log(`✅ Seeded ${seededProducts.length} Agricultural Products.`);

    // 5. Seed Reviews from Priya
    const review1 = await Review.create({
      product: seededProducts[0]._id, // Tomato
      customer: customerPriya._id,
      rating: 5,
      comment: 'Absolutely amazing freshness! The country tomatoes smell divine and are so flavorful. Delivered directly from Mandya.',
    });

    const review2 = await Review.create({
      product: seededProducts[3]._id, // Mango
      customer: customerRahul._id,
      rating: 5,
      comment: 'Super sweet and authentic carbide-free Banganapalli mangoes. Thank you farmer Suresh for preserving traditional farming!',
    });

    const review3 = await Review.create({
      product: seededProducts[9]._id, // Ghee
      customer: customerPriya._id,
      rating: 5,
      comment: 'Best Gir cow A2 ghee I have tasted in Bangalore. Pure aroma and golden granular quality.',
    });

    console.log('✅ Seeded Customer Product Reviews.');

    // 6. Seed Sample Orders
    const order1 = await Order.create({
      orderNumber: 'KC-20261010-1001',
      customer: customerPriya._id,
      items: [
        {
          product: seededProducts[0]._id,
          name: seededProducts[0].name,
          price: seededProducts[0].price,
          unit: seededProducts[0].unit,
          quantity: 3,
          image: seededProducts[0].images[0],
          farmer: farmerRamesh._id,
          farmerStatus: 'delivered',
        },
        {
          product: seededProducts[1]._id,
          name: seededProducts[1].name,
          price: seededProducts[1].price,
          unit: seededProducts[1].unit,
          quantity: 2,
          image: seededProducts[1].images[0],
          farmer: farmerRamesh._id,
          farmerStatus: 'delivered',
        },
      ],
      shippingAddress: {
        fullName: customerPriya.name,
        phone: customerPriya.phone,
        addressLine: customerPriya.address.street,
        city: customerPriya.address.city,
        state: customerPriya.address.state,
        pincode: customerPriya.address.pincode,
        landmark: 'Near Indiranagar Metro Station',
      },
      paymentMethod: 'cod',
      paymentStatus: 'paid',
      subtotal: 38 * 3 + 45 * 2,
      shippingFee: 40,
      totalAmount: 38 * 3 + 45 * 2 + 40,
      status: 'delivered',
      deliveredAt: new Date(Date.now() - 24 * 3600 * 1000),
    });

    const order2 = await Order.create({
      orderNumber: 'KC-20261011-1002',
      customer: customerRahul._id,
      items: [
        {
          product: seededProducts[3]._id,
          name: seededProducts[3].name,
          price: seededProducts[3].price,
          unit: seededProducts[3].unit,
          quantity: 2,
          image: seededProducts[3].images[0],
          farmer: farmerSuresh._id,
          farmerStatus: 'accepted',
        },
        {
          product: seededProducts[9]._id,
          name: seededProducts[9].name,
          price: seededProducts[9].price,
          unit: seededProducts[9].unit,
          quantity: 1,
          image: seededProducts[9].images[0],
          farmer: farmerSuresh._id,
          farmerStatus: 'accepted',
        },
      ],
      shippingAddress: {
        fullName: customerRahul.name,
        phone: customerRahul.phone,
        addressLine: customerRahul.address.street,
        city: customerRahul.address.city,
        state: customerRahul.address.state,
        pincode: customerRahul.address.pincode,
      },
      paymentMethod: 'cod',
      paymentStatus: 'pending',
      subtotal: 160 * 2 + 1250 * 1,
      shippingFee: 0,
      totalAmount: 160 * 2 + 1250 * 1,
      status: 'processing',
    });

    const order3 = await Order.create({
      orderNumber: 'KC-20261012-1003',
      customer: customerPriya._id,
      items: [
        {
          product: seededProducts[6]._id,
          name: seededProducts[6].name,
          price: seededProducts[6].price,
          unit: seededProducts[6].unit,
          quantity: 4,
          image: seededProducts[6].images[0],
          farmer: farmerRamesh._id,
          farmerStatus: 'pending',
        },
      ],
      shippingAddress: {
        fullName: customerPriya.name,
        phone: customerPriya.phone,
        addressLine: customerPriya.address.street,
        city: customerPriya.address.city,
        state: customerPriya.address.state,
        pincode: customerPriya.address.pincode,
      },
      paymentMethod: 'cod',
      paymentStatus: 'pending',
      subtotal: 55 * 4,
      shippingFee: 40,
      totalAmount: 55 * 4 + 40,
      status: 'pending',
    });

    console.log('✅ Seeded 3 Sample Orders across lifecycles.');

    // 7. Seed Wishlists
    await Wishlist.create({
      customer: customerPriya._id,
      products: [seededProducts[3]._id, seededProducts[9]._id],
    });

    // 8. Seed In-app Notifications
    await Notification.create({
      recipient: farmerRamesh._id,
      title: 'New Order Received!',
      message: 'You have a new pending order KC-20261012-1003 for 4 kg Ragi.',
      type: 'order',
      link: '/farmer-dashboard.html#orders',
      isRead: false,
    });

    await Notification.create({
      recipient: farmerAnita._id,
      title: 'Low Stock Alert',
      message: 'Product "Forged Carbon Steel Harvesting Sickle" has only 3 pieces remaining in stock.',
      type: 'inventory',
      link: '/farmer-dashboard.html#inventory',
      isRead: false,
    });

    await Notification.create({
      recipient: customerPriya._id,
      title: 'Order Confirmed',
      message: 'Your order KC-20261012-1003 has been placed and received by the farmer.',
      type: 'order',
      link: '/customer-dashboard.html#orders',
      isRead: false,
    });

    // 9. Activity Log
    await ActivityLog.create({
      user: adminUser._id,
      action: 'SYSTEM_INITIALIZATION',
      details: 'Kissan Cart system seeded and initialized successfully with standard agricultural categories and sample records.',
      ipAddress: '127.0.0.1',
    });

    console.log('\n=============================================');
    console.log('🎉 SEEDING COMPLETED SUCCESSFULLY!');
    console.log('=============================================');
    console.log('Credentials for local demo testing:');
    console.log('  Admin:    admin@kissancart.com / admin123');
    console.log('  Farmer 1: ramesh.farmer@kissancart.com / farmer123 (Verified)');
    console.log('  Farmer 2: suresh.farmer@kissancart.com / farmer123 (Verified)');
    console.log('  Farmer 3: anita.farmer@kissancart.com / farmer123 (Pending)');
    console.log('  Customer 1: priya.customer@kissancart.com / customer123');
    console.log('  Customer 2: rahul.customer@kissancart.com / customer123');
    console.log('=============================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding Error:', error);
    process.exit(1);
  }
};

seedData();
