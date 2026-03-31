import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';

// Initialize Redis - Handles both Upstash and Vercel KV env variables automatically
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN!,
});

// GET: Load Partition
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key') || 'mainframe_default';

  try {
    const data = await redis.get(key);
    return NextResponse.json({ success: true, data: data || null });
  } catch (e: any) {
    console.error(`SYNC_GET_FAIL [${key}]:`, e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

// POST: Save Partition
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const key = body.key || 'mainframe_default';
    const payload = body.payload;

    if (!payload) {
      return NextResponse.json({ success: false, error: 'No payload' }, { status: 400 });
    }

    await redis.set(key, payload);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error(`SYNC_POST_FAIL:`, e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
