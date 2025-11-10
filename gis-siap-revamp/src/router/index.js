import React, { Suspense, lazy } from "react";
import { Routes, Route } from 'react-router-dom';
import Spinner from '../components/Spinner/Loading-spinner';

// Use lazy for importing your components
const MapRegister = lazy(() => import('../components/map/MapRegister'));
const MapView = lazy(() => import('../components/map/MapView'));
const MapKlaim = lazy(() => import('../components/map/MapClaim'));
const MapAnalysis = lazy(() => import('../components/map/MapAnalytic'));
const MapAnggota = lazy(() => import('../components/map/MapAnggota'));
const MapAnggotaDisetujui = lazy(() => import('../components/map/MapAnggotaDisetujui'));
const MapAnggotaKlaim = lazy(() => import('../components/map/MapAnggotaKlaim'));
const MapViewClaim = lazy(() => import('../components/map/MapViewClaim'));


function MyRouter() {
    return (
        <Routes>
            <Route path='/' element={
                <Suspense fallback={<Spinner className="content-loader" />}>
                    <MapRegister />
                </Suspense>
            } />
            <Route path='/map-view' element={
                <Suspense fallback={<Spinner className="content-loader" />}>
                    <MapView />
                </Suspense>
            } />
            <Route path='/map-klaim' element={
                <Suspense fallback={<Spinner className="content-loader" />}>
                    <MapKlaim />
                </Suspense>
            } />
            <Route path='/map-analisis' element={
                <Suspense fallback={<Spinner className="content-loader" />}>
                    <MapAnalysis />
                </Suspense>
            } />
            <Route path='/map-anggota' element={
                <Suspense fallback={<Spinner className="content-loader" />}>
                    <MapAnggota />
                </Suspense>
            } />
            <Route path='/map-anggota-disetujui' element={
                <Suspense fallback={<Spinner className="content-loader" />}>
                    <MapAnggotaDisetujui />
                </Suspense>
            } />
            <Route path='/map-anggota-klaim' element={
                <Suspense fallback={<Spinner className="content-loader" />}>
                    <MapAnggotaKlaim />
                </Suspense>
            } />
            <Route path='/map-view-klaim' element={
                <Suspense fallback={<Spinner className="content-loader" />}>
                    <MapViewClaim />
                </Suspense>
            } />
        </Routes>
    );
}

export default MyRouter;
