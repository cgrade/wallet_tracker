import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    return NextResponse.json({ message: 'Hello, world!', time: new Date().toISOString() });
  } catch (error) {
    console.error('Error in hello endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 