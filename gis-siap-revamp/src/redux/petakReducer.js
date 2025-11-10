import {
    CREATE_PETAK,
    GET_PETAK,
    GET_PETAK_USER,
    GET_PETAK_ID,
    UPDATE_PETAK,
    DELETE_PETAK,
} from "../actions/types";

const initialstate = {
    loading: true,
    petaklist: [],
    petakobj: {},
    errmessage: "",
};

function petakReducer(petak = initialstate, action) {
    const { type, payload } = action;

    switch (type) {
        case CREATE_PETAK:
            return {
                ...petak,
                loading: false,
            };
        case GET_PETAK:
            return {
                loading: false,
                errmessage: "",
                petaklist: action.payload,
                petakobj: {},
            };


        case UPDATE_PETAK:

            return {
                ...petak,
                errmessage: "",
                //  petaklist: action.payload,
                // petakobj: petak.petakobj,
            };

        case DELETE_PETAK:
            return {
                ...petak,
                loading: false,
                // Don't immediately filter - let the server refresh handle it
                // petaklist: petak.petaklist.filter(p => p.idpetak !== payload.id),
            };
        case GET_PETAK_USER:
            return {
                ...petak,
                loading: false,
                petaklist: action.payload, // action.payload is already the API response object

            };
        case GET_PETAK_ID:
            return {
                ...petak,
                loading: false,
                petakobj: action.payload,

            };

        default:
            return petak;
    }
}

export default petakReducer;
