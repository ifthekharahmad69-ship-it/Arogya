import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Cache predictor data
const cache: Record<string, any> = {};

function loadPredictor(name: string) {
  if (cache[name]) return cache[name];
  const filePath = path.join(process.cwd(), 'src', 'data', 'predictors', `${name}.json`);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  cache[name] = data;
  return data;
}

// Bayesian-style risk scoring: multiply likelihood ratios from each factor
function computeRisk(predictorData: any, inputs: Record<string, any>): {
  riskScore: number;
  riskLevel: string;
  factors: { name: string; value: string; impact: string; riskRate: number }[];
  advice: string[];
} {
  const baseRate = (predictorData.baseRate || 15) / 100;
  let logOdds = Math.log(baseRate / (1 - baseRate));
  const factors: any[] = [];
  const advice: string[] = [];
  const rf = predictorData.riskFactors;

  // Helper: find matching bucket and compute LR
  function applyFactor(label: string, riskData: any, matchKey: string) {
    if (!riskData || !riskData[matchKey]) return;
    const bucket = riskData[matchKey];
    const rate = (bucket.rate ?? bucket.highRiskRate ?? bucket.recoveryRate ?? 0) / 100;
    if (rate > 0 && baseRate > 0) {
      const lr = rate / baseRate;
      const contribution = Math.log(lr);
      logOdds += contribution * 0.5; // dampen to avoid extreme scores
      factors.push({
        name: label,
        value: matchKey,
        impact: lr > 1.2 ? 'increases' : lr < 0.8 ? 'decreases' : 'neutral',
        riskRate: Math.round(rate * 1000) / 10
      });
    }
  }

  // Age
  if (inputs.age && rf.byAge) {
    const age = parseInt(inputs.age);
    const ageKey = age < 35 ? '20-34' : age < 45 ? '35-44' : age < 55 ? '45-54' : age < 65 ? '55-64' : '65+';
    applyFactor('Age Group', rf.byAge, ageKey);
    if (age >= 55) advice.push('Age is a significant risk factor. Regular screenings are recommended.');
  }

  // Gender
  if (inputs.gender && rf.byGender) {
    const gKey = inputs.gender.toLowerCase() === 'male' ? 'male' : 'female';
    applyFactor('Gender', rf.byGender, gKey);
  }

  // BMI
  if (inputs.bmi && rf.byBMI) {
    const bmi = parseFloat(inputs.bmi);
    const bmiKey = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese';
    applyFactor('BMI Category', rf.byBMI, bmiKey);
    if (bmi >= 30) advice.push('Your BMI indicates obesity. Weight management can significantly reduce health risks.');
    if (bmi >= 25 && bmi < 30) advice.push('You are overweight. Regular exercise and a balanced diet can help.');
  }

  // Blood Pressure
  if (inputs.sysBP && rf.bySysBP) {
    const bp = parseFloat(inputs.sysBP);
    const bpKey = bp < 120 ? 'Normal (<120)' : bp < 130 ? 'Elevated (120-129)' : bp < 140 ? 'High Stage 1 (130-139)' : 'High Stage 2 (140+)';
    applyFactor('Systolic BP', rf.bySysBP, bpKey);
    if (bp >= 140) advice.push('Your blood pressure is high. Consult a doctor and consider lifestyle changes.');
  }

  // Cholesterol
  if (inputs.totChol && rf.byChol) {
    const chol = parseFloat(inputs.totChol);
    const cholKey = chol < 200 ? 'Desirable (<200)' : chol < 240 ? 'Borderline (200-239)' : 'High (240+)';
    applyFactor('Cholesterol', rf.byChol, cholKey);
    if (chol >= 240) advice.push('High cholesterol increases heart disease risk. Discuss statins with your doctor.');
  }

  // Glucose
  if (inputs.glucose && rf.byGlucose) {
    const glu = parseFloat(inputs.glucose);
    const gluKey = glu < 100 ? 'Normal (<100)' : glu < 126 ? 'Pre-diabetic (100-125)' : 'Diabetic (126+)';
    applyFactor('Glucose', rf.byGlucose, gluKey);
    if (glu >= 126) advice.push('Your glucose level indicates diabetes. Regular monitoring and medication are essential.');
  }

  // Smoking
  if (inputs.smoking && rf.bySmoking) {
    let sKey = '';
    if (inputs.smoking === 'Yes' || inputs.smoking === 'Current') sKey = 'smoker';
    else if (inputs.smoking === 'No' || inputs.smoking === 'Never') sKey = 'nonSmoker';
    else if (inputs.smoking === 'Former') sKey = 'Former';
    
    if (rf.bySmoking[sKey]) {
      applyFactor('Smoking', rf.bySmoking, sKey);
    } else if (rf.bySmoking['Current'] && inputs.smoking === 'Yes') {
      applyFactor('Smoking', rf.bySmoking, 'Current');
    } else if (rf.bySmoking['Never'] && inputs.smoking === 'No') {
      applyFactor('Smoking', rf.bySmoking, 'Never');
    }
    if (inputs.smoking === 'Yes' || inputs.smoking === 'Current') {
      advice.push('Smoking significantly increases your risk. Quitting is the single best thing you can do for your health.');
    }
  }

  // Diabetes flag
  if (inputs.diabetes && rf.byDiabetes) {
    const dKey = inputs.diabetes === 'Yes' ? 'diabetic' : 'nonDiabetic';
    applyFactor('Diabetes', rf.byDiabetes, dKey);
  }
  if (inputs.diabetes && rf.byDiabetes === undefined && rf.byDiabetes === undefined) {
    // Try 'bydm' for kidney
    if (rf.bydm) {
      const dKey = inputs.diabetes === 'Yes' ? 'yes' : 'no';
      applyFactor('Diabetes', rf.bydm, dKey);
    }
  }

  // Hypertension
  if (inputs.hypertension && rf.byhtn) {
    const hKey = inputs.hypertension === 'Yes' ? 'yes' : 'no';
    applyFactor('Hypertension', rf.byhtn, hKey);
    if (inputs.hypertension === 'Yes') advice.push('Hypertension requires continuous management. Monitor your BP regularly.');
  }

  // Alcohol
  if (inputs.alcohol && rf.byAlcohol) {
    const alc = parseFloat(inputs.alcohol);
    const alcKey = alc < 1 ? 'None (0)' : alc < 6 ? 'Low (1-5)' : alc < 11 ? 'Moderate (5-10)' : 'Heavy (10+)';
    applyFactor('Alcohol', rf.byAlcohol, alcKey);
    if (alc >= 10) advice.push('Heavy alcohol consumption increases disease risk. Reducing intake is recommended.');
  }
  if (inputs.alcohol && rf.byAlcohol_Use) {
    const alcKey = inputs.alcohol === 'Yes' ? 'Yes' : 'No';
    applyFactor('Alcohol Use', rf.byAlcohol_Use, alcKey);
  }

  // Family History
  if (inputs.familyHistory) {
    const fhFields = ['byFamily_History', 'byFamily_History'];
    for (const fhField of fhFields) {
      if (rf[fhField]) {
        applyFactor('Family History', rf[fhField], inputs.familyHistory);
        if (inputs.familyHistory === 'Yes') advice.push('Family history is a significant risk factor. Get regular checkups.');
        break;
      }
    }
  }

  // Allergies (asthma)
  if (inputs.allergies && rf.byAllergies) {
    applyFactor('Allergies', rf.byAllergies, inputs.allergies);
  }

  // Pollution (asthma)
  if (inputs.pollution && rf.byAir_Pollution_Level) {
    applyFactor('Air Pollution', rf.byAir_Pollution_Level, inputs.pollution);
  }

  // Dengue symptoms
  if (rf.bySymptomCombo) {
    const fever = inputs.fever === 'Yes' ? '1' : '0';
    const headache = inputs.headache === 'Yes' ? '1' : '0';
    const jointPain = inputs.jointPain === 'Yes' ? '1' : '0';
    const bleeding = inputs.bleeding === 'Yes' ? '1' : '0';
    const comboKey = `${fever}-${headache}-${jointPain}-${bleeding}`;
    if (rf.bySymptomCombo[comboKey]) {
      const rate = rf.bySymptomCombo[comboKey].rate / 100;
      // Direct probability from symptom combo
      const directScore = Math.max(0, Math.min(100, rf.bySymptomCombo[comboKey].rate));
      const odds = rate / (1 - rate + 0.001);
      logOdds = Math.log(odds + 0.001);
      factors.push({ name: 'Symptom Combination', value: comboKey, impact: rate > 0.5 ? 'increases' : 'neutral', riskRate: directScore });
    }
    if (inputs.bleeding === 'Yes') advice.push('⚠️ URGENT: Unusual bleeding with fever may indicate severe dengue. Seek medical attention immediately!');
    if (inputs.fever === 'Yes' && inputs.jointPain === 'Yes') advice.push('Fever with joint pain is a classic dengue symptom. Get a blood test done.');
  }

  // TSH (thyroid)
  if (inputs.tsh && rf.byTSH) {
    const tsh = parseFloat(inputs.tsh);
    const tshKey = tsh < 1 ? 'Low (<1)' : tsh < 4 ? 'Normal (1-4)' : tsh < 8 ? 'Elevated (4-8)' : 'High (8+)';
    applyFactor('TSH Level', rf.byTSH, tshKey);
    if (tsh >= 8) advice.push('Elevated TSH levels require further thyroid evaluation. Consult an endocrinologist.');
  }

  // Radiation (thyroid)
  if (inputs.radiation && rf.byRadiation_Exposure) {
    applyFactor('Radiation Exposure', rf.byRadiation_Exposure, inputs.radiation);
  }

  // Mental Health specific factors
  // Sleep
  if (inputs.sleepHours && rf.bySleep) {
    const sleep = parseFloat(inputs.sleepHours);
    const sleepKey = sleep < 5 ? 'Very Low (<5h)' : sleep < 6 ? 'Low (5-6h)' : sleep < 8 ? 'Normal (6-8h)' : 'Good (8+h)';
    applyFactor('Sleep Hours', rf.bySleep, sleepKey);
    if (sleep < 5) advice.push('You are severely sleep-deprived. Poor sleep significantly impacts mental health. Aim for 7-8 hours.');
    else if (sleep < 6) advice.push('Your sleep is below recommended levels. Try to get at least 7 hours for better mental health.');
  }

  // Stress Level
  if (inputs.stressLevel && rf.byStress) {
    const stress = parseFloat(inputs.stressLevel);
    const stressKey = stress < 4 ? 'Low' : stress < 7 ? 'Moderate' : 'High';
    applyFactor('Stress Level', rf.byStress, stressKey);
    if (stress >= 7) advice.push('High stress levels are a major mental health risk. Consider meditation, yoga, or professional counseling.');
  }

  // Social Media
  if (inputs.socialMediaHours && rf.bySocialMedia) {
    const sm = parseFloat(inputs.socialMediaHours);
    const smKey = sm < 2 ? 'Low (<2h)' : sm < 4 ? 'Moderate (2-4h)' : sm < 6 ? 'High (4-6h)' : 'Excessive (6+h)';
    applyFactor('Social Media', rf.bySocialMedia, smKey);
    if (sm >= 6) advice.push('Excessive social media use is linked to anxiety and depression. Try digital detox breaks.');
  }

  // Screen Time
  if (inputs.screenTime && rf.byScreenTime) {
    const st = parseFloat(inputs.screenTime);
    const stKey = st < 4 ? 'Low (<4h)' : st < 8 ? 'Moderate (4-8h)' : st < 12 ? 'High (8-12h)' : 'Excessive (12+h)';
    applyFactor('Screen Time', rf.byScreenTime, stKey);
    if (st >= 12) advice.push('Excessive screen time affects sleep and mental well-being. Take regular breaks using the 20-20-20 rule.');
  }

  // Diet Quality (mental health)
  if (inputs.dietQuality && rf.byDiet) {
    applyFactor('Diet Quality', rf.byDiet, inputs.dietQuality);
    if (inputs.dietQuality === 'Poor') advice.push('Poor diet affects brain chemistry. Include omega-3 rich foods, vegetables, and whole grains.');
  }

  // Social Activity
  if (inputs.socialActivity && rf.bySocialActivity) {
    applyFactor('Social Activity', rf.bySocialActivity, inputs.socialActivity);
    if (inputs.socialActivity === 'Low') advice.push('Low social interaction increases loneliness risk. Try joining community groups or clubs.');
  }

  // Exercise (mental health)
  if (inputs.exerciseFrequency && rf.byExercise) {
    const ex = parseFloat(inputs.exerciseFrequency);
    const exKey = ex < 1 ? 'None (0)' : ex < 3 ? 'Low (1-2)' : ex < 5 ? 'Moderate (3-4)' : 'High (5+)';
    applyFactor('Exercise Frequency', rf.byExercise, exKey);
    if (ex < 1) advice.push('No exercise is a significant risk factor for poor mental health. Even 30 minutes of walking helps!');
  }

  // Convert log-odds back to probability
  let riskScore = Math.round(1 / (1 + Math.exp(-logOdds)) * 100);
  riskScore = Math.max(1, Math.min(95, riskScore)); // Clamp to 1-95%

  const riskLevel = riskScore < 20 ? 'Low' : riskScore < 40 ? 'Moderate' : riskScore < 60 ? 'High' : 'Very High';

  // Default advice
  if (advice.length === 0) {
    if (riskScore < 20) advice.push('Your risk appears low. Maintain a healthy lifestyle with regular exercise and balanced diet.');
    else if (riskScore < 40) advice.push('Moderate risk detected. Consider lifestyle improvements and regular health checkups.');
    else advice.push('Your risk level is elevated. Please consult a healthcare professional for detailed evaluation.');
  }

  return { riskScore, riskLevel, factors, advice };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { predictor, inputs } = body;

    if (!predictor || !inputs) {
      return NextResponse.json({ error: 'predictor and inputs are required' }, { status: 400 });
    }

    const validPredictors = ['diabetes-heart', 'dengue', 'kidney', 'liver', 'lung', 'cancer', 'thyroid', 'asthma', 'mental-health'];
    if (!validPredictors.includes(predictor)) {
      return NextResponse.json({ error: `Invalid predictor. Valid options: ${validPredictors.join(', ')}` }, { status: 400 });
    }

    const predictorData = loadPredictor(predictor);
    const result = computeRisk(predictorData, inputs);

    return NextResponse.json({
      predictor: predictorData.name,
      description: predictorData.description,
      totalPatientsAnalyzed: predictorData.totalPatients,
      ...result
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET: Return list of available predictors with their fields
export async function GET() {
  const validPredictors = ['diabetes-heart', 'dengue', 'kidney', 'liver', 'lung', 'cancer', 'thyroid', 'asthma', 'mental-health'];
  const predictors = validPredictors.map(name => {
    const data = loadPredictor(name);
    return {
      id: name,
      name: data.name,
      description: data.description,
      totalPatients: data.totalPatients,
      fields: data.fields
    };
  });
  return NextResponse.json({ predictors });
}
