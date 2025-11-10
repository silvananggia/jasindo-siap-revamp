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
  const clientCookies = req.headers.cookie;

  if (!clientCookies) {
    return res.status(401).json({ message: "No session cookie found" });
  }

  const {
    search_text = "",
    search_field = "",
    per_page = 100,
    page = 1,
    order_by0 = "id_anggota",
    order_by1 = "ASC",
  } = req.query;


  const targetUrl = `${BASE_URL}/cpcl_autp/detail/${id}/ajax_list`;

  try {
    // Check session
    const response = await axios.get(`${BASE_URL}/auth/check_session`, {
      headers: {
        Cookie: clientCookies,
        "User-Agent": req.headers["user-agent"],
        Accept: req.headers["accept"],
        "Accept-Language": req.headers["accept-language"],
      },
    });

    if (response.data.logged_in) {
      // Kirim parameter ke target CI (POST)
      const formData = qs.stringify({
        search_text,
        search_field,
        per_page,
        "order_by[0]": order_by0,
        "order_by[1]": order_by1,
        page,
      });

      const { data: html } = await axios.post(targetUrl, formData, {
        headers: {
          Cookie: clientCookies,
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": req.headers["user-agent"],
          Accept: req.headers["accept"],
          "Accept-Language": req.headers["accept-language"],
        },
      });

      const $ = cheerio.load(html);
      const headers = [];
      const data = [];

      // Extract table headers
      $("#flex1 thead th").each((_, el) => {
        headers.push($(el).text().trim());
      });

      // Extract table rows
      $("#flex1 tbody tr").each((_, tr) => {
        const row = {};
        $(tr)
          .find("td")
          .each((i, td) => {
            const text = $(td).text().trim();
            const header = headers[i] || `column_${i}`;
            const normalizedHeader = normalizeFieldName(header);
            row[normalizedHeader] = text === "\xa0" ? "" : text;
          });
        data.push(row);
      });

      const noPolis = $("#field-no_polis").val();

      res.json({
        success: true,
        idkelompok: id,
        noPolis,
        pagination: { page: Number(page), per_page: Number(per_page) },
        data,
      });
    } else {
      res.status(401).json({ message: "Unauthorized" });
    }
  } catch (err) {
    console.error("Fetch error:", err.response?.status, err.response?.data || err.message);
    res.status(500).json({ message: "Failed to fetch or parse HTML", error: err.message });
  }
};


exports.getAnggotaDisetujui = async (req, res) => {
  const { id } = req.params;
  const clientCookies = req.headers.cookie;

  if (!clientCookies) {
    return res.status(401).json({ message: "No session cookie found" });
  }

  const {
    search_text = "",
    search_field = "",
    per_page = 100,
    page = 1,
    order_by0 = "id_anggota",
    order_by1 = "ASC",
  } = req.query;


  const targetUrl = `${BASE_URL}/autp_disetujui/detil/${id}/ajax_list`;

  try {
    // Check session
    const response = await axios.get(`${BASE_URL}/auth/check_session`, {
      headers: {
        Cookie: clientCookies,
        "User-Agent": req.headers["user-agent"],
        Accept: req.headers["accept"],
        "Accept-Language": req.headers["accept-language"],
      },
    });

    if (response.data.logged_in) {
      // Kirim parameter ke target CI (POST)
      const formData = qs.stringify({
        search_text,
        search_field,
        per_page,
        "order_by[0]": order_by0,
        "order_by[1]": order_by1,
        page,
      });

      const { data: html } = await axios.post(targetUrl, formData, {
        headers: {
          Cookie: clientCookies,
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": req.headers["user-agent"],
          Accept: req.headers["accept"],
          "Accept-Language": req.headers["accept-language"],
        },
      });

      const $ = cheerio.load(html);
      const headers = [];
      const data = [];

      // Extract table headers
      $("#flex1 thead th").each((_, el) => {
        headers.push($(el).text().trim());
      });

      // Extract table rows
      $("#flex1 tbody tr").each((_, tr) => {
        const row = {};
        $(tr)
          .find("td")
          .each((i, td) => {
            const text = $(td).text().trim();
            const header = headers[i] || `column_${i}`;
            const normalizedHeader = normalizeFieldName(header);
            row[normalizedHeader] = text === "\xa0" ? "" : text;
          });
        data.push(row);
      });

      const noPolis = $("#field-no_polis").val();

      res.json({
        success: true,
        idkelompok: id,
        noPolis,
        pagination: { page: Number(page), per_page: Number(per_page) },
        data,
      });
    } else {
      res.status(401).json({ message: "Unauthorized" });
    }
  } catch (err) {
    console.error("Fetch error:", err.response?.status, err.response?.data || err.message);
    res.status(500).json({ message: "Failed to fetch or parse HTML", error: err.message });
  }
};

exports.getAnggotaKlaim = async (req, res) => {
  const { idkelompok } = req.params;
  const { idklaim } = req.params;
  const clientCookies = req.headers.cookie;

  if (!clientCookies) {
    return res.status(401).json({ message: "No session cookie found" });
  }

  const {
    search_text = "",
    search_field = "",
    per_page = 100,
    page = 1,
    order_by0 = "id_anggota",
    order_by1 = "ASC",
  } = req.query;

  const targetUrl = `${BASE_URL}/klaim/data_klaim_detail/${idkelompok}/${idklaim}/ajax_list`;

  try {
    // console.log("Forwarding cookies:", req.headers.cookie);

    const response = await axios.get(`${BASE_URL}/auth/check_session`, {
      headers: {
        Cookie: req.headers.cookie,
        'User-Agent': req.headers['user-agent'],
        'Accept': req.headers['accept'],
        'Accept-Language': req.headers['accept-language']
      }
    });

    // console.log("Response from CI:", response.data);

    if (response.data.logged_in) {
      // Kirim parameter ke target CI (POST)
      const formData = qs.stringify({
        search_text,
        search_field,
        per_page,
        "order_by[0]": order_by0,
        "order_by[1]": order_by1,
        page,
      });

      const { data: html } = await axios.post(targetUrl, formData, {
        headers: {
          Cookie: req.headers.cookie,
          "Content-Type": "application/x-www-form-urlencoded",
          'User-Agent': req.headers['user-agent'],
          'Accept': req.headers['accept'],
          'Accept-Language': req.headers['accept-language']
        }
      });

      const $ = cheerio.load(html);

      const headers = [];
      const data = [];

      // Extract table headers
      $('#flex1 thead th').each((_, el) => {
        headers.push($(el).text().trim());
      });

      // Extract table rows
      $('#flex1 tbody tr').each((_, tr) => {
        const row = {};
        $(tr).find('td').each((i, td) => {
          const text = $(td).text().trim();
          const header = headers[i] || `column_${i}`;
          const normalizedHeader = normalizeFieldName(header);
          row[normalizedHeader] = text === '\xa0' ? '' : text;
        });
        data.push(row);
      });
      const noPolis = $('#field-no_polis').val();

      res.json({
        success: true,
        idkelompok,
        idklaim,
        noPolis,
        pagination: { page: Number(page), per_page: Number(per_page) },
        data
      });
    } else {
      res.status(401).json({ message: 'Unauthorized' });
    }

  } catch (err) {
    console.error('Fetch error:', err.response?.status, err.response?.data || err.message);
    res.status(500).json({ message: 'Failed to fetch or parse HTML', error: err.message });
  }
};
