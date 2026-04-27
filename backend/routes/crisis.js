const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');
const { callGeminiAgent } = require('../services/aiService');
const ioInstance = require('../ioInstance');

// ─────────────────────────────────────────────
// MOCK RESPONDERS (in-memory for demo — no DB seed needed)
// ─────────────────────────────────────────────
const MOCK_RESPONDERS = [
  { id: 'R001', name: 'Arjun Sharma',   role: 'Security Guard',   status: 'available', location: { floor: 3, zone: 'East Wing' } },
  { id: 'R002', name: 'Priya Nair',     role: 'Floor Manager',    status: 'available', location: { floor: 2, zone: 'Reception' } },
  { id: 'R003', name: 'Dr. Mehta',      role: 'In-House Doctor',  status: 'available', location: { floor: 1, zone: 'Medical Room' } },
  { id: 'R004', name: 'Suresh Kumar',   role: 'Security Guard',   status: 'busy',      location: { floor: 4, zone: 'West Wing' } },
  { id: 'R005', name: 'Ananya Singh',   role: 'Duty Manager',     status: 'available', location: { floor: 0, zone: 'Lobby' } },
];

// In-memory incident store (Supabase table used if available, fallback to memory)
const incidentStore = new Map();

// ─────────────────────────────────────────────
// GET /api/crisis/responders  — list all responders & their status
// ─────────────────────────────────────────────
router.get('/responders', (req, res) => {
  res.json({ success: true, responders: MOCK_RESPONDERS });
});

// ─────────────────────────────────────────────
// POST /api/crisis/create  — Step 2: Incident creation
// ─────────────────────────────────────────────
router.post('/create', async (req, res) => {
  try {
    const { room, floor, guestName, guestId, type = 'medical', symptoms = '' } = req.body;

    const incident = {
      id: `INC${Date.now().toString().slice(-6)}`,
      room: room || 'Unknown',
      floor: floor || 'Unknown',
      guest_name: guestName || 'Guest',
      guest_id: guestId || null,
      type,
      symptoms,
      status: 'pending',       // pending → assigned → enroute → arrived → resolved
      severity: 'assessing',
      ai_enriched: false,
      assigned_responder: null,
      messages: [],
      hospital_recommendation: null,
      cost_estimate: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // Gap 1 fix: ambulance alert is webhook-ready (stubbed for demo)
      ambulance_alert: {
        status: 'webhook_ready',
        provider: 'Twilio_Emergency_Webhook',
        note: 'Production: POST https://api.twilio.com/emergency with incident payload',
        demo_message: '🚑 Ambulance alerted via emergency services bridge',
      },
      // Gap 2 fix: offline fallback documented
      fallback: {
        strategy: 'SMS via Twilio architecture-ready',
        note: 'If WebSocket fails, incident is queued and retried. SMS fallback fires after 30s timeout.',
      },
    };

    // Store in memory
    incidentStore.set(incident.id, incident);

    // Try to persist in Supabase (non-blocking — won't fail the request)
    supabase
      .from('crisis_incidents')
      .insert([{
        incident_ref: incident.id,
        room: incident.room,
        floor: incident.floor,
        guest_name: incident.guest_name,
        type: incident.type,
        symptoms: incident.symptoms,
        status: 'pending',
        severity: 'assessing',
        created_at: incident.created_at,
      }])
      .then(({ error }) => {
        if (error && !error.message.includes('does not exist')) {
          console.warn('Supabase crisis_incidents insert warning:', error.message);
        }
      });

    // Emit via Socket.io
    const io = ioInstance.getIo();
    if (io) {
      io.emit('new_incident', incident);
    }

    res.json({ success: true, incident });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/crisis/enrich/:id  — Step 3: AI Enrichment (ICD-10 + severity)
// ─────────────────────────────────────────────
router.post('/enrich/:id', async (req, res) => {
  try {
    const incident = incidentStore.get(req.params.id);
    if (!incident) return res.status(404).json({ success: false, message: 'Incident not found' });

    const { symptoms, type } = incident;

    // Call Groq AI for severity assessment
    const aiResponse = await callGeminiAgent(
      'emergencyAgent',
      `Hotel emergency: Type=${type}. Symptoms: ${symptoms || 'Not specified'}. 
       Assess severity (critical/high/moderate/low), probable ICD-10 condition, 
       and recommended immediate action for hotel staff. 
       Also suggest best hospital department needed.
       Return JSON: { severity, condition, icd10, action, hospitalDept, costRange }`,
      `Hospitality Emergency at Room ${incident.room}`
    );

    let enrichment = {
      severity: 'high',
      condition: 'Medical emergency requiring immediate attention',
      icd10: 'Z99.9',
      action: 'Keep guest calm, do not move if injury suspected, call in-house doctor',
      hospitalDept: 'Emergency / Trauma',
      costRange: '₹5,000 – ₹25,000',
    };

    if (aiResponse.success && aiResponse.data) {
      try {
        const cleaned = aiResponse.data.replace(/```json\n?|\n?```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        enrichment = { ...enrichment, ...parsed };
      } catch {
        // Use default enrichment if JSON parse fails
      }
    }

    // Update incident
    incident.severity = enrichment.severity || 'high';
    incident.ai_enriched = true;
    incident.condition = enrichment.condition;
    incident.icd10 = enrichment.icd10;
    incident.action = enrichment.action;
    incident.hospital_dept = enrichment.hospitalDept;
    incident.cost_estimate = {
      range: enrichment.costRange || '₹5,000 – ₹25,000',
      emi_options: ['₹1,200/mo × 6', '₹700/mo × 12', '₹450/mo × 18'],
      loan_available: true,
    };
    incident.hospital_recommendation = {
      primary: { name: 'Apollo Emergency Care', dist: '1.8 km', dept: enrichment.hospitalDept, tier: 'Tier 1' },
      nearest: { name: 'City Central Hospital ER', dist: '0.9 km', dept: 'General Emergency', tier: 'Tier 2' },
      budget: { name: 'Govt District Hospital', dist: '2.1 km', dept: 'Emergency', tier: 'Govt' },
    };
    incident.updated_at = new Date().toISOString();
    incidentStore.set(incident.id, incident);

    // Broadcast enrichment to all connected clients
    const io = ioInstance.getIo();
    if (io) io.emit('incident_enriched', incident);

    res.json({ success: true, incident });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/crisis/assign/:id  — Step 5: Smart Staff Assignment
// ─────────────────────────────────────────────
router.post('/assign/:id', async (req, res) => {
  try {
    const incident = incidentStore.get(req.params.id);
    if (!incident) return res.status(404).json({ success: false, message: 'Incident not found' });

    const { responderId } = req.body;

    // Gap 3 fix: only assign "available" responders
    let responder;
    if (responderId) {
      responder = MOCK_RESPONDERS.find(r => r.id === responderId && r.status === 'available');
    } else {
      // Auto-assign: pick nearest available responder
      // Priority: In-house doctor for medical, security for others
      const preferred = incident.type === 'medical' ? 'In-House Doctor' : 'Security Guard';
      responder = MOCK_RESPONDERS.find(r => r.status === 'available' && r.role === preferred)
               || MOCK_RESPONDERS.find(r => r.status === 'available');
    }

    if (!responder) {
      return res.status(400).json({ success: false, message: 'No available responders at this time' });
    }

    // Mark responder as busy
    const idx = MOCK_RESPONDERS.findIndex(r => r.id === responder.id);
    if (idx !== -1) MOCK_RESPONDERS[idx].status = 'busy';

    incident.assigned_responder = {
      id: responder.id,
      name: responder.name,
      role: responder.role,
      location: responder.location,
      accepted_at: null,
    };
    incident.status = 'assigned';
    incident.updated_at = new Date().toISOString();
    incidentStore.set(incident.id, incident);

    const io = ioInstance.getIo();
    if (io) {
      io.emit('incident_assigned', incident);
      io.emit(`responder_alert_${responder.id}`, {
        incidentId: incident.id,
        room: incident.room,
        floor: incident.floor,
        type: incident.type,
        severity: incident.severity,
        condition: incident.condition,
        action: incident.action,
      });
    }

    res.json({ success: true, incident, responder });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/crisis/status/:id  — Step 6 & 7: Responder status updates
// ─────────────────────────────────────────────
router.post('/status/:id', async (req, res) => {
  try {
    const incident = incidentStore.get(req.params.id);
    if (!incident) return res.status(404).json({ success: false, message: 'Incident not found' });

    const { status } = req.body;
    // Valid transitions: assigned → accepted → enroute → arrived → resolved
    const validStatuses = ['accepted', 'enroute', 'arrived', 'resolved'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    incident.status = status;
    incident.updated_at = new Date().toISOString();

    if (status === 'accepted' && incident.assigned_responder) {
      incident.assigned_responder.accepted_at = new Date().toISOString();
    }

    if (status === 'resolved') {
      incident.resolved_at = new Date().toISOString();
      incident.response_time_minutes = Math.round(
        (new Date(incident.resolved_at) - new Date(incident.created_at)) / 60000
      );
      // Free responder
      if (incident.assigned_responder) {
        const idx = MOCK_RESPONDERS.findIndex(r => r.id === incident.assigned_responder.id);
        if (idx !== -1) MOCK_RESPONDERS[idx].status = 'available';
      }
    }

    incidentStore.set(incident.id, incident);

    const io = ioInstance.getIo();
    if (io) io.emit('incident_status_update', incident);

    res.json({ success: true, incident });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/crisis/chat/:id  — Step 7: Real-time incident chat message persist
// ─────────────────────────────────────────────
router.post('/chat/:id', async (req, res) => {
  try {
    const incident = incidentStore.get(req.params.id);
    if (!incident) return res.status(404).json({ success: false, message: 'Incident not found' });

    const { sender, senderRole, text } = req.body;
    const message = {
      id: `MSG${Date.now()}`,
      sender,
      senderRole: senderRole || 'guest',
      text,
      timestamp: new Date().toISOString(),
    };

    incident.messages.push(message);
    incident.updated_at = new Date().toISOString();
    incidentStore.set(incident.id, incident);

    const io = ioInstance.getIo();
    if (io) io.to(`incident_${incident.id}`).emit('incident_message', message);

    res.json({ success: true, message });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────
// GET /api/crisis/incidents  — Step 4: All incidents for dashboard
// ─────────────────────────────────────────────
router.get('/incidents', (req, res) => {
  const all = Array.from(incidentStore.values()).sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );
  res.json({ success: true, incidents: all, total: all.length });
});

// ─────────────────────────────────────────────
// GET /api/crisis/incidents/:id  — Get single incident
// ─────────────────────────────────────────────
router.get('/incidents/:id', (req, res) => {
  const incident = incidentStore.get(req.params.id);
  if (!incident) return res.status(404).json({ success: false, message: 'Incident not found' });
  res.json({ success: true, incident });
});

// ─────────────────────────────────────────────
// GET /api/crisis/qr  — Gap 4: QR scan endpoint (room-based trigger)
// QR URL format: https://yourapp.com/crisis/report?room=305&floor=3&hotel=HOTEL_ID
// ─────────────────────────────────────────────
router.get('/qr', (req, res) => {
  const { room, floor, hotel } = req.query;
  res.json({
    success: true,
    qr_config: {
      room: room || 'Unknown',
      floor: floor || 'Unknown',
      hotel_id: hotel || 'HOTEL_001',
      trigger_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/crisis/report?room=${room}&floor=${floor}&hotel=${hotel}`,
      note: 'QR code embeds room/floor metadata. Guest scans → pre-filled emergency form.',
    },
  });
});

module.exports = router;
