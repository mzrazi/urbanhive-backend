const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const passwordResetController = require('../controllers/passwordResetController');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');
const customerOnly = [authMiddleware, requireRole('customer')];

// Authentication
router.post('/register', userController.registerUser);
router.post('/login', userController.loginUser);
router.post('/forgot-password', (req, res) => { req.body.accountType = 'customer'; return passwordResetController.forgotPassword(req, res); });
router.post('/reset-password', (req, res) => { req.body.accountType = 'customer'; return passwordResetController.resetPassword(req, res); });

// Profile Management
router.get('/profile/:userid', ...customerOnly, userController.getUserProfile);
router.put('/profile/update', ...customerOnly, userController.updateUserProfile);
router.put('/profile/change-password', ...customerOnly, userController.changeUserPassword);

// Cart Management
router.post('/cart/add', ...customerOnly, userController.addToCart);
router.delete('/cart/remove', ...customerOnly, userController.removeFromCart);
router.put('/cart/update', ...customerOnly, userController.updateCartItem);
router.put('/cart/clear', ...customerOnly, userController.clearCart);
router.get('/cart/:userid', ...customerOnly, userController.getCart);
router.post("/cart/details", ...customerOnly, userController.getFullCartDetails);
router.post("/create-order", ...customerOnly, userController.createOrder)
router.post("/save-order", ...customerOnly, userController.saveOrder)
router.get('/view-product/:id',userController.viewProduct)
router.get("/homepage", async (req, res) => {
    try {
      const vendorIds = await userController.getNearbyVendorIds(req.query.lat, req.query.lng);
      const [featuredProducts, popularVendors] = await Promise.all([
        userController.getRandomProducts(4, vendorIds),
        userController.getPopularVendors(4, vendorIds),
      ]);
  
      res.json({ featuredProducts, popularVendors });
    } catch (error) {
      console.error("Error fetching homepage data:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

router.get("/nearby", userController.getNearbyVendors);
router.get('/search', userController.searchMarketplace);
router.post("/complaint", ...customerOnly, userController.submitComplaint)
router.get('/complaints', ...customerOnly, userController.getComplaintHistory)
// Order Management
router.put('/order-rating', ...customerOnly, userController.OrderRating);
router.get('/order-history/:userId', ...customerOnly, userController.getOrderHistory);
router.put('/order/cancel/:orderId', ...customerOnly, userController.cancelOrder);

module.exports = router;
