import axios from "../api/axios";

// Token is automatically added by axios interceptor from Redux store
// Token parameter is kept for backward compatibility but is optional
const getAllKlaim = (token = null) => {
  const config = {};
  
  if (token) {
    config.headers = {
      Authorization: `Bearer ${token}`
    };
  }
  
  return axios.get(`/klaim`, config);
};


const getKlaimUser = (id, nopolis, token = null) => {
 // console.log("klaimService - getKlaimUser called with id:", id, "nopolis:", nopolis);
  const encodedNopolis = encodeURIComponent(nopolis);
 // console.log("klaimService - encoded nopolis:", encodedNopolis);
  const url = `/petak-user-klaim/${id}/${encodedNopolis}`;
 // console.log("klaimService - API URL:", url);
  
  const config = {};
  
  if (token) {
    config.headers = {
      Authorization: `Bearer ${token}`
    };
  }
  
  return axios.get(url, config);
};

const getKlaimID = (id, token = null) => {
  const config = {};
  
  if (token) {
    config.headers = {
      Authorization: `Bearer ${token}`
    };
  }
  
  return axios.get(`/klaimid/${id}`, config);
};

const createKlaim = (data, token = null) => {
  const config = {};
  
  if (token) {
    config.headers = {
      Authorization: `Bearer ${token}`
    };
  }
  
  return axios.post("/save-petak-klaim", data, config);
};

const updateKlaim = (id, data, token = null) => {
  const config = {
    headers: {
      "Content-Type": "multipart/form-data",
    }
  };
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  return axios.post(`/klaim/${id}`, data, config);
};

const deleteKlaim = (id, token = null) => {
 // console.log('klaimService.deleteKlaim called with id:', id);
  const url = `/petak-klaim/${id}`;
 // console.log('klaimService.deleteKlaim URL:', url);
  
  const config = {};
  
  if (token) {
    config.headers = {
      Authorization: `Bearer ${token}`
    };
  }
  
  return axios.delete(url, config);
};

const KlaimService = {
    getAllKlaim,
    getKlaimUser,
    getKlaimID,
    createKlaim,
    updateKlaim,
    deleteKlaim
};

export default KlaimService;
