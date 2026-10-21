import { syncHandler } from '@/server/sync-handler';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 180;
export function GET(request: Request) { return syncHandler(request, true); }
