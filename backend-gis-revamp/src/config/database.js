const { Pool } = require("pg");
const dotenv = require("dotenv");

dotenv.config();

const connectionString = `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DATABASE}`;
const pool = new Pool({
  connectionString,
  max: 20, // Increase the maximum number of connections
  idleTimeoutMillis: 30000, // Adjust the idle timeout
  connectionTimeoutMillis: 2000, // Adjust the connection timeout
});

/* pool.on("connect", () => {
  console.log("Koneksi DB Berhasil!");
}); */

module.exports = {
  query: (text, params) => pool.query(text, params),
};
