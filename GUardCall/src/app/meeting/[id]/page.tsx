"use client";

import React, { useState, Suspense } from 'react';
import { useSearchParams, useParams, useRouter } from 'next/navigation';
import { MeetingRoom } from '@/components/meeting/MeetingRoom';
import { PreJoin } from '@/components/meeting/PreJoin';
import { WaitingRoom } from '@/components/meeting/WaitingRoom';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Stage = 'prejoin' | 'waiting' | 'meeting';

function MeetingContent() {
  const params = useParams();
  const router = useRouter();
  const meetingId = params?.id as string;
  const searchParams = useSearchParams();
  const isHost = searchParams?.get('isHost') === 'true';
  const { toast } = useToast();

  const [stage, setStage] = useState<Stage>('prejoin');
  const [userName, setUserName] = useState('');
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [initialDevices, setInitialDevices] = useState({ video: true, audio: true });

  // ── Session Persistence ──────────────────────────────────────────────────
  React.useEffect(() => {
    const savedName = sessionStorage.getItem(`guardcall_name_${meetingId}`);
    const savedPid = sessionStorage.getItem(`guardcall_pid_${meetingId}`);
    if (savedName && savedPid) {
      setUserName(savedName);
      setParticipantId(savedPid);
      // If we have a saved session, assume we are either admitted or the host
      // The signaling server will verify if we are still admitted or if the room exists
      setStage('meeting');
    }
  }, [meetingId]);

  // ── PreJoin ──────────────────────────────────────────────────────────────
  if (stage === 'prejoin') {
    return (
      <PreJoin
        onJoin={async (name, devices) => {
          try {
            const res = await fetch('/api/join-meeting', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ meetingId, name }),
            });
            if (!res.ok) {
              const errorData = await res.json();
              throw new Error(errorData.error || 'Failed to register');
            }
            const data = await res.json();
            
            // Persist session
            sessionStorage.setItem(`guardcall_name_${meetingId}`, name);
            sessionStorage.setItem(`guardcall_pid_${meetingId}`, data.participant.id);
            
            setUserName(name);
            setParticipantId(data.participant.id);
            setInitialDevices(devices);
            // Host goes straight to meeting; participants wait to be admitted
            setStage(isHost ? 'meeting' : 'waiting');
          } catch (err: any) {
            toast({ variant: 'destructive', title: 'Registration Failed', description: err.message });
          }
        }}
      />
    );
  }

  // ── Waiting Room (participants only) ─────────────────────────────────────
  if (stage === 'waiting' && participantId) {
    return (
      <WaitingRoom
        meetingId={meetingId}
        participantId={participantId}
        name={userName}
        onAdmitted={() => setStage('meeting')}
      />
    );
  }

  // ── Meeting Room ──────────────────────────────────────────────────────────
  return (
    <MeetingRoom
      meetingId={meetingId}
      userName={userName}
      participantId={participantId!}
      isHost={isHost}
      initialDevices={initialDevices}
    />
  );
}

export default function MeetingPage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    }>
      <MeetingContent />
    </Suspense>
  );
}
