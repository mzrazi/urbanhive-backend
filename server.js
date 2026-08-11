require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const { createRateLimiter } = require('./middleware/rateLimit');
const { handleRazorpayWebhook } = require('./controllers/userController');

const app = express();

// Middleware
app.set('trust proxy', 1);
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin not allowed by CORS'));
  },
}));
app.post('/api/payments/razorpay/webhook', express.raw({ type: 'application/json' }), handleRazorpayWebhook);
app.use(express.json({ limit: '100kb' }));
app.use(createRateLimiter({ windowMs: 15 * 60 * 1000, max: 300, message: 'Too many requests. Please try again later.' }));
app.use(express.static("public")); 

// Database Connection
connectDB();

// Routes
const authLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 15, message: 'Too many sign-in attempts. Please try again in 15 minutes.' });
app.use('/api/users/login', authLimiter);
app.use('/api/users/register', authLimiter);
app.use('/api/users/forgot-password', authLimiter);
app.use('/api/vendors/login', authLimiter);
app.use('/api/vendors/register', authLimiter);
app.use('/api/vendors/forgot-password', authLimiter);
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/vendors", require("./routes/vendorRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));

app.use((error, req, res, next) => {
  if (error.name === 'MulterError' || error.message === 'Only JPG, PNG, and WEBP images are allowed.') {
    return res.status(400).json({ message: error.code === 'LIMIT_FILE_SIZE' ? 'Image must be 5 MB or smaller.' : error.message });
  }
  console.error(error);
  res.status(500).json({ message: 'Server error' });
});

// Server Port
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
