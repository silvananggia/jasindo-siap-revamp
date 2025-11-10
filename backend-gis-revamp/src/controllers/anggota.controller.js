const axios = require("axios");
const cheerio = require("cheerio");
const qs = require("qs");

// Get base URL from environment variable or use default
const BASE_URL = process.env.BASE_URL || "http://localhost/newautp-siap-komersial";

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

exports.getAnggota = async (req, res) => {
  const { id } = req.params;
  const authHeader = req.headers.authorization;

  // Validate required parameter
  if (!id) {
    return res.status(400).json({ 
      message: "Missing required parameter: id (idkelompok) is required" 
    });
  }

  // Validate authorization header
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: "Authorization Bearer token is required" });
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  const targetUrl = `http://service-dev-jasindo-revampsiap-be.apps.okd.asuransijasindo.co.id/siap-geospatial-service/api/v1/geospatial/getAnggotaKelompok`;

  try {
    const response = await axios.get(targetUrl, {
      params: {
        idkelompok: id
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
      idkelompok: id,
      data: response.data
    });
  } catch (err) {
    console.error('Fetch error:', err.response?.status, err.response?.data || err.message);
    
    // Return appropriate error status
    const statusCode = err.response?.status || 500;
    const errorMessage = err.response?.data || { message: 'Failed to fetch anggota kelompok', error: err.message };
    
    res.status(statusCode).json(errorMessage);
  }
};


exports.getAnggotaKlaim = async (req, res) => {
  const { nopolis } = req.query;
  const authHeader = req.headers.authorization;

  // Validate required parameter
  if (!nopolis) {
    return res.status(400).json({ 
      message: "Missing required parameter: nopolis is required" 
    });
  }

  // Validate authorization header
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: "Authorization Bearer token is required" });
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  const targetUrl = `http://service-dev-jasindo-revampsiap-be.apps.okd.asuransijasindo.co.id/siap-geospatial-service/api/v1/geospatial/getAnggotaKlaim`;

  try {
    const response = await axios.get(targetUrl, {
      params: {
        nopolis
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
      nopolis,
      data: response.data
    });
  } catch (err) {
    console.error('Fetch error:', err.response?.status, err.response?.data || err.message);
    
    // Return appropriate error status
    const statusCode = err.response?.status || 500;
    const errorMessage = err.response?.data || { message: 'Failed to fetch anggota klaim', error: err.message };
    
    res.status(statusCode).json(errorMessage);
  }
};

exports.detailAnggotaKlaim = async (req, res) => {
  const { nik, nopolis } = req.query;
  const authHeader = req.headers.authorization;

  // Validate required parameters
  if (!nik || !nopolis) {
    return res.status(400).json({ 
      message: "Missing required parameters: nik and nopolis are required" 
    });
  }

  // Validate authorization header
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: "Authorization Bearer token is required" });
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  const targetUrl = `http://service-dev-jasindo-revampsiap-be.apps.okd.asuransijasindo.co.id/siap-geospatial-service/api/v1/geospatial/getPesertaKlaim`;

  try {
    const response = await axios.get(targetUrl, {
      params: {
        nik,
        nopolis
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
      nopolis,
      data: response.data
    });
  } catch (err) {
    console.error('Fetch error:', err.response?.status, err.response?.data || err.message);
    
    // Return appropriate error status
    const statusCode = err.response?.status || 500;
    const errorMessage = err.response?.data || { message: 'Failed to fetch detail anggota klaim', error: err.message };
    
    res.status(statusCode).json(errorMessage);
  }
};

exports.getDetailPeserta = async (req, res) => {
  const { idkelompok, nik } = req.query;
  const authHeader = req.headers.authorization;

  // Validate required parameters
  if (!idkelompok || !nik) {
    return res.status(400).json({ 
      message: "Missing required parameters: idkelompok and nik are required" 
    });
  }

  // Validate authorization header
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: "Authorization Bearer token is required" });
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  const targetUrl = `http://service-dev-jasindo-revampsiap-be.apps.okd.asuransijasindo.co.id/siap-geospatial-service/api/v1/geospatial/getDetailPeserta`;

  try {
    const response = await axios.get(targetUrl, {
      params: {
        idkelompok,
        nik
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
      data: response.data
    });
  } catch (err) {
    console.error('Fetch error:', err.response?.status, err.response?.data || err.message);
    
    // Return appropriate error status
    const statusCode = err.response?.status || 500;
    const errorMessage = err.response?.data || { message: 'Failed to fetch detail peserta', error: err.message };
    
    res.status(statusCode).json(errorMessage);
  }
};
