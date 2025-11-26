import {
    GET_ANGGOTA,
    GET_ANGGOTA_KLAIM,
    GET_ANGGOTA_DISETUJUI,
} from "./types";

import AnggotaService from "../services/anggotaService";


// Token is automatically added by axios interceptor from Redux store
// Token parameter is kept for backward compatibility but is optional
export const getAnggota = (idkelompok, token = null) => async (dispatch) => {
    try {
        const res = await AnggotaService.getAnggota(idkelompok, token);
        //console.log("getAnggota - res:", res.data);
        dispatch({
            type: GET_ANGGOTA,
            payload: res.data,
        });
    } catch (err) {
        console.log(err);
    }
};

export const getAnggotaKlaim = (nopolis, token = null) => async (dispatch) => {
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

export const detailAnggotaKlaim = (nik, nopolis, token = null) => async (dispatch) => {
    try {
        const res = await AnggotaService.detailAnggotaKlaim(nik, nopolis, token);
        return Promise.resolve(res.data);
    } catch (err) {
        console.error('Error in detailAnggotaKlaim:', err);
        return Promise.reject(err);
    }
};

export const getAnggotaKlaimId = (claimid, token = null) => async (dispatch) => {
    try {
        const res = await AnggotaService.getAnggotaKlaimId(claimid, token);

        dispatch({
            type: GET_ANGGOTA_KLAIM,
            payload: res.data,
        });

        return Promise.resolve(res.data);
    } catch (err) {
        console.error('Error in getAnggotaKlaimId:', err);
        return Promise.reject(err);
    }
};

export const detailAnggotaKlaimId = (nik, claimid, token = null) => async () => {
    const debugContext = {
        nikProvided: !!nik,
        claimidProvided: !!claimid,
        tokenProvided: !!token,
    };
    console.log('[detailAnggotaKlaimId] Thunk invoked', debugContext);

    if (!nik || !claimid) {
        console.warn('[detailAnggotaKlaimId] Missing required params', {
            missingNik: !nik,
            missingClaimid: !claimid,
        });
    }

    try {
        const res = await AnggotaService.detailAnggotaKlaimId(nik, claimid, token);
        console.log('[detailAnggotaKlaimId] API success', {
            status: res?.status,
            hasData: !!res?.data,
            apiSuccess: res?.data?.success,
        });
        return Promise.resolve(res.data);
    } catch (err) {
        console.error('[detailAnggotaKlaimId] API error', {
            message: err?.message,
            responseStatus: err?.response?.status,
        });
        return Promise.reject(err);
    }
};

export const getDetailPeserta = (idkelompok, nik, token = null) => async (dispatch) => {
    try {
        const res = await AnggotaService.getDetailPeserta(idkelompok, nik, token);
        return Promise.resolve(res.data);
    } catch (err) {
        console.error('Error in getDetailPeserta:', err);
        return Promise.reject(err);
    }
};
