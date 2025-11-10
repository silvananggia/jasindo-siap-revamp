import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { checkAuth } from '../actions/authActions';

export const useAuthListener = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    // Listen for postMessage with token from index.php
    const handleMessage = (e) => {
      if (e.data && e.data.token) {
        // Trigger auth check with token from postMessage
        dispatch(checkAuth(e.data.token));
      }
    };

    window.addEventListener('message', handleMessage);
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [dispatch]);
}; 