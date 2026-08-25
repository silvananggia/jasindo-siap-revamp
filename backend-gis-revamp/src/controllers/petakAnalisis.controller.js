const db2 = require("../config/db2");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { promisify } = require('util');
const axios = require("axios");
const { v4: uuidv4 } = require('uuid');

const PETAK_SUMMARY_COLUMNS = {
  tanam: "petak_id, tanam_last2th",
  ndpi: "petak_id, ndpi_val_last2th, sat_epoch",
  water: "petak_id, water_val_last2th, sat_epoch",
  bare: "petak_id, bare_val_last2th, sat_epoch",
};

async function findPetakSummary(petakId, columns) {
  const result = await db2.query(
    `
    SELECT ${columns}
    FROM petak_summary
    WHERE petak_id = $1
       OR replace(petak_id, '.', '') = replace($1::text, '.', '')
    LIMIT 1
    `,
    [petakId]
  );

  return result.rows[0] || null;
}

function notFound(res) {
  return res.status(404).json({
    code: 404,
    status: "error",
    data: "Petak not found",
  });
}

function serverError(res, error) {
  console.error("Error getting petak by ID:", error);
  return res.status(500).json({
    code: 500,
    status: "error",
    data: "Internal Server Error",
  });
}

exports.getTanamPetak = async (req, res) => {
  try {
    const data = await findPetakSummary(req.params.id, PETAK_SUMMARY_COLUMNS.tanam);

    if (!data) {
      return notFound(res);
    }

    res.json({
      code: 200,
      status: "success",
      data: {
        petak_id: data.petak_id,
        tanam_last2th: data.tanam_last2th
      },
    });
  } catch (error) {
    return serverError(res, error);
  }
};

exports.getNDPIAnalisis = async (req, res) => {
  try {
    const data = await findPetakSummary(req.params.id, PETAK_SUMMARY_COLUMNS.ndpi);

    if (!data) {
      return notFound(res);
    }

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
    return serverError(res, error);
  }
};

exports.getWaterAnalisis = async (req, res) => {
  try {
    const data = await findPetakSummary(req.params.id, PETAK_SUMMARY_COLUMNS.water);

    if (!data) {
      return notFound(res);
    }

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
    return serverError(res, error);
  }
};

exports.getBareAnalisis = async (req, res) => {
  try {
    const data = await findPetakSummary(req.params.id, PETAK_SUMMARY_COLUMNS.bare);

    if (!data) {
      return notFound(res);
    }

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
    return serverError(res, error);
  }
};
