import axios from "../api/axios";

// Token is automatically added by axios interceptor from Redux store
// Token parameter is kept for backward compatibility but is optional
const getAnggota = (idkelompok, token = null) => {
  const config = {
    params: {}
  };
  
  // Only override if token is explicitly provided
  if (token) {
    config.headers = {
      Authorization: `Bearer ${token}`
    };
  }
  
  return axios.get(`/get-anggota/${idkelompok}`, config);
};

const getAnggotaKlaim = (nopolis, token = null) => {
  const config = {
    params: {
      nopolis
    }
  };
  
  if (token) {
    config.headers = {
      Authorization: `Bearer ${token}`
    };
  }
  
  return axios.get(`/get-anggota-klaim`, config);
};

const detailAnggotaKlaim = (nik, nopolis, token = null) => {
  const config = {
    params: {
      nik,
      nopolis
    }
  };
  
  if (token) {
    config.headers = {
      Authorization: `Bearer ${token}`
    };
  }
  
  return axios.get(`/detail-anggota-klaim`, config);
};

const getDetailPeserta = (idkelompok, nik, token = null) => {
  const config = {
    params: {
      idkelompok,
      nik
    }
  };
  
  if (token) {
    config.headers = {
      Authorization: `Bearer ${token}`
    };
  }
  
  return axios.get(`/get-detail-peserta`, config);
};

const anggotaService = {
  getAnggota,
  getAnggotaKlaim,
  detailAnggotaKlaim,
  getDetailPeserta
};

export default anggotaService;
