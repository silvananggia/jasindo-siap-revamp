const db2 = require("../config/db2");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { promisify } = require('util');
const axios = require("axios");
const { v4: uuidv4 } = require('uuid');
const { getBearerToken } = require("../utils/auth");


exports.getTanamPetak = async (req, res) => {
  const token = getBearerToken(req, res);
  if (!token) return;

  try {
    const petakId = req.params.id;

    // Get the exact petak by ID with geometry for precise zooming
    const result = await db2.query(
      `
      SELECT 
        petak_id,
        tanam_last2th
      FROM petak_summary
      WHERE petak_id = $1
      `,
      [petakId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        code: 404,
        status: "error",
        data: "Petak not found",
      });
    }

    const data = result.rows[0];
    
    res.json({
      code: 200,
      status: "success",
      data: {
        petak_id: data.petak_id,
        tanam_last2th: data.tanam_last2th
      },
    });

  } catch (error) {
    console.error("Error getting petak by ID:", error);
    res.status(500).json({
      code: 500,
      status: "error",
      data: "Internal Server Error",
    });
  }
};

exports.getNDPIAnalisis = async (req, res) => {
  const token = getBearerToken(req, res);
  if (!token) return;

  try {
    const petakId = req.params.id;

    // Get the exact petak by ID with geometry for precise zooming
    const result = await db2.query(
      `
      SELECT 
        petak_id,
        ndpi_val_last2th,
        sat_epoch
      FROM petak_summary
      WHERE petak_id = $1
      `,
      [petakId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        code: 404,
        status: "error",
        data: "Petak not found",
      });
    }

    const data = result.rows[0];
    
    res.json({
      code: 200,
      status: "success",
      data: {
        petak_id: data.petak_id,
        ndpi_val_last2th: data.ndpi_val_last2th,
        sat_epoch: data.sat_epoch 
      },
    });

  } catch (error) {
    console.error("Error getting petak by ID:", error);
    res.status(500).json({
      code: 500,
      status: "error",
      data: "Internal Server Error",
    });
  }
};

exports.getWaterAnalisis = async (req, res) => {
  const token = getBearerToken(req, res);
  if (!token) return;

  try {
    const petakId = req.params.id;

    // Get the exact petak by ID with geometry for precise zooming
    const result = await db2.query(
      `
      SELECT 
        petak_id,
        water_val_last2th,
        sat_epoch
      FROM petak_summary
      WHERE petak_id = $1
      `,
      [petakId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        code: 404,
        status: "error",
        data: "Petak not found",
      });
    }

    const data = result.rows[0];
    
    res.json({
      code: 200,
      status: "success",
      data: {
        petak_id: data.petak_id,
        water_val_last2th: data.water_val_last2th,
        sat_epoch: data.sat_epoch
      },
    });

  } catch (error) {
    console.error("Error getting petak by ID:", error);
    res.status(500).json({
      code: 500,
      status: "error",
      data: "Internal Server Error",
    });
  }
};

exports.getBareAnalisis = async (req, res) => {
  const token = getBearerToken(req, res);
  if (!token) return;

  try {
    const petakId = req.params.id;

    // Get the exact petak by ID with geometry for precise zooming
    const result = await db2.query(
      `
      SELECT 
        petak_id,
        bare_val_last2th,
        sat_epoch
      FROM petak_summary
      WHERE petak_id = $1
      `,
      [petakId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        code: 404,
        status: "error",
        data: "Petak not found",
      });
    }

    const data = result.rows[0];
    
    res.json({
      code: 200,
      status: "success",
      data: {
        petak_id: data.petak_id,
        bare_val_last2th: data.bare_val_last2th,
        sat_epoch: data.sat_epoch
      },
    });

  } catch (error) {
    console.error("Error getting petak by ID:", error);
    res.status(500).json({
      code: 500,
      status: "error",
      data: "Internal Server Error",
    });
  }
};