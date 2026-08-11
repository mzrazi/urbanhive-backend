const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Vendor = require('../models/Vendor');

const authMiddleware = async (req, res, next) => {
  const token = req.header('Authorization');

  if (!token || !token.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET);
    if (decoded.role === 'customer' || decoded.role === 'vendor') {
      const Model = decoded.role === 'customer' ? User : Vendor;
      const account = await Model.findById(decoded.id).select('isBlocked approvedByAdmin');
      if (!account || account.isBlocked || (decoded.role === 'vendor' && !account.approvedByAdmin)) {
        return res.status(401).json({ message: 'This account is no longer authorised.' });
      }
    }
    req.user = decoded;
    next(); // Proceed to the next middleware/controller
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
  }

  next();
};

module.exports = { authMiddleware, requireRole };
