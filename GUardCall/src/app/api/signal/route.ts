import { NextRequest } from 'next/server';

// roomData: meetingId -> { participants: Map<pid, {name, isHost, ...}>, controllers: Map<pid, controller> }
const rooms = new Map<string, {
  participants: Map<string, any>;
  controllers: Map<string, ReadableStreamDefaultController>;
}>();

const hostIds = new Map<string, string>();
const pendingSignals = new Map<string, any[]>();
const pendingKnocks = new Map<string, any[]>();

function send(controller: ReadableStreamDefaultController, message: any) {
  try {
    controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(message)}\n\n`));
  } catch (_) {}
}

function sendToParticipant(meetingId: string, targetId: string, message: any) {
  const room = rooms.get(meetingId);
  const controller = room?.controllers.get(targetId);
  if (controller) {
    send(controller, message);
  } else {
    const key = `${meetingId}:${targetId}`;
    const buf = pendingSignals.get(key) ?? [];
    buf.push(message);
    pendingSignals.set(key, buf);
  }
}

function broadcastToRoom(meetingId: string, excludeId: string | null, message: any) {
  const room = rooms.get(meetingId);
  room?.controllers.forEach((controller, pid) => {
    if (pid !== excludeId) send(controller, message);
  });
}

function broadcastRoomMetadata(meetingId: string) {
  const room = rooms.get(meetingId);
  if (!room) return;
  const participantList = Array.from(room.participants.values());
  broadcastToRoom(meetingId, null, { type: 'room-metadata', payload: participantList });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const meetingId = searchParams.get('meetingId');
  const participantId = searchParams.get('participantId');
  const name = searchParams.get('name') || 'Anonymous';
  const isHost = searchParams.get('isHost') === 'true';

  if (!meetingId || !participantId) return new Response('Missing params', { status: 400 });

  console.log(`[SSE] ${isHost ? 'Host' : 'Participant'} ${name} (${participantId}) connecting to room ${meetingId}`);

  const stream = new ReadableStream({
    start(controller) {
      if (!rooms.has(meetingId)) {
        rooms.set(meetingId, { participants: new Map(), controllers: new Map() });
      }
      const room = rooms.get(meetingId)!;
      room.controllers.set(participantId, controller);
      
      // We only add to participants list AFTER admission for participants, 
      // but host is added immediately.
      if (isHost) {
        hostIds.set(meetingId, participantId);
        room.participants.set(participantId, { 
          id: participantId, 
          name, 
          isHost: true, 
          joinedAt: Date.now(),
          status: 'Human'
        });
        
        // Flush buffered knocks for this host
        const knocks = pendingKnocks.get(meetingId) ?? [];
        knocks.forEach(k => send(controller, k));
        pendingKnocks.delete(meetingId);
      }

      // Flush buffered private signals
      const key = `${meetingId}:${participantId}`;
      (pendingSignals.get(key) ?? []).forEach(msg => send(controller, msg));
      pendingSignals.delete(key);

      // If this is a returning participant (admitted previously), broadcast their arrival
      if (!isHost && room.participants.has(participantId)) {
        console.log(`[SSE] Admitted participant ${name} (${participantId}) re-joined/transitioned`);
        broadcastToRoom(meetingId, participantId, { type: 'user-joined', from: participantId });
        broadcastRoomMetadata(meetingId);
      }

      // Send initial room state if host
      if (isHost) broadcastRoomMetadata(meetingId);

      const hb = setInterval(() => {
        try { controller.enqueue(new TextEncoder().encode(': ping\n\n')); }
        catch (_) { clearInterval(hb); }
      }, 15_000);
    },
    cancel() {
      const room = rooms.get(meetingId);
      if (room) {
        console.log(`[SSE] ${participantId} connection closed for room ${meetingId}`);
        room.controllers.delete(participantId);
        
        // We DO NOT delete from room.participants here immediately.
        // This allows page transitions (WaitingRoom -> MeetingRoom) without losing admitted status.
        // If the host leaves, the room is deleted anyway.
        
        if (room.controllers.size === 0 && isHost) {
          // If host leaves and no one else is connected, clean up
          rooms.delete(meetingId);
          hostIds.delete(meetingId);
          pendingKnocks.delete(meetingId);
        } else {
          // Notify others that connection was lost, but keep them in the participant list for now
          broadcastToRoom(meetingId, participantId, { type: 'user-left', from: participantId });
          // We still broadcast room metadata so others see the 'offline' status if we had one,
          // but for now we just keep the list as is.
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const { meetingId, type, from, target, payload } = await req.json();
    if (!meetingId || !type || !from) return Response.json({ error: 'Missing fields' }, { status: 400 });

    const message = { type, from, payload };

    if (type === 'knock') {
      const hostId = hostIds.get(meetingId);
      if (hostId) {
        sendToParticipant(meetingId, hostId, message);
      } else {
        // Buffer knock for when host arrives
        const buf = pendingKnocks.get(meetingId) ?? [];
        if (!buf.some(k => k.from === from)) {
          buf.push(message);
          pendingKnocks.set(meetingId, buf);
        }
      }
    } else if (type === 'accept-participant') {
      if (target) {
        const room = rooms.get(meetingId);
        if (room) {
          room.participants.set(target, { 
            id: target, 
            name: payload.name || 'Participant', 
            isHost: false, 
            joinedAt: Date.now(),
            status: 'Human'
          });
          // Send 'accepted' signal to the participant
          sendToParticipant(meetingId, target, { type: 'accepted', from, payload });
          broadcastRoomMetadata(meetingId);
          // NOTE: We no longer broadcast 'user-joined' here. 
          // We wait until the participant actually connects to the SSE in the MeetingRoom (the GET handler).
        }
      }
    } else if (type === 'deny') {
      if (target) sendToParticipant(meetingId, target, message);
    } else if (type === 'update-status') {
       // Broadcast media toggles or AI status updates
       const room = rooms.get(meetingId);
       if (room && room.participants.has(from)) {
         const p = room.participants.get(from);
         room.participants.set(from, { ...p, ...payload });
         broadcastRoomMetadata(meetingId);
       }
    } else if (target) {
      sendToParticipant(meetingId, target, message);
    } else {
      broadcastToRoom(meetingId, from, message);
    }

    return Response.json({ ok: true });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
