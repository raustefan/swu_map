// src/app/page.jsx
'use client'; // 👈 This is the key!

import Head from 'next/head';
import MapApp from './components/MapApp';

export default function Home() {
  return (
    <>
      <Head>
        <title>SWU Echtzeitkarte</title>
        <meta name="description" content="ÖPNV Fahrzeugkarte für Ulm" />
      </Head>
      <MapApp />
    </>
  );
}