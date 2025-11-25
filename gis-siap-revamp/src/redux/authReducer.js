import {CHECK_AUTH, AUTH_ERROR, SET_TOKEN } from "../actions/types";

const initialState = {
  loading: true,
  isAuthenticated: false,
  user: null,
  token: null,
  errmessage: "",
};

function authReducer(state = initialState, action) {
  const { type, payload } = action;

  switch (type) {
    case CHECK_AUTH:
      return {
        ...state,
        loading: false,
        errmessage: "",
        isAuthenticated: true,
        user: payload,
        token: payload?.token || state.token
      };
      
    case AUTH_ERROR:
      return {
        ...state,
        loading: false,
        isAuthenticated: false,
        user: null,
        token: null,
        errmessage: payload
      };
      
    case SET_TOKEN:
      return {
        ...state,
        token: payload
      };
      
    default:
      return state;
  }
}

export default authReducer;
