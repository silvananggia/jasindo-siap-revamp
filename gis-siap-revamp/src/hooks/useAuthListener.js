import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { checkAuth } from '../actions/authActions';

export const useAuthListener = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    // Listen for postMessage with cred from index.php
    const handleMessage = (e) => {
      if (e.data && e.data.cred) {
        // Trigger auth check with cred from postMessage
        dispatch(checkAuth(e.data.cred));
      }
    };

    window.addEventListener('message', handleMessage);
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [dispatch]);
}; 