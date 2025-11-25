import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { checkAuth } from '../actions/authActions';

export const useAuthListener = () => {
  const dispatch = useDispatch();
  const pollingRef = useRef(null);
  const tokenReceivedRef = useRef(false);

  const requestToken = () => {
    // If this page is inside an iframe, ask the parent for a token
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'REQUEST_AUTH_TOKEN' }, '*');
    } else {
      // Fallback for standalone usage (still triggers postMessage listeners)
      window.postMessage({ type: 'REQUEST_AUTH_TOKEN' }, '*');
    }
  };

  useEffect(() => {
    // Listen for postMessage with token from index.php
    const handleMessage = (e) => {
      if (e.data && e.data.token) {
        console.log('[useAuthListener] Token received via postMessage');

        tokenReceivedRef.current = true;
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
        // Trigger auth check with token from postMessage
        dispatch(checkAuth(e.data.token));
      }
    };

    window.addEventListener('message', handleMessage);
    // Keep requesting the token until we receive it
    requestToken();
    pollingRef.current = setInterval(() => {
      if (!tokenReceivedRef.current) {
        // Keep requesting the token until we receive it
        console.log('[useAuthListener] Requesting token from parent frame...');
        requestToken();
      }
    }, 1500);
    
    return () => {
      window.removeEventListener('message', handleMessage);
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [dispatch]);
}; 