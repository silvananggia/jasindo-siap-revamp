import axios from "../api/axios";

const checkAuth = (token) => {
  const config = {
    withCredentials: true,
  };
  
  if (token) {
    const normalizedToken = token.replace(/^Bearer\s+/i, "").trim();
    config.headers = {
      Authorization: `Bearer ${normalizedToken}`
    };
  }
  
  return axios.get(`/checkAuth`, config);
};


const authService = {
  checkAuth
};

export default authService;
