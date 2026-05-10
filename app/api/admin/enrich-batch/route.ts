import type { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { requireAdmin } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

// Known Australian university email domain patterns
const UNIVERSITY_DOMAINS: Record<string, string> = {
  'University of Adelaide': 'adelaide.edu.au',
  'Griffith University': 'griffith.edu.au',
  'Queensland University of Technology': 'qut.edu.au',
  'Macquarie University': 'mq.edu.au',
  'Deakin University': 'deakin.edu.au',
  'Curtin University': 'curtin.edu.au',
  'RMIT University': 'rmit.edu.au',
  'University of Technology Sydney': 'uts.edu.au',
  'University of Newcastle': 'newcastle.edu.au',
  'La Trobe University': 'latrobe.edu.au',
  'University of Tasmania': 'utas.edu.au',
  'Flinders University': 'flinders.edu.au',
  'UNSW Sydney': 'unsw.edu.au',
  'University of Queensland': 'uq.edu.au',
  'University of Melbourne': 'unimelb.edu.au',
  'University of Wollongong': 'uow.edu.au',
  'University of Sydney': 'sydney.edu.au',
  'Monash University': 'monash.edu',
  'University of Western Australia': 'uwa.edu.au',
  'Australian National University': 'anu.edu.au',
  'Western Sydney University': 'westernsydney.edu.au',
  'James Cook University': 'jcu.edu.au',
  'Swinburne University of Technology': 'swinburne.edu.au',
  'Murdoch University': 'murdoch.edu.au',
  'University of Canberra': 'canberra.edu.au',
  'Charles Sturt University': 'csu.edu.au',
  'Edith Cowan University': 'ecu.edu.au',
  'University of Southern Queensland': 'usq.edu.au',
  'Victoria University': 'vu.edu.au',
  'University of New England': 'une.edu.au',
  'Bond University': 'bond.edu.au',
  'Charles Darwin University': 'cdu.edu.au',
  'Australian Catholic University': 'acu.edu.au',
  'University of Divinity': 'divinity.edu.au',
  'Federation University Australia': 'federation.edu.au',
  'University of the Sunshine Coast': 'usc.edu.au',
  'Southern Cross University': 'scu.edu.au',
  'CQUniversity': 'cqu.edu.au',
};

function extractNameParts(fullName: string): { firstName: string; lastName: string; middleNames: string[] } | null {
  // Remove common prefixes/suffixes
  let cleaned = fullName
    .replace(/^(Prof\.?|Dr\.?|A\/Prof\.?|Assoc\.?\s*Prof\.?|Mr\.?|Ms\.?|Mrs\.?|Sir)\s+/i, '')
    .replace(/\s+(Jr\.?|Sr\.?|III?|IV|PhD|OAM|AO|AC|AM|AOM|FRS|FAHA|FAA|FTSE|FAICD)$/gi, '')
    .trim();

  // Remove initials like "A. B." from middle
  const parts = cleaned.split(/\s+/).filter(p => p.length > 0);
  if (parts.length < 2) return null;

  const lastName = parts[parts.length - 1].replace(/[^a-zA-ZÀ-ɏ'-]/g, '');
  const firstName = parts[0].replace(/[^a-zA-ZÀ-ɏ'-]/g, '');
  const middleNames = parts.slice(1, -1).filter(p => p.length > 2 && !p.match(/^[A-Z]\.?$/));

  if (!firstName || !lastName || firstName.length < 2) return null;

  return { firstName, lastName, middleNames };
}

function generateEmailCandidates(name: { firstName: string; lastName: string }, domain: string): string[] {
  const f = name.firstName.toLowerCase().replace(/['-]/g, '');
  const l = name.lastName.toLowerCase().replace(/['-]/g, '');

  return [
    `${f}.${l}@${domain}`,          // firstname.lastname@
    `${f[0]}.${l}@${domain}`,       // f.lastname@
    `${f}${l}@${domain}`,           // firstnamelastname@
    `${f}_${l}@${domain}`,          // firstname_lastname@
    `${l}.${f}@${domain}`,          // lastname.firstname@
    `${f}@${domain}`,               // firstname@ (rare)
  ];
}

function sendEvent(controller: ReadableStreamDefaultController, data: object) {
  const encoder = new TextEncoder();
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const {
      mode = 'pattern',  // 'pattern' = email pattern only, 'ai' = AI web search
      university,        // optional: filter by university
      limit = 100,       // batch size
      offset = 0,
    } = body;

    // Fetch professors missing email
    let query = db
      .from('professors')
      .select('id, name, university, email, faculty, position_title, research_areas, profile_url')
      .or('email.is.null,email.eq.')
      .order('h_index', { ascending: false, nullsFirst: false })
      .range(offset, offset + limit - 1);

    if (university) {
      query = query.eq('university', university);
    }

    const { data: professors, error } = await query;
    if (error) throw new Error(error.message);
    if (!professors || professors.length === 0) {
      return Response.json({ message: 'No professors to enrich', processed: 0 });
    }

    if (mode === 'pattern') {
      // Fast pattern-based email generation — no AI needed
      let updated = 0;
      let skipped = 0;
      const results: Array<{ id: string; name: string; email: string | null; source: string }> = [];

      for (const prof of professors) {
        const domain = UNIVERSITY_DOMAINS[prof.university];
        if (!domain) {
          skipped++;
          results.push({ id: prof.id, name: prof.name, email: null, source: 'unknown_university' });
          continue;
        }

        const nameParts = extractNameParts(prof.name);
        if (!nameParts) {
          skipped++;
          results.push({ id: prof.id, name: prof.name, email: null, source: 'unparseable_name' });
          continue;
        }

        // Use the most common pattern: firstname.lastname@domain
        const email = generateEmailCandidates(nameParts, domain)[0];

        await db
          .from('professors')
          .update({
            email,
            email_source: 'pattern_generated',
            updated_at: new Date().toISOString(),
          })
          .eq('id', prof.id);

        updated++;
        results.push({ id: prof.id, name: prof.name, email, source: 'pattern' });
      }

      return Response.json({
        mode: 'pattern',
        processed: professors.length,
        updated,
        skipped,
        results: results.slice(0, 20), // Return first 20 as sample
      });
    }

    // AI mode — use web search to find and verify data (streaming)
    const stream = new ReadableStream({
      async start(controller) {
        sendEvent(controller, { type: 'start', total: professors.length });

        let updated = 0;
        let failed = 0;

        for (let i = 0; i < professors.length; i++) {
          const prof = professors[i];
          sendEvent(controller, {
            type: 'progress',
            current: i + 1,
            total: professors.length,
            name: prof.name,
          });

          try {
            const missingFields: string[] = [];
            if (!prof.email) missingFields.push('email');
            if (!prof.faculty) missingFields.push('faculty');
            if (!prof.position_title) missingFields.push('position_title');

            const domain = UNIVERSITY_DOMAINS[prof.university] || 'unknown';

            const prompt = `Find the following information for this academic professor:

Professor: ${prof.name}
University: ${prof.university}
Research Areas: ${(prof.research_areas || []).join(', ')}
Known profile URL: ${prof.profile_url || '(none)'}
Expected email domain: @${domain}

Missing fields to find: ${missingFields.join(', ')}

Search ${prof.university}'s staff directory and academic profiles.
Return ONLY valid JSON (no markdown):
{
  "email": "found_email@..." or null,
  "faculty": "Faculty/School/Department name" or null,
  "position_title": "Professor|Associate Professor|Senior Lecturer|Lecturer|Research Fellow|Senior Research Fellow|Postdoctoral Fellow" or null,
  "confidence": "high|medium|low"
}`;

            const response = await client.messages.create({
              model: 'claude-sonnet-4-6',
              max_tokens: 512,
              tools: [{ type: 'web_search_20250305' as const, name: 'web_search' }],
              messages: [{ role: 'user', content: prompt }],
            });

            const textBlock = response.content.findLast(b => b.type === 'text');
            const rawText = textBlock?.type === 'text' ? textBlock.text.trim() : '';
            const clean = rawText.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();

            let parsed: Record<string, string | null>;
            try {
              parsed = JSON.parse(clean);
            } catch {
              failed++;
              sendEvent(controller, { type: 'error', index: i, name: prof.name, error: 'parse_failed' });
              continue;
            }

            const updates: Record<string, string> = {};
            if (parsed.email && typeof parsed.email === 'string' && parsed.email.includes('@')) {
              updates.email = parsed.email;
              updates.email_source = 'ai_verified';
            }
            if (parsed.faculty && typeof parsed.faculty === 'string') {
              updates.faculty = parsed.faculty;
            }
            if (parsed.position_title && typeof parsed.position_title === 'string') {
              updates.position_title = parsed.position_title;
            }

            if (Object.keys(updates).length > 0) {
              updates.updated_at = new Date().toISOString();
              await db.from('professors').update(updates).eq('id', prof.id);
              updated++;
              sendEvent(controller, { type: 'updated', index: i, name: prof.name, fields: Object.keys(updates) });
            } else {
              failed++;
              sendEvent(controller, { type: 'no_data', index: i, name: prof.name });
            }
          } catch (err) {
            failed++;
            sendEvent(controller, {
              type: 'error',
              index: i,
              name: prof.name,
              error: err instanceof Error ? err.message : 'unknown',
            });
          }

          // Rate limit: pause between AI calls
          if (i < professors.length - 1) {
            await new Promise(r => setTimeout(r, 500));
          }
        }

        sendEvent(controller, { type: 'done', updated, failed, total: professors.length });
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    const msg = (error as Error).message;
    if (msg === 'Unauthorized') return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (msg === 'Forbidden') return Response.json({ error: 'Forbidden' }, { status: 403 });
    console.error('[enrich-batch]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET: Return enrichment statistics
export async function GET() {
  try {
    await requireAdmin();

    const { data: stats } = await db.rpc('get_enrichment_stats').single();

    // Fallback if RPC doesn't exist
    if (!stats) {
      const [totalRes, emailRes, patternRes, aiRes, facultyRes] = await Promise.all([
        db.from('professors').select('id', { count: 'exact', head: true }),
        db.from('professors').select('id', { count: 'exact', head: true }).not('email', 'is', null).neq('email', ''),
        db.from('professors').select('id', { count: 'exact', head: true }).eq('email_source', 'pattern_generated'),
        db.from('professors').select('id', { count: 'exact', head: true }).eq('email_source', 'ai_verified'),
        db.from('professors').select('id', { count: 'exact', head: true }).not('faculty', 'is', null).neq('faculty', ''),
      ]);

      return Response.json({
        total: totalRes.count ?? 0,
        withEmail: emailRes.count ?? 0,
        patternGenerated: patternRes.count ?? 0,
        aiVerified: aiRes.count ?? 0,
        withFaculty: facultyRes.count ?? 0,
      });
    }

    return Response.json(stats);
  } catch (error) {
    const msg = (error as Error).message;
    if (msg === 'Unauthorized') return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (msg === 'Forbidden') return Response.json({ error: 'Forbidden' }, { status: 403 });
    console.error('[enrich-stats]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
