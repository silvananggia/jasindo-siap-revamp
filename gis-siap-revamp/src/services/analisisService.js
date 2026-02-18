import axios from "../api/axios";

// Token is automatically added by axios interceptor from Redux store
// Token parameter is kept for backward compatibility but is optional
const getTanamPetak = (id, token = null) => {
  const config = {};
  
  if (token) {
    config.headers = {
      Authorization: `Bearer ${token}`
    };
  }
  
  return axios.get(`/tanam-petak/${id}`, config);
};

const getNDPIAnalisis = (id, token = null) => {
  const config = {};
  
  if (token) {
    config.headers = {
      Authorization: `Bearer ${token}`
    };
  }
  
  return axios.get(`/ndpi-petak/${id}`, config);
};

const getWaterAnalisis = (id, token = null) => {
  const config = {};
  
  if (token) {
    config.headers = {
      Authorization: `Bearer ${token}`
    };
  }
  
  return axios.get(`/water-petak/${id}`, config);
};

const getBareAnalisis = (id, token = null) => {
  const config = {};
  
  if (token) {
    config.headers = {
      Authorization: `Bearer ${token}`
    };
  }
  
  return axios.get(`/bare-petak/${id}`, config);
};

const AnalisisService = {
    getTanamPetak,
    getNDPIAnalisis,
    getWaterAnalisis,
    getBareAnalisis
};

export default AnalisisService;
