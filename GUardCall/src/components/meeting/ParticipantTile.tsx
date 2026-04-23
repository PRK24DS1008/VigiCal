
"use client";

import React, { useEffect, useRef } from 'react';
import { MicOff, ShieldAlert, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ParticipantTileProps {
  participant: any;
  isLocal: boolean;
  stream: MediaStream | null;
  videoOn: boolean;
}

export function ParticipantTile({ participant, isLocal, stream, videoOn }: ParticipantTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isSuspicious = participant.status !== 'Human';

  useEffect(() => {
    if (videoRef.current && stream && videoOn) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, videoOn]);

  return (
    <div 
      className={cn(
        "video-tile group transition-all duration-500 relative",
        isSuspicious && "suspicious",
        participant.isHost && "host shadow-lg shadow-primary/10"
      )}
    >
      {videoOn ? (
        <video 
          ref={videoRef}
          autoPlay 
          playsInline 
          muted={isLocal} 
          className={cn("w-full h-full object-cover", isLocal && "scale-x-[-1]")}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-card text-muted-foreground gap-3">
          <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center">
            <User className="w-10 h-10" />
          </div>
          <p className="font-medium">{isLocal ? "Camera Off" : "Video Unavailable"}</p>
        </div>
      )}

      {/* Overlay UI */}
      <div className="absolute top-4 left-4 flex gap-2">
        <Badge variant="secondary" className="bg-black/40 backdrop-blur-md border-none text-white">
          {participant.name} {isLocal && "(You)"}
          {participant.isHost && " • Host"}
        </Badge>
        {!participant.audioOn && (
          <div className="bg-destructive/80 p-1.5 rounded-lg">
            <MicOff className="w-3.5 h-3.5 text-white" />
          </div>
        )}
      </div>

      {isSuspicious && (
        <div className="absolute inset-0 border-4 border-destructive animate-pulse pointer-events-none flex items-center justify-center z-10">
          <div className="bg-destructive text-white px-4 py-2 rounded-full font-bold flex items-center gap-2 shadow-xl">
            <ShieldAlert className="w-5 h-5" />
            POTENTIAL DEEPFAKE
          </div>
        </div>
      )}

      {/* AI Status Badge */}
      <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-20">
         <Badge 
           className={cn(
             "border-none",
             participant.status === 'Human' ? 'bg-green-500/80' : 
             participant.status === 'Suspicious' ? 'bg-yellow-500/80' : 'bg-red-500/80'
           )}
         >
           {participant.status}
         </Badge>
      </div>
    </div>
  );
}
