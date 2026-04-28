import Link from 'next/link';
import {
  LayoutDashboard, Bot, Stethoscope, Pill, FileText,
  Heart, Calendar, Siren, Settings, ScanLine, MapPin,
  Globe, ChevronDown, User, Brain, Microscope, Camera, BriefcaseMedical,
  Menu, X, Navigation, CreditCard, Sparkles, Building2, Radio, BarChart2
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useLanguage, Language } from '@/context/LanguageContext';
import { useState, useRef, useEffect } from 'react';

export default function Sidebar() {
  const pathname = usePathname();
  const { t, language, setLanguage } = useLanguage();
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const menuItems = [
    { icon: LayoutDashboard, label: t('dashboard'), href: '/dashboard' },
    { icon: Navigation, label: 'Healthcare Navigator', href: '/dashboard/healthcare-navigator', featured: true },
    { icon: Radio, label: 'Crisis Command', href: '/dashboard/crisis', crisis: true },
    { icon: Heart, label: 'My Medical Profile', href: '/dashboard/profile', profile: true },
    { icon: BarChart2, label: 'Health Analytics', href: '/dashboard/analytics' },
    { icon: Bot, label: t('askAIDoctor'), href: '/dashboard/ai' },
    { icon: Stethoscope, label: t('symptomChecker'), href: '/dashboard/symptoms' },
    { icon: Pill, label: t('medicineFinder'), href: '/dashboard/medicines' },
    { icon: ScanLine, label: t('medicineScanner'), href: '/dashboard/scanner' },
    { icon: User, label: 'Doctors', href: '/dashboard/doctors' },
    { icon: BriefcaseMedical, label: 'Doctor Dashboard', href: '/dashboard/doctor-dashboard' },
    { icon: Microscope, label: 'Diagnostic Centre', href: '/dashboard/diagnostic-centre' },
    { icon: Camera, label: 'Media Gallery', href: '/dashboard/media' },
    { icon: Building2, label: t('hospitals'), href: '/dashboard/hospitals' },
    { icon: Brain, label: t('healthPredictors'), href: '/dashboard/predictors' },
    { icon: FileText, label: t('medicalReports'), href: '/dashboard/reports' },
    { icon: Heart, label: t('healthTracker'), href: '/dashboard/quiz' },
    { icon: Calendar, label: t('appointments'), href: '/dashboard/appointments' },
    { icon: Siren, label: t('emergency'), href: '/dashboard/emergency' },
    { icon: Settings, label: t('settings'), href: '/dashboard/settings' },
  ];

  const languages: { code: Language; name: string; flag: string }[] = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'te', name: 'తెలుగు', flag: '🇮🇳' },
    { code: 'hi', name: 'हिंदी', flag: '🇮🇳' },
    { code: 'ta', name: 'தமிழ்', flag: '🇮🇳' },
    { code: 'kn', name: 'ಕನ್ನಡ', flag: '🇮🇳' },
    { code: 'mr', name: 'मराठी', flag: '🇮🇳' },
    { code: 'bn', name: 'বাংলা', flag: '🇮🇳' },
    { code: 'bho', name: 'भोजपुरी', flag: '🇮🇳' },
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Mobile Hamburger Button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-[#0f2027] text-white p-2.5 rounded-xl shadow-lg shadow-black/20"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed left-0 top-0 h-screen w-64 bg-[#0f2027] text-white flex flex-col shadow-2xl z-50
        transition-transform duration-300 ease-in-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        {/* Brand + Close */}
        <div className="px-5 py-5 flex items-center gap-3">
          <div className="bg-gradient-to-br from-emerald-400 to-teal-500 p-2 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-300 to-cyan-300">
              Medical AI
            </h1>
            <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-[0.2em]">Powered by AI</p>
          </div>
          {/* Mobile close button */}
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white transition p-1"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav Items */}
        <div className="flex-1 overflow-y-auto pt-3 pb-4 px-3">
          <ul className="space-y-1">
            {menuItems.map((item, index) => {
              const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/dashboard');
              const isFeatured = (item as any).featured;
              const isCrisis = (item as any).crisis;
              const isProfile = (item as any).profile;
              return (
                <li key={index}>
                  {isCrisis ? (
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden ${
                        isActive
                          ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg shadow-red-500/40 font-semibold'
                          : 'bg-gradient-to-r from-red-500/10 to-rose-500/10 text-red-300 hover:from-red-500/20 hover:to-rose-500/20 border border-red-500/20 hover:border-red-500/40'
                      }`}
                    >
                      <item.icon className={`h-5 w-5 ${isActive ? 'text-white animate-pulse' : 'text-red-400 group-hover:text-red-300 animate-pulse'}`} />
                      <span className="text-sm font-bold">{item.label}</span>
                      {!isActive && (
                        <span className="ml-auto text-[9px] font-black bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-md uppercase tracking-wider animate-pulse">
                          Live
                        </span>
                      )}
                    </Link>
                  ) : isProfile ? (
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden ${
                        isActive
                          ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/40 font-semibold'
                          : 'bg-gradient-to-r from-indigo-500/10 to-violet-500/10 text-indigo-300 hover:from-indigo-500/20 hover:to-violet-500/20 border border-indigo-500/20 hover:border-indigo-500/40'
                      }`}
                    >
                      <item.icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-indigo-400 group-hover:text-indigo-300'}`} />
                      <span className="text-sm font-bold">{item.label}</span>
                      {!isActive && (
                        <span className="ml-auto text-[9px] font-black bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                          ID
                        </span>
                      )}
                    </Link>
                  ) : isFeatured ? (
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden ${
                        isActive
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/40 font-semibold'
                          : 'bg-gradient-to-r from-emerald-500/10 to-teal-500/10 text-emerald-300 hover:from-emerald-500/20 hover:to-teal-500/20 border border-emerald-500/20 hover:border-emerald-500/40'
                      }`}
                    >
                      <Sparkles className={`h-4 w-4 ${isActive ? 'text-white' : 'text-emerald-400'}`} />
                      <item.icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-emerald-400 group-hover:text-emerald-300'}`} />
                      <span className="text-sm font-bold">{item.label}</span>
                      {!isActive && (
                        <span className="ml-auto text-[9px] font-black bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                          New
                        </span>
                      )}
                    </Link>
                  ) : (
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                        isActive
                          ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 font-semibold'
                          : 'text-slate-400 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <item.icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-emerald-400'}`} />
                      <span className="text-sm font-medium">{item.label}</span>
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {/* Language Selector */}
        <div className="px-3 pb-6 relative" ref={dropdownRef}>
          {isLangOpen && (
            <div className="absolute bottom-full left-3 right-3 mb-2 bg-[#1a2d35] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
              <div className="py-2 max-h-60 overflow-y-auto">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setLanguage(lang.code);
                      setIsLangOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-white/5 ${
                      language === lang.code ? 'text-emerald-400 font-bold bg-white/5' : 'text-slate-300'
                    }`}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.name}</span>
                    {language === lang.code && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
          <button
            onClick={() => setIsLangOpen(!isLangOpen)}
            className={`flex items-center gap-2 text-slate-400 hover:text-white transition-all w-full px-4 py-3 rounded-xl hover:bg-white/5 border border-transparent ${isLangOpen ? 'border-white/10 bg-white/5 text-white' : ''}`}
          >
            <Globe className="h-4 w-4" />
            <span className="text-sm font-medium">
              {languages.find(l => l.code === language)?.name || 'English'}
            </span>
            <ChevronDown className={`h-3.5 w-3.5 ml-auto transition-transform duration-200 ${isLangOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </aside>
    </>
  );
}
