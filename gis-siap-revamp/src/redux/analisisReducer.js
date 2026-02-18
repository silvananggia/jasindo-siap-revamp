import {
    GET_TANAM_PETAK,
    GET_NDPI_ANALISIS,
    GET_WATER_ANALISIS,
    GET_BARE_ANALISIS,
} from "../actions/types";

const initialstate = {
    loading: true,
    tanamPetak: null,
    ndpiAnalisis: null,
    waterAnalisis: null,
    bareAnalisis: null,
    errmessage: "",
};

function analisisReducer(analisis = initialstate, action) {
    const { type, payload } = action;

    switch (type) {
        case GET_TANAM_PETAK:
            return {
                ...analisis,
                loading: false,
                tanamPetak: payload,
                errmessage: "",
            };

        case GET_NDPI_ANALISIS:
            return {
                ...analisis,
                loading: false,
                ndpiAnalisis: payload,
                errmessage: "",
            };

        case GET_WATER_ANALISIS:
            return {
                ...analisis,
                loading: false,
                waterAnalisis: payload,
                errmessage: "",
            };

        case GET_BARE_ANALISIS:
            return {
                ...analisis,
                loading: false,
                bareAnalisis: payload,
                errmessage: "",
            };

        default:
            return analisis;
    }
}

export default analisisReducer;

