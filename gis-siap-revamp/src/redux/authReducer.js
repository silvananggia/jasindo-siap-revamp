import {CHECK_AUTH, AUTH_ERROR } from "../actions/types";

const initialState = {
  loading: true,
  isAuthenticated: false,
  user: null,
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
        user: payload
      };
      
    case AUTH_ERROR:
      return {
        ...state,
        loading: false,
        isAuthenticated: false,
        user: null,
        errmessage: payload
      };
      
    default:
      return state;
  }
}

export default authReducer;
