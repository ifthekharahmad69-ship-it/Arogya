import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Cache loaded medicine files
const cache: Record<string, any[]> = {};

function loadLetterFile(letter: string): any[] {
  const safeLetter = letter.toUpperCase().replace(/[^A-Z0-9]/g, '_');
  if (cache[safeLetter]) return cache[safeLetter];
  try {
    const filePath = path.join(process.cwd(), 'src', 'data', 'medicines', `meds_${safeLetter}.json`);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    cache[safeLetter] = data;
    return data;
  } catch {
    return [];
  }
}

function loadStats() {
  if (cache['__stats__']) return cache['__stats__'][0];
  const filePath = path.join(process.cwd(), 'src', 'data', 'medicines', 'medicine-stats.json');
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  cache['__stats__'] = [data];
  return data;
}

// GET /api/medicines?q=paracetamol&page=1&limit=20&type=Tablet&letter=P
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get('q') || '').toLowerCase().trim();
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const type = searchParams.get('type') || '';
  const letter = searchParams.get('letter') || '';
  const statsOnly = searchParams.get('stats') === 'true';

  // Return stats
  if (statsOnly) {
    return NextResponse.json(loadStats());
  }

  let results: any[] = [];

  if (query) {
    // Search across relevant letter files
    const firstLetter = query[0].toUpperCase();
    const lettersToSearch = letter ? [letter.toUpperCase()] : [firstLetter];
    
    // Also search all letters if query is longer (might match in middle)
    if (query.length >= 3 && !letter) {
      const stats = loadStats();
      const allLetters = Object.keys(stats.letters || {});
      allLetters.forEach(l => {
        if (!lettersToSearch.includes(l)) lettersToSearch.push(l);
      });
    }

    for (const l of lettersToSearch) {
      const meds = loadLetterFile(l);
      const matches = meds.filter((m: any) => m.n.toLowerCase().includes(query));
      results.push(...matches);
      if (results.length > 200) break; // Cap search results
    }
  } else if (letter) {
    // Browse by letter
    results = loadLetterFile(letter);
  } else {
    // Default: return popular medicines (letter A, first page)
    results = loadLetterFile('A');
  }

  // Filter by type
  if (type) {
    results = results.filter((m: any) => m.t && m.t.toLowerCase().includes(type.toLowerCase()));
  }

  // Pagination
  const total = results.length;
  const start = (page - 1) * limit;
  const paged = results.slice(start, start + limit);

  // Expand to full format
  const medicines = paged.map((m: any) => ({
    id: m.id,
    name: m.n,
    price: m.p,
    manufacturer: m.m,
    type: m.t,
    packSize: m.pk,
    composition1: m.c1,
    composition2: m.c2,
  }));

  return NextResponse.json({
    medicines,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}
