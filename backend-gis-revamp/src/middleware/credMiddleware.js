// Middleware to extract cred from request (from postMessage)
// Supports both GET (query parameter) and POST (request body)
const extractCred = (req, res, next) => {
  // Get cred from query parameter (GET request)
  const credFromQuery = req.query?.cred;
  
  // Get cred from request body (POST request)
  const credFromBody = req.body?.cred;
  
  // Set req.cred from query param or body (query param takes precedence for GET)
  req.cred = credFromQuery || credFromBody || null;
  
  next();
};

module.exports = extractCred;

