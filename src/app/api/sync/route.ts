import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';

// The Key to your locker
const DATA_KEY = 'virtue_os_user_data';

// GET: Load data from Cloud
export async function GET() {
  try {
    const data = await kv.get(DATA_KEY);
    return NextResponse.json({ data: data || {} });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to load' }, { status: 500 });
  }
}

// POST: Save data to Cloud
export async function POST(request: Request) {
  try {
    const body = await request.json();
    await kv.set(DATA_KEY, body.payload);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
