const db = require("../config/db1");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { promisify } = require('util');
const axios = require("axios");

// Get base URL from environment variable or use default
const BASE_URL = process.env.BASE_URL ;

exports.checkAuth = async (req, res, next) => {
  // Extract token from Authorization Bearer header
  let clientToken = null;
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    clientToken = authHeader.substring(7); // Remove 'Bearer ' prefix
  } else {
    // Fallback to existing token extraction (from middleware)
    clientToken = req.token;
  }
  
  if (!clientToken) return res.status(401).json({ message: 'No token found' });

  try {
    const endpoint = `${BASE_URL}/auth/check-auth`;
    
    // Try GET with Authorization header first, fallback to POST if needed
    let response;
    try {
      response = await axios.get(endpoint, {
        headers: {
          Authorization: `Bearer ${clientToken}`
        }
      });
    } catch (getError) {
      // If GET fails, try POST with token in body and header
      response = await axios.post(endpoint, {
        token: clientToken
      }, {
        headers: {
          Authorization: `Bearer ${clientToken}`
        }
      });
    }
    
    // console.log("Response from CI:", response.data);

    if (response.data && response.data.status === 200 && response.data.message === "Success") {
      req.user = response.data.user;
      res.status(200).json({ message: 'authorized' });
    } else {
      res.status(401).json({ message: 'Unauthorized' });
    }
  } catch (error) {
    console.error('Session check failed:', error.response?.data || error.message);
    res.status(500).json({ message: 'Session check failed' });
  }
};

