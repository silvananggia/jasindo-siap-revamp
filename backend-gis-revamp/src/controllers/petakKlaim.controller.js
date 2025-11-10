const db = require("../config/database");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { promisify } = require('util');
const axios = require("axios");
const { v4: uuidv4 } = require('uuid');

exports.savePetakKlaim = async (req, res) => {
  const percils = req.body; // Array of percils

  if (!Array.isArray(percils) || percils.length === 0) {
    return res.status(400).json({ error: 'Invalid or empty list of percils' });
  }

  const insertValues = [];
  const insertQueryParts = [];

  // Loop through each percils and prepare the values for insertion
  percils.forEach((percils, index) => {
    const { nik, nopolis, idpetak, luas, geometry, tglKejadian } = percils;

    if (!nik || !nopolis || !idpetak || !luas || !geometry) {
      return res.status(400).json({ error: `Missing required fields in percils ${index + 1}` });
    }

    const id = uuidv4(); // Generate a unique UUID for each percils

    // Prepare the query part and corresponding values for batch insert
    insertValues.push(id, nik, nopolis, idpetak, luas, JSON.stringify(geometry), tglKejadian || null);
    insertQueryParts.push(`($${index * 7 + 1}, $${index * 7 + 2}, $${index * 7 + 3}, $${index * 7 + 4}, $${index * 7 + 5}, ST_GeomFromGeoJSON($${index * 7 + 6}), $${index * 7 + 7})`);
  });

  const insertQuery = `
      INSERT INTO petak_klaim (id, nik, nopolis, idpetak, luas, geometry, tgl_kejadian)
      VALUES ${insertQueryParts.join(', ')}
  `;

  try {
    // Execute the batch insert query
    await db.query(insertQuery, insertValues);

    res.status(201).json({ message: `${percils.length} percils saved successfully` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
};


exports.listPetakKlaim = async (req, res) => {
  try {
    const id = req.params.id;
    const nopolis = req.params.nopolis;

    const result = await db.query(
      `
  SELECT petak_klaim.id AS id, petak_klaim.luas, petak_user.id as idpuser, petak_user.idpetak AS idpetak 
    FROM petak_klaim
    JOIN petak_user ON petak_klaim.idpetak = petak_user.id
    WHERE petak_klaim.nik=$1 and petak_klaim.nopolis=$2
    `,
      [id, nopolis]
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

exports.deletePetakKlaim = async (req, res) => {
  try {
    const klaimId = req.params.id;
    console.log('deletePetakKlaim called with klaimId:', klaimId);

    // First check if the klaim exists
    const checkResult = await db.query(
      `SELECT id, nik, nopolis, idpetak, luas FROM petak_klaim WHERE id = $1`,
      [klaimId]
    );
    console.log('checkResult rows:', checkResult.rows);

    if (checkResult.rows.length === 0) {
      console.log('Klaim not found for id:', klaimId);
      return res.status(404).json({
        code: 404,
        status: "error",
        data: "Klaim not found",
      });
    }

    // Delete the klaim
    const deleteResult = await db.query(
      `DELETE FROM petak_klaim WHERE id = $1 RETURNING id, nik, nopolis, idpetak, luas`,
      [klaimId]
    );
    console.log('deleteResult rows:', deleteResult.rows);

    res.json({
      code: 200,
      status: "success",
      data: {
        message: "Klaim deleted successfully",
        deletedKlaim: deleteResult.rows[0]
      },
    });

  } catch (error) {
    console.error("Error deleting klaim:", error);
    res.status(500).json({
      code: 500,
      status: "error",
      data: "Internal Server Error",
    });
  }
};

exports.klaimId = async (req, res) => {
  try {
    const id = req.params.id;

    const result = await db.query(
      `
    SELECT petak_klaim.id, idpetak
    FROM petak_klaim
    WHERE petak_klaim.idpetak=$1
    `,
      [id]
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

exports.getPetakKlaimID = async (req, res) => {
  try {
    const id = req.params.id;

    const result = await db.query(
      `
      SELECT 
        petak_klaim.id,
        petak_klaim.idpetak,
        petak_klaim.luas,
        ST_AsGeoJSON(ST_Transform(petak_klaim.geometry, 4326))::json AS geometry,
        ST_AsGeoJSON(ST_Centroid(ST_Transform(petak_klaim.geometry, 4326)))::json AS center,
        ST_AsGeoJSON(ST_Envelope(ST_Transform(petak_klaim.geometry, 4326)))::json AS extent
      FROM petak_klaim
      WHERE petak_klaim.idpetak=$1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.json({
        code: 200,
        status: "success",
        data: [],
      });
    }

    // Process the data to include center and bounds information
    const processedData = result.rows.map(row => ({
      id: row.id,
      idpetak: row.idpetak,
      luas: parseFloat(row.luas),
      geometry: row.geometry,
      center: row.center,
      extent: row.extent,
      bounds: {
        minX: row.extent.coordinates[0][0][0],
        minY: row.extent.coordinates[0][0][1],
        maxX: row.extent.coordinates[0][2][0],
        maxY: row.extent.coordinates[0][2][1]
      }
    }));

    res.json({
      code: 200,
      status: "success",
      data: processedData,
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

exports.getPetakKlaimByNikGeoJSON = async (req, res) => {
  try {
    const nik = req.query.nik;
    const nopolis = req.query.nopolis;

    if (!nopolis) {
      return res.status(400).json({
        code: 400,
        status: "error",
        data: "nopolis query parameter is required",
      });
    }

    // Get all petak klaim geometries for the user by NIK and return as GeoJSON FeatureCollection
    const result = await db.query(
      `
      SELECT 
        id,
        nik,
        nopolis,
        luas,
        ST_AsGeoJSON(ST_Transform(geometry, 4326))::json AS geometry
      FROM petak_klaim
      WHERE nik = $1 and nopolis = $2
      ORDER BY idpetak
      `,
      [nik, nopolis]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        code: 404,
        status: "error",
        data: "No petak klaim data found for this NIK",
      });
    }

    // Create GeoJSON FeatureCollection
    const features = result.rows.map(row => ({
      type: "Feature",
      properties: {
        id: row.id,
        nopolis: row.nopolis,
        nik: row.nik,
        luas: parseFloat(row.luas)
      },
      geometry: row.geometry
    }));

    const geoJSON = {
      type: "FeatureCollection",
      features: features
    };
    
    res.json(geoJSON);

  } catch (error) {
    console.error("Error getting petak klaim GeoJSON by NIK:", error);
    res.status(500).json({
      code: 500,
      status: "error",
      data: "Internal Server Error",
    });
  }
};