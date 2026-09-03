import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const TEMPLATES = [
  'SAMPLE.xlsx',
  'MANGESH TRANSPORT BILLING INVOICE COPY-1.xlsx',
  'REWORK BILL Format.xlsx',
  'Additional Bill Format.xlsx',
  'PROVISION FORMAT.xlsx',
  'Final Submission Sheet.xlsx',
];

export async function GET() {
  const cwd = process.cwd();
  const results = TEMPLATES.map((name) => {
    const filePath = path.join(cwd, name);
    const exists = fs.existsSync(filePath);
    // Do not leak absolute server paths in the response.
    return { name, exists };
  });

  const allOk = results.every(r => r.exists);

  return NextResponse.json({
    status: allOk ? 'ok' : 'missing',
    templates: results,
    timestamp: new Date().toISOString(),
  }, { status: allOk ? 200 : 500 });
}


