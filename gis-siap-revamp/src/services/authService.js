import axios from "../api/axios";

const checkAuth = (cred) => {
  return axios.post(`/checkAuth`, {
    cred: cred || '',
  }, {
    withCredentials: true,
  });
};


const authService = {
  checkAuth
};

export default authService;
