import axios from "../api/axios";

const getAnggota = (idkelompok, token) => {
  const config = {
    params: {}
  };
  
  if (token) {
    config.headers = {
      Authorization: `Bearer ${token}`
    };
  }
  
  return axios.get(`/get-anggota/${idkelompok}`, config);
};

const getAnggotaKlaim = (nopolis, token) => {
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

const detailAnggotaKlaim = (nik, nopolis, token) => {
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

const getDetailPeserta = (idkelompok, nik, token) => {
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
