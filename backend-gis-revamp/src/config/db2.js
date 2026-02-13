const { Pool } = require("pg");
const dotenv = require("dotenv");

dotenv.config();

const connectionString = `postgresql://${process.env.DB2_USER}:${process.env.DB2_PASSWORD}@${process.env.DB2_HOST}:${process.env.DB2_PORT}/${process.env.DATABASE2}`;
const pool = new Pool({
  connectionString,
  max: 20, // Increase the maximum number of connections
  idleTimeoutMillis: 30000, // Adjust the idle timeout
  connectionTimeoutMillis: 2000, // Adjust the connection timeout
});


module.exports = {
  query: (text, params) => pool.query(text, params),
};
