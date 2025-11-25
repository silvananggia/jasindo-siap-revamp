import { CHECK_AUTH, AUTH_ERROR, SET_TOKEN } from "./types";

import authService from "../services/authService";

export const setToken = (token) => {
    return {
        type: SET_TOKEN,
        payload: token
    };
};

export const checkAuth = (token) => async (dispatch) => {
    // Store token first
    dispatch(setToken(token));
    
    try {
        const res = await authService.checkAuth(token);
        dispatch({
            type: CHECK_AUTH,
            payload: res.data
        });
    } catch (err) {
        dispatch({
            type: AUTH_ERROR,
            payload: err.response?.data?.message || 'Authentication failed'
        });
    }
};
