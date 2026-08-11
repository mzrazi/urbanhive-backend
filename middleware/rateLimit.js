const createRateLimiter = ({ windowMs, max, message }) => {
  const requests = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const recentRequests = (requests.get(key) || []).filter((timestamp) => now - timestamp < windowMs);

    if (recentRequests.length >= max) return res.status(429).json({ message });

    recentRequests.push(now);
    requests.set(key, recentRequests);
    next();
  };
};

module.exports = { createRateLimiter };
