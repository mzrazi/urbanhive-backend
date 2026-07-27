const Vendor = require('../models/Vendor');
const Complaint = require('../models/Complaint');
const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product');
const Review = require('../models/Review');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
require('dotenv').config();
// 📌 Configure Nodemailer Transport
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_APP_PASSWORD
  }
});



const adminLogin = async (req, res) => {
  const { email, password } = req.body;
  console.log(email);
  

  // Fetch admin credentials from .env
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  // Validate credentials
  if (email !== adminEmail || password !== adminPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ message: 'Login successful', token });
};

// 📌 Vendor Management
const getVendors = async (req, res) => {
  try {
    const vendors = await Vendor.find().select('-password');
    res.status(200).json(vendors);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching vendors', error });
  }
};

const updateVendorStatus = async (req, res) => {
  const { id } = req.params;
  const { approvedByAdmin } = req.body;

  try {
    const vendor = await Vendor.findById(id);
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

    const vendorEmail = vendor.email; // Save email before deletion
    console.log(vendorEmail);
    
    if (approvedByAdmin) {
      vendor.approvedByAdmin = true;
      await vendor.save();

      try {
        await transporter.sendMail({
          from: process.env.MAIL_USER,
          to: vendorEmail,
          subject: 'Vendor Approval',
          text: `Congratulations! Your vendor application has been approved.`,
        });
        console.log("Approval email sent successfully!");
      } catch (mailError) {
        console.error("Failed to send approval email:", mailError);
      }

      return res.status(200).json({ message: 'Vendor approved successfully', vendor });
    } else {
      await Vendor.findByIdAndDelete(id);

      try {
        await transporter.sendMail({
          from: process.env.MAIL_USER,
          to: vendorEmail,
          subject: 'Vendor Rejection',
          text: `We regret to inform you that your vendor application has been rejected.`,
        });
        console.log("Rejection email sent successfully!");
      } catch (mailError) {
        console.error("Failed to send rejection email:", mailError);
      }

      return res.status(200).json({ message: 'Vendor rejected and deleted successfully' });
    }
  } catch (error) {
    console.error("Error updating vendor status:", error);
    res.status(500).json({ message: 'Error updating vendor status', error });
  }
};


const deleteVendor = async (req, res) => {
  try {
    await Vendor.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Vendor deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting vendor', error });
  }
};

// 📌 Complaint Management
const getComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find();
    res.status(200).json(complaints);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching complaints', error });
  }
};

const resolveComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

    complaint.status = 'Resolved';
    await complaint.save();

    res.status(200).json({ message: 'Complaint marked as resolved', complaint });
  } catch (error) {
    res.status(500).json({ message: 'Error resolving complaint', error });
  }
};

const deleteComplaint = async (req, res) => {
  try {
    await Complaint.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Complaint deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting complaint', error });
  }
};

// 📌 Order Management
const getOrders = async (req, res) => {
  try {
    const orders = await Order.find().populate('user', '-password').populate('vendor', '-password');
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching orders', error });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
   
    
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    order.orderStatus = req.body.status;
   
    
    await order.save();
    console.log(order);
    

    res.status(200).json({ message: 'Order status updated', order });
  } catch (error) {
    console.log(error);
    
    res.status(500).json({ message: 'Error updating order status', error });
  }
};

const deleteOrder = async (req, res) => {
  try {
    await Order.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Order deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting order', error });
  }
};

// 📌 User Management
const getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users', error });
  }
};

const blockUnblockUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.isBlocked = !user.isBlocked;
    await user.save();

    res.status(200).json({ message: `User ${user.isBlocked ? 'blocked' : 'unblocked'}` });
  } catch (error) {
    res.status(500).json({ message: 'Error updating user status', error });
  }
};

const deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting user', error });
  }
};

const getProducts = async (req, res) => {
  try {
    const products = await Product.find().populate({
      path: 'vendor',
      select: 'name email storeName approvedByAdmin' // Select only necessary fields from vendor
    });

    res.status(200).json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ message: 'Error fetching products', error });
  }
};


const addProduct = async (req, res) => {
  try {
    const newProduct = new Product(req.body);
    await newProduct.save();
    res.status(201).json({ message: 'Product added successfully', newProduct });
  } catch (error) {
    res.status(500).json({ message: 'Error adding product', error });
  }
};

const updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!product) return res.status(404).json({ message: 'Product not found' });

    res.status(200).json({ message: 'Product updated successfully', product });
  } catch (error) {
    res.status(500).json({ message: 'Error updating product', error });
  }
};

const deleteProduct = async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting product', error });
  }
};

// 📌 Review Management
const getReviews = async (req, res) => {
  try {
    const reviews = await Review.find().populate('user', '-password').populate('product');
    res.status(200).json(reviews);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching reviews', error });
  }
};

const deleteReview = async (req, res) => {
  try {
    await Review.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Review deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting review', error });
  }
};

// 📌 Dashboard Statistics
const getDashboardStats = async (req, res) => {
  try {
    const vendorCount = await Vendor.countDocuments();
    const userCount = await User.countDocuments();
    const orderCount = await Order.countDocuments();
    const complaintCount = await Complaint.countDocuments();

    
    const totalRevenueResult = await Order.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalAmount" } 
        }
      }
    ]);

    const totalRevenue = totalRevenueResult.length > 0 ? totalRevenueResult[0].totalRevenue : 0;

    res.status(200).json({ vendorCount, userCount, orderCount, complaintCount, totalRevenue });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching dashboard stats', error });
  }
};

module.exports = { adminLogin,
  getVendors, updateVendorStatus, deleteVendor,
  getComplaints, resolveComplaint, deleteComplaint,
  getOrders, updateOrderStatus, deleteOrder,
  getUsers, blockUnblockUser, deleteUser,
  getProducts, addProduct, updateProduct, deleteProduct,
  getReviews, deleteReview,
  getDashboardStats
};
