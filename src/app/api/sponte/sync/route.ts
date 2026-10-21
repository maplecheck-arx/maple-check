import { syncHandler } from '@/server/sync-handler';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 180;
export function POST(request: Request) { return syncHandler(request, false); }
