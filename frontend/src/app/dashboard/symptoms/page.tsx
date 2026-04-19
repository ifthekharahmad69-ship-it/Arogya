'use client';

import { useState } from 'react';
import {
  Stethoscope, User, Heart, Activity, Baby, Loader2, AlertTriangle,
  Pill, Clock, ShieldAlert, ChevronRight, Info, Search,
  Thermometer, X, CheckCircle2, Syringe, Droplets
} from 'lucide-react';
import HealthcareCTA from '@/components/HealthcareCTA';

interface Medicine {
  name: string;
  brandName: string;
  form: string;
  power: string;
  dosage: string;
  frequency: string;
  duration: string;
  timing: string;
  purpose: string;
  warnings: string[];
  contraindications: string[];
}

interface DiagnosisResult {
  diagnosis: string;
  severity: string;
  medicines: Medicine[];
  generalAdvice: string[];
  whenToSeeDoctor: string;
  disclaimer: string;
}

const COMMON_SYMPTOMS = [
  'Headache', 'Fever', 'Cough', 'Cold', 'Body Pain', 'Fatigue',
  'Nausea', 'Vomiting', 'Diarrhea', 'Stomach Pain', 'Back Pain',
  'Sore Throat', 'Chest Pain', 'Dizziness', 'Joint Pain',
  'Skin Rash', 'Difficulty Breathing', 'Loss of Appetite',
  'Muscle Cramps', 'Acidity', 'Constipation', 'Insomnia',
];

function FormIcon({ form }: { form: string }) {
  switch (form) {
    case 'tablet': case 'capsule': return <Pill className="h-5 w-5" />;
    case 'syrup': return <Droplets className="h-5 w-5" />;
    case 'injection': return <Syringe className="h-5 w-5" />;
    default: return <Pill className="h-5 w-5" />;
  }
}

function SeverityBadge({ severity }: { severity: string }) {
  const config = {
    mild: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: '🟢 Mild' },
    moderate: { bg: 'bg-amber-50 text-amber-700 border-amber-200', label: '🟡 Moderate' },
    severe: { bg: 'bg-rose-50 text-rose-700 border-rose-200', label: '🔴 Severe' },
  };
  const c = config[severity as keyof typeof config] || config.mild;
  return <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${c.bg}`}>{c.label}</span>;
}

export default function SymptomChecker() {
  // Form state
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [bpSystolic, setBpSystolic] = useState('');
  const [bpDiastolic, setBpDiastolic] = useState('');
  const [isDiabetic, setIsDiabetic] = useState(false);
  const [isPregnant, setIsPregnant] = useState(false);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [customSymptom, setCustomSymptom] = useState('');
  const [symptomSearch, setSymptomSearch] = useState('');

  // Result state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<DiagnosisResult | null>(null);

  const toggleSymptom = (s: string) => {
    setSelectedSymptoms(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    );
  };

  const addCustomSymptom = () => {
    const trimmed = customSymptom.trim();
    if (trimmed && !selectedSymptoms.includes(trimmed)) {
      setSelectedSymptoms(prev => [...prev, trimmed]);
      setCustomSymptom('');
    }
  };

  const filteredSymptoms = COMMON_SYMPTOMS.filter(s =>
    s.toLowerCase().includes(symptomSearch.toLowerCase())
  );

  const handleAnalyze = async () => {
    if (selectedSymptoms.length === 0) { setError('Please select at least one symptom.'); return; }
    if (!age) { setError('Please enter your age.'); return; }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/symptoms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symptoms: selectedSymptoms.join(', '),
          age: parseInt(age),
          gender,
          bpSystolic: bpSystolic ? parseInt(bpSystolic) : null,
          bpDiastolic: bpDiastolic ? parseInt(bpDiastolic) : null,
          isDiabetic,
          isPregnant: gender === 'female' ? isPregnant : false,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to analyze');
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-500 w-full pb-12">
      {/* Header */}
      <header>
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-violet-100 p-2.5 rounded-xl border border-violet-200">
            <Stethoscope className="h-6 w-6 text-violet-600" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Symptom Checker</h1>
            <p className="text-slate-500 font-medium">AI-powered medicine recommendations based on your profile</p>
          </div>
        </div>
      </header>

      {/* Disclaimer Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-700 font-medium">
          <strong>Disclaimer:</strong> This is AI-generated advice for informational purposes only.
          Always consult a qualified doctor before taking any medicine.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* LEFT: Patient Profile + Symptoms */}
        <div className="xl:col-span-2 space-y-5">
          {/* Patient Profile Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xl shadow-slate-200/40">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-5">
              <User className="h-5 w-5 text-violet-600" /> Patient Profile
            </h2>

            <div className="space-y-4">
              {/* Age + Gender */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Age</label>
                  <input type="number" value={age} onChange={e => setAge(e.target.value)}
                    placeholder="e.g. 35" min="1" max="120"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Gender</label>
                  <select value={gender} onChange={e => setGender(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all bg-white">
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {/* Blood Pressure */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  <Heart className="h-3 w-3 inline mr-1" /> Blood Pressure (mmHg)
                </label>
                <div className="flex items-center gap-2">
                  <input type="number" value={bpSystolic} onChange={e => setBpSystolic(e.target.value)}
                    placeholder="Systolic (e.g. 120)" min="60" max="250"
                    className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
                  <span className="text-slate-400 font-bold">/</span>
                  <input type="number" value={bpDiastolic} onChange={e => setBpDiastolic(e.target.value)}
                    placeholder="Diastolic (e.g. 80)" min="40" max="150"
                    className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
                </div>
              </div>

              {/* Toggles */}
              <div className="flex flex-wrap gap-3">
                <button onClick={() => setIsDiabetic(!isDiabetic)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border-2 ${
                    isDiabetic ? 'bg-rose-50 border-rose-300 text-rose-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}>
                  <Activity className="h-4 w-4" />
                  {isDiabetic ? '✓ Diabetic' : 'Diabetic?'}
                </button>

                {gender === 'female' && (
                  <button onClick={() => setIsPregnant(!isPregnant)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border-2 ${
                      isPregnant ? 'bg-pink-50 border-pink-300 text-pink-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}>
                    <Baby className="h-4 w-4" />
                    {isPregnant ? '✓ Pregnant' : 'Pregnant?'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Symptoms Selection */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xl shadow-slate-200/40">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
              <Thermometer className="h-5 w-5 text-violet-600" /> Select Symptoms
            </h2>

            {/* Selected chips */}
            {selectedSymptoms.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedSymptoms.map(s => (
                  <span key={s} className="flex items-center gap-1.5 bg-violet-100 text-violet-700 px-3 py-1.5 rounded-full text-xs font-bold">
                    {s}
                    <button onClick={() => toggleSymptom(s)} className="hover:text-violet-900">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input type="text" value={symptomSearch} onChange={e => setSymptomSearch(e.target.value)}
                placeholder="Search symptoms…"
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all" />
            </div>

            {/* Symptom grid */}
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
              {filteredSymptoms.map(s => (
                <button key={s} onClick={() => toggleSymptom(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectedSymptoms.includes(s)
                      ? 'bg-violet-500 text-white shadow-md shadow-violet-500/30'
                      : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}>
                  {s}
                </button>
              ))}
            </div>

            {/* Custom symptom */}
            <div className="mt-3 flex gap-2">
              <input type="text" value={customSymptom} onChange={e => setCustomSymptom(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCustomSymptom()}
                placeholder="Add other symptom…"
                className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all" />
              <button onClick={addCustomSymptom}
                className="px-4 py-2 bg-violet-100 text-violet-700 rounded-xl text-sm font-bold hover:bg-violet-200 transition-colors">
                Add
              </button>
            </div>
          </div>

          {/* Analyze Button */}
          <button onClick={handleAnalyze} disabled={loading || selectedSymptoms.length === 0}
            className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-violet-500/30 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg">
            {loading ? (
              <><Loader2 className="h-5 w-5 animate-spin" /> Analyzing with AI…</>
            ) : (
              <><Stethoscope className="h-5 w-5" /> Analyze Symptoms</>
            )}
          </button>

          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-500 flex-shrink-0" />
              <p className="text-sm text-rose-700 font-medium">{error}</p>
            </div>
          )}
        </div>

        {/* RIGHT: AI Results */}
        <div className="xl:col-span-3 space-y-5">
          {!result && !loading && (
            <div className="bg-white rounded-3xl p-12 border border-slate-100 shadow-xl shadow-slate-200/40 text-center">
              <div className="bg-violet-50 p-6 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                <Stethoscope className="h-12 w-12 text-violet-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-700 mb-2">AI Medicine Recommendations</h3>
              <p className="text-slate-400 max-w-md mx-auto">
                Fill in your patient profile and select your symptoms, then click &quot;Analyze Symptoms&quot; to get AI-powered medicine recommendations.
              </p>
            </div>
          )}

          {loading && (
            <div className="bg-white rounded-3xl p-12 border border-slate-100 shadow-xl shadow-slate-200/40 text-center">
              <div className="relative mx-auto w-20 h-20 mb-6">
                <div className="w-20 h-20 rounded-full border-4 border-violet-100 border-t-violet-500 animate-spin"></div>
                <Stethoscope className="h-8 w-8 text-violet-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <h3 className="text-lg font-bold text-slate-700 mb-1">Analyzing your symptoms…</h3>
              <p className="text-slate-400 text-sm">Our AI is reviewing your profile and finding the best medicines</p>
            </div>
          )}

          {result && (
            <div className="space-y-5 animate-in slide-in-from-bottom-4 duration-300">
              {/* Diagnosis Card */}
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xl shadow-slate-200/40">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-violet-100 rounded-xl">
                      <Stethoscope className="h-5 w-5 text-violet-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg">AI Diagnosis</h3>
                      <p className="text-violet-600 text-sm font-medium">Based on your symptoms & profile</p>
                    </div>
                  </div>
                  <SeverityBadge severity={result.severity} />
                </div>
                <p className="text-slate-700 bg-slate-50 rounded-xl p-4 border border-slate-100 font-medium">
                  {result.diagnosis}
                </p>
              </div>

              {/* Medicine Cards */}
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <Pill className="h-5 w-5 text-violet-600" /> Recommended Medicines ({result.medicines?.length || 0})
                </h3>
                <div className="space-y-4">
                  {result.medicines?.map((med, i) => (
                    <div key={i} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-lg shadow-slate-200/30 hover:-translate-y-0.5 transition-all">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-xl ${
                            med.form === 'syrup' ? 'bg-blue-100 text-blue-600' :
                            med.form === 'injection' ? 'bg-rose-100 text-rose-600' :
                            'bg-emerald-100 text-emerald-600'
                          }`}>
                            <FormIcon form={med.form} />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900">{med.name}</h4>
                            <p className="text-sm text-slate-500">{med.brandName}</p>
                          </div>
                        </div>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${
                          med.form === 'tablet' || med.form === 'capsule' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                          med.form === 'syrup' ? 'bg-blue-50 text-blue-600 border border-blue-200' :
                          'bg-rose-50 text-rose-600 border border-rose-200'
                        }`}>
                          💊 {med.form} • {med.power}
                        </span>
                      </div>

                      <p className="text-sm text-violet-600 font-medium mb-3 bg-violet-50 px-3 py-1.5 rounded-lg inline-block">
                        {med.purpose}
                      </p>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Dosage</p>
                          <p className="text-xs font-bold text-slate-700">{med.dosage}</p>
                        </div>
                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Frequency</p>
                          <p className="text-xs font-bold text-slate-700">{med.frequency}</p>
                        </div>
                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Duration</p>
                          <p className="text-xs font-bold text-slate-700">{med.duration}</p>
                        </div>
                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Timing</p>
                          <p className="text-xs font-bold text-slate-700">{med.timing}</p>
                        </div>
                      </div>

                      {(med.warnings?.length > 0 || med.contraindications?.length > 0) && (
                        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                          {med.warnings?.map((w, j) => (
                            <p key={j} className="text-xs text-amber-700 flex items-start gap-1.5 mb-1 last:mb-0">
                              <AlertTriangle className="h-3 w-3 flex-shrink-0 mt-0.5" /> {w}
                            </p>
                          ))}
                          {med.contraindications?.map((c, j) => (
                            <p key={`c-${j}`} className="text-xs text-rose-600 flex items-start gap-1.5 mb-1 last:mb-0">
                              <ShieldAlert className="h-3 w-3 flex-shrink-0 mt-0.5" /> {c}
                            </p>
                          ))}
                        </div>
                      )}

                      {/* Cross-Feature: Book & Search from Dataset */}
                      <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                        <a href={`/dashboard/medicines?search=${encodeURIComponent(med.name)}`}
                          className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5">
                          <Pill className="h-3.5 w-3.5" /> Book This Medicine
                        </a>
                        <a href="/dashboard/diagnostic-centre"
                          className="flex-1 bg-violet-100 hover:bg-violet-200 text-violet-700 text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5">
                          <Stethoscope className="h-3.5 w-3.5" /> Book Test
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* General Advice */}
              {result.generalAdvice && result.generalAdvice.length > 0 && (
                <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100">
                  <h3 className="font-bold text-emerald-800 mb-3 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5" /> General Advice
                  </h3>
                  <ul className="space-y-2">
                    {result.generalAdvice.map((a, i) => (
                      <li key={i} className="text-sm text-emerald-700 flex items-start gap-2">
                        <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" /> {a}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* When to see doctor */}
              {result.whenToSeeDoctor && (
                <div className="bg-rose-50 rounded-2xl p-5 border border-rose-100">
                  <h3 className="font-bold text-rose-800 mb-2 flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5" /> When to See a Doctor
                  </h3>
                  <p className="text-sm text-rose-700">{result.whenToSeeDoctor}</p>
                </div>
              )}

              {/* Disclaimer */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-center">
                <p className="text-xs text-slate-500 font-medium flex items-center justify-center gap-1.5">
                  <Info className="h-3.5 w-3.5" />
                  {result.disclaimer || 'This is AI-generated advice. Always consult a qualified doctor.'}
                </p>
              </div>

              {/* Healthcare CTA — Loan & Nearby Hospitals */}
              <HealthcareCTA
                context={`Based on your ${result.severity} ${result.diagnosis} diagnosis`}
                condition={result.diagnosis}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
