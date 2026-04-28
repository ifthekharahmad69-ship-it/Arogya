'use client';

import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { LocationProvider } from '@/context/LocationContext';
import { LanguageProvider } from '@/context/LanguageContext';
import MediBotAgent from '@/components/MediBotAgent';
import ClerkApiProvider from '@/components/ClerkApiProvider';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LanguageProvider>
      <LocationProvider>
        <ClerkApiProvider>
          <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex transition-colors duration-300">
            <Sidebar />
            <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
              <Header />
              <main className="flex-1 mt-20 p-4 md:p-8 overflow-y-auto w-full">
                <div className="max-w-7xl mx-auto w-full">
                  {children}
                </div>
                <Footer />
              </main>
            </div>
          </div>
          <MediBotAgent userName="Patient" />
        </ClerkApiProvider>
      </LocationProvider>
    </LanguageProvider>
  );
}

