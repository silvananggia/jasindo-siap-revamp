import {
    GET_TANAM_PETAK,
    GET_NDPI_ANALISIS,
    GET_WATER_ANALISIS,
    GET_BARE_ANALISIS,
} from "./types";

import AnalisisService from "../services/analisisService";

export const getTanamPetak = (id) => async (dispatch) => {
    try {
        const res = await AnalisisService.getTanamPetak(id);

        dispatch({
            type: GET_TANAM_PETAK,
            payload: res.data,
        });

        return Promise.resolve(res.data);
    } catch (err) {
        console.log(err);
        return Promise.reject(err);
    }
};

export const getNDPIAnalisis = (id) => async (dispatch) => {
    try {
        const res = await AnalisisService.getNDPIAnalisis(id);

        dispatch({
            type: GET_NDPI_ANALISIS,
            payload: res.data,
        });

        return Promise.resolve(res.data);
    } catch (err) {
        console.log(err);
        return Promise.reject(err);
    }
};

export const getWaterAnalisis = (id) => async (dispatch) => {
    try {
        const res = await AnalisisService.getWaterAnalisis(id);

        dispatch({
            type: GET_WATER_ANALISIS,
            payload: res.data,
        });

        return Promise.resolve(res.data);
    } catch (err) {
        console.log(err);
        return Promise.reject(err);
    }
};

export const getBareAnalisis = (id) => async (dispatch) => {
    try {
        const res = await AnalisisService.getBareAnalisis(id);

        dispatch({
            type: GET_BARE_ANALISIS,
            payload: res.data,
        });

        return Promise.resolve(res.data);
    } catch (err) {
        console.log(err);
        return Promise.reject(err);
    }
};

