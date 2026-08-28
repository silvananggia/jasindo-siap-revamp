const db = require("../config/db1");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { promisify } = require('util');
const axios = require("axios");
const { v4: uuidv4 } = require('uuid');
const { getBearerToken } = require("../utils/auth");

let schemaReady = false;

const ensureLonLatColumns = async () => {
  if (schemaReady) return;
  await db.query(`ALTER TABLE petak_user ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION`);
  await db.query(`ALTER TABLE petak_user ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION`);
  await db.query(`ALTER TABLE petak_user ADD COLUMN IF NOT EXISTS status VARCHAR(20)`);
  await db.query(`ALTER TABLE petak_user ADD COLUMN IF NOT EXISTS parent_id TEXT`);
  await db.query(`
    UPDATE petak_user
    SET status = CASE
      WHEN GeometryType(geometry) ILIKE '%POINT%' THEN 'titik'
      ELSE 'petak'
    END
    WHERE status IS NULL OR btrim(status) = ''
  `);
  schemaReady = true;
};

const statusFromGeometry = (geometry) => (
  geometry?.type === 'Point' ? 'titik' : 'petak'
);

const PETAKGEN_URL =
  process.env.PETAKGEN_URL ||
  'http://100.67.151.63:5000/api/v1/process_points';

const callPetakGen = async (payload) => {
  const response = await axios.post(PETAKGEN_URL, payload, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 60000,
  });
  return response.data;
};

const rowLonLatSql = `
  COALESCE(
    longitude,
    ST_X(
      CASE
        WHEN ST_SRID(geometry) IN (0, 4326) THEN ST_SetSRID(ST_Centroid(geometry), 4326)
        ELSE ST_Transform(ST_Centroid(geometry), 4326)
      END
    )
  )
`;

const rowLatSql = `
  COALESCE(
    latitude,
    ST_Y(
      CASE
        WHEN ST_SRID(geometry) IN (0, 4326) THEN ST_SetSRID(ST_Centroid(geometry), 4326)
        ELSE ST_Transform(ST_Centroid(geometry), 4326)
      END
    )
  )
`;

const geom4326Sql = `
  CASE
    WHEN ST_SRID(geometry) IN (0, 4326) THEN ST_SetSRID(geometry, 4326)
    ELSE ST_Transform(geometry, 4326)
  END
`;

const statusSql = `
  COALESCE(
    NULLIF(btrim(status), ''),
    CASE WHEN GeometryType(geometry) ILIKE '%POINT%' THEN 'titik' ELSE 'petak' END
  )
`;

const extractLonLat = (item) => {
  const lon = item.longitude ?? item.lon ?? item.long;
  const lat = item.latitude ?? item.lat;
  const lonNum = lon === undefined || lon === null || lon === '' ? null : Number(lon);
  const latNum = lat === undefined || lat === null || lat === '' ? null : Number(lat);
  return {
    longitude: Number.isFinite(lonNum) ? lonNum : null,
    latitude: Number.isFinite(latNum) ? latNum : null,
  };
};

exports.savePetakUser = async (req, res) => {
  const token = getBearerToken(req, res);
  if (!token) return;

  const percils = req.body; // Array of percils

  if (!Array.isArray(percils) || percils.length === 0) {
    return res.status(400).json({ error: 'Invalid or empty list of percils' });
  }

  // Extract all idpetak from the incoming batch
  const idpetakList = percils.map(p => p.idpetak);

  // Check for duplicate idpetak or same coordinates globally in petak_user
  try {
    const checkQuery = `SELECT idpetak FROM petak_user WHERE idpetak = ANY($1)`;
    const checkResult = await db.query(checkQuery, [idpetakList]);
    if (checkResult.rows.length > 0) {
      const existing = checkResult.rows.map(r => r.idpetak);
      return res.status(409).json({ error: 'Duplicate idpetak found', duplicates: existing });
    }

    const coordValues = percils
      .map((item) => extractLonLat(item))
      .filter((item) => Number.isFinite(item.longitude) && Number.isFinite(item.latitude));
    if (coordValues.length > 0) {
      const coordResult = await db.query(
        `
        SELECT p.idpetak
        FROM petak_user p
        JOIN unnest($1::float8[], $2::float8[]) AS i(lon, lat)
          ON ROUND(p.longitude::numeric, 5) = ROUND(i.lon::numeric, 5)
         AND ROUND(p.latitude::numeric, 5) = ROUND(i.lat::numeric, 5)
        WHERE p.longitude IS NOT NULL AND p.latitude IS NOT NULL
        `,
        [coordValues.map((item) => item.longitude), coordValues.map((item) => item.latitude)]
      );
      if (coordResult.rows.length > 0) {
        return res.status(409).json({
          error: 'Duplicate coordinates found',
          duplicates: coordResult.rows.map((row) => row.idpetak),
        });
      }
    }
  } catch (error) {
    console.error('Error checking duplicate idpetak:', error);
    return res.status(500).json({ error: 'Database error during duplicate check' });
  }

  try {
    await ensureLonLatColumns();
  } catch (error) {
    console.error('Error ensuring longitude/latitude columns:', error);
    return res.status(500).json({ error: 'Database error preparing coordinate columns' });
  }

  const insertValues = [];
  const insertQueryParts = [];

  // Loop through each percils and prepare the values for insertion
  for (let index = 0; index < percils.length; index++) {
    const percilsItem = percils[index];
    const { nik, idpetak, luas, musim_tanam, tgl_tanam, tgl_panen, geometry } = percilsItem;
    const { longitude, latitude } = extractLonLat(percilsItem);
    const luasNum = luas === undefined || luas === null || luas === '' ? NaN : Number(luas);

    let geometryPayload = geometry;
    if (!geometryPayload && Number.isFinite(longitude) && Number.isFinite(latitude)) {
      geometryPayload = {
        type: 'Point',
        coordinates: [longitude, latitude, 0],
      };
    }

    if (!nik || !idpetak || !Number.isFinite(luasNum) || luasNum < 0 || !musim_tanam || !tgl_tanam || !tgl_panen || !geometryPayload) {
      return res.status(400).json({ error: `Missing required fields in percils ${index + 1}` });
    }

    const id = uuidv4(); // Generate a unique UUID for each percils
    const status = percilsItem.status === 'titik' || percilsItem.status === 'petak'
      ? percilsItem.status
      : statusFromGeometry(geometryPayload);

    // Prepare the query part and corresponding values for batch insert
    insertValues.push(id, nik, idpetak, luasNum, musim_tanam, tgl_tanam, tgl_panen, JSON.stringify(geometryPayload), longitude, latitude, status);
    insertQueryParts.push(`($${index * 11 + 1}, $${index * 11 + 2}, $${index * 11 + 3}, $${index * 11 + 4}, $${index * 11 + 5}, $${index * 11 + 6}, $${index * 11 + 7}, ST_SetSRID(ST_Force3D(ST_GeomFromGeoJSON($${index * 11 + 8})), 4326), $${index * 11 + 9}, $${index * 11 + 10}, $${index * 11 + 11})`);
  }

  const insertQuery = `
      INSERT INTO petak_user (id, nik, idpetak, luas, musim_tanam, tgl_tanam, tgl_panen, geometry, longitude, latitude, status)
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

exports.listPetakUser = async (req, res) => {
  const token = getBearerToken(req, res);
  if (!token) return;

  try {
    const id = req.params.id;

    try {
      await ensureLonLatColumns();
    } catch (error) {
      console.error('Error ensuring longitude/latitude columns:', error);
    }

    const result = await db.query(
      `
            SELECT petak_user.id AS id, luas, idpetak, longitude, latitude, ${statusSql} AS status
            FROM petak_user
            WHERE petak_user.nik=$1
            ORDER BY petak_user.idpetak, petak_user.id
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

exports.pointPetakUser = async (req, res) => {
  const token = getBearerToken(req, res);
  if (!token) return;

  try {
    const id = req.params.id;
  
    const result = await db.query(
      `
      SELECT 
        petak_user.id AS id, 
        luas, 
        ST_AsGeoJSON(
          CASE
            WHEN ST_SRID(geometry) IN (0, 4326) THEN ST_SetSRID(ST_Centroid(geometry), 4326)
            ELSE ST_Transform(ST_Centroid(geometry), 4326)
          END
        )::json AS geometry
      FROM petak_user
      WHERE petak_user.id = $1
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

exports.listPointPetakUser = async (req, res) => {
  const token = getBearerToken(req, res);
  if (!token) return;

  try {
    const id = req.params.id;
  
    const result = await db.query(
      `
      SELECT 
        petak_user.id AS id, 
        luas, 
        ST_AsGeoJSON(
          CASE
            WHEN ST_SRID(geometry) IN (0, 4326) THEN ST_SetSRID(ST_Centroid(geometry), 4326)
            ELSE ST_Transform(ST_Centroid(geometry), 4326)
          END
        )::json AS geometry
      FROM petak_user
      WHERE petak_user.nik = $1
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

exports.petakId = async (req, res) => {
  const token = getBearerToken(req, res);
  if (!token) return;

  try {
    const id = req.params.id;

    const result = await db.query(
      `
    SELECT petak_user.id, idpetak
    FROM petak_user
    WHERE petak_user.idpetak=$1
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

exports.deletePetakUser = async (req, res) => {
  const token = getBearerToken(req, res);
  if (!token) return;

  try {
    const idpetak = req.params.id;

    // First check if the petak exists
    const checkResult = await db.query(
      `SELECT id, nik, idpetak, luas FROM petak_user WHERE id = $1`,
      [idpetak]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        code: 404,
        status: "error",
        data: "Petak not found",
      });
    }

    // Delete the petak
    const deleteResult = await db.query(
      `DELETE FROM petak_user WHERE id = $1 RETURNING id, nik, idpetak, luas`,
      [idpetak]
    );

    res.json({
      code: 200,
      status: "success",
      data: {
        message: "Petak deleted successfully",
        deletedPetak: deleteResult.rows[0]
      },
    });

  } catch (error) {
    console.error("Error deleting petak:", error);
    res.status(500).json({
      code: 500,
      status: "error",
      data: "Internal Server Error",
    });
  }
}

exports.deletePetakUserByNik = async (req, res) => {
  const token = getBearerToken(req, res);
  if (!token) return;

  try {
    const nik = req.params.id;

    // First check if any petak exists for this NIK
    const checkResult = await db.query(
      `SELECT id, nik, idpetak, luas FROM petak_user WHERE nik = $1`,
      [nik]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        code: 404,
        status: "error",
        data: "No petak found for this NIK",
      });
    }

    // Delete all petak for this NIK
    const deleteResult = await db.query(
      `DELETE FROM petak_user WHERE nik = $1 RETURNING id, nik, idpetak, luas`,
      [nik]
    );

    res.json({
      code: 200,
      status: "success",
      data: {
        message: `${deleteResult.rows.length} petak deleted successfully`,
        deletedCount: deleteResult.rows.length,
        deletedPetaks: deleteResult.rows
      },
    });

  } catch (error) {
    console.error("Error deleting petak by NIK:", error);
    res.status(500).json({
      code: 500,
      status: "error",
      data: "Internal Server Error",
    });
  }
}

exports.centerPetakUser = async (req, res) => {
  const token = getBearerToken(req, res);
  if (!token) return;

  try {
    const nik = req.params.id;

    // Get the center point and extent of all petak for the user
    const result = await db.query(
      `
      SELECT 
        ST_AsGeoJSON(ST_Centroid(ST_Collect(geometry)))::json AS center,
        ST_AsGeoJSON(ST_Envelope(ST_Collect(geometry)))::json AS extent,
        COUNT(*) AS petak_count,
        SUM(luas) AS total_area
      FROM petak_user
      WHERE nik = $1
      `,
      [nik]
    );

    if (result.rows.length === 0 || result.rows[0].petak_count === '0') {
      return res.status(404).json({
        code: 404,
        status: "error",
        data: "No petak data found for this user",
      });
    }

    const data = result.rows[0];
    
    res.json({
      code: 200,
      status: "success",
      data: {
        center: data.center,
        extent: data.extent,
        petak_count: parseInt(data.petak_count),
        total_area: parseFloat(data.total_area),
        bounds: {
          minX: data.extent.coordinates[0][0][0],
          minY: data.extent.coordinates[0][0][1],
          maxX: data.extent.coordinates[0][2][0],
          maxY: data.extent.coordinates[0][2][1]
        }
      },
    });

  } catch (error) {
    console.error("Error getting petak center:", error);
    res.status(500).json({
      code: 500,
      status: "error",
      data: "Internal Server Error",
    });
  }
};

exports.getPetakById = async (req, res) => {
  const token = getBearerToken(req, res);
  if (!token) return;

  try {
    const petakId = req.params.id;

    // Get the exact petak by ID with geometry for precise zooming
    const result = await db.query(
      `
      SELECT 
        id,
        idpetak,
        nik,
        luas,
        ST_AsGeoJSON(ST_Transform(geometry, 4326))::json AS geometry,
        ST_AsGeoJSON(ST_Centroid(ST_Transform(geometry, 4326)))::json AS center,
        ST_AsGeoJSON(ST_Envelope(ST_Transform(geometry, 4326)))::json AS extent
      FROM petak_user
      WHERE id = $1
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
        id: data.id,
        idpetak: data.idpetak,
        nik: data.nik,
        luas: parseFloat(data.luas),
        geometry: data.geometry,
        center: data.center,
        extent: data.extent,
        bounds: {
          minX: data.extent.coordinates[0][0][0],
          minY: data.extent.coordinates[0][0][1],
          maxX: data.extent.coordinates[0][2][0],
          maxY: data.extent.coordinates[0][2][1]
        }
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

exports.getPetakByIdPetak = async (req, res) => {
  const token = getBearerToken(req, res);
  if (!token) return;

  try {
    const idpetak = req.params.id;

    // Get the exact petak by idpetak with geometry for precise zooming
    const result = await db.query(
      `
      SELECT 
        id,
        idpetak,
        nik,
        luas,
        ST_AsGeoJSON(ST_Transform(geometry, 4326))::json AS geometry,
        ST_AsGeoJSON(ST_Centroid(ST_Transform(geometry, 4326)))::json AS center,
        ST_AsGeoJSON(ST_Envelope(ST_Transform(geometry, 4326)))::json AS extent
      FROM petak_user
      WHERE idpetak = $1
      `,
      [idpetak]
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
        id: data.id,
        idpetak: data.idpetak,
        nik: data.nik,
        luas: parseFloat(data.luas),
        geometry: data.geometry,
        center: data.center,
        extent: data.extent,
        bounds: {
          minX: data.extent.coordinates[0][0][0],
          minY: data.extent.coordinates[0][0][1],
          maxX: data.extent.coordinates[0][2][0],
          maxY: data.extent.coordinates[0][2][1]
        }
      },
    });

  } catch (error) {
    console.error("Error getting petak by idpetak:", error);
    res.status(500).json({
      code: 500,
      status: "error",
      data: "Internal Server Error",
    });
  }
};

exports.getPetakUserByNikGeoJSON = async (req, res) => {
  const token = getBearerToken(req, res);
  if (!token) return;

  try {
    const nik = req.query.nik;

    // Get all petak geometries for the user by NIK and return as GeoJSON FeatureCollection
    const result = await db.query(
      `
      SELECT 
        id,
        nik,
        luas,
        idpetak,
        ${statusSql} AS status,
        ST_AsGeoJSON(${geom4326Sql})::json AS geometry
      FROM petak_user
      WHERE nik = $1
      ORDER BY idpetak
      `,
      [nik]
    );

    if (result.rows.length === 0) {
      return res.json({
        type: 'FeatureCollection',
        total_luas: 0,
        features: [],
      });
    }

    // Create GeoJSON FeatureCollection
    const features = result.rows.map(row => ({
      type: "Feature",
      properties: {
        id: row.id,
        nik: row.nik,
        idpetak: row.idpetak,
        luas: parseFloat(row.luas),
        status: row.status,
      },
      geometry: row.geometry
    }));

    const geoJSON = {
      type: "FeatureCollection",
      total_luas: result.rows.reduce((acc, row) => acc + parseFloat(row.luas), 0),
      features: features
    };
    
    res.json(geoJSON);

  } catch (error) {
    console.error("Error getting petak GeoJSON by NIK:", error);
    res.status(500).json({
      code: 500,
      status: "error",
      data: "Internal Server Error",
    });
  }
};

exports.checkPercilAvailability = async (req, res) => {
  const token = getBearerToken(req, res);
  if (!token) return;

  try {
    const { idpetak, musim_tanam, tgl_tanam } = req.query;

    if (!idpetak || !musim_tanam || !tgl_tanam) {
      return res.status(400).json({
        code: 400,
        status: "error",
        data: "Missing required parameters: idpetak, musim_tanam, tgl_tanam",
      });
    }

    // Extract year from tgl_tanam
    const year = new Date(tgl_tanam).getFullYear();

    // Check if this percil is already registered for the same musim_tanam and year (regardless of user)
    const result = await db.query(
      `
      SELECT 
        id,
        idpetak,
        nik,
        musim_tanam,
        tgl_tanam,
        EXTRACT(YEAR FROM tgl_tanam::date) as year
      FROM petak_user
      WHERE idpetak = $1 
        AND musim_tanam = $2 
        AND EXTRACT(YEAR FROM tgl_tanam::date) = $3
      `,
      [idpetak, musim_tanam, year]
    );

    const isAvailable = result.rows.length === 0;
    const existingRecord = result.rows[0] || null;

    res.json({
      code: 200,
      status: "success",
      data: {
        isAvailable,
        existingRecord: existingRecord ? {
          id: existingRecord.id,
          idpetak: existingRecord.idpetak,
          nik: existingRecord.nik,
          musim_tanam: existingRecord.musim_tanam,
          tgl_tanam: existingRecord.tgl_tanam,
          year: existingRecord.year
        } : null,
        message: isAvailable 
          ? "Percil is available for selection"
          : `Percil already registered for musim_tanam ${musim_tanam} in year ${year}`
      }
    });

  } catch (error) {
    console.error("Error checking percil availability:", error);
    res.status(500).json({
      code: 500,
      status: "error",
      data: "Internal Server Error",
    });
  }
};

exports.listPetakPointsByExtent = async (req, res) => {
  const token = getBearerToken(req, res);
  if (!token) return;

  const minx = Number(req.query.minx);
  const miny = Number(req.query.miny);
  const maxx = Number(req.query.maxx);
  const maxy = Number(req.query.maxy);
  const nik = req.query.nik || '';

  if (![minx, miny, maxx, maxy].every(Number.isFinite) || minx >= maxx || miny >= maxy) {
    return res.status(400).json({
      code: 400,
      status: 'error',
      data: 'Invalid extent. Provide minx, miny, maxx, maxy as longitude/latitude.',
    });
  }

  if ((maxx - minx) > 1.5 || (maxy - miny) > 1.5) {
    return res.json({
      code: 200,
      status: 'success',
      data: [],
    });
  }

  try {
    await ensureLonLatColumns();
  } catch (error) {
    console.error('Error ensuring longitude/latitude columns:', error);
  }

  try {
    const result = await db.query(
      `
      SELECT
        id,
        idpetak,
        (nik = $5) AS mine,
        COALESCE(
          longitude,
          ST_X(
            CASE
              WHEN ST_SRID(geometry) IN (0, 4326) THEN ST_SetSRID(ST_Centroid(geometry), 4326)
              ELSE ST_Transform(ST_Centroid(geometry), 4326)
            END
          )
        ) AS longitude,
        COALESCE(
          latitude,
          ST_Y(
            CASE
              WHEN ST_SRID(geometry) IN (0, 4326) THEN ST_SetSRID(ST_Centroid(geometry), 4326)
              ELSE ST_Transform(ST_Centroid(geometry), 4326)
            END
          )
        ) AS latitude
      FROM petak_user
      WHERE
        CASE
          WHEN ST_SRID(geometry) IN (0, 4326) THEN ST_SetSRID(geometry, 4326)
          ELSE ST_Transform(geometry, 4326)
        END && ST_MakeEnvelope($1, $2, $3, $4, 4326)
      LIMIT 800
      `,
      [minx, miny, maxx, maxy, nik]
    );

    res.json({
      code: 200,
      status: 'success',
      data: result.rows.map((row) => ({
        id: row.id,
        idpetak: row.idpetak,
        mine: Boolean(row.mine),
        longitude: Number(row.longitude),
        latitude: Number(row.latitude),
      })),
    });
  } catch (error) {
    console.error('Error listing petak points by extent:', error);
    res.status(500).json({
      code: 500,
      status: 'error',
      data: 'Internal Server Error',
    });
  }
};

exports.checkPetakBatch = async (req, res) => {
  const token = getBearerToken(req, res);
  if (!token) return;

  const { nik, items, jmlPetak } = req.body || {};
  if (!nik || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      code: 400,
      status: 'error',
      data: 'nik and items[] are required',
    });
  }

  try {
    await ensureLonLatColumns();
  } catch (error) {
    console.error('Error ensuring longitude/latitude columns:', error);
  }

  try {
    const countResult = await db.query(
      `SELECT COUNT(*)::int AS count FROM petak_user WHERE nik = $1`,
      [nik]
    );
    const nikCount = countResult.rows[0]?.count || 0;
    const quota = Number(jmlPetak);
    const quotaExceeded = Number.isFinite(quota) && quota > 0 && (nikCount + items.length) > quota;

    const ids = items.map((item) => String(item.idpetak || '')).filter(Boolean);
    const existingIds = ids.length
      ? (await db.query(
          `SELECT idpetak, nik FROM petak_user WHERE idpetak = ANY($1)`,
          [ids]
        )).rows
      : [];

    const coords = items
      .map((item) => extractLonLat(item))
      .filter((item) => Number.isFinite(item.longitude) && Number.isFinite(item.latitude));

    const existingCoords = coords.length
      ? (await db.query(
          `
          SELECT p.idpetak, p.nik, p.longitude, p.latitude
          FROM petak_user p
          JOIN unnest($1::float8[], $2::float8[]) AS i(lon, lat)
            ON ROUND(p.longitude::numeric, 5) = ROUND(i.lon::numeric, 5)
           AND ROUND(p.latitude::numeric, 5) = ROUND(i.lat::numeric, 5)
          WHERE p.longitude IS NOT NULL AND p.latitude IS NOT NULL
          `,
          [coords.map((item) => item.longitude), coords.map((item) => item.latitude)]
        )).rows
      : [];

    res.json({
      code: 200,
      status: 'success',
      data: {
        nikCount,
        quotaExceeded,
        existingIds,
        existingCoords,
        hasConflict: quotaExceeded || existingIds.length > 0 || existingCoords.length > 0,
      },
    });
  } catch (error) {
    console.error('Error checking petak batch:', error);
    res.status(500).json({
      code: 500,
      status: 'error',
      data: 'Internal Server Error',
    });
  }
};

/**
 * Proxy generate-petak to petakgen service (avoids FortiWeb blocking POST on geoportal).
 * Upstream: PETAKGEN_URL or http://100.67.151.63:5000/api/v1/process_points
 */
exports.processPoints = async (req, res) => {
  const token = getBearerToken(req, res);
  if (!token) return;

  try {
    const data = await callPetakGen(req.body);
    return res.status(200).send(data);
  } catch (error) {
    const status = error.response?.status;
    if (status) {
      return res.status(status).send(error.response.data);
    }
    console.error('Error proxying process-points:', error.message);
    return res.status(502).json({
      code: 502,
      status: 'error',
      data: 'Gagal menghubungi layanan generate petak',
    });
  }
};

const mapMonitorRow = (row) => ({
  id: row.id,
  nik: row.nik,
  idpetak: row.idpetak,
  luas: row.luas == null ? 0 : parseFloat(row.luas),
  status: row.status,
  longitude: row.longitude == null ? null : Number(row.longitude),
  latitude: row.latitude == null ? null : Number(row.latitude),
  musim_tanam: row.musim_tanam,
  tgl_tanam: row.tgl_tanam,
  tgl_panen: row.tgl_panen,
  created_at: row.created_at,
  parent_id: row.parent_id || null,
  geometry: row.geometry,
});

exports.listPetakMonitor = async (req, res) => {
  const token = getBearerToken(req, res);
  if (!token) return;

  const search = String(req.query.search || '').trim();
  const statusFilter = String(req.query.status || 'all').toLowerCase();
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const offset = (page - 1) * limit;

  try {
    await ensureLonLatColumns();
  } catch (error) {
    console.error('Error ensuring petak_user schema:', error);
  }

  try {
    const summaryResult = await db.query(
      `
      SELECT
        COUNT(DISTINCT nik)::int AS total_nik,
        COUNT(*)::int AS total_row,
        COUNT(*) FILTER (WHERE ${statusSql} = 'titik')::int AS titik,
        COUNT(*) FILTER (WHERE ${statusSql} = 'petak')::int AS petak
      FROM petak_user
      `
    );

    const params = [search, statusFilter, limit, offset];
    const countResult = await db.query(
      `
      SELECT COUNT(*)::int AS total
      FROM (
        SELECT nik
        FROM petak_user
        WHERE ($1 = '' OR nik ILIKE '%' || $1 || '%')
        GROUP BY nik
        HAVING (
          $2 = 'all'
          OR ($2 = 'titik' AND COUNT(*) FILTER (WHERE ${statusSql} = 'titik') > 0)
          OR ($2 = 'petak' AND COUNT(*) FILTER (WHERE ${statusSql} = 'petak') > 0)
        )
      ) t
      `,
      [search, statusFilter]
    );

    const listResult = await db.query(
      `
      SELECT
        nik,
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE ${statusSql} = 'titik')::int AS titik,
        COUNT(*) FILTER (WHERE ${statusSql} = 'petak')::int AS petak,
        COUNT(*) FILTER (
          WHERE ${rowLonLatSql} IS NOT NULL AND ${rowLatSql} IS NOT NULL
        )::int AS titik_coord,
        COALESCE(SUM(luas), 0)::float AS total_luas,
        MAX(created_at) AS last_created
      FROM petak_user
      WHERE ($1 = '' OR nik ILIKE '%' || $1 || '%')
      GROUP BY nik
      HAVING (
        $2 = 'all'
        OR ($2 = 'titik' AND COUNT(*) FILTER (WHERE ${statusSql} = 'titik') > 0)
        OR ($2 = 'petak' AND COUNT(*) FILTER (WHERE ${statusSql} = 'petak') > 0)
      )
      ORDER BY last_created DESC NULLS LAST, nik
      LIMIT $3 OFFSET $4
      `,
      params
    );

    res.json({
      code: 200,
      status: 'success',
      data: {
        summary: summaryResult.rows[0] || { total_nik: 0, total_row: 0, titik: 0, petak: 0 },
        items: listResult.rows,
        page,
        limit,
        total: countResult.rows[0]?.total || 0,
      },
    });
  } catch (error) {
    console.error('Error listing petak monitor:', error);
    res.status(500).json({
      code: 500,
      status: 'error',
      data: 'Internal Server Error',
    });
  }
};

exports.getPetakMonitorByNik = async (req, res) => {
  const token = getBearerToken(req, res);
  if (!token) return;

  const nik = req.params.nik;
  if (!nik) {
    return res.status(400).json({ code: 400, status: 'error', data: 'nik is required' });
  }

  try {
    await ensureLonLatColumns();
  } catch (error) {
    console.error('Error ensuring petak_user schema:', error);
  }

  try {
    const result = await db.query(
      `
      SELECT
        id,
        nik,
        idpetak,
        luas,
        ${statusSql} AS status,
        ${rowLonLatSql} AS longitude,
        ${rowLatSql} AS latitude,
        musim_tanam,
        tgl_tanam,
        tgl_panen,
        created_at,
        parent_id,
        ST_AsGeoJSON(${geom4326Sql})::json AS geometry
      FROM petak_user
      WHERE nik = $1
      ORDER BY idpetak, id
      `,
      [nik]
    );

    const items = result.rows.map(mapMonitorRow);
    const features = items.map((row) => ({
      type: 'Feature',
      id: row.id,
      properties: {
        id: row.id,
        nik: row.nik,
        idpetak: row.idpetak,
        luas: row.luas,
        status: row.status,
        parent_id: row.parent_id || null,
        longitude: row.longitude,
        latitude: row.latitude,
      },
      geometry: row.geometry,
    }));

    res.json({
      code: 200,
      status: 'success',
      data: {
        nik,
        total: items.length,
        titik: items.filter((item) => item.status === 'titik').length,
        petak: items.filter((item) => item.status === 'petak').length,
        total_luas: items.reduce((sum, item) => sum + (item.luas || 0), 0),
        items,
        geojson: {
          type: 'FeatureCollection',
          features,
        },
      },
    });
  } catch (error) {
    console.error('Error getting petak monitor by NIK:', error);
    res.status(500).json({
      code: 500,
      status: 'error',
      data: 'Internal Server Error',
    });
  }
};

exports.generatePetakMonitor = async (req, res) => {
  const token = getBearerToken(req, res);
  if (!token) return;

  const { nik, ids, zoom } = req.body || {};
  if (!nik) {
    return res.status(400).json({ code: 400, status: 'error', data: 'nik is required' });
  }

  try {
    await ensureLonLatColumns();
  } catch (error) {
    console.error('Error ensuring petak_user schema:', error);
  }

  try {
    const idList = Array.isArray(ids) ? ids.filter(Boolean) : [];
    const result = await db.query(
      `
      SELECT
        id,
        nik,
        idpetak,
        ${rowLonLatSql} AS longitude,
        ${rowLatSql} AS latitude,
        ${statusSql} AS status
      FROM petak_user
      WHERE nik = $1
        AND (cardinality($2::text[]) = 0 OR id::text = ANY($2::text[]))
      ORDER BY idpetak, id
      `,
      [nik, idList]
    );

    const rows = result.rows.filter(
      (row) => Number.isFinite(Number(row.longitude)) && Number.isFinite(Number(row.latitude))
    );
    if (!rows.length) {
      return res.status(400).json({
        code: 400,
        status: 'error',
        data: 'Tidak ada titik yang bisa digenerate untuk NIK ini.',
      });
    }

    const payload = {
      zoom: Number.isFinite(Number(zoom)) ? Number(zoom) : 19,
      geojson: {
        type: 'FeatureCollection',
        features: rows.map((row, index) => ({
          type: 'Feature',
          id: index + 1,
          properties: { id: index + 1, uuid: row.id },
          geometry: {
            type: 'Point',
            coordinates: [Number(row.longitude), Number(row.latitude)],
          },
        })),
      },
    };

    const collection = await callPetakGen(payload);
    const features = Array.isArray(collection?.features)
      ? collection.features
      : collection?.type === 'Feature'
        ? [collection]
        : [];
    const polygonFeatures = features.filter(
      (feature) =>
        feature?.geometry &&
        (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon')
    );

    if (!polygonFeatures.length) {
      return res.status(502).json({
        code: 502,
        status: 'error',
        data: 'Layanan generate tidak mengembalikan polygon.',
      });
    }

    const byIndex = new Map();
    polygonFeatures.forEach((feature) => {
      const rawId = feature.id ?? feature.properties?.id;
      const idx = Number(rawId);
      if (Number.isFinite(idx) && idx >= 1) {
        byIndex.set(idx, feature.geometry);
      }
    });

    const updated = [];
    const failed = [];
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      const geometry = byIndex.get(i + 1) || (polygonFeatures[i] && polygonFeatures[i].geometry);
      if (!geometry) {
        failed.push(row.id);
        continue;
      }
      const geometryPayload = JSON.stringify(geometry);
      const updateResult = await db.query(
        `
        UPDATE petak_user
        SET
          geometry = ST_SetSRID(ST_Force3D(ST_GeomFromGeoJSON($2)), 4326),
          luas = ST_Area(ST_Force2D(ST_SetSRID(ST_GeomFromGeoJSON($2), 4326))::geography) / 10000.0,
          status = 'petak',
          longitude = COALESCE(longitude, $3),
          latitude = COALESCE(latitude, $4)
        WHERE id = $1
        RETURNING
          id, nik, idpetak, luas, status, longitude, latitude,
          musim_tanam, tgl_tanam, tgl_panen, created_at,
          ST_AsGeoJSON(${geom4326Sql})::json AS geometry
        `,
        [row.id, geometryPayload, Number(row.longitude), Number(row.latitude)]
      );
      if (updateResult.rows[0]) {
        updated.push(mapMonitorRow(updateResult.rows[0]));
      }
    }

    res.json({
      code: 200,
      status: 'success',
      data: {
        generated: updated.length,
        failed,
        items: updated,
      },
    });
  } catch (error) {
    console.error('Error generating petak monitor:', error.message);
    res.status(502).json({
      code: 502,
      status: 'error',
      data: error.response?.data?.data || error.message || 'Gagal generate petak',
    });
  }
};

exports.generateTitikFromCentroid = async (req, res) => {
  const token = getBearerToken(req, res);
  if (!token) return;

  const { nik, ids } = req.body || {};
  const idList = Array.isArray(ids) ? ids.filter(Boolean) : [];
  if (!idList.length && !nik) {
    return res.status(400).json({ code: 400, status: 'error', data: 'ids or nik is required' });
  }

  try {
    await ensureLonLatColumns();
  } catch (error) {
    console.error('Error ensuring petak_user schema:', error);
  }

  try {
    await db.query(
      `
      DELETE FROM petak_user t
      USING petak_user p
      WHERE t.parent_id = p.id::text
        AND ($1::text IS NULL OR p.nik = $1)
        AND (cardinality($2::text[]) = 0 OR p.id::text = ANY($2::text[]))
        AND GeometryType(p.geometry) ILIKE '%POLYGON%'
      `,
      [nik || null, idList]
    );

    const result = await db.query(
      `
      UPDATE petak_user p
      SET
        longitude = ST_X(s.centroid),
        latitude = ST_Y(s.centroid)
      FROM (
        SELECT
          id,
          ST_Centroid(${geom4326Sql}) AS centroid
        FROM petak_user
        WHERE ($1::text IS NULL OR nik = $1)
          AND (cardinality($2::text[]) = 0 OR id::text = ANY($2::text[]))
          AND GeometryType(geometry) ILIKE '%POLYGON%'
      ) s
      WHERE p.id = s.id
      RETURNING
        p.id, p.nik, p.idpetak, p.luas, p.status, p.longitude, p.latitude, p.parent_id,
        p.musim_tanam, p.tgl_tanam, p.tgl_panen, p.created_at,
        ST_AsGeoJSON(
          CASE
            WHEN ST_SRID(p.geometry) IN (0, 4326) THEN ST_SetSRID(p.geometry, 4326)
            ELSE ST_Transform(p.geometry, 4326)
          END
        )::json AS geometry
      `,
      [nik || null, idList]
    );

    res.json({
      code: 200,
      status: 'success',
      data: {
        generated: result.rows.length,
        items: result.rows.map(mapMonitorRow),
      },
    });
  } catch (error) {
    console.error('Error generating titik from centroid:', error);
    res.status(500).json({
      code: 500,
      status: 'error',
      data: 'Gagal membuat titik dari centroid polygon.',
    });
  }
};

exports.revertPetakMonitor = async (req, res) => {
  const token = getBearerToken(req, res);
  if (!token) return;

  const { nik, ids } = req.body || {};
  const idList = Array.isArray(ids) ? ids.filter(Boolean) : [];
  if (!idList.length && !nik) {
    return res.status(400).json({ code: 400, status: 'error', data: 'ids or nik is required' });
  }

  try {
    await ensureLonLatColumns();
  } catch (error) {
    console.error('Error ensuring petak_user schema:', error);
  }

  try {
    const result = await db.query(
      `
      UPDATE petak_user
      SET
        geometry = ST_SetSRID(ST_Force3D(ST_MakePoint(${rowLonLatSql}, ${rowLatSql}, 0)), 4326),
        luas = 0,
        status = 'titik',
        longitude = ${rowLonLatSql},
        latitude = ${rowLatSql}
      WHERE ($1::text IS NULL OR nik = $1)
        AND (cardinality($2::text[]) = 0 OR id::text = ANY($2::text[]))
      RETURNING
        id, nik, idpetak, luas, status, longitude, latitude,
        musim_tanam, tgl_tanam, tgl_panen, created_at,
        ST_AsGeoJSON(${geom4326Sql})::json AS geometry
      `,
      [nik || null, idList]
    );

    res.json({
      code: 200,
      status: 'success',
      data: {
        reverted: result.rows.length,
        items: result.rows.map(mapMonitorRow),
      },
    });
  } catch (error) {
    console.error('Error reverting petak monitor:', error);
    res.status(500).json({
      code: 500,
      status: 'error',
      data: 'Internal Server Error',
    });
  }
};

exports.updatePetakGeometries = async (req, res) => {
  const token = getBearerToken(req, res);
  if (!token) return;

  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  if (!items.length) {
    return res.status(400).json({ code: 400, status: 'error', data: 'items[] is required' });
  }

  try {
    await ensureLonLatColumns();
  } catch (error) {
    console.error('Error ensuring petak_user schema:', error);
  }

  try {
    const updated = [];
    for (const item of items) {
      if (!item?.id || !item?.geometry) {
        return res.status(400).json({ code: 400, status: 'error', data: 'Each item needs id and geometry' });
      }
      const status = item.status === 'titik' || item.status === 'petak'
        ? item.status
        : statusFromGeometry(item.geometry);
      const result = await db.query(
        `
        UPDATE petak_user
        SET
          geometry = ST_SetSRID(ST_Force3D(ST_GeomFromGeoJSON($2)), 4326),
          luas = CASE
            WHEN $3 = 'titik' THEN 0
            ELSE ST_Area(ST_Force2D(ST_SetSRID(ST_GeomFromGeoJSON($2), 4326))::geography) / 10000.0
          END,
          status = $3
        WHERE id = $1
        RETURNING
          id, nik, idpetak, luas, status, longitude, latitude,
          musim_tanam, tgl_tanam, tgl_panen, created_at,
          ST_AsGeoJSON(${geom4326Sql})::json AS geometry
        `,
        [item.id, JSON.stringify(item.geometry), status]
      );
      if (result.rows[0]) {
        updated.push(mapMonitorRow(result.rows[0]));
      }
    }

    res.json({
      code: 200,
      status: 'success',
      data: {
        updated: updated.length,
        items: updated,
      },
    });
  } catch (error) {
    console.error('Error updating petak geometries:', error);
    res.status(500).json({
      code: 500,
      status: 'error',
      data: 'Internal Server Error',
    });
  }
};

