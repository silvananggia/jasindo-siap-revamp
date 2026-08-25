import {
    GET_TANAM_PETAK,
    GET_NDPI_ANALISIS,
    GET_WATER_ANALISIS,
    GET_BARE_ANALISIS,
} from "./types";

import AnalisisService from "../services/analisisService";

const emptyAnalisisPayload = {
    code: 404,
    status: "error",
    data: null,
};

const isNotFound = (err) => err?.response?.status === 404;

const fetchAnalisis = (serviceFn, type) => (id) => async (dispatch) => {
    try {
        const res = await serviceFn(id);
        dispatch({
            type,
            payload: res.data,
        });
        return res.data;
    } catch (err) {
        if (isNotFound(err)) {
            dispatch({
                type,
                payload: emptyAnalisisPayload,
            });
            return emptyAnalisisPayload;
        }

        console.log(err);
        return Promise.reject(err);
    }
};

export const getTanamPetak = fetchAnalisis(AnalisisService.getTanamPetak, GET_TANAM_PETAK);
export const getNDPIAnalisis = fetchAnalisis(AnalisisService.getNDPIAnalisis, GET_NDPI_ANALISIS);
export const getWaterAnalisis = fetchAnalisis(AnalisisService.getWaterAnalisis, GET_WATER_ANALISIS);
export const getBareAnalisis = fetchAnalisis(AnalisisService.getBareAnalisis, GET_BARE_ANALISIS);
