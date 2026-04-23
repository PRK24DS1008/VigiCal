
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { meetingId, name } = await req.json();

    if (!meetingId || !name) {
      return NextResponse.json(
        { error: 'Missing meetingId or name' },
        { status: 400 }
      );
    }

    // In a production environment, you would check if the meeting is active here.
    // The client-side useDoc hook already handles existence/active check.

    const participant = {
      id: crypto.randomUUID(),
      name,
      joinedAt: Date.now(),
    };

    return NextResponse.json({ participant });

  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
