// Middleware to extract token from request (from postMessage)
// Supports both GET (query parameter) and POST (request body)
const extractToken = (req, res, next) => {
  // Get token from query parameter (GET request)
  const tokenFromQuery = req.query?.token;
  
  // Get token from request body (POST request)
  const tokenFromBody = req.body?.token;
  
  // Set req.token from query param or body (query param takes precedence for GET)
  req.token = tokenFromQuery || tokenFromBody || null;
  
  next();
};

module.exports = extractToken;

