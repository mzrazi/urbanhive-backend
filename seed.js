require('dotenv').config();

const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('./models/User');
const Vendor = require('./models/Vendor');
const Product = require('./models/Product');
const Order = require('./models/Order');
const Complaint = require('./models/Complaint');

const demoPassword = 'UrbanHiveDemo123!';

const upsertVendor = async (vendor) => Vendor.findOneAndUpdate(
  { email: vendor.email },
  { $set: vendor },
  { new: true, upsert: true, runValidators: true }
);

const upsertProduct = async (product) => Product.findOneAndUpdate(
  { name: product.name, vendor: product.vendor },
  { $set: product },
  { new: true, upsert: true, runValidators: true }
);

const seed = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is missing from .env');
  }

  await mongoose.connect(process.env.MONGO_URI);
  const password = await bcrypt.hash(demoPassword, 10);

  const freshMart = await upsertVendor({
    name: 'Aarav Mehta',
    email: 'freshmart@urbanhive.local',
    password,
    phone: '9876543210',
    storeName: 'FreshMart Groceries',
    storeAddress: '12 Park Street, Kolkata',
    category: 'Grocery',
    location: { type: 'Point', coordinates: [88.3639, 22.5726] },
    averageRating: 4.7,
    approvedByAdmin: true,
  });

  const urbanStyle = await upsertVendor({
    name: 'Nisha Kapoor',
    email: 'urbanstyle@urbanhive.local',
    password,
    phone: '9876543211',
    storeName: 'UrbanStyle Boutique',
    storeAddress: '25 Camac Street, Kolkata',
    category: 'Clothing',
    location: { type: 'Point', coordinates: [88.3558, 22.5448] },
    averageRating: 4.5,
    approvedByAdmin: true,
  });

  const products = await Promise.all([
    upsertProduct({ name: 'Organic Bananas', vendor: freshMart._id, price: 60, category: 'Grocery', description: 'Fresh, naturally ripened bananas.', image: '/uploads/1742372138194.jpg' }),
    upsertProduct({ name: 'Farm Fresh Tomatoes', vendor: freshMart._id, price: 45, category: 'Grocery', description: 'Juicy tomatoes sourced from local farms.', image: '/uploads/1742372179190.jpg' }),
    upsertProduct({ name: 'Artisan Sourdough', vendor: freshMart._id, price: 110, category: 'Grocery', description: 'Freshly baked sourdough bread.', image: '/uploads/1742372868188.jpg' }),
    upsertProduct({ name: 'Classic Linen Shirt', vendor: urbanStyle._id, price: 1299, category: 'Clothing', description: 'A breathable everyday linen shirt.', image: '/uploads/1742372974443.jpg' }),
    upsertProduct({ name: 'Everyday Tote Bag', vendor: urbanStyle._id, price: 799, category: 'Clothing', description: 'A durable canvas tote for daily use.', image: '/uploads/1742373402440.jpg' }),
    upsertProduct({ name: 'Minimal Cotton Tee', vendor: urbanStyle._id, price: 599, category: 'Clothing', description: 'Soft cotton tee in a relaxed fit.', image: '/uploads/1742373473143.jpg' }),
  ]);

  await Vendor.findByIdAndUpdate(freshMart._id, { products: products.slice(0, 3).map((product) => product._id) });
  await Vendor.findByIdAndUpdate(urbanStyle._id, { products: products.slice(3).map((product) => product._id) });

  const customer = await User.findOneAndUpdate(
    { email: 'customer@urbanhive.local' },
    {
      $set: {
        name: 'Priya Sharma',
        password,
        phone: '9876543212',
        address: '8 Salt Lake Road, Kolkata',
        cart: [
          { product: products[0]._id, quantity: 2 },
          { product: products[1]._id, quantity: 1 },
        ],
      },
      $setOnInsert: { email: 'customer@urbanhive.local' },
    },
    { new: true, upsert: true, runValidators: true }
  );

  await Order.findOneAndUpdate(
    { razorpayOrderId: 'demo_order_delivered_001' },
    {
      $set: {
        user: customer._id,
        vendor: freshMart._id,
        products: [
          { productId: products[2]._id, quantity: 2 },
          { productId: products[0]._id, quantity: 1 },
        ],
        totalAmount: 310,
        orderStatus: 'Delivered',
        paymentStatus: 'Successful',
        deliveryDate: new Date(),
        rating: 5,
        history: [{ status: 'Delivered', updatedBy: customer._id }],
      },
      $setOnInsert: { razorpayOrderId: 'demo_order_delivered_001' },
    },
    { new: true, upsert: true, runValidators: true }
  );

  await Complaint.findOneAndUpdate(
    { description: 'Demo complaint: delivery packaging could be improved.' },
    {
      $set: { user: customer._id, status: 'In Progress', updatedAt: new Date() },
      $setOnInsert: { description: 'Demo complaint: delivery packaging could be improved.' },
    },
    { new: true, upsert: true, runValidators: true }
  );

  console.log('Demo data is ready.');
  console.log('Customer: customer@urbanhive.local');
  console.log('Vendors: freshmart@urbanhive.local, urbanstyle@urbanhive.local');
  console.log(`Demo password: ${demoPassword}`);
};

seed()
  .catch((error) => {
    console.error('Seeding failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
