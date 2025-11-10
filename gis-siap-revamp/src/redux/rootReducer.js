import { combineReducers } from 'redux';
import authReducer from './authReducer';
import petakReducer from './petakReducer';
import klaimReducer from './klaimReducer';
import anggotaReducer from './anggotaReducer';

const rootReducer = combineReducers({
  
  auth: authReducer,
  petak : petakReducer,
  klaim : klaimReducer,
  anggota : anggotaReducer,
});

export default rootReducer;