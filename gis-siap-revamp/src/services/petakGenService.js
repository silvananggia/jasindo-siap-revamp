import axios from 'axios';

const PROCESS_POINTS_URL = process.env.REACT_APP_PETAKGEN_URL;

export const processPetakPoints = (payload) => {
  if (!PROCESS_POINTS_URL) {
    return Promise.reject(
      new Error('REACT_APP_PETAKGEN_URL belum diatur di file .env')
    );
  }

  return axios.post(PROCESS_POINTS_URL, payload, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 60000,
  });
};
