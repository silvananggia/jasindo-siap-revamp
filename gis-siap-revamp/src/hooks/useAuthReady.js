import { useMemo } from 'react';
import { useSelector } from 'react-redux';

/**
 * Gate for protected API calls.
 * Wait until auth finished loading, user is authenticated, and Bearer token exists.
 * Prevents empty lists when data is fetched too early (401), then never retried.
 */
export const useAuthReady = () => {
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const token = useSelector((state) => state.auth.token);
  const authLoading = useSelector((state) => state.auth.loading);

  const isAuthReady = useMemo(
    () => Boolean(!authLoading && isAuthenticated && token),
    [authLoading, isAuthenticated, token]
  );

  return {
    isAuthReady,
    isAuthenticated,
    token: token || null,
    authLoading,
  };
};

export default useAuthReady;
