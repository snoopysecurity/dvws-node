const rateLimitMap = new Map();

const rateLimiter = (options) => {
  const windowMs = options.windowMs || 30 * 1000; // Default: 30 seconds
  const max = options.max || 1000; // Relaxed for testing
  const message = options.message || "Too many requests, please try again later.";

  return (req, res, next) => {
    // Simple IP-based rate limiting
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const now = Date.now();
    
    if (!rateLimitMap.has(ip)) {
      rateLimitMap.set(ip, []);
    }
    
    let requests = rateLimitMap.get(ip);
    // Filter out old requests
    requests = requests.filter(time => time > now - windowMs);
    
    if (requests.length >= max) {
      // Update with filtered list to prevent memory leak
      rateLimitMap.set(ip, requests);
      return res.status(429).json({ error: message });
    }
    
    requests.push(now);
    rateLimitMap.set(ip, requests);
    next();
  };
};

module.exports = rateLimiter;
