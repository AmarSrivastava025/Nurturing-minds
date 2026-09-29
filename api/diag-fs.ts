import type { VercelRequest, VercelResponse } from '@vercel/node';
import fs from 'fs';
import path from 'path';

function listDir(dir: string, depth = 0, maxDepth = 3): any {
  let entries: any[] = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e: any) {
    return { error: e.message };
  }
  const out: any = {};
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git') {
      out[entry.name] = '(skipped)';
      continue;
    }
    if (entry.isDirectory()) {
      out[entry.name] = depth < maxDepth ? listDir(path.join(dir, entry.name), depth + 1, maxDepth) : '(dir)';
    } else {
      out[entry.name] = 'file';
    }
  }
  return out;
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  const probes: Record<string, string> = {};
  const targets = [
    '../_lib/email-templates',
    '../lib/email-templates',
    '../src/services/automation/email-templates',
    '../../src/services/automation/email-templates',
  ];

  for (const target of targets) {
    try {
      const mod = require(target);
      probes[target] = 'OK keys=' + Object.keys(mod).length;
    } catch (e: any) {
      probes[target] = (e.code || 'ERR') + ': ' + String(e.message).split('\n')[0];
    }
  }

  let dirname: string;
  try {
    dirname = __dirname;
  } catch (e: any) {
    dirname = 'unavailable: ' + e.message;
  }

  return res.status(200).json({
    cwd: process.cwd(),
    dirname,
    apiTree: listDir(path.join(process.cwd(), 'api'), 0, 3),
    probes,
  });
}
