import { NextRequest } from 'next/server';
import { proxyRequest } from '@/shared/api/requestHandler';

// All browser GraphQL traffic goes through this server-side proxy.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  return proxyRequest(req);
}
