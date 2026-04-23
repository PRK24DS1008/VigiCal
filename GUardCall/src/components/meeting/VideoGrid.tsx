
"use client";

import React from 'react';
import { ParticipantTile } from './ParticipantTile';

interface VideoGridProps {
  participants: any[];
  localId: string;
  localStream: MediaStream | null;
  localDevices: { video: boolean; audio: boolean };
  remoteStreams: Record<string, MediaStream>;
}

export function VideoGrid({
  participants,
  localId,
  localStream,
  localDevices,
  remoteStreams,
}: VideoGridProps) {

  // Handle empty state (though unlikely with participant joining logic)
  if (participants.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
        <p className="font-headline uppercase tracking-widest text-xs animate-pulse">Waiting for participants to connect...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full h-full max-h-[calc(100vh-12rem)] auto-rows-fr">
      {participants.map((p) => {
        const isLocal = p.id === localId;
        const stream = isLocal ? localStream : remoteStreams[p.id] || null;
        const videoOn = isLocal ? localDevices.video : p.videoOn;

        return (
          <ParticipantTile
            key={p.id}
            participant={p}
            isLocal={isLocal}
            stream={stream}
            videoOn={videoOn}
          />
        );
      })}
    </div>
  );
}
