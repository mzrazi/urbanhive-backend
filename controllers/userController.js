const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Vendor = require("../models/Vendor");
const Razorpay = require("razorpay");
const crypto = require('crypto');
const Complaint=require('../models/Complaint')



const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});



const registerUser = async (req, res) => {
    try {
      const { name, email, password, phone, address } = req.body; // Add additional fields
  
      // Check if user already exists
      const userExists = await User.findOne({ email });
      if (userExists) return res.status(400).json({ message: 'User already exists' });
  
      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);
  
      // Create new user with all fields
      const user = new User({ 
        name, 
        email, 
        password: hashedPassword, 
        phone, 
        address 
      });
  
      await user.save();
  
      res.status(201).json({ message: 'User registered successfully', user });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  };

  const getFullCartDetails = async (req, res) => {
    try {
      const { lat, lng } = req.body;
      const userid = req.user.id;
      
     
  
      // Fetch user details 
      const user = await User.findById(userid).populate("cart.product");
      
      
      if (!user)   return res.status(404).json({ message: "User  not found" });
      

      
      if (user.cart.length === 0) {
        return res.json({ cart: [], subtotal: 0, discount: 0, deliveryCharge: 0, grandTotal: 0 });
      }

      const vendorid = user.cart[0].product.vendor.toString();
      // Fetch vendor details
      const vendor = await Vendor.findById(vendorid);
     
      
      if (!vendor || !vendor.location) return res.status(404).json({ message: "Vendor location not found" });
  
      // Calculate Distance
      const [vendorLng, vendorLat] = vendor.location.coordinates;
      const hasCustomerLocation = Number.isFinite(Number(lat)) && Number.isFinite(Number(lng));
      const distance = hasCustomerLocation
        ? calculateDistance(Number(lat), Number(lng), vendorLat, vendorLng)
        : 0;
  
      // Calculate Delivery Charge
      const deliveryCharge = calculateDeliveryCharge(distance);
  
      // Calculate Subtotal & Discount
      const subtotal = user.cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
      let discount = subtotal > 500 ? 50 : subtotal > 300 ? 30 : 10;
  
      // Send all cart data in one response
      res.json({
        cart: user.cart,
        subtotal,
        discount,
        deliveryCharge,
        grandTotal: subtotal + deliveryCharge - discount,
      });
    } catch (error) {
      console.log(error);
      
      res.status(500).json({ message: "Server error", error: error.message });
    }
  };
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of Earth in KM
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in KM
  };
  const calculateDeliveryCharge = (distance) => {
    if (!Number.isFinite(distance) || distance <= 5) return 30;
    return Math.min(99, 30 + Math.ceil((distance - 5) / 2) * 10);
  };
  
  
  
// Login User
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    

    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

   
 const token = jwt.sign({ id: user._id, role: 'customer' }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { message:'login success',id: user._id, name: user.name, email: user.email,userType:'customer' } });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get User Profile
const getUserProfile = async (req, res) => {
  try {
    const userid = req.user.id;
   
    
    const user = await User.findById(userid).select('-password');
    res.json(user);
  } catch (error) {
    console.log(error);
    
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update User Profile
const updateUserProfile = async (req, res) => {
  try {

    const { name, email, phone, address } = req.body; // Add any other fields you want to update
    const userid = req.user.id;
    console.log(req.body);
    
    const user = await User.findById(userid);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Update fields, but don't touch the password
    user.name = name || user.name;
    user.email = email || user.email;
    user.phone = phone || user.phone;
    user.address = address || user.address;

    // Save the updated user data
    await user.save();

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


// Change Password
const changeUserPassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Old password is incorrect' });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const addToCart = async (req, res) => {
  try {
    const { productId } = req.body;
    const userid = req.user.id;

    // 1. Find the user
    const user = await User.findById(userid);
    if (!user) return res.status(404).json({ message: "User not found" });

    // 2. Add the new item to cart
    user.cart.push({ product: productId, quantity: 1 });

    // 3. Save the updated user document
    await user.save();

    // 4. Re-fetch user with the last cart item populated
    await user.populate({
      path: 'cart.product',
      model: 'Product',
    });

    const lastItem = user.cart[user.cart.length - 1];

    // 5. Return the last item with populated product
    res.status(200).json(lastItem);
  } catch (error) {
    console.error("Error in addToCart:", error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


const clearCart = async (req, res) => {
  try {
    const userid = req.user.id;
    const user = await User.findById(userid);

    if (!user) return res.status(404).json({ message: "User not found" });

    user.cart = []; // Clear the cart array
    await user.save();

    res.json({ message: "Cart cleared successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
 

const removeFromCart = async (req, res) => {
  try {
    const { productId } = req.body;
    const userid = req.user.id;

    // Fetch user and check if exists
    const user = await User.findById(userid);
    if (!user) return res.status(404).json({ message: "User not found" });



    // Ensure productId is converted to a string
    const productIdStr = productId.toString();

    // Remove the item from cart where the `product` field matches
    user.cart = user.cart.filter((item) => item.product.toString() !== productIdStr);

    await user.save();

    

    res.json({ message: "Removed from cart", cart: user.cart });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getCart = async (req, res) => {
  try {
    const userid = req.user.id;

    const user = await User.findById(userid).populate({
      path: "cart.product", // Populate the product details inside the cart
      model: "Product", // Ensure it refers to the correct model
    });
    
    

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user.cart); // Now the cart will contain product details including vendorId
  } catch (error) {
   
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


const updateCartItem = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    
    if (!user) return res.status(404).json({ message: 'User not found' });
   
    const { productid, quantity } = req.body;


    // Check if product exists in cart
    const cartItem = user.cart.find((item) => item.product.toString() === productid.toString());

    
    
    if (!cartItem) return res.status(404).json({ message: 'Product not found in cart' });

    // Update quantity
    cartItem.quantity = quantity;
    await user.save();

    res.json({ message: 'Cart updated successfully', cart: user.cart });
  } catch (error) {
    console.log(error);
    
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Order Functions
const placeOrder = async (req, res) => {
  try {
    const order = new Order({ user: req.user.id, items: req.body.items });
    await order.save();

    res.json({ message: 'Order placed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getOrderHistory = async (req, res) => {
  try {
    const userId = req.user.id;

    const orders = await Order.find({ user: userId })
    .populate('user', 'name email phone')  
    .populate('vendor', 'name email phone address')
    .populate('products.productId', 'name price image') // Populate product details
    .sort({ createdAt: -1 }); // Sort by latest order first
  

    
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order || order.user.toString() !== req.user.id)
      return res.status(400).json({ message: 'Order not found' });

    order.orderStatus = 'Cancelled';
    await order.save();

    res.json({ message: 'Order cancelled' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getNearbyVendors = async (req, res) => {
  try {
    const { lat, lng } = req.query;
   
    

    if (!lat || !lng) {
      return res.status(400).json({ error: "Latitude and Longitude are required" });
    }

    // Find vendors within a certain radius (e.g., 10 km)
    const vendors = await Vendor.find({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [parseFloat(lng), parseFloat(lat)],
          },
         $maxDistance: 2000000 // 2000 km (approx all-India coverage)
, 
        },
      },
    });

   

    // Send the vendors with their average ratings to the frontend
    res.status(200).json(vendors);
  } catch (error) {
    console.error("Error fetching vendors:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};





const createOrder = async (req, res) => {
  try {
    const { lat, lng } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId).populate('cart.product');
    if (!user || user.cart.length === 0) {
      return res.status(400).json({ message: 'Cart is empty.' });
    }

    const cartVendorId = user.cart[0].product.vendor.toString();
    if (user.cart.some((item) => item.product.vendor.toString() !== cartVendorId)) {
      return res.status(400).json({ message: 'Checkout supports one vendor per order.' });
    }

    const cartProducts = user.cart.map((item) => ({
      productId: item.product._id,
      quantity: item.quantity,
    }));
    const subtotal = user.cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const discount = subtotal > 500 ? 50 : subtotal > 300 ? 30 : 10;
    const vendor = await Vendor.findById(cartVendorId);
    if (!vendor || !vendor.location) {
      return res.status(404).json({ message: 'Vendor location not found.' });
    }

    const [vendorLng, vendorLat] = vendor.location.coordinates;
    const hasCustomerLocation = Number.isFinite(Number(lat)) && Number.isFinite(Number(lng));
    const distance = hasCustomerLocation
      ? calculateDistance(Number(lat), Number(lng), vendorLat, vendorLng)
      : 0;

    const deliveryCharge = calculateDeliveryCharge(distance);
    const calculatedTotal = Math.max(0, subtotal + deliveryCharge - discount);

    // Create Razorpay order
    const options = {
      amount: Math.round(calculatedTotal * 100),  // Amount in paise (1 INR = 100 paise)
      currency: "INR", // Currency in INR
      receipt: `receipt_${Date.now()}`, // Unique receipt number for the order
      payment_capture: 1,  // 1 means automatic capture of payment after successful transaction
    };

    const razorpayOrder = await razorpay.orders.create(options);
    console.log(razorpayOrder.id);
    

    

    // Store order data temporarily or create a record in your database
    // You can save this order in your database, but this step is optional as you already have the order ID
    const order = new Order({
      user: userId,
      vendor: cartVendorId,
      products: cartProducts,
      totalAmount: calculatedTotal,
      orderStatus: "Pending", // You can update this status as payment progresses
      razorpayOrderId: razorpayOrder.id,
    });
   
    

    await order.save(); // Save the order in your database

    // Send the Razorpay order ID and payment key to frontend
    res.json({
      razorpayOrderId: razorpayOrder.id,
      razorpayPaymentKey: process.env.RAZORPAY_KEY_ID,
      totalAmount: calculatedTotal,
    });
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    res.status(500).json({ error: "Failed to create Razorpay order" });
  }
};


const saveOrder = async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
    // Verify payment signature
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ error: "Payment verification failed" });
    }

    // If the payment is verified, save the order status in your database
    const order = await Order.findOne({ razorpayOrderId: razorpay_order_id });
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    if (order.user.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    order.paymentStatus = "Successful";
    order.paymentDetails = {
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
    };
   
    await order.save();

    const user = await User.findById(order.user);
    if (user) {
      // console.log("called",user);
      
      // Assuming the cart is stored in user.cart (you may adjust this based on your schema)
      user.cart = [];
      await user.save();
    }

    // Respond with the saved order data
    res.json(order);
  } catch (error) {
   console.log("Error saving order:", error);
    res.status(500).json({ error: "Failed to save the order" });
  }
};

// In your backend controller (e.g., OrderController.js)
const OrderRating = async (req, res) => {
  try {
  const { orderId, rating } = req.body; // Receive orderId and rating from the request body
  
    
    // Find the order by its ID
    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    if (order.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    // Update the order with the new rating
    order.rating = rating;
    await order.save();

    // Find the vendor associated with this order (assuming order.vendorId exists)
    const vendor = await Vendor.findById(order.vendor);
    console.log(vendor);
    
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    // Use aggregation to calculate the new average rating for the vendor based on the updated ratings
    const vendorOrders = await Order.aggregate([
      { $match: { vendor: vendor._id } },  // Match orders for the vendor
      { $match: { rating: { $gt: 0 } } },  // Filter out orders that have a rating of 0
      {
        $group: {
          _id: "$vendor", 
          totalRatings: { $sum: "$rating" },  
          count: { $sum: 1 }, 
        }
      }
    ]);
    
    

    // If no rated orders, set the average rating to 0
    const averageRating = vendorOrders.length > 0
      ? vendorOrders[0].totalRatings / vendorOrders[0].count
      : 0;

    // Update the vendor's rating with the new average
    vendor.averageRating = averageRating;
   
    await vendor.save();

    // Return the updated order and vendor data
    res.status(200).json({ order, vendor });
  } catch (error) {
    console.log(error);
    
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


// Function to get random featured products
const getRandomProducts = async (count) => {
  const products = await Product.find({ }).populate('vendor');
  const shuffled = products.sort(() => 0.5 - Math.random()); // Shuffle the array
  return shuffled.slice(0, count); // Return 'count' number of products
};

// Function to get popular vendors (sorted by rating)
const getPopularVendors = async (count) => {
  return await Vendor.find().sort({ averageRating: -1 }).limit(count);
};

const searchMarketplace = async (req, res) => {
  try {
    const query = String(req.query.q || '').trim();
    const category = String(req.query.category || '').trim();
    if (!query && !category) return res.json({ products: [], vendors: [] });

    const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const matcher = safeQuery ? new RegExp(safeQuery, 'i') : null;
    const productFilter = { ...(category ? { category: new RegExp(`^${category}$`, 'i') } : {}), ...(matcher ? { $or: [{ name: matcher }, { category: matcher }, { description: matcher }] } : {}) };
    const vendorFilter = { ...(category ? { category: new RegExp(`^${category}$`, 'i') } : {}), ...(matcher ? { $or: [{ storeName: matcher }, { name: matcher }, { category: matcher }, { storeAddress: matcher }] } : {}) };
    const [products, vendors] = await Promise.all([
      Product.find(productFilter).populate('vendor', 'storeName category storeAddress').limit(24),
      Vendor.find(vendorFilter).sort({ averageRating: -1 }).limit(24),
    ]);
    res.json({ products, vendors });
  } catch (error) {
    res.status(500).json({ message: 'Could not search the marketplace.' });
  }
};


const viewProduct = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find product by ID
    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const submitComplaint = async (req, res) => {
try {
  const { description } = req.body;
  const userId = req.user.id;

  if (!description) {
    return res.status(400).json({ message: "Description is required." });
  }

  const newComplaint = new Complaint({ user: userId, description });
  await newComplaint.save();

  res.status(201).json({ message: "Complaint submitted successfully!" });
} catch (error) {
  console.error(error);
  res.status(500).json({ message: "Server Error" });
}
};

const getComplaintHistory = async (req, res) => {
  try {
    const complaints = await Complaint.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(complaints);
  } catch (error) {
    res.status(500).json({ message: 'Could not load complaint history.' });
  }
};










// Export all functions
module.exports = {
  submitComplaint, getComplaintHistory,
  getRandomProducts,getPopularVendors,
  saveOrder,
  createOrder,
  getNearbyVendors,
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  changeUserPassword,
  addToCart,
  removeFromCart,
  getCart,
  placeOrder,
  getOrderHistory,
  cancelOrder,
  updateCartItem,
  clearCart,getFullCartDetails
  ,OrderRating ,viewProduct, searchMarketplace
};
