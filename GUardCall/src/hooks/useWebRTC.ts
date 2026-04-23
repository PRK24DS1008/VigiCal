"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
    { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" },
  ],
};

async function sendSignal(data: { meetingId: string; type: string; from: string; target?: string; payload?: any }) {
  try {
    await fetch("/api/signal", { 
      method: "POST", 
      headers: { "Content-Type": "application/json" }, 
      body: JSON.stringify(data) 
    });
  } catch (e) { console.warn("signal send failed", e); }
}

export interface KnockRequest {
  participantId: string;
  name: string;
}

export interface Participant {
  id: string;
  name: string;
  isHost: boolean;
  joinedAt: number;
  videoOn?: boolean;
  audioOn?: boolean;
  status?: string;
  aiScore?: number;
}

export function useWebRTC({
  meetingId, participantId, userName, localStream, isHost,
}: {
  meetingId: string;
  participantId: string;
  userName: string;
  localStream: MediaStream | null;
  isHost?: boolean;
}) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [knockRequests, setKnockRequests] = useState<KnockRequest[]>([]);
  const peerConns = useRef<Record<string, RTCPeerConnection>>({});
  const localStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => { 
    localStreamRef.current = localStream; 
    // If localStream becomes available after peers were created, add tracks to them
    if (localStream) {
      Object.values(peerConns.current).forEach(pc => {
        const senders = pc.getSenders();
        localStream.getTracks().forEach(track => {
          if (!senders.some(s => s.track === track)) {
            pc.addTrack(track, localStream as MediaStream);
          }
        });
      });
    }
  }, [localStream]);

  const closePeer = useCallback((remoteId: string) => {
    const pc = peerConns.current[remoteId];
    if (pc) { 
      pc.ontrack = null; 
      pc.onicecandidate = null; 
      pc.close(); 
      delete peerConns.current[remoteId]; 
    }
    setRemoteStreams(prev => {
      const n = { ...prev };
      delete n[remoteId];
      return n;
    });
  }, []);

  const getPeer = useCallback((remoteId: string): RTCPeerConnection => {
    if (peerConns.current[remoteId]) return peerConns.current[remoteId];

    const pc = new RTCPeerConnection(ICE_SERVERS);
    const stream = localStreamRef.current;
    if (stream) {
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
    }

    const remoteStream = new MediaStream();
    pc.ontrack = e => {
      console.log(`[WebRTC] Received remote track from ${remoteId}`);
      e.streams[0].getTracks().forEach(t => remoteStream.addTrack(t));
      setRemoteStreams(prev => ({ ...prev, [remoteId]: remoteStream }));
    };

    pc.onicecandidate = e => {
      if (e.candidate) {
        sendSignal({ 
          meetingId, 
          type: "ice-candidate", 
          from: participantId, 
          target: remoteId, 
          payload: e.candidate.toJSON() 
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC] Connection state with ${remoteId}: ${pc.connectionState}`);
      if (["failed", "closed", "disconnected"].includes(pc.connectionState)) {
        closePeer(remoteId);
      }
    };

    peerConns.current[remoteId] = pc;
    return pc;
  }, [meetingId, participantId, closePeer]);

  const admitParticipant = useCallback(async (targetId: string, targetName: string) => {
    console.log(`[Signal] Admitting ${targetName} (${targetId})`);
    await sendSignal({ 
      meetingId, 
      type: "accept-participant", 
      from: participantId, 
      target: targetId, 
      payload: { name: targetName } 
    });
    setKnockRequests(prev => prev.filter(k => k.participantId !== targetId));
  }, [meetingId, participantId]);

  const denyParticipant = useCallback(async (targetId: string) => {
    await sendSignal({ meetingId, type: "deny", from: participantId, target: targetId, payload: {} });
    setKnockRequests(prev => prev.filter(k => k.participantId !== targetId));
  }, [meetingId, participantId]);

  const updateStatus = useCallback((payload: Partial<Participant>) => {
    sendSignal({ meetingId, type: "update-status", from: participantId, payload });
  }, [meetingId, participantId]);

  useEffect(() => {
    if (!meetingId || !participantId) return;

    const url = `/api/signal?meetingId=${encodeURIComponent(meetingId)}&participantId=${encodeURIComponent(participantId)}&name=${encodeURIComponent(userName)}${isHost ? "&isHost=true" : ""}`;
    const es = new EventSource(url);

    es.onopen = () => console.log("[SSE] Connected to signaling server");

    es.addEventListener('room-metadata', (event: any) => {
      try {
        const data = JSON.parse(event.data);
        console.log("[SSE] Received room metadata", data);
        setParticipants(data);
      } catch (err) { console.error("Room metadata parse error", err); }
    });

    es.onmessage = async (event) => {
      let msg: any;
      try { msg = JSON.parse(event.data); } catch { return; }
      const { type, from, payload } = msg;

      if (!from || from === participantId) return;

      if (type === "knock" && isHost) {
        setKnockRequests(prev => 
          prev.some(k => k.participantId === from) ? prev : [...prev, { participantId: from, name: payload?.name || "Participant" }]
        );
        return;
      }

      if (type === "user-joined") {
        // Someone joined — send them an offer
        console.log(`[Signal] New user joined: ${from}. Sending offer...`);
        try {
          const pc = getPeer(from);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await sendSignal({ 
            meetingId, 
            type: "offer", 
            from: participantId, 
            target: from, 
            payload: { sdp: offer.sdp, type: offer.type } 
          });
        } catch (err) { console.error("Offer creation failed", err); }
      }

      if (type === "room-metadata") {
        // Update local participant list for UI
        setParticipants(payload);

        // For any participant we don't have a peer for yet, the host should send an offer.
        if (isHost) {
          payload.forEach(async (p: Participant) => {
            if (p.id !== participantId && !peerConns.current[p.id]) {
              console.log(`[Signal] Discovering existing participant ${p.id}. Sending offer...`);
              try {
                const pc = getPeer(p.id);
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                await sendSignal({ 
                  meetingId, type: "offer", from: participantId, target: p.id, 
                  payload: { sdp: offer.sdp, type: offer.type } 
                });
              } catch (e) { console.error("Re-discovery offer failed", e); }
            }
          });
        }
      }

      if (type === "offer") {
        console.log(`[Signal] Received offer from ${from}. Sending answer...`);
        try {
          const pc = getPeer(from);
          await pc.setRemoteDescription(new RTCSessionDescription(payload));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await sendSignal({ 
            meetingId, 
            type: "answer", 
            from: participantId, 
            target: from, 
            payload: { sdp: answer.sdp, type: answer.type } 
          });
        } catch (err) { console.error("Answer creation failed", err); }
      }

      if (type === "answer") {
        console.log(`[Signal] Received answer from ${from}`);
        try {
          const pc = peerConns.current[from];
          if (pc?.signalingState === "have-local-offer") {
            await pc.setRemoteDescription(new RTCSessionDescription(payload));
          }
        } catch (err) { console.error("Answer application failed", err); }
      }

      if (type === "ice-candidate") {
        try {
          const pc = peerConns.current[from];
          if (pc?.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(payload));
          }
        } catch (err) { console.warn("ICE candidate failed", err); }
      }

      if (type === "user-left") closePeer(from);
    };

    es.onerror = (e) => console.warn("[SSE] Connection error", e);

    return () => {
      es.close();
      Object.values(peerConns.current).forEach(pc => pc.close());
      peerConns.current = {};
      setRemoteStreams({});
    };
  }, [meetingId, participantId, userName, isHost, getPeer, closePeer]);

  return { 
    participants, 
    remoteStreams, 
    knockRequests, 
    admitParticipant, 
    denyParticipant,
    updateStatus 
  };
}