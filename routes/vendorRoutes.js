const express = require("express");
const { registerVendor, loginVendor, updateStoreDetails, addProduct, getVendorProducts, updateProduct, deleteProduct, getVendorOrders, updateOrderStatus, uploadImageMiddleware, getproduct, getVendorStats } = require("../controllers/vendorController");


const router = express.Router();
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');
const passwordResetController = require('../controllers/passwordResetController');

// Vendor authentication
router.post("/register", registerVendor);
router.post("/login", loginVendor);
router.post('/forgot-password', (req, res) => { req.body.accountType = 'vendor'; return passwordResetController.forgotPassword(req, res); });
router.post('/reset-password', (req, res) => { req.body.accountType = 'vendor'; return passwordResetController.resetPassword(req, res); });
router.get("/dashboard/:vendorId", authMiddleware, requireRole('vendor'), getVendorStats)

// Vendor store management
router.put("/update", authMiddleware, requireRole('vendor'), updateStoreDetails);

// Product management
router.post("/add-product", authMiddleware, requireRole('vendor'), uploadImageMiddleware, addProduct);
router.get("/products/:vendorId", getVendorProducts);
router.get("/getproduct/:productId", authMiddleware, requireRole('vendor'), getproduct)
router.put("/update-product/:id", authMiddleware, requireRole('vendor'), updateProduct);
router.delete("/delete-product/:id", authMiddleware, requireRole('vendor'), deleteProduct);

// Order management
router.get("/get-orders/:id", authMiddleware, requireRole('vendor'), getVendorOrders);
router.put("/order/:id", authMiddleware, requireRole('vendor'), updateOrderStatus);

module.exports = router;
