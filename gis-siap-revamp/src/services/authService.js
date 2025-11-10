import axios from "../api/axios";

const checkAuth = (token) => {
  const config = {
    withCredentials: true,
  };
  
  if (token) {
    config.headers = {
      Authorization: `Bearer ${token}`
    };
  }
  
  return axios.get(`/checkAuth`, config);
};


const authService = {
  checkAuth
};

export default authService;
