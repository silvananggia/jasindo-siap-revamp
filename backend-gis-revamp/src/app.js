const express = require("express");
const compression = require('compression')
require("dotenv").config();
const cors = require("cors");
const cookieParser = require('cookie-parser');
const session = require("express-session");
var bodyParser = require("body-parser");
const { Pool } = require("pg");
const { v4: uuidv4 } = require("uuid");
var helmet =require('helmet');

const app = express();
app.use(cookieParser());
app.use(compression());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({
  origin: true,
  credentials: true,
}));
 

/* app.use(cors({
  origin: 'http://localhost:8888', // CI origin
  credentials: true,
})); */


//Route
const index = require("./routes/index");
const authRoute = require("./routes/auth.routes");
const petakRoute = require("./routes/petak.routes");
const petakUserRoute = require("./routes/petakUser.routes");
const petakKlaimRoute = require("./routes/petakKlaim.routes");
const anggotaRoute = require("./routes/anggota.routes");


app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.json({ type: "application/vnd.api+json" }));



app.use(index);
app.use("/api/", authRoute);
app.use("/api/", petakRoute);
app.use("/api/", petakUserRoute);
app.use("/api/", petakKlaimRoute);
app.use("/api/", anggotaRoute);

module.exports = app;
