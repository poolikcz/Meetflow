import dynamic from 'next/dynamic';
import Head from 'next/head';
import { CalendarDays } from 'lucide-react';
import { ThemeToggle } from '../components/theme-toggle';

const CalendarView = dynamic(() => import('../components/CalendarView'), {
  ssr: false,
});

export default function Home() {
  return (
    <>
      <Head>
        <title>HubSpot Calendar</title>
      </Head>
      <main className="min-h-screen bg-background">
        <div className="container max-w-7xl py-8">
          <header className="mb-6 flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-6 w-6 text-primary" />
                <h1 className="text-3xl font-bold tracking-tight">HubSpot Calendar</h1>
              </div>
              <p className="text-sm text-muted-foreground">
                Přehled schůzek, telefonátů a úkolů s chytrou filtrací a detailním náhledem.
              </p>
            </div>
            <ThemeToggle />
          </header>

          <CalendarView />
        </div>
      </main>
    </>
  );
}
