const axios = require("axios");
const cheerio = require("cheerio");
const qs = require("qs");
const { getBearerToken, GEOSPATIAL_BASE_URL, buildUnauthorizedResponse } = require("../utils/auth");

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

  // Validate required parameter
  if (!id) {
    return res.status(400).json({ 
      message: "Missing required parameter: id (idkelompok) is required" 
    });
  }

  const token = getBearerToken(req, res);
  if (!token) return;

  const targetUrl = `${GEOSPATIAL_BASE_URL}/getAnggotaKelompok`;

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
    if (statusCode === 401) {
      return res.status(401).json(buildUnauthorizedResponse("Authentication required when accessing geospatial anggota kelompok data. Please refresh your session."));
    }
    const errorMessage = err.response?.data || { message: 'Failed to fetch anggota kelompok', error: err.message };
    
    res.status(statusCode).json(errorMessage);
  }
};


exports.getAnggotaKlaim = async (req, res) => {
  const { nopolis } = req.query;

  // Validate required parameter
  if (!nopolis) {
    return res.status(400).json({ 
      message: "Missing required parameter: nopolis is required" 
    });
  }

  const token = getBearerToken(req, res);
  if (!token) return;

  const targetUrl = `${GEOSPATIAL_BASE_URL}/getAnggotaKlaim`;

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
    if (statusCode === 401) {
      return res.status(401).json(buildUnauthorizedResponse("Authentication required when accessing geospatial anggota klaim data. Please refresh your session."));
    }
    const errorMessage = err.response?.data || { message: 'Failed to fetch anggota klaim', error: err.message };
    
    res.status(statusCode).json(errorMessage);
  }
};

exports.detailAnggotaKlaim = async (req, res) => {
  const { nik, nopolis } = req.query;

  // Validate required parameters
  if (!nik || !nopolis) {
    return res.status(400).json({ 
      message: "Missing required parameters: nik and nopolis are required" 
    });
  }

  const token = getBearerToken(req, res);
  if (!token) return;

  const targetUrl = `${GEOSPATIAL_BASE_URL}/getPesertaKlaim`;

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
    if (statusCode === 401) {
      return res.status(401).json(buildUnauthorizedResponse("Authentication required when accessing detail anggota klaim. Please refresh your session."));
    }
    const errorMessage = err.response?.data || { message: 'Failed to fetch detail anggota klaim', error: err.message };
    
    res.status(statusCode).json(errorMessage);
  }
};

exports.getDetailPeserta = async (req, res) => {
  const { idkelompok, nik } = req.query;

  // Validate required parameters
  if (!idkelompok || !nik) {
    return res.status(400).json({ 
      message: "Missing required parameters: idkelompok and nik are required" 
    });
  }

  const token = getBearerToken(req, res);
  if (!token) return;

  const targetUrl = `${GEOSPATIAL_BASE_URL}/getDetailPeserta`;

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
    if (statusCode === 401) {
      return res.status(401).json(buildUnauthorizedResponse("Authentication required when accessing detail peserta. Please refresh your session."));
    }
    const errorMessage = err.response?.data || { message: 'Failed to fetch detail peserta', error: err.message };
    
    res.status(statusCode).json(errorMessage);
  }
};
