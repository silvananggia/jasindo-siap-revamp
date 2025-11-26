const axios = require("axios");
const cheerio = require("cheerio");
const qs = require("qs");
const { getBearerToken, BASE_URL_V2, buildUnauthorizedResponse } = require("../utils/auth");

// Function to normalize field names from HTML table headers
const normalizeFieldName = (fieldName) => {
  if (!fieldName) return fieldName;
  
  // Common field name mappings
  const fieldMappings = {
    'N I K': 'NIK',
    'Nama': 'Nama',
    'Alamat Lahan': 'AlamatLahan',
    'Desa': 'Desa',
    'RT': 'RT',
    'RW': 'RW',
    'Kecamatan': 'Kecamatan',
    'Kabupaten/Kota': 'KabupatenKota',
    'Provinsi': 'Provinsi',
    'Luas Lahan': 'LuasLahan',
    'Jenis lahan': 'JenisLahan',
    'Jumlah Petak Alami': 'JumlahPetakAlami',
    'Status Petani': 'StatusPetani',
    'Luas lahan polygon': 'LuasLahanPolygon',
    'Pilihan': 'Pilihan'
  };
  
  // Return mapped field name or original if no mapping exists
  return fieldMappings[fieldName] || fieldName;
}; 



exports.getAnggotaKlaimById = async (req, res) => {
  const { claimid } = req.query;

  // Validate required parameter
  if (!claimid) {
    return res.status(400).json({ 
      message: "Missing required parameter: claimid is required" 
    });
  }

  const token = getBearerToken(req, res);
  if (!token) return;

  const targetUrl = `${BASE_URL_V2}/getAnggotaKlaim`;

  try {
    const response = await axios.get(targetUrl, {
      params: {
        claimid
      },
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0',
        'Accept': req.headers['accept'] || 'application/json',
        'Accept-Language': req.headers['accept-language'] || 'en-US,en;q=0.9'
      }
    });

    res.json({
      success: true,
      claimid,
      data: response.data
    });
  } catch (err) {
    console.error('Fetch error:', err.response?.status, err.response?.data || err.message);
    
    // Return appropriate error status
    const statusCode = err.response?.status || 500;
    if (statusCode === 401) {
      return res.status(401).json(buildUnauthorizedResponse("Authentication required when accessing geospatial anggota klaim data. Please refresh your session."));
    }
    const errorMessage = err.response?.data || { message: 'Failed to fetch anggota klaim', error: err.message };
    
    res.status(statusCode).json(errorMessage);
  }
};

exports.detailAnggotaKlaimById = async (req, res) => {
  const { nik, claimid } = req.query;

  // Validate required parameters
  if (!nik || !claimid) {
    return res.status(400).json({ 
      message: "Missing required parameters: nik and claimid are required" 
    });
  }

  const token = getBearerToken(req, res);
  if (!token) return;

  const targetUrl = `${BASE_URL_V2}/getPesertaKlaim`;

  try {
    const response = await axios.get(targetUrl, {
      params: {
        nik,
        claimid
      },
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0',
        'Accept': req.headers['accept'] || 'application/json',
        'Accept-Language': req.headers['accept-language'] || 'en-US,en;q=0.9'
      }
    });

    res.json({
      success: true,
      nik,
      claimid,
      data: response.data
    });
  } catch (err) {
    console.error('Fetch error:', err.response?.status, err.response?.data || err.message);
    
    // Return appropriate error status
    const statusCode = err.response?.status || 500;
    if (statusCode === 401) {
      return res.status(401).json(buildUnauthorizedResponse("Authentication required when accessing detail anggota klaim. Please refresh your session."));
    }
    const errorMessage = err.response?.data || { message: 'Failed to fetch detail anggota klaim', error: err.message };
    
    res.status(statusCode).json(errorMessage);
  }
};

