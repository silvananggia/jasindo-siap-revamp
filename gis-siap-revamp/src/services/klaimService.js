import axios from "../api/axios";
import authHeader from "./auth-header";

const getAllKlaim = () => {
  return axios.get(`/klaim`);
};


const getKlaimUser = (id, nopolis) => {
  console.log("klaimService - getKlaimUser called with id:", id, "nopolis:", nopolis);
  const encodedNopolis = encodeURIComponent(nopolis);
  console.log("klaimService - encoded nopolis:", encodedNopolis);
  const url = `/petak-user-klaim/${id}/${encodedNopolis}`;
  console.log("klaimService - API URL:", url);
  return axios.get(url);
};

const getKlaimID = (id) => {
    return axios.get(`/klaimid/${id}`);
  };

const createKlaim = (data) => {
  return axios.post("/save-petak-klaim", data);
};

const updateKlaim = (id, data) => {
  const headers = {
    ...authHeader(),
    "Content-Type": "multipart/form-data",
  };
  return axios.post(`/klaim/${id}`, data, { headers: headers });
};

const deleteKlaim = (id) => {
  console.log('klaimService.deleteKlaim called with id:', id);
  const url = `/petak-klaim/${id}`;
  console.log('klaimService.deleteKlaim URL:', url);
  return axios.delete(url, { headers: authHeader() });
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
