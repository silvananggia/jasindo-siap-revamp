import {
    GET_ANGGOTA,
    GET_ANGGOTA_DISETUJUI,
    GET_ANGGOTA_KLAIM,
} from "../actions/types";

const initialstate = {
    loading: true,
    anggotalist: [],
    anggotaobj: {},
    errmessage: "",
};

function anggotaReducer(anggota = initialstate, action) {
    const { type, payload } = action;

    switch (type) {
        case GET_ANGGOTA:
            return {
                ...anggota,
                loading: false,
                anggotalist: action.payload,
            };

        case GET_ANGGOTA_DISETUJUI:
            return {
                ...anggota,
                loading: false,
                anggotalist: action.payload,
            };

        case GET_ANGGOTA_KLAIM:
            return {
                ...anggota,
                loading: false,
                anggotalist: action.payload, // Store the entire response
            };

        default:
            return anggota;
    }
}

export default anggotaReducer;
