import axios from "../api/axios";

const getAnggota = (idkelompok) => {
  return axios.get(`/get-anggota/${idkelompok}`);
};

const getAnggotaDisetujui = (idkelompok) => {
  return axios.get(`/get-anggota-disetujui/${idkelompok}`);
};

const getAnggotaKlaim = (idkelompok,idklaim) => {
  return axios.get(`/get-anggota-klaim/${idkelompok}/${idklaim}`);
};


const anggotaService = {
  getAnggota,
  getAnggotaKlaim,
  getAnggotaDisetujui
};

export default anggotaService;
