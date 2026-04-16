'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Activity, MessageSquare, Mail, MapPin, Phone,
  ChevronRight, Heart, Facebook, Twitter, Instagram,
  Linkedin, Youtube
} from 'lucide-react';

const quickLinks = [
  { label: 'Home', href: '/dashboard' },
  { label: 'Doctors', href: '/dashboard/doctors' },
  { label: 'Hospitals', href: '/dashboard/hospitals' },
  { label: 'Health Predictors', href: '/dashboard/predictors' },
  { label: 'Appointments', href: '/dashboard/appointments' },
];

const services = [
  'Blood Pressure Check',
  'Blood Sugar Test',
  'Full Blood Count',
  'X-Ray Scan',
  'Eye Check-Up',
];

export default function Footer() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail('');
      setTimeout(() => setSubscribed(false), 3000);
    }
  };

  return (
    <footer className="bg-slate-50 border-t border-slate-200 mt-16">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-emerald-500 p-2 rounded-xl">
                <Activity className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-black text-emerald-700">Arogya Raksha</h3>
                <p className="text-xs font-bold text-emerald-500">Healthcare Solutions</p>
              </div>
            </div>
            <p className="text-sm text-slate-500 italic leading-relaxed mb-6">
              Your trusted partner in healthcare innovation. We&apos;re committed to providing exceptional medical care with cutting-edge technology and compassionate service.
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <Phone className="h-4 w-4 text-emerald-500" />
                <span>+91 7981502973</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <Mail className="h-4 w-4 text-emerald-500" />
                <span>arogyaraksha@gmail.com</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <MapPin className="h-4 w-4 text-emerald-500" />
                <span>India</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-black text-slate-800 mb-5">Quick Links</h3>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <Link href={link.href}
                    className="flex items-center gap-2 text-sm text-slate-500 hover:text-emerald-600 transition-colors font-medium group">
                    <ChevronRight className="h-3 w-3 text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-lg font-black text-slate-800 mb-5">Our Services</h3>
            <ul className="space-y-3">
              {services.map((service) => (
                <li key={service} className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                  {service}
                </li>
              ))}
            </ul>
          </div>

          {/* Stay Connected */}
          <div>
            <h3 className="text-lg font-black text-slate-800 mb-5">Stay Connected</h3>
            <p className="text-sm text-slate-500 mb-4 leading-relaxed">
              Subscribe for health tips, medical updates, and wellness insights delivered to your inbox.
            </p>
            <form onSubmit={handleSubscribe} className="flex mb-6">
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Enter your email"
                className="flex-1 border-2 border-slate-200 rounded-l-xl px-4 py-2.5 text-sm outline-none focus:border-emerald-400" />
              <button type="submit"
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-r-xl font-bold text-sm transition-colors">
                {subscribed ? '✓' : 'Subscribe'}
              </button>
            </form>
            {/* Social Icons */}
            <div className="flex gap-3">
              {[
                { icon: Facebook, href: '#', color: 'hover:bg-blue-50 hover:text-blue-600' },
                { icon: Twitter, href: '#', color: 'hover:bg-sky-50 hover:text-sky-600' },
                { icon: Instagram, href: '#', color: 'hover:bg-pink-50 hover:text-pink-600' },
                { icon: Linkedin, href: '#', color: 'hover:bg-blue-50 hover:text-blue-700' },
                { icon: Youtube, href: '#', color: 'hover:bg-red-50 hover:text-red-600' },
              ].map((s, i) => (
                <a key={i} href={s.href}
                  className={`p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 transition-all ${s.color} shadow-sm hover:shadow-md`}>
                  <s.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-10 pt-6 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-slate-400">© 2026 Arogya Raksha Healthcare. All rights reserved.</p>
          <p className="text-sm text-slate-400">Designed with <Heart className="h-3 w-3 inline text-red-400 fill-red-400" /> by Team SSRRK</p>
        </div>
      </div>

      {/* Floating WhatsApp Button */}
      <a href="https://wa.me/917981502973" target="_blank" rel="noopener noreferrer"
        className="fixed bottom-6 right-6 bg-[#25D366] hover:bg-[#20BD5A] text-white p-4 rounded-full shadow-2xl shadow-green-500/30 transition-all hover:scale-110 z-50">
        <MessageSquare className="h-6 w-6" />
      </a>
    </footer>
  );
}
