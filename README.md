# Stranger Video Chat — Starter Project

A working demo of random-stranger text + video chat, similar in concept to
Omegle/Uhmegle/OmeTV. This is a **learning scaffold**, not a production-ready
product.

## What's included

- `server.js` — Node.js + Socket.io signaling server with a simple
  random-matching queue (pairs up any two waiting users).
- `public/index.html` — Single-page client: camera/mic capture, WebRTC
  peer connection, and a basic text chat panel.
- `package.json` — dependencies.

## Run it locally

```bash
npm install
npm start
```

Then open **http://localhost:3000** in two different browser tabs (or two
devices on the same network) and click "Start" in both. They'll be matched
with each other.

## How it works

1. Client clicks "Start" → browser requests camera/mic access → emits
   `find-peer` to the server.
2. Server holds a waiting queue. When 2+ users are waiting, it pairs them
   and emits `matched` to both, designating one as the WebRTC "initiator."
3. The initiator creates an SDP offer, sent through the server via `offer`.
   The other side replies with `answer`. Both exchange `ice-candidate`
   events as they discover network paths.
4. Once WebRTC negotiation completes, video/audio flows **directly between
   the two browsers** (peer-to-peer) — the server only handled the initial
   handshake, not the media itself.
5. Text chat messages are relayed through the server via `chat-message`.

## Before deploying this anywhere public

This demo will **not work reliably** for real-world users, and is **not
safe to deploy publicly**, without the following:

### 1. TURN server (required for real networks)
Public STUN (`stun.l.google.com`) only helps peers discover their public
IP. Many real users sit behind strict NATs/firewalls (offices, schools,
some mobile carriers) where direct P2P fails outright — you need a TURN
relay as fallback. Options:
- Self-host [coturn](https://github.com/coturn/coturn) on a VPS
- Managed: Twilio, Xirsys, Metered.ca, Cloudflare Calls

Add credentials in `public/index.html` under `rtcConfig.iceServers`.

### 2. Content moderation & legal compliance — the hard part
Omegle itself shut down in 2023 largely due to child-safety lawsuits and
regulatory pressure. Any public random-video-chat service needs, before
launch:
- **Age verification/gating**
- **Automated content moderation** — real-time nudity/CSAM detection
  (e.g., PhotoDNA hash matching is legally required in many jurisdictions
  once you're at scale; there are commercial APIs for this)
- **Reporting + instant-ban tooling**, moderator review queue
- **Clear Terms of Service**, privacy policy, and a defined process for
  responding to law enforcement requests
- Legal counsel review before public launch — liability here is real and
  jurisdiction-dependent

### 3. Production hardening
- Proper session/user management (currently anyone can spam `find-peer`)
- Rate limiting on the signaling server
- HTTPS (required — browsers block camera/mic access on non-secure origins
  except `localhost`)
- Horizontal scaling for the matching queue if you expect real traffic
  (Redis-backed queue instead of an in-memory array)
- Recording/logging policy for moderation evidence, balanced against
  privacy law (GDPR, etc.)

## Next steps to extend this demo
- Add interest-based matching (tags users select before pairing)
- Add a report button that flags the current session to a moderation queue
- Swap the in-memory `waitingQueue` for Redis if you deploy with multiple
  server instances
- Add reconnect/retry logic for flaky connections
