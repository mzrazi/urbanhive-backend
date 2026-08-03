const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const passwordResetController = require('../controllers/passwordResetController');
const { authMiddleware } = require('../middleware/authMiddleware');

// Authentication
router.post('/register', userController.registerUser);
router.post('/login', userController.loginUser);
router.post('/forgot-password', (req, res) => { req.body.accountType = 'customer'; return passwordResetController.forgotPassword(req, res); });
router.post('/reset-password', (req, res) => { req.body.accountType = 'customer'; return passwordResetController.resetPassword(req, res); });

// Profile Management
router.get('/profile/:userid', authMiddleware, userController.getUserProfile);
router.put('/profile/update', authMiddleware, userController.updateUserProfile);
router.put('/profile/change-password', authMiddleware, userController.changeUserPassword);

// Cart Management
router.post('/cart/add', authMiddleware, userController.addToCart);
router.delete('/cart/remove', authMiddleware, userController.removeFromCart);
router.put('/cart/update', authMiddleware, userController.updateCartItem);
router.put('/cart/clear', authMiddleware, userController.clearCart);
router.get('/cart/:userid', authMiddleware, userController.getCart);
router.post("/cart/details", authMiddleware, userController.getFullCartDetails);
router.post("/create-order", authMiddleware, userController.createOrder)
router.post("/save-order", authMiddleware, userController.saveOrder)
router.get('/view-product/:id',userController.viewProduct)
router.get("/homepage", async (req, res) => {
    try {
      const featuredProducts = await userController.getRandomProducts(4)
      const popularVendors = await userController.getPopularVendors(4);
  
      res.json({ featuredProducts, popularVendors });
    } catch (error) {
      console.error("Error fetching homepage data:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

router.get("/nearby", userController.getNearbyVendors);
router.get('/search', userController.searchMarketplace);
router.post("/complaint", authMiddleware, userController.submitComplaint)
// Order Management
router.put('/order-rating', authMiddleware, userController.OrderRating);
router.get('/order-history/:userId', authMiddleware, userController.getOrderHistory);
router.put('/order/cancel/:orderId', authMiddleware, userController.cancelOrder);

module.exports = router;
