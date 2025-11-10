import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export const useURLParams = () => {
  const location = useLocation();
   
  const [formData, setFormData] = useState({
    nik: '',
    nama: '',
    address: '',
    idkab: '',
    idkec: '',
    jmlPetak: 0, // Initialize with 0 instead of empty string
    luasLahan: 0,
    noPolis: '',
    idKelompok: '',
    idKlaim: '',
    tglKejadian: ''
  });

  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Debug: Track when formData changes
  useEffect(() => {
    // console.log('useURLParams - formData changed:', formData);
    // console.log('useURLParams - formData.jmlPetak:', formData.jmlPetak, 'type:', typeof formData.jmlPetak);
    // console.log('useURLParams - isDataLoaded:', isDataLoaded);
  }, [formData, isDataLoaded]);
  useEffect(() => {
    const handleMessage = (e) => {
      // console.log('useURLParams - Received message:', e.data);
      // console.log('useURLParams - Message origin:', e.origin);
      // console.log('useURLParams - Message timestamp:', new Date().toISOString());
      
      // Handle response to data request
      if (e.data && e.data.type === 'DATA_RESPONSE' && e.data.data) {
        // console.log('useURLParams - Received data response from iframe:', e.data.data);
        
        // Map tanggalTanam to tglKejadian if available
        const processedData = {
          ...e.data.data,
          tglKejadian: e.data.data.tanggalTanam || e.data.data.tglKejadian || ''
        };
        
        // console.log('useURLParams - Setting formData with processed data:', processedData);
        setFormData(processedData);
        setIsDataLoaded(true);
        return;
      }
      
      // More flexible validation - check for either nik or idKelompok
      if (e.data && (e.data.nik || e.data.idKelompok)) {
        // console.log('useURLParams - Setting formData with:', e.data);
        // console.log('useURLParams - jmlPetak in message:', e.data.jmlPetak, 'type:', typeof e.data.jmlPetak);
        
        // Map tanggalTanam to tglKejadian if available
        const processedData = {
          ...e.data,
          tglKejadian: e.data.tanggalTanam || e.data.tglKejadian || ''
        };
        
        // console.log('useURLParams - Setting formData with processed data:', processedData);
        setFormData(processedData);
        setIsDataLoaded(true);
      } else {
        // console.log('useURLParams - Invalid message format:', e.data);
      }
    };

    // console.log('useURLParams - Adding message event listener');
    window.addEventListener('message', handleMessage);
    
    // Also listen for messages on document for better compatibility
    document.addEventListener('message', handleMessage);
    
    // Request data from parent iframe after a short delay
    const requestData = () => {
      // console.log('useURLParams - Requesting data from parent iframe');
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'REQUEST_DATA' }, '*');
      }
    };
    
    // Request data immediately and also after 2 seconds as fallback
    setTimeout(requestData, 100);
    setTimeout(requestData, 2000);
    
    return () => {
      // console.log('useURLParams - Removing message event listener');
      window.removeEventListener('message', handleMessage);
      document.removeEventListener('message', handleMessage);
    };
  }, []); // Empty dependency array - only run once on mount
  /* 
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const nik = urlParams.get('nik');
    const idkab = urlParams.get('idkab');
    const idkec = urlParams.get('idkec');

    if (nik) {
      setFormData(prev => ({
        ...prev,
        nik,
        idkab,
        idkec
      }));
    }
  }, [location.search]); */



  return { formData, setFormData, isDataLoaded,   };
}; 