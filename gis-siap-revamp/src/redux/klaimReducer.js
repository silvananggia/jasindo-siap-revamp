import {
    CREATE_KLAIM,
    GET_KLAIM,
    GET_KLAIM_USER,
    GET_KLAIM_ID,
    UPDATE_KLAIM,
    DELETE_KLAIM,
} from "../actions/types";

const initialstate = {
    loading: true,
    klaimlist: [],
    klaimobj: {},
    errmessage: "",
};

function petakReducer(petak = initialstate, action) {
    const { type, payload } = action;

    switch (type) {
        case CREATE_KLAIM:
            return {
                ...petak,
                loading: false,
            };
        case GET_KLAIM:
            return {
                loading: false,
                errmessage: "",
                klaimlist: action.payload,
                klaimobj: {},
            };


        case UPDATE_KLAIM:

            return {
                ...petak,
                errmessage: "",
                //  klaimlist: action.payload,
                // klaimobj: petak.klaimobj,
            };

        case DELETE_KLAIM:
            return {
                ...petak,
                loading: false,
                klaimlist: petak.klaimlist.filter(k => k.id !== payload.id),
            };
        case GET_KLAIM_USER:
            return {
                ...petak,
                loading: false,
                klaimlist: action.payload.data,

            };
        case GET_KLAIM_ID:
            return {
                ...petak,
                loading: false,
                klaimobj: action.payload,

            };

        default:
            return petak;
    }
}

export default petakReducer;
