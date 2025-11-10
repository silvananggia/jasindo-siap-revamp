const db = require("../config/database");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { promisify } = require('util');
const axios = require("axios");

exports.listAllPetak = async (req, res) => {
    try {

          const result = await db.query(
            `
          SELECT psid, luas FROM petak_sawah LIMIT 5;
        `
          );
    
          res.json({
            code: 200,
            status: "success",
            data: result.rows,
          });
        
      } catch (error) {
        console.error("Error executing query", error);
        res.status(500).json({
          code: 500,
          status: "error",
          data: "Internal Server Error",
        });
      }
};

