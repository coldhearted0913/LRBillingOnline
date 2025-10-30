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
    return { name, exists, path: exists ? filePath : null };
  });

  const allOk = results.every(r => r.exists);

  return NextResponse.json({
    status: allOk ? 'ok' : 'missing',
    templates: results,
    cwd,
    timestamp: new Date().toISOString(),
  }, { status: allOk ? 200 : 500 });
}


