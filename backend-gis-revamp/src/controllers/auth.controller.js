const db = require("../config/database");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { promisify } = require('util');
const axios = require("axios");

// Get base URL from environment variable or use default
const BASE_URL = process.env.BASE_URL ;

exports.checkAuth = async (req, res, next) => {
  const clientCred = req.cred;
  if (!clientCred) return res.status(401).json({ message: 'No credential found' });

  try {
    const endpoint = 'http://service-dev-jasindo-revampsiap-be.apps.okd.asuransijasindo.co.id/siap-auth-service/api/v1/auth/login/confirm';
    
    const response = await axios.post(endpoint, {
      product: "autp",
      cred: clientCred
    });
    
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

