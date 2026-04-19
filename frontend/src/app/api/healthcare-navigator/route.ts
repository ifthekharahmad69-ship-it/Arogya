import { NextRequest, NextResponse } from 'next/server';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

const SYSTEM_PROMPT = `You are an AI-powered Healthcare and Financial Decision Navigator for India.
Your role: Help users make informed medical AND financing decisions.
Rules: Neutral (no lender bias). Transparent (show assumptions). Responsible (no over-borrowing).
You do NOT: Diagnose, guarantee approvals, rank lenders as "best".

Respond ONLY with a valid JSON object. No markdown, no preamble, no explanation, no code fences.

JSON schema (all numbers are raw INR integers):
{
  "detectedCondition": "string",
  "icdCode": "string (ICD-10)",
  "snomedConcept": "string (SNOMED CT concept)",
  "recommendedProcedure": "string",
  "clinicalPathway": ["step 1","step 2","step 3","step 4"],
  "urgencyLevel": "routine|urgent|emergency",
  "hospitals": [
    { "name":"string","category":"Premium|Mid-tier|Budget","location":"string","distance":"string","rating":4.2,"accreditations":["NABH"],"costRange":{"min":150000,"max":300000},"strengths":["string"],"specialization":"string","procedureVolume":"string","appointmentAvailability":"string","lat":0,"lng":0 }
  ],
  "costBreakdown": {
    "procedure":{"min":100000,"max":200000},
    "hospitalStay":{"min":20000,"max":50000},
    "medicines":{"min":10000,"max":25000},
    "diagnostics":{"min":8000,"max":20000},
    "contingency":{"min":15000,"max":40000},
    "total":{"min":153000,"max":335000}
  },
  "affordabilityStatus":"fully_affordable|partial_financing|high_stress|unknown",
  "safeSpendLimit": null,
  "emiAffordabilityThreshold": null,
  "loanNeeded": 0,
  "emiScenarios": [
    {"tenure":6,"interestRate":14,"emi":28000,"totalRepayment":168000,"totalInterest":18000,"incomePercent":23,"safe":true},
    {"tenure":12,"interestRate":14,"emi":15000,"totalRepayment":180000,"totalInterest":30000,"incomePercent":12,"safe":true},
    {"tenure":24,"interestRate":16,"emi":9000,"totalRepayment":216000,"totalInterest":66000,"incomePercent":7,"safe":true},
    {"tenure":36,"interestRate":18,"emi":7000,"totalRepayment":252000,"totalInterest":102000,"incomePercent":6,"safe":true}
  ],
  "lenderOptions": [
    {"type":"NBFC","examples":"Bajaj Finserv, Tata Capital, Aditya Birla","interestRange":"12-18% p.a.","approvalTime":"1-3 days","docLevel":"Minimal","note":"Fast disbursal, slightly higher rates"},
    {"type":"Private Bank","examples":"HDFC, ICICI, Axis","interestRange":"10-15% p.a.","approvalTime":"3-7 days","docLevel":"Moderate","note":"Competitive rates with broad network"},
    {"type":"Public Bank","examples":"SBI, PNB, Canara","interestRange":"9-13% p.a.","approvalTime":"7-14 days","docLevel":"Detailed","note":"Lowest rates, longer processing time"},
    {"type":"Digital Lender","examples":"KreditBee, MoneyTap, PaySense","interestRange":"14-24% p.a.","approvalTime":"Same day","docLevel":"Minimal","note":"Instant approval, higher cost"}
  ],
  "recommendedPlan": {"tenure":12,"interestRate":14,"emi":15000,"rationale":"string"},
  "financialRiskScore": 0.42,
  "financialRiskLabel": "Moderate",
  "notes": ["note1","note2","note3"],
  "assumptions": ["assumption1","assumption2"],
  "disclaimer": "Two-sentence disclaimer."
}

Calculation rules:
- 3 hospitals: one Premium, one Mid-tier, one Budget — use REAL hospital names for the given city
- If user lat/lng is provided, use REAL hospitals near that area of the city with realistic distances
- City multiplier: Metro (Mumbai/Delhi/Bangalore/Chennai/Kolkata) = 1.3x, Tier-2 = 1.0x, Tier-3 = 0.8x
- lat/lng for hospitals: provide approximate coordinates near the user's area
- safeSpendLimit = monthly_income * 4 (null if no income)
- emiAffordabilityThreshold = monthly_income * 0.25 (null if no income)
- loanNeeded = max(0, total.min - available_budget). If no budget, loanNeeded = total.min
- EMI formula: P*r*(1+r)^n / ((1+r)^n - 1), r = annual_rate/(12*100), n = months
- incomePercent = (emi/monthly_income)*100
- safe = incomePercent <= 30
- affordabilityStatus: fully_affordable if loanNeeded=0, partial_financing if loanNeeded < safeSpendLimit, high_stress if loanNeeded >= safeSpendLimit, unknown if no income
- financialRiskScore 0-1 based on income-to-cost ratio, EMI burden, comorbidities
- recommendedPlan: safest plan (EMI <= emiAffordabilityThreshold). null if income unknown
- Adjust contingency upward for comorbidities`;

function getApiKeys(): string[] {
  const keys: string[] = [];
  const envVars = [
    'GROQ_API_KEY_1', 'GROQ_API_KEY_2', 'GROQ_API_KEY_3', 'GROQ_API_KEY_4',
    'GROQ_API_KEY', 'GROQ_API_KEY_ASSISTANT', 'GROQ_API_KEY_EXPLAIN',
    'GROQ_API_KEY_IMAGE', 'GROQ_API_KEY_QUIZ',
  ];
  for (const envVar of envVars) {
    const key = process.env[envVar];
    if (key && key.length > 10 && !keys.includes(key)) keys.push(key);
  }
  return keys;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, city, age, gender, comorbidities, income, budget, lat, lng, area } = body;

    if (!query || typeof query !== 'string' || !query.trim()) {
      return NextResponse.json({ error: 'A health query is required.' }, { status: 400 });
    }

    const apiKeys = getApiKeys();
    if (apiKeys.length === 0) {
      return NextResponse.json({ error: 'AI service not configured.' }, { status: 500 });
    }

    const userMessage = `Patient Query: ${query}
City: ${city || 'Mumbai'}
User Location: ${lat && lng ? `Latitude ${lat}, Longitude ${lng}, Area: ${area || 'unknown'}` : 'not provided'}
Age: ${age || 'not specified'}
Gender: ${gender || 'not specified'}
Comorbidities: ${comorbidities || 'none reported'}
Monthly Income: ${income ? `₹${income}` : 'not provided'}
Available Budget: ${budget ? `₹${budget}` : 'not specified'}

Generate a full healthcare + financial navigation report. Use REAL hospital names near the user's location in ${city || 'Mumbai'}. Include lat/lng coordinates for each hospital.`;

    let lastError = '';

    for (const apiKey of apiKeys) {
      try {
        const res = await fetch(GROQ_API_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              { role: 'user', content: userMessage },
            ],
            temperature: 0.3,
            max_tokens: 3500,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const raw = data.choices?.[0]?.message?.content;
          if (!raw) { lastError = 'Empty AI response'; continue; }
          const clean = raw.replace(/```json|```/g, '').trim();
          try {
            const parsed = JSON.parse(clean);
            return NextResponse.json({ success: true, result: parsed });
          } catch {
            lastError = 'AI returned invalid JSON';
            continue;
          }
        }

        if (res.status === 429) {
          lastError = 'Rate limited';
          continue;
        }
        lastError = `API error: ${res.status}`;
      } catch (err: any) {
        lastError = err.message;
      }
    }

    return NextResponse.json(
      { error: `Failed to get AI response: ${lastError}` },
      { status: 502 }
    );
  } catch (error: any) {
    console.error('Navigator API error:', error);
    return NextResponse.json(
      { error: error.message || 'Something went wrong.' },
      { status: 500 }
    );
  }
}
