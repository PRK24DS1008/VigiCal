"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Loader2, ShieldCheck, UserX } from 'lucide-react';

interface WaitingRoomProps {
  meetingId: string;
  participantId: string;
  name: string;
  onAdmitted: () => void;
}

export function WaitingRoom({ meetingId, participantId, name, onAdmitted }: WaitingRoomProps) {
  const [status, setStatus] = useState<'connecting' | 'waiting' | 'denied'>('connecting');
  const knockSent = useRef(false);

  useEffect(() => {
    const es = new EventSource(
      `/api/signal?meetingId=${encodeURIComponent(meetingId)}&participantId=${encodeURIComponent(participantId)}`
    );

    es.onopen = () => {
      setStatus('waiting');
      if (!knockSent.current) {
        knockSent.current = true;
        fetch('/api/signal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ meetingId, type: 'knock', from: participantId, payload: { name } }),
        });
      }
    };

    es.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'accepted') {
          es.close();
          onAdmitted();
        } else if (msg.type === 'deny') {
          es.close();
          setStatus('denied');
        }
      } catch (_) {}
    };

    return () => es.close();
  }, [meetingId, participantId, name, onAdmitted]);

  if (status === 'denied') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full text-center space-y-6 glass-morphism p-8 rounded-3xl border border-destructive/20 shadow-2xl">
          <div className="flex justify-center">
            <div className="p-4 bg-destructive/10 rounded-full">
              <UserX className="w-12 h-12 text-destructive" />
            </div>
          </div>
          <h1 className="text-2xl font-bold font-headline">Entry Denied</h1>
          <p className="text-muted-foreground">The host has declined your request to join this meeting.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background">
      <div className="max-w-md w-full text-center space-y-8 glass-morphism p-10 rounded-3xl border border-primary/20 shadow-2xl backdrop-blur-2xl">
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
            <div className="relative p-5 bg-primary/10 rounded-full">
              <ShieldCheck className="w-14 h-14 text-primary" />
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <h1 className="text-2xl font-bold font-headline tracking-tight">Waiting to be admitted</h1>
          <p className="text-muted-foreground">
            <span className="text-foreground font-semibold">{name}</span>, the host will let you in shortly.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span className="animate-pulse uppercase tracking-widest text-xs font-headline text-muted-foreground">
            {status === 'connecting' ? 'Connecting...' : 'Waiting for host...'}
          </span>
        </div>
      </div>
    </div>
  );
}
