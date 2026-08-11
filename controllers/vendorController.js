
// controllers/vendorController.js
const Vendor = require("../models/Vendor");
const Product = require("../models/Product");
const Order = require("../models/Order");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const User = require('../models/User');
const { log } = require("console");

const uploadDir = path.join(__dirname, "../public/uploads");
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
      cb(null, uploadDir); // Save images to /public/uploads
  },
  filename: (req, file, cb) => {
      cb(null, Date.now() + path.extname(file.originalname)); // Unique filename
  },
});

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      return cb(new Error('Only JPG, PNG, and WEBP images are allowed.'));
    }
    cb(null, true);
  },
});


// Vendor Registration
// Vendor Registration
const registerVendor = async (req, res) => {
    try {
      const { name, email, password, phone, storeName, storeAddress, latitude, longitude, category } = req.body;
  
    
  
      const existingVendor = await Vendor.findOne({ email });
      if (existingVendor) return res.status(400).json({ message: "Vendor already exists" });
  
      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);
  
      // Create new vendor object
      const newVendor = new Vendor({
        name,
        email,
        password: hashedPassword,
        phone,
        storeName,
        storeAddress,
        category, // Add category here
        location: {
          type: "Point", // GeoJSON format
          coordinates: [longitude, latitude], // [longitude, latitude]
        },
      });
  
      await newVendor.save();
  
      res.status(201).json({ message: "Vendor registered successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  };
  
  


// Vendor Login
const loginVendor = async (req, res) => {
    try {
      const { email, password } = req.body;
  
      // Find the vendor by email
      const vendor = await Vendor.findOne({ email });
      if (!vendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }
  
      // Check if the vendor is approved
      if (!vendor.approvedByAdmin) {
        return res.status(403).json({ message: "Your account is pending approval. Please contact the admin." });
      }
      if (vendor.isBlocked) {
        return res.status(403).json({ message: 'This vendor account has been blocked.' });
      }
  
      // Check if the password is correct
      const isMatch = await bcrypt.compare(password, vendor.password);
      if (!isMatch) {
        return res.status(400).json({ message: "Invalid credentials" });
      }
  
      // Generate a JWT token
      const token = jwt.sign({ id: vendor._id, role: 'vendor' }, process.env.JWT_SECRET, { expiresIn: "7d" });
  
      // Return the token and vendor details
      const vendorData = vendor.toObject();
      delete vendorData.password;
      res.json({ token, user: { ...vendorData, userType: 'vendor' } });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Server error" });
    }
  };

  
// Update Store Details
const updateStoreDetails = async (req, res) => {
    try {
        const { storeName, storeAddress, phone, category, location } = req.body;
        const updates = { storeName, storeAddress, phone, category, location };
        Object.keys(updates).forEach((key) => updates[key] === undefined && delete updates[key]);
        const vendor = await Vendor.findByIdAndUpdate(req.user.id, updates, { new: true, runValidators: true }).select('-password');
        res.json({ message: "Store details updated", vendor });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

const getVendorProfile = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.user.id).select('-password -passwordResetToken -passwordResetExpires');
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
    res.json(vendor);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Add Product
const addProduct = async (req, res) => {
  try {
      const { name, price, description, category } = req.body;

      // Check if an image is uploaded
      let imageUrl = "";
      if (req.file) {
          imageUrl = `/uploads/${req.file.filename}`; // Save relative path
      }

      // Create product with image URL
      const newProduct = new Product({ 
          name, 
          price, 
          category,
          description, 
          vendor: req.user.id,
          image: imageUrl 
      });

      await newProduct.save();
      res.status(201).json({ message: "Product added", product: newProduct });

  } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
  }
};
const uploadImageMiddleware = upload.single("image");


// Get Vendor Products (with query param)
const getVendorProducts = async (req, res) => {
  try {
    const { vendorId } = req.params; // Extract vendor ID from query params

    if (!vendorId) {
      return res.status(400).json({ error: "Vendor ID is required" });
    }

    // Check if the vendor exists
    const vendorExists = await Vendor.findById(vendorId);
    if (!vendorExists) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    // Fetch products for the vendor
    const products = await Product.find({ vendor: vendorId });

    res.status(200).json(products);
  } catch (error) {
    console.error("Error fetching vendor products:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};



// Update Product
const updateProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: 'Product not found' });
        if (product.vendor.toString() !== req.user.id) {
          return res.status(403).json({ message: 'Access denied.' });
        }

        const { name, price, description, category } = req.body;
        const updates = { name, price, description, category };
        Object.keys(updates).forEach((key) => updates[key] === undefined && delete updates[key]);
        const updatedProduct = await Product.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
        
        res.json({ message: "Product updated", product: updatedProduct });
    } catch (error) {
      console.log(error);
      
        res.status(500).json({ message: "Server error" });
    }
};
 
// Delete Product
const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: 'Product not found' });
        if (product.vendor.toString() !== req.user.id) {
          return res.status(403).json({ message: 'Access denied.' });
        }

        await product.deleteOne();
        res.json({ message: "Product deleted" });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

// Get Vendor Orders
const getVendorOrders = async (req, res) => {
    try {
        const orders = await Order.find({ vendor: req.user.id, paymentStatus: 'Successful' }).populate("products.productId");
      
      
        res.json(orders);
    } catch (error) {

        res.status(500).json({ message: "Server error" });
    }
};

// Update Order Status
const updateOrderStatus = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: 'Order not found' });
        if (order.vendor.toString() !== req.user.id) {
          return res.status(403).json({ message: 'Access denied.' });
        }

        order.orderStatus = req.body.orderStatus;
        await order.save();
        const updatedOrder = order;
        res.json({ message: "Order status updated", order: updatedOrder });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

const getproduct = async(req,res)=>{
  try {

    const product=await Product.findById(req.params.productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    if (product.vendor.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied.' });
    }
    res.json({ message: "product fetched", product });
    
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
}
const getVendorStats = async (req, res) => {
  try {
    const vendorId = req.user.id;

    // 1. Find vendor by ID
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    // 2. Get the total number of orders for the vendor
    const totalOrders = await Order.countDocuments({ vendor: vendorId, paymentStatus: 'Successful' });

    // 3. Get the total number of products for the vendor
    const totalProducts = await Product.countDocuments({ vendor: vendorId });

    // 4. Get the total number of users on the platform
    const totalUsers = await User.countDocuments();

    // 5. Calculate total revenue for the vendor (sum of all amounts in the orders)
    const orders = await Order.find({ vendor: vendorId, paymentStatus: 'Successful' });
    const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);

    // 6. Calculate the average rating for the vendor
    const ratedOrders = orders.filter(order => order.rating > 0);  // Filter orders that have a rating
    const totalRating = ratedOrders.reduce((sum, order) => sum + order.rating, 0);
    const averageRating = ratedOrders.length > 0 ? totalRating / ratedOrders.length : 0;

    // Return the vendor stats as a response
    return res.status(200).json({
      totalOrders,
      totalProducts, 
      totalUsers,
      totalRevenue,
      averageRating
    });
  } catch (error) {
    console.error('Error fetching vendor stats:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

 

module.exports = {getVendorStats, getproduct,uploadImageMiddleware , registerVendor, loginVendor, updateStoreDetails, getVendorProfile, addProduct, getVendorProducts, updateProduct, deleteProduct, getVendorOrders, updateOrderStatus };
