import {
    GET_ANGGOTA,
    GET_ANGGOTA_KLAIM,
    GET_ANGGOTA_DISETUJUI,
} from "./types";

import AnggotaService from "../services/anggotaService";


export const getAnggota = (idkelompok, token) => async (dispatch) => {
    try {
        const res = await AnggotaService.getAnggota(idkelompok, token);
        console.log("getAnggota - res:", res.data);
        dispatch({
            type: GET_ANGGOTA,
            payload: res.data,
        });
    } catch (err) {
        console.log(err);
    }
};

export const getAnggotaKlaim = (nopolis, token) => async (dispatch) => {
    try {
        const res = await AnggotaService.getAnggotaKlaim(nopolis, token);
        
        dispatch({
            type: GET_ANGGOTA_KLAIM,
            payload: res.data,
        });
        
    } catch (err) {
        console.error('Error in getAnggotaKlaim:', err);
    }
};

export const detailAnggotaKlaim = (nik, nopolis, token) => async (dispatch) => {
    try {
        const res = await AnggotaService.detailAnggotaKlaim(nik, nopolis, token);
        return Promise.resolve(res.data);
    } catch (err) {
        console.error('Error in detailAnggotaKlaim:', err);
        return Promise.reject(err);
    }
};

export const getDetailPeserta = (idkelompok, nik, token) => async (dispatch) => {
    try {
        const res = await AnggotaService.getDetailPeserta(idkelompok, nik, token);
        return Promise.resolve(res.data);
    } catch (err) {
        console.error('Error in getDetailPeserta:', err);
        return Promise.reject(err);
    }
};
