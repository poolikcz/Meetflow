import dynamic from 'next/dynamic';
import Head from 'next/head';

const CalendarView = dynamic(() => import('../components/CalendarView'), {
  ssr: false,
});

export default function Home() {
  return (
    <>
      <Head>
        <title>HubSpot Calendar</title>
      </Head>
      <main style={{ padding: 20 }}>
        <h1>HubSpot Calendar</h1>
        <CalendarView />
      </main>
    </>
  );
}
