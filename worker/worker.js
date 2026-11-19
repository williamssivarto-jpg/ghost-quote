// SiteIQ worker: the only thing that talks to the AI providers.
// It holds the API keys, the model, the site instructions and the PIN,
// so the public page can't be used to run other prompts on your account.
//
// Settings (Cloudflare > Workers & Pages > siteiq-proxy > Settings):
//   Secrets:   OPENROUTER_API_KEY, ANTHROPIC_API_KEY, SITE_PIN
//   Optional:  OPENROUTER_MODEL, ANTHROPIC_MODEL
//   KV binding named LIMITS (for daily limits and PIN lockout)

const ALLOWED_ORIGINS = [
  'https://williamssivarto-jpg.github.io',
];
const MAX_TOKENS = 1000;
const MAX_MESSAGES = 20;          // the last 20 turns of a conversation are sent
const MAX_CHARS = 2000;           // longest single message accepted
const DAILY_PER_ADDRESS = 300;    // questions a day from one network address
const DAILY_TOTAL = 2000;         // questions a day across everyone
const PIN_TRIES_PER_HOUR = 10;    // wrong PINs from one address before a 1-hour lockout

const ASSIGNMENT_INSTRUCTIONS = `ASSIGNMENT INSTRUCTIONS - HARTFIELD BUILDING SOCIETY
HARTFIELD HOUSE, 14 ASHFORD ROW, BIRMINGHAM, B3 9ZZ
DOCUMENT REFERENCE: HBS-AI-2026-001 | VERSION: 3.2 | ISSUE DATE: 1 JANUARY 2026
Issued by: Brightwell Security Ltd | Contract Manager: James Hodgkiss | j.hodgkiss@brightwell.example | 07700 900 101

SECTION 1 - BUILDING DESCRIPTION
Hartfield House is a 3-floor commercial office building at 14 Ashford Row, Birmingham B3 9ZZ. Regional HQ for Hartfield Building Society. Built 1987, refurbished 2019. 12,400 sq ft across three floors plus basement plant room and rooftop plant area.

FLOOR LAYOUT:
GROUND FLOOR: Main public reception (south, Ashford Row). Customer service area (public, Mon-Fri 09:00-17:00). Staff entrance (east, Warwick Passage). Security control room (adjacent reception, coded door). Post room and goods-in bay (rear, Warwick Passage). Disabled WC. IT server room (Level 3 access required).
FIRST FLOOR: Open plan staff office (80 workstations). HR department (north corner). Staff kitchen and break room. Meeting rooms 1A (6), 1B (12), 1C (20 persons). Finance department (Level 2 access).
SECOND FLOOR: Executive offices (Board and Senior Management). Boardroom (24 persons, advance booking via PA). Chief Executive suite (Level 3 access always). Legal and Compliance. IT helpdesk.
BASEMENT: Plant room (boilers, electrical, HVAC). Archive storage (Level 2). Bicycle storage. Stairwell only - no lift to basement.
ROOF: Plant area (AC units, comms). Access via 2nd floor fire escape stairwell only. Restricted - engineer visits by appointment. Officers must accompany all roof access and log in site diary.

ACCESS POINTS:
MAIN ENTRANCE - Ashford Row (south): Public and staff. Automatic sliding doors. 24hr CCTV. Officer at reception at all times.
STAFF ENTRANCE - Warwick Passage (east): Staff only via proximity card. No public access ever. Intercom to control room.
GOODS-IN BAY - Warwick Passage (rear east): Deliveries and collections only. Roller shutter controlled from control room. Never leave unattended when open.
FIRE EXIT - North elevation: Emergency only. Alarmed. No access from outside. Investigate and log any activation immediately.
FIRE EXIT - West elevation (first floor): Emergency only. Alarmed. Opens to fire escape stairwell. Investigate and log any activation.
LIFTS: Two passenger lifts in main lobby. Level 2 card required for second floor executive access. Lift engineer: lift maintenance contractor - 0808 157 0003.

SECTION 2 - STAFFING AND SHIFT PATTERNS
Security Site Manager: Barry Bonds - b.bonds@brightwell.example - 07700 900 102
Deputy Site Manager: Sandra Okafor - s.okafor@brightwell.example - 07700 900 103
Contract Manager (Brightwell): James Hodgkiss - j.hodgkiss@brightwell.example - 07700 900 101
Client Security Lead (Hartfield BS): Trevor Marsh - t.marsh@hartfield.example - 0121 496 0001 - Out of hours: 07700 900 104

SHIFT PATTERNS:
DAY SHIFT: 07:00-19:00 (12 hours)
NIGHT SHIFT: 19:00-07:00 (12 hours)
Minimum staffing: Day Mon-Fri 3 officers. Day Sat 2 officers. Night all days 1 officer. Public holidays 2 officers.

BREAKS:
Day shift: Two 30-minute breaks at 10:00-10:30 and 15:00-15:30. Reception must never be left unstaffed. Officer 2 covers reception during breaks.
Night shift: One 45-minute break 02:00-02:45. Officer must remain on site and contactable. Monitor control room via CCTV during break.

SECTION 3 - RECEPTION DUTIES
OPENING PROCEDURES (07:00):
1. Relieve night shift officer and receive full verbal handover
2. Check and sign site diary - note overnight incidents or required actions
3. Test all door entry systems - report faults to Site Manager
4. Check CCTV cameras operational - report faults immediately
5. Ensure reception desk clean and presentable
6. Confirm visitor pass stock - reorder if below 20 passes
7. Check post room for overnight deliveries
8. Unlock customer service area doors at 08:55 for 09:00 opening
9. Ensure fire escape routes clear and unobstructed

CLOSING PROCEDURES (19:00):
1. Ensure all public areas clear of visitors and public
2. Lock customer service area doors
3. Conduct full building sweep - all floors including toilets and meeting rooms
4. Check all fire exits secure but not obstructed
5. Confirm all staff exited or logged as working late
6. Brief incoming night shift officer - verbal handover plus site diary
7. Complete handover entry in site diary

ONGOING RECEPTION DUTIES:
- Greet all visitors professionally and by name where possible
- Challenge all unescorted persons in restricted areas
- Monitor CCTV from control room minimum every 30 minutes
- Answer telephone: "Hartfield House Security, good morning/afternoon/evening, how can I help you?"
- Log all calls, visitors, incidents, and deliveries in site diary
- Monitor access system for door held open or forced entry alerts
- Report suspicious behaviour immediately to Site Manager

SECTION 4 - ACCESS CONTROL
ACCESS LEVELS:
LEVEL 1 - General Staff: Ground and first floor unrestricted areas. Staff entrance. All permanent staff from day one.
LEVEL 2 - Senior Staff: All Level 1 plus second floor, finance department, archive storage, lift to executive floor. HR approval with line manager sign-off.
LEVEL 3 - Restricted: All Level 2 plus IT server room, Chief Executive suite, plant room. CEO or IT Director approval only.
VISITOR ACCESS: Temporary paper pass, day of visit only. Escorted at all times. No electronic access - doors opened manually by escort.

FORGOTTEN PASS PROCEDURE:
1. Ask for full name and department
2. Check staff list in security control room folder (updated monthly by HR)
3. If confirmed - issue temporary yellow day pass. Record in temporary pass log: name, department, date, time issued, time returned
4. Instruct staff member to return pass before leaving building
5. Inform staff member to contact HR for replacement card if lost
6. DO NOT grant Level 2 or Level 3 access on temporary pass regardless of seniority
7. If not on staff list - do not grant access. Contact Site Manager immediately.

LOST OR STOLEN PASS PROCEDURE:
1. Record report in site diary immediately - name, department, card number if known, date/time
2. Immediately suspend card on Paxton Net2 system
3. Issue temporary yellow day pass
4. Notify HR: hr@hartfield.example and copy Site Manager
5. If stolen (not lost) - also notify Trevor Marsh (Client Security Lead) and complete Security Incident Report
6. Replacement card issued by HR within 2 working days
7. Log all actions in site diary

TAILGATING: Strictly prohibited. Challenge any person observed tailgating. If unable to produce valid ID - treat as intruder (see Section 7).

SECTION 5 - VISITOR PASS PROCEDURE
ISSUING A VISITOR PASS:
1. Greet visitor, ask full name and name of person they are visiting
2. Call host staff member to confirm - internal directory in red folder on reception desk
3. If host does not answer - wait 5 minutes and try again. If no answer after two attempts - visitor must not be admitted
4. Ask visitor to sign visitor log book: full name, company, host name, purpose, time of arrival
5. Take photographic ID for visits to second floor or above - note ID type and reference number in visitor log
6. Issue visitor pass (blue laminated card with numbered lanyard) - note pass number in visitor log
7. Inform visitor: wear pass visibly at all times, remain with host, return pass on departure
8. Call host to collect visitor from reception - do not give directions
9. Record departure time in visitor log when pass returned

UNANNOUNCED VISITORS: Follow standard procedure. Host must come to reception personally. If host declines - inform visitor staff member is unavailable and offer to take message. Never disclose if staff member is in the building.

CONTRACTOR VISITS: Must produce valid Contractor ID and be on approved contractor register (held in control room). If not on register - refuse entry and contact Site Manager. Must be accompanied by Hartfield BS facilities contact in restricted areas. Officers must not escort contractors into Level 3 areas without written authorisation from Client Security Lead.

SECTION 6 - EMERGENCY PROCEDURES
FIRE ALARM ACTIVATION:
IMMEDIATE ACTIONS:
1. Treat every activation as a real fire - never assume false alarm
2. Identify zone from zone indicator panel in security control room
3. PA announcement: "Attention please. The fire alarm has activated. Please evacuate the building immediately using the nearest fire exit. Do not use the lifts. Make your way to the assembly point."
4. Assembly point: Ashford Square, north side - green assembly point signs
5. Call 999 immediately - do not wait to investigate
6. Assist mobility-impaired persons to refuge points on each floor (adjacent to fire exit stairwell) - inform fire service of their location

EVACUATION DUTIES:
- Ground floor officer: sweep ground floor, clear customer area, take visitor log to assembly point
- First floor officer: sweep first floor including meeting rooms and toilets
- Second floor officer: sweep second floor including executive suites and boardroom
- Night shift (single officer): activate PA, call 999, sweep ground floor only - DO NOT enter upper floors alone
DO NOT re-enter until fire service confirms safe.

FIRE ALARM ZONES:
Zone 1: Ground floor - reception, customer area, post room
Zone 2: First floor - open plan office, meeting rooms
Zone 3: Second floor - executive offices, boardroom
Zone 4: Basement - plant room, archive
Zone 5: External - car park and perimeter
Zone indicator panel is in the security control room. Log all activations: zone, time, actions taken.

BOMB THREAT - TELEPHONE PROCEDURE:
1. Stay calm. Do not hang up.
2. Keep caller talking as long as possible
3. Complete bomb threat checklist immediately - red folder on reception desk
4. After call - dial 999
5. Do NOT activate fire alarm until instructed by police
6. Notify Site Manager and Client Security Lead immediately
7. Follow police instructions at all times

MEDICAL EMERGENCY:
1. Call 999 immediately if unconscious, not breathing, or in serious distress
2. Do not move person unless in immediate danger
3. Send colleague to meet ambulance at main entrance, Ashford Row
4. Notify Site Manager immediately
5. Complete Security Incident Report
First aiders on site: Barry Bonds and Sandra Okafor. If neither present - contact appointed staff first aider via reception.

POWER FAILURE:
1. Emergency lighting activates automatically - check all areas lit
2. Contact Facilities Manager: Paul Greer - 07700 900 105
3. Check basement plant room electrical distribution board for tripped breakers - do not reset without facilities manager authorisation
4. If anyone trapped in lift - call the lift maintenance contractor: 0808 157 0003
5. Log in site diary: time and duration
6. If power not restored within 30 minutes - notify Site Manager

SECTION 7 - INTRUDER ALARM ACTIVATION (NIGHT SHIFT)
Intruder alarm monitored by the alarm receiving centre: 0808 157 0002 (reference: HBS-2247)
Alarm set by last day shift officer at 19:00. Must be set no later than 19:30.

ACTIVATION DURING NIGHT SHIFT:
IMMEDIATE ACTIONS:
1. Do not investigate alone - mandatory safety requirement
2. Call the alarm receiving centre immediately: 0808 157 0002 - quote reference HBS-2247
3. Call Site Manager: Barry Bonds - 07700 900 102
4. If no answer within 3 minutes - call Deputy Site Manager: Sandra Okafor - 07700 900 103
5. If neither answers - call Brightwell Control Room: 0808 157 0001 (24 hours)
6. Remain at security control room and monitor CCTV
7. DO NOT enter any area where intruder may be present
8. Only call 999 if immediate risk to life or you witness a crime in progress - the alarm receiving centre will arrange police if required

KEYHOLDER LIST (contact in this order):
1. Barry Bonds (Site Manager) - 07700 900 102
2. Sandra Okafor (Deputy Site Manager) - 07700 900 103
3. Trevor Marsh (Client Security Lead, out of hours) - 07700 900 104
4. James Hodgkiss (Brightwell Contract Manager) - 07700 900 101
Log all keyholder callouts: time of activation, time of contact, time of attendance, outcome.

FALSE ALARM PROCEDURE:
1. Reset alarm using panel in security control room - code in red folder under TAB 4
2. Log in site diary: zone, time, cause if known, reset time
3. Complete false alarm report and email to Site Manager by 08:00
4. Three false alarms in 30 days must be reported to Contract Manager

SECTION 8 - GOODS IN AND DELIVERIES
All deliveries at goods-in bay, Warwick Passage ONLY. No deliveries at main Ashford Row entrance.

STANDARD DELIVERY PROCEDURE:
1. Driver must produce delivery note or consignment note
2. Check against expected deliveries list (copy held in control room)
3. If expected - open roller shutter from control room. Remain present throughout. Close immediately when vehicle departs.
4. Ask driver to sign goods-in log: company, driver name, items, time of arrival
5. Contact relevant department to collect within 30 minutes - items must not be left unattended
6. If unexpected - contact relevant department to confirm before accepting or refusing

SUSPICIOUS DELIVERIES:
1. Do not handle further
2. Do not bring into building
3. Ask driver to leave item in goods-in bay and remain outside
4. Call Site Manager immediately
5. If suspected device - follow bomb threat procedure and call 999

OUT OF HOURS DELIVERIES: No deliveries outside 07:00-18:00 Mon-Fri and 08:00-13:00 Sat without written authorisation from Client Security Lead or Facilities Manager.

COURIER COLLECTIONS: Same procedure as deliveries. Confirm with sending department before releasing any items. Never release without written confirmation.

SECTION 9 - KEY CONTACTS
SITE CONTACTS:
Security Site Manager: Barry Bonds - 07700 900 102 - b.bonds@brightwell.example
Deputy Site Manager: Sandra Okafor - 07700 900 103 - s.okafor@brightwell.example
Brightwell Contract Manager: James Hodgkiss - 07700 900 101 - j.hodgkiss@brightwell.example
Brightwell Control Room (24 hours): 0808 157 0001
Client Security Lead: Trevor Marsh - 0121 496 0001 - t.marsh@hartfield.example - Out of hours: 07700 900 104
Facilities Manager: Paul Greer - 07700 900 105 - p.greer@hartfield.example
HR Department: hr@hartfield.example - 0121 496 0002

EMERGENCY CONTACTS:
Police/Fire/Ambulance: 999
Non-emergency police: 101
Alarm Receiving Centre: 0808 157 0002 (Reference: HBS-2247)
Lift Maintenance Contractor: 0808 157 0003
Building Electrical Emergency: 0121 496 0003 (24 hours)
Gas Emergency: 0800 111 999

UTILITIES:
Gas: Cadent - 0800 111 999
Electricity (power cut): 105
Water: Severn Trent - 0800 783 4444

SECTION 10 - ACCESS CONTROL SYSTEM
PAXTON NET2 SYSTEM: Management terminal in security control room.
LOGIN CREDENTIALS: Red folder under TAB 2 - do not share.

To suspend a lost or stolen card:
1. Open Net2 software on control room PC
2. Select Users from left menu
3. Search for cardholder by name
4. Right-click - select Suspend Access
5. Confirm - card deactivated immediately
6. Log action in site diary

To check door activity:
1. Select Events from left menu
2. Filter by door or cardholder
3. Export to PDF for incident reports if required

CCTV SYSTEM: Milestone XProtect software on control room workstation.
Cameras cover: main entrance, staff entrance, goods-in bay, all floor lobby areas, car park, perimeter.
Footage retained for 31 days. Export required footage to Evidence folder on desktop before it is overwritten.
To export: Right-click camera feed - Export - choose date/time range - save to Evidence folder on desktop.

SECTION 11 - UNIFORM AND CONDUCT
UNIFORM: Navy blue trousers or skirt. Brightwell logo shirt. Brightwell logo fleece or jacket for external duties. Black shoes - polished. Brightwell ID badge visible at all times.
Personal mobile phones must not be visible or used at reception desk. Use during designated break times only.

PROFESSIONAL CONDUCT:
- Address members of public and staff by name where possible
- Never engage in personal conversations at reception while a member of public is waiting
- Do not consume food at reception desk
- Do not use social media whilst on duty
- Report any conduct concerns to Site Manager immediately`;

const SYSTEM_PROMPT = `You are SiteIQ, an AI operational knowledge agent for security officers working at Hartfield Building Society, Hartfield House, 14 Ashford Row, Birmingham. You are deployed by SiteIQ Security Ltd.

Your purpose is to answer questions from security officers based only on the Assignment Instructions document provided below.

Rules you must follow:
1. ONLY answer from the Assignment Instructions. Never use general knowledge or make assumptions.
2. Give clear, concise, actionable answers. Officers need to act quickly.
3. For emergencies, lead with the most critical action first.
4. Present contact numbers clearly and prominently.
5. If a question cannot be answered from the document, say: "This is not covered in the current Assignment Instructions. Contact the Site Manager: Barry Bonds - 07700 900 102"
6. Never guess or speculate.
7. Always respond in the same language the officer used to ask the question. If the question is in Polish, respond in Polish. If in Spanish, respond in Spanish. If in French, respond in French. The procedures and facts come from the English documentation but your entire response must be in the officer's language.
8. Keep responses brief and suitable for a mobile device.
9. Use numbered steps for procedures.
10. For critical safety situations, lead with the most urgent action.
11. Start every answer with a short heading on its own line, beginning with "# " (for example "# Fire alarm: treat it as real").
12. Write each phone number in full next to the person or service it belongs to, for example "Site Manager Barry Bonds - 07700 900 102".
13. End every answer with one final line in exactly this form, naming the section or sections you used: "SOURCE: Assignment Instructions, section 6". If the question is not covered, end with "SOURCE: none". Keep the word SOURCE in English whatever language you answer in.

ASSIGNMENT INSTRUCTIONS:
${ASSIGNMENT_INSTRUCTIONS}`;

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = ALLOWED_ORIGINS.includes(origin);
    const cors = {
      'Access-Control-Allow-Origin': allowed ? origin : ALLOWED_ORIGINS[0],
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin',
      'Content-Type': 'application/json',
    };
    const reply = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: cors });
    const say = (text, status = 200) => reply({ content: [{ type: 'text', text }], role: 'assistant' }, status);

    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (request.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
    if (!allowed) return reply({ error: 'Not allowed' }, 403);

    let body;
    try { body = await request.json(); } catch { return reply({ error: 'Bad request' }, 400); }

    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const kv = env.LIMITS;
    const hour = new Date().toISOString().slice(0, 13);
    const day = hour.slice(0, 10);

    // PIN check, with a lockout after too many wrong tries
    const lockKey = `pin:${ip}:${hour}`;
    const tries = kv ? Number(await kv.get(lockKey)) || 0 : 0;
    if (tries >= PIN_TRIES_PER_HOUR) return reply({ ok: false, error: 'Too many attempts. Try again in an hour.' }, 429);
    const pinOk = !!env.SITE_PIN && typeof body.pin === 'string' && body.pin === env.SITE_PIN;
    if (!pinOk) {
      if (kv) await kv.put(lockKey, String(tries + 1), { expirationTtl: 3700 });
      return reply({ ok: false, error: 'Incorrect PIN. Try again.' }, 401);
    }
    if (body.action === 'pin') return reply({ ok: true });

    // Tidy the conversation: user/assistant text only, recent turns, sensible lengths
    const messages = (Array.isArray(body.messages) ? body.messages : [])
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .slice(-MAX_MESSAGES)
      .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }));
    while (messages.length && messages[0].role !== 'user') messages.shift();
    if (!messages.length || messages[messages.length - 1].role !== 'user') return reply({ error: 'Bad request' }, 400);

    // Daily limits
    if (kv) {
      const ipKey = `day:${ip}:${day}`, allKey = `day:all:${day}`;
      const [mine, all] = await Promise.all([kv.get(ipKey), kv.get(allKey)]);
      if ((Number(mine) || 0) >= DAILY_PER_ADDRESS || (Number(all) || 0) >= DAILY_TOTAL) {
        return say('SiteIQ has reached its daily limit. For anything urgent, use the contact numbers in your Assignment Instructions.', 429);
      }
      await Promise.all([
        kv.put(ipKey, String((Number(mine) || 0) + 1), { expirationTtl: 90000 }),
        kv.put(allKey, String((Number(all) || 0) + 1), { expirationTtl: 90000 }),
      ]);
    }

    try {
      let text;
      try { text = await viaOpenRouter(messages, env); }
      catch { text = await viaAnthropic(messages, env); }
      return say(text);
    } catch {
      return say('SiteIQ is temporarily unavailable. Please try again in a moment.', 502);
    }
  },
};

async function viaOpenRouter(messages, env) {
  if (!env.OPENROUTER_API_KEY) throw new Error('no key');
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.OPENROUTER_API_KEY}`, 'X-Title': 'SiteIQ' },
    body: JSON.stringify({
      model: env.OPENROUTER_MODEL || 'anthropic/claude-sonnet-4.6',
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
      max_tokens: MAX_TOKENS,
      temperature: 0.3,
    }),
  });
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!res.ok || !text) throw new Error('OpenRouter failed');
  return text;
}

async function viaAnthropic(messages, env) {
  if (!env.ANTHROPIC_API_KEY) throw new Error('no key');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'anthropic-version': '2023-06-01', 'x-api-key': env.ANTHROPIC_API_KEY },
    body: JSON.stringify({
      model: env.ANTHROPIC_MODEL || 'claude-sonnet-4-5',
      max_tokens: MAX_TOKENS,
      temperature: 0.3,
      system: SYSTEM_PROMPT,
      messages,
    }),
  });
  const data = await res.json();
  const text = data?.content?.[0]?.text;
  if (!res.ok || !text) throw new Error('Anthropic failed');
  return text;
}
