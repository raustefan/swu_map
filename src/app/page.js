import Head from 'next/head';
import MapApp from './App';

export default function Home() {

  return (
    <>
      <Head>
        <title>SWU Echtzeitkarte</title>
        <meta name="description" content="ÖPNV Fahrzeugkarte für Ulm" />
      </Head>
      <MapApp apikeys={{MAP_ID: process.env.MAP_ID, MAPS_API_KEY: process.env.MAPS_API_KEY}} />
    </>
  );
}