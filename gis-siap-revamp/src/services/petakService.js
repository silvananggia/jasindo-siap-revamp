import axios from "../api/axios";

// Token is automatically added by axios interceptor from Redux store
// Token parameter is kept for backward compatibility but is optional
const getPetakAll = (token = null) => {
  const config = {};
  
  if (token) {
    config.headers = {
      Authorization: `Bearer ${token}`
    };
  }
  
  return axios.get(`/petak`, config);
};


const getPetakUser = (id, token = null) => {
  const config = {};
  
  if (token) {
    config.headers = {
      Authorization: `Bearer ${token}`
    };
  }
  
  return axios.get(`/petak-user/${id}`, config);
};

const getCenterPetakUser = (id, token = null) => {
  const config = {};
  
  if (token) {
    config.headers = {
      Authorization: `Bearer ${token}`
    };
  }
  
  return axios.get(`/center-petak-user/${id}`, config);
};

const getPetakById = (id, token = null) => {
  const config = {};
  
  if (token) {
    config.headers = {
      Authorization: `Bearer ${token}`
    };
  }
  
  return axios.get(`/petak-by-id/${id}`, config);
};

const getPetakByIdPetak = (idpetak, token = null) => {
  const config = {};
  
  if (token) {
    config.headers = {
      Authorization: `Bearer ${token}`
    };
  }
  
  return axios.get(`/petak-by-idpetak/${idpetak}`, config);
};

const getPetakID = (id, token = null) => {
  const config = {};
  
  if (token) {
    config.headers = {
      Authorization: `Bearer ${token}`
    };
  }
  
  return axios.get(`/petakid/${id}`, config);
};

const getPetakKlaimID = (id, token = null) => {
  const config = {};
  
  if (token) {
    config.headers = {
      Authorization: `Bearer ${token}`
    };
  }
  
  return axios.get(`/petak-klaim-id/${id}`, config);
};

const createPetak = (data, token = null) => {
  const config = {};
  
  if (token) {
    config.headers = {
      Authorization: `Bearer ${token}`
    };
  }
  
  return axios.post("/save-petak", data, config);
};

const updatePetak = (id, data, token = null) => {
  const config = {
    headers: {
      "Content-Type": "multipart/form-data",
    }
  };
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  return axios.post(`/petak/${id}`, data, config);
};

const deletePetak = (id, token = null) => {
  const config = {};
  
  if (token) {
    config.headers = {
      Authorization: `Bearer ${token}`
    };
  }
  
  return axios.delete(`/petak/${id}`, config);
};

const checkPercilAvailability = (idpetak, musim_tanam, tgl_tanam, token = null) => {
  const config = {
    params: {
      idpetak,
      musim_tanam,
      tgl_tanam
    }
  };
  
  if (token) {
    config.headers = {
      Authorization: `Bearer ${token}`
    };
  }
  
  return axios.get(`/check-percil-availability`, config);
};

const PetakService = {
    getPetakAll,
    getPetakUser,
    getCenterPetakUser,
    getPetakById,
    getPetakByIdPetak,
    getPetakID,
    getPetakKlaimID,
    createPetak,
    updatePetak,
    deletePetak,
    checkPercilAvailability
};

export default PetakService;
