
import { db } from "./firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

export async function endMeeting(meetingId: string) {
  const meetingRef = doc(db, "meetings", meetingId);
  await updateDoc(meetingRef, {
    isActive: false,
    endedAt: Date.now()
  });
}

/**
 * Generates a meeting invitation link based on the current environment.
 * Prioritizes the current browser origin to ensure the link is reachable.
 */
export function generateInviteLink(meetingId: string) {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/meeting/${meetingId}`;
  }
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  return `${envUrl || ''}/meeting/${meetingId}`;
}
