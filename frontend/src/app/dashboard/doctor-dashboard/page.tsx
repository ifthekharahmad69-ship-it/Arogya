'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  User, Phone, MapPin, Building2, Stethoscope, GraduationCap,
  Clock, IndianRupee, Camera, Save, Trash2, Edit3, Plus,
  CheckCircle2, AlertCircle, Loader2, X, Languages, FileText
} from 'lucide-react';
import api from '@/lib/api';

interface DoctorProfile {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  location: string;
  specialization: string;
  qualification: string;
  experience: number;
  consultation_fee: number;
  hospital_name: string;
  hospital_image: string;
  profile_image: string;
  bio: string;
  languages: string[];
  rating: number;
  total_reviews: number;
  is_available: boolean;
  created_at: string;
}

const SPECIALIZATIONS = [
  'General Medicine', 'Cardiology', 'Dermatology', 'Pediatrics',
  'Neurology', 'Orthopedics', 'Gynecology', 'ENT',
  'Ophthalmology', 'Psychiatry', 'Urology', 'Oncology',
  'Dentistry', 'General Surgery', 'Pulmonology', 'Gastroenterology',
];

const LANGUAGES = ['English', 'Hindi', 'Telugu', 'Tamil', 'Kannada', 'Marathi', 'Bengali', 'Gujarati', 'Malayalam', 'Urdu'];

export default function DoctorDashboardPage() {
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Form state
  const [form, setForm] = useState({
    name: '', phone: '', location: '', specialization: '',
    qualification: '', experience: 0, consultationFee: 0,
    hospitalName: '', bio: '', languages: [] as string[],
    isAvailable: true,
  });
  const [profileImagePreview, setProfileImagePreview] = useState('');
  const [profileImageData, setProfileImageData] = useState('');
  const [hospitalImagePreview, setHospitalImagePreview] = useState('');
  const [hospitalImageData, setHospitalImageData] = useState('');

  const profileImageRef = useRef<HTMLInputElement>(null);
  const hospitalImageRef = useRef<HTMLInputElement>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // Compress image
  const compressImage = (file: File, maxWidth = 800, quality = 0.8): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas error'));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  // Fetch profile
  useEffect(() => {
    (async () => {
      try {
        const res = await api.getMyDoctorProfile();
        if (res.success && res.profile) {
          setProfile(res.profile);
          setForm({
            name: res.profile.name || '',
            phone: res.profile.phone || '',
            location: res.profile.location || '',
            specialization: res.profile.specialization || '',
            qualification: res.profile.qualification || '',
            experience: res.profile.experience || 0,
            consultationFee: res.profile.consultation_fee || 0,
            hospitalName: res.profile.hospital_name || '',
            bio: res.profile.bio || '',
            languages: res.profile.languages || [],
            isAvailable: res.profile.is_available ?? true,
          });
          if (res.profile.profile_image) setProfileImagePreview(res.profile.profile_image);
          if (res.profile.hospital_image) setHospitalImagePreview(res.profile.hospital_image);
        }
      } catch {
        showToast('Failed to load profile', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, [showToast]);

  // Handle image selection
  const handleImageSelect = async (file: File, type: 'profile' | 'hospital') => {
    if (!file || !file.type.startsWith('image/')) return;
    try {
      const compressed = await compressImage(file);
      if (type === 'profile') {
        setProfileImagePreview(compressed);
        setProfileImageData(compressed);
      } else {
        setHospitalImagePreview(compressed);
        setHospitalImageData(compressed);
      }
    } catch {
      showToast('Failed to process image', 'error');
    }
  };

  // Save / Create
  const handleSave = async () => {
    if (!form.name || !form.phone || !form.location) {
      showToast('Name, phone, and location are required.', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = { ...form };
      if (profileImageData) payload.profileImage = profileImageData;
      if (hospitalImageData) payload.hospitalImage = hospitalImageData;

      let res;
      if (profile) {
        res = await api.updateDoctorProfile(payload);
      } else {
        res = await api.createDoctorProfile(payload);
      }

      if (res.success) {
        setProfile(res.profile);
        setEditing(false);
        setProfileImageData('');
        setHospitalImageData('');
        showToast(profile ? 'Profile updated!' : 'Profile created!', 'success');
      } else {
        showToast(res.message || 'Save failed', 'error');
      }
    } catch {
      showToast('Save failed. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Delete
  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete your doctor profile? This cannot be undone.')) return;
    setSaving(true);
    try {
      const res = await api.deleteDoctorProfile();
      if (res.success) {
        setProfile(null);
        setForm({ name: '', phone: '', location: '', specialization: '', qualification: '', experience: 0, consultationFee: 0, hospitalName: '', bio: '', languages: [], isAvailable: true });
        setProfileImagePreview('');
        setHospitalImagePreview('');
        setEditing(false);
        showToast('Profile deleted.', 'success');
      } else {
        showToast(res.message || 'Delete failed', 'error');
      }
    } catch {
      showToast('Delete failed.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleLanguage = (lang: string) => {
    setForm(f => ({
      ...f,
      languages: f.languages.includes(lang)
        ? f.languages.filter(l => l !== lang)
        : [...f.languages, lang],
    }));
  };

  const isEditing = editing || !profile;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 text-violet-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-8 duration-500">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[200] flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl text-white text-sm font-semibold animate-in slide-in-from-right-8 duration-300 ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}>
          {toast.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-violet-500 to-purple-600 p-2.5 rounded-xl shadow-lg shadow-violet-500/30">
            <Stethoscope className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Doctor Dashboard</h1>
            <p className="text-sm text-slate-500">{profile ? 'Manage your doctor profile' : 'Create your doctor profile'}</p>
          </div>
        </div>
        {profile && !editing && (
          <div className="flex gap-3">
            <button onClick={() => setEditing(true)}
              className="flex items-center gap-2 bg-violet-500 hover:bg-violet-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-violet-500/25 transition-all hover:-translate-y-0.5">
              <Edit3 className="h-4 w-4" /> Edit Profile
            </button>
            <button onClick={handleDelete}
              className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-red-500/25 transition-all hover:-translate-y-0.5">
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          </div>
        )}
      </div>

      {/* Profile View / Edit Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Images */}
        <div className="space-y-6">
          {/* Profile Image */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-lg p-6">
            <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
              <Camera className="h-4 w-4 text-violet-500" /> Profile Photo
            </h3>
            <div className="relative group">
              <div className="w-full aspect-square rounded-2xl overflow-hidden bg-slate-100 border-2 border-dashed border-slate-200">
                {profileImagePreview ? (
                  <img src={profileImagePreview} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                    <User className="h-16 w-16 mb-2" />
                    <span className="text-sm font-medium">No photo</span>
                  </div>
                )}
              </div>
              {isEditing && (
                <button onClick={() => profileImageRef.current?.click()}
                  className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center">
                  <Camera className="h-8 w-8 text-white" />
                </button>
              )}
              <input ref={profileImageRef} type="file" accept="image/*" className="hidden"
                onChange={e => { if (e.target.files?.[0]) handleImageSelect(e.target.files[0], 'profile'); e.target.value = ''; }} />
            </div>
          </div>

          {/* Hospital Image */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-lg p-6">
            <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-violet-500" /> Hospital Photo
            </h3>
            <div className="relative group">
              <div className="w-full aspect-video rounded-xl overflow-hidden bg-slate-100 border-2 border-dashed border-slate-200">
                {hospitalImagePreview ? (
                  <img src={hospitalImagePreview} alt="Hospital" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                    <Building2 className="h-12 w-12 mb-2" />
                    <span className="text-sm font-medium">No hospital photo</span>
                  </div>
                )}
              </div>
              {isEditing && (
                <button onClick={() => hospitalImageRef.current?.click()}
                  className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                  <Camera className="h-8 w-8 text-white" />
                </button>
              )}
              <input ref={hospitalImageRef} type="file" accept="image/*" className="hidden"
                onChange={e => { if (e.target.files?.[0]) handleImageSelect(e.target.files[0], 'hospital'); e.target.value = ''; }} />
            </div>
          </div>
        </div>

        {/* Right: Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-lg p-6 space-y-5">
            <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3">Basic Information</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Name */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-bold text-slate-700 mb-1.5">
                  <User className="h-3.5 w-3.5 text-violet-500" /> Name <span className="text-red-500">*</span>
                </label>
                <input type="text" value={form.name} disabled={!isEditing}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Dr. John Doe"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 outline-none disabled:bg-slate-50 disabled:text-slate-600 transition-all" />
              </div>

              {/* Phone */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-bold text-slate-700 mb-1.5">
                  <Phone className="h-3.5 w-3.5 text-violet-500" /> Phone <span className="text-red-500">*</span>
                </label>
                <input type="tel" value={form.phone} disabled={!isEditing}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+91 9876543210"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 outline-none disabled:bg-slate-50 disabled:text-slate-600 transition-all" />
              </div>

              {/* Location */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-bold text-slate-700 mb-1.5">
                  <MapPin className="h-3.5 w-3.5 text-violet-500" /> Location <span className="text-red-500">*</span>
                </label>
                <input type="text" value={form.location} disabled={!isEditing}
                  onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  placeholder="Mumbai, Maharashtra"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 outline-none disabled:bg-slate-50 disabled:text-slate-600 transition-all" />
              </div>

              {/* Specialization */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-bold text-slate-700 mb-1.5">
                  <Stethoscope className="h-3.5 w-3.5 text-violet-500" /> Specialization
                </label>
                <select value={form.specialization} disabled={!isEditing}
                  onChange={e => setForm(f => ({ ...f, specialization: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 outline-none disabled:bg-slate-50 disabled:text-slate-600 transition-all">
                  <option value="">Select specialization</option>
                  {SPECIALIZATIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Qualification */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-bold text-slate-700 mb-1.5">
                  <GraduationCap className="h-3.5 w-3.5 text-violet-500" /> Qualification
                </label>
                <input type="text" value={form.qualification} disabled={!isEditing}
                  onChange={e => setForm(f => ({ ...f, qualification: e.target.value }))}
                  placeholder="MBBS, MD"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 outline-none disabled:bg-slate-50 disabled:text-slate-600 transition-all" />
              </div>

              {/* Experience */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-bold text-slate-700 mb-1.5">
                  <Clock className="h-3.5 w-3.5 text-violet-500" /> Experience (years)
                </label>
                <input type="number" value={form.experience} disabled={!isEditing} min={0}
                  onChange={e => setForm(f => ({ ...f, experience: parseInt(e.target.value) || 0 }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 outline-none disabled:bg-slate-50 disabled:text-slate-600 transition-all" />
              </div>

              {/* Consultation Fee */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-bold text-slate-700 mb-1.5">
                  <IndianRupee className="h-3.5 w-3.5 text-violet-500" /> Consultation Fee (₹)
                </label>
                <input type="number" value={form.consultationFee} disabled={!isEditing} min={0}
                  onChange={e => setForm(f => ({ ...f, consultationFee: parseInt(e.target.value) || 0 }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 outline-none disabled:bg-slate-50 disabled:text-slate-600 transition-all" />
              </div>

              {/* Hospital Name */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-bold text-slate-700 mb-1.5">
                  <Building2 className="h-3.5 w-3.5 text-violet-500" /> Hospital Name
                </label>
                <input type="text" value={form.hospitalName} disabled={!isEditing}
                  onChange={e => setForm(f => ({ ...f, hospitalName: e.target.value }))}
                  placeholder="City Hospital"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 outline-none disabled:bg-slate-50 disabled:text-slate-600 transition-all" />
              </div>
            </div>

            {/* Bio */}
            <div>
              <label className="flex items-center gap-1.5 text-sm font-bold text-slate-700 mb-1.5">
                <FileText className="h-3.5 w-3.5 text-violet-500" /> About / Bio
              </label>
              <textarea value={form.bio} disabled={!isEditing} rows={3}
                onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                placeholder="Tell patients about yourself..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 outline-none disabled:bg-slate-50 disabled:text-slate-600 transition-all resize-none" />
            </div>

            {/* Languages */}
            <div>
              <label className="flex items-center gap-1.5 text-sm font-bold text-slate-700 mb-2">
                <Languages className="h-3.5 w-3.5 text-violet-500" /> Languages Spoken
              </label>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map(lang => (
                  <button key={lang} disabled={!isEditing}
                    onClick={() => isEditing && toggleLanguage(lang)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      form.languages.includes(lang)
                        ? 'bg-violet-500 text-white shadow-md shadow-violet-500/25'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:hover:bg-slate-100'
                    }`}>
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            {/* Availability toggle */}
            {isEditing && (
              <div className="flex items-center gap-3 pt-2">
                <button onClick={() => setForm(f => ({ ...f, isAvailable: !f.isAvailable }))}
                  className={`relative w-12 h-6 rounded-full transition-colors ${form.isAvailable ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.isAvailable ? 'translate-x-6' : ''}`} />
                </button>
                <span className="text-sm font-bold text-slate-700">
                  {form.isAvailable ? '✅ Available for consultations' : '❌ Not available'}
                </span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          {isEditing && (
            <div className="flex gap-3">
              <button onClick={handleSave} disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-violet-500/25 transition-all hover:-translate-y-0.5 disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? 'Saving...' : profile ? 'Update Profile' : 'Create Profile'}
              </button>
              {profile && (
                <button onClick={() => setEditing(false)} disabled={saving}
                  className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all">
                  Cancel
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
