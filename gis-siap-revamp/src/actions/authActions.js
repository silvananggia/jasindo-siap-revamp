import { CHECK_AUTH, AUTH_ERROR, SET_TOKEN } from "./types";

import authService from "../services/authService";

const normalizeToken = (rawToken) => {
    if (!rawToken || typeof rawToken !== "string") {
        return "";
    }

    return rawToken.replace(/^Bearer\s+/i, "").trim();
};

export const setToken = (token) => {
    const normalizedToken = normalizeToken(token);
    return {
        type: SET_TOKEN,
        payload: normalizedToken
    };
};

export const checkAuth = (token) => async (dispatch) => {
    const normalizedToken = normalizeToken(token);
    // Store token first
    dispatch(setToken(normalizedToken));
    
    try {
        const res = await authService.checkAuth(normalizedToken);
        dispatch({
            type: CHECK_AUTH,
            payload: res.data
        });
    } catch (err) {
        const status = err?.response?.status;

        // Backend auth health can be unstable on 5xx; keep token-based session
        // so protected endpoints become the effective auth validator.
        if (normalizedToken && status >= 500) {
            dispatch({
                type: CHECK_AUTH,
                payload: { token: normalizedToken, degradedAuth: true }
            });
            return;
        }

        dispatch({
            type: AUTH_ERROR,
            payload: err.response?.data?.message || 'Authentication failed'
        });
    }
};
