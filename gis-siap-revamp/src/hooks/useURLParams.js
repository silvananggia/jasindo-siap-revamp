import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const useURLParams = () => {
  const location = useLocation();
  
  // Get URL parameters
  const urlParams = new URLSearchParams(location.search);
  const nikFromUrl = urlParams.get('nik') || '';
  const idKelompokFromUrl = urlParams.get('idkelompok') || '';
  const idKlaimFromUrl = urlParams.get('idklaim') || '';
  const namaFromUrl = urlParams.get('nama') || '';
  const addressFromUrl = urlParams.get('address') || '';
  const idkabFromUrl = urlParams.get('idkab') || '';
  const idkecFromUrl = urlParams.get('idkec') || '';
  const jmlPetakFromUrl = urlParams.get('jmlPetak') || '';
  const luasLahanFromUrl = urlParams.get('luasLahan') || '';
  const noPolisFromUrl = urlParams.get('noPolis') || '';
  const tglKejadianFromUrl = urlParams.get('tglKejadian') || '';

  // Initialize formData state
  const [formData, setFormData] = useState({
    nik: nikFromUrl,
    nama: namaFromUrl,
    address: addressFromUrl,
    idkab: idkabFromUrl,
    idkec: idkecFromUrl,
    jmlPetak: jmlPetakFromUrl ? parseInt(jmlPetakFromUrl) || 0 : 0,
    luasLahan: luasLahanFromUrl ? parseFloat(luasLahanFromUrl) || 0 : 0,
    noPolis: noPolisFromUrl,
    idKelompok: idKelompokFromUrl,
    idKlaim: idKlaimFromUrl,
    tglKejadian: tglKejadianFromUrl,
    musimTanam: '',
    tanggalTanam: '',
    tanggalPanen: ''
  });

  const [isDataLoaded, setIsDataLoaded] = useState(!!(nikFromUrl || idKelompokFromUrl || idKlaimFromUrl));

  // Update formData when URL parameters change
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const nik = urlParams.get('nik') || '';
    const idKelompok = urlParams.get('idkelompok') || '';
    const idKlaim = urlParams.get('idklaim') || '';
    const nama = urlParams.get('nama') || '';
    const address = urlParams.get('address') || '';
    const idkab = urlParams.get('idkab') || '';
    const idkec = urlParams.get('idkec') || '';
    const jmlPetak = urlParams.get('jmlPetak') || '';
    const luasLahan = urlParams.get('luasLahan') || '';
    const noPolis = urlParams.get('noPolis') || '';
    const tglKejadian = urlParams.get('tglKejadian') || '';
    
    if (nik || idKelompok || idKlaim || nama || address) {
      setFormData(prev => ({
        ...prev,
        ...(nik && { nik }),
        ...(idKelompok && { idKelompok }),
        ...(idKlaim && { idKlaim }),
        ...(nama && { nama }),
        ...(address && { address }),
        ...(idkab && { idkab }),
        ...(idkec && { idkec }),
        ...(jmlPetak && { jmlPetak: parseInt(jmlPetak) || 0 }),
        ...(luasLahan && { luasLahan: parseFloat(luasLahan) || 0 }),
        ...(noPolis && { noPolis }),
        ...(tglKejadian && { tglKejadian })
      }));
      setIsDataLoaded(true);
    }
  }, [location.search]);

  // Listen for postMessage data (for backward compatibility)
  useEffect(() => {
    const handleMessage = (e) => {
      if (e.data && (e.data.nik || e.data.idKelompok || e.data.idklaim)) {
        setFormData(prev => ({
          ...prev,
          ...(e.data.nik && { nik: e.data.nik }),
          ...(e.data.nama && { nama: e.data.nama }),
          ...(e.data.address && { address: e.data.address }),
          ...(e.data.idkab && { idkab: e.data.idkab }),
          ...(e.data.idkec && { idkec: e.data.idkec }),
          ...(e.data.jmlPetak && { jmlPetak: e.data.jmlPetak }),
          ...(e.data.luasLahan && { luasLahan: e.data.luasLahan }),
          ...(e.data.noPolis && { noPolis: e.data.noPolis }),
          ...(e.data.idKelompok && { idKelompok: e.data.idKelompok }),
          ...(e.data.idklaim && { idKlaim: e.data.idklaim }),
          ...(e.data.tglKejadian && { tglKejadian: e.data.tglKejadian }),
          ...(e.data.musimTanam && { musimTanam: e.data.musimTanam }),
          ...(e.data.tanggalTanam && { tanggalTanam: e.data.tanggalTanam }),
          ...(e.data.tanggalPanen && { tanggalPanen: e.data.tanggalPanen })
        }));
        setIsDataLoaded(true);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return { formData, setFormData, isDataLoaded };
};

