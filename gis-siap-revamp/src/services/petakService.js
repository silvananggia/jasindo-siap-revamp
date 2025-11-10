import axios from "../api/axios";
import authHeader from "./auth-header";

const getPetakAll = () => {
  return axios.get(`/petak`);
};


const getPetakUser = (id) => {
  return axios.get(`/petak-user/${id}`);
};

const getCenterPetakUser = (id) => {
  return axios.get(`/center-petak-user/${id}`);
};

const getPetakById = (id) => {
  return axios.get(`/petak-by-id/${id}`);
};

const getPetakByIdPetak = (idpetak) => {
  return axios.get(`/petak-by-idpetak/${idpetak}`);
};

const getPetakID = (id) => {
    return axios.get(`/petakid/${id}`);
  };

const getPetakKlaimID = (id) => {
    return axios.get(`/petak-klaim-id/${id}`);
  };

const createPetak = (data) => {
  return axios.post("/save-petak", data);
};

const updatePetak = (id, data) => {
  const headers = {
    ...authHeader(),
    "Content-Type": "multipart/form-data",
  };
  return axios.post(`/petak/${id}`, data, { headers: headers });
};

const deletePetak = (id) => {
  return axios.delete(`/petak/${id}`, { headers: authHeader() });
};

const checkPercilAvailability = (idpetak, musim_tanam, tgl_tanam) => {
  return axios.get(`/check-percil-availability?idpetak=${idpetak}&musim_tanam=${musim_tanam}&tgl_tanam=${tgl_tanam}`);
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
