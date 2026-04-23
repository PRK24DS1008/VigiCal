# **App Name**: GuardCall

## Core Features:

- Meeting Lifecycle Management: Allows hosts to create new meetings, generating unique IDs and secure invite links. Manages meeting persistence and state.
- Secure Invitation & Joining: Host can invite participants via email. Participants join through validated, secure links, presented with a pre-join screen to configure AV devices and enter their name.
- Real-time Video Conferencing: Establishes peer-to-peer WebRTC connections for live audio and video streaming, coordinated via a WebSocket signaling server.
- Dynamic Participant Management: Maintains real-time participant state, dynamically updating the UI video grid as users join and leave the meeting.
- AI-Powered Audio Deepfake Detection: Continuously captures and analyzes active participants' audio using a backend AI tool to extract features and compute a deepfake risk score.
- AI-Powered Video Deepfake Detection: Periodically captures and analyzes active participants' video frames using a backend AI tool to detect visual deepfakes and compute a risk score.
- Host Security Dashboard & Alerts: A dedicated dashboard for the host, displaying real-time AI risk scores for all participants (audio, video, total) and triggering visual and audible alerts for suspicious activity.

## Style Guidelines:

- Primary color: A vibrant yet deep blue-violet (#6B9EF3), reflecting professionalism, security, and advanced technology. This hue contrasts well against a dark background.
- Background color: A very dark, desaturated blue (#12151D) providing a sophisticated and focused canvas that allows content and alerts to stand out without being visually strenuous.
- Accent color: A dynamic aqua-teal (#25D5C6), providing a lively contrast to the primary and background colors. It can be used for interactive elements, highlights, and subtle alerts to draw attention without being harsh.
- Headline font: 'Space Grotesk' (sans-serif), lending a modern, tech-forward, and crisp feel to prominent text elements. Body font: 'Inter' (sans-serif), ensuring excellent readability for all functional and informational text within the application.
- Utilize a consistent set of sleek, modern, and outline-based icons. Focus on clarity for meeting controls (mic, camera, hang-up), participant statuses, and especially for security-related alerts and dashboard elements (e.g., warning triangles, lock icons).
- Implement a 'Zoom-like' adaptable video grid for participant streams, responsive across devices. The pre-join screen should be minimalist and focused. The Host Dashboard requires a clear, segmented layout to display participant data and real-time risk scores efficiently, with a dedicated area for prominent alerts.
- Incorporate subtle, smooth transition animations for participants joining or leaving the meeting, dynamic grid resizing, and dashboard updates. Critical alerts should utilize a slightly more noticeable, but not overly distracting, animation to draw the host's attention.