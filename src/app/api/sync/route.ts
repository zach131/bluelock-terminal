import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';

// GET: Load data from Cloud
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key') || 'virtue_os_user_data';
  try {
    const data = await kv.get(key);
    return NextResponse.json({ success: true, data: data || null });
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to load' }, { status: 500 });
  }
}

// POST: Save data to Cloud
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const key = body.key || 'virtue_os_user_data';
    await kv.set(key, body.payload);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to save' }, { status: 500 });
  }
}
