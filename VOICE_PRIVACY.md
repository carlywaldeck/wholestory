# elya conversational voice

## Current default: offline feminine device voice

The user changed the requirement to avoid APIs. VOICE_PROVIDER is now local. Samantha is the first choice, and Chrome was checked to expose Samantha, Karen, Moira and Tessa as installed local voices on this Mac. The app selects a known feminine English localService voice and never silently substitutes a masculine or remote voice. No /api/tts request is made in local mode, so API credits and keys are unnecessary. If no supported feminine voice is installed, an explicit notice and captions remain. Perceived sound still requires user listening. Settings has one sample and a speed slider, with no voice picker.

Ten fixed fictional Samantha WAV auditions were generated offline using macOS say; the public player and score sheet now use these real local clips. The macOS export rate approximates the browser default and can sound slightly different. Runtime patient speech is not recorded or saved as audio. Run node scripts/generate-local-voice-samples.mjs to regenerate on macOS. OpenAI-style tone instructions do not control the local system voice; adjust speed/pause values and audition the installed voice instead.

The OpenAI adapter described below remains optional and inactive. Its earlier quota failure does not block local mode. Changing VOICE_PROVIDER to openai re-enables the provider requirements and privacy review below. No default voice sends spoken text to OpenAI. Speech recognition/dictation is separate and may use the browser’s speech service.

## What is sent and retained

`/api/tts` calls OpenAI's `/v1/audio/speech` with `gpt-4o-mini-tts`, server-selected `marin`, raw 24 kHz mono PCM, and the configured style instruction. The secret stays in the server environment. Requests accept only fixed allowlisted questions, acknowledgments, bounded reflections and audition lines. Raw Journal text, names, account IDs and free-text answers are not accepted by the endpoint. Reflections describe a selected answer or acknowledge that the user supplied their own wording, rather than sending that wording to the provider. This is deliberately less detailed than reflecting arbitrary health information.

Audio is streamed and discarded. Only short generic acknowledgment PCM is cached in volatile browser memory; it never enters IndexedDB, localStorage, analytics or server logs. Captions and the reviewed patient entry remain the record. The only disk-audio exception is the explicitly requested fixed fictional audition clips in public/voice-samples; no patient audio goes there. Runtime responses use no-store. Browser recognition has its own browser/device speech-service policy, unchanged by this work. Local fallback selects a localService voice only, never an unmarked remote system voice.

OpenAI's published data-controls table lists speech as not used for training, no application-state retention, default abuse-monitoring retention up to 30 days, and eligibility for approved Zero Data Retention. There is no supported per-request `store:false` or zero-retention switch on the speech endpoint. We have not inspected or changed this account's organization policy and cannot claim ZDR is active. Lowest-retention next step: the account owner must request/enable eligible ZDR for the project and confirm it applies to this speech model. Whether account policy meets our privacy requirements remains unresolved; no health data should be sent until reviewed. Current allowlisting limits this integration to generic, name-free lines.

Official sources checked during implementation:
- https://developers.openai.com/api/docs/guides/text-to-speech
- https://developers.openai.com/api/docs/guides/your-data

## Voice and tuning

`lib/conversation-voice-config.ts` contains VOICE_ID (one production voice, marin), model, STYLE_INSTRUCTION, default speed 0.95, pauseAfterAck 0.4 seconds and pauseBetweenSentences 0.15 seconds. Settings has Play sample and a 0.8–1.2 speed slider, plus the existing Journal input preference. There is no voice picker. Existing saved multi-voice choices are ignored by this conversational engine.

The user requires a clearly feminine-sounding voice. Marin is the candidate, not a verified gender/quality claim. Human listening is required. Cedar exists only in the requested audition comparison, not as a selectable app voice. No cloning is implemented. If too fast, lower speed; if too flat or chirpy, adjust the style instruction and regenerate samples before choosing a voice; if too quiet, check system/device volume rather than adding artificial gain or whisper instructions. Changing voice or instruction requires regenerating audition clips and refreshing the page to clear volatile caches.

## Playback and interruption

One singleton queue schedules PCM chunks using Web Audio. Sentence requests are prepared ahead while the preceding sentence plays; adjacent PCM chunks use one continuous audio clock. Odd network-byte boundaries are preserved. Network starvation can still produce gaps: gapless scheduling is not a promise about provider delivery. Sentence captions are shown, not word timestamps. API TTS does not supply word alignment here.

AudioContext is created/resumed synchronously from the first playback tap, including a silent one-sample unlock. Stop aborts the shared request controller, stops scheduled sources, cancels fallback synthesis and invalidates late responses. Recording an answer explicitly stops playback first. The microphone never activates automatically. Once a user starts spoken questions, subsequent questions can be read after Next/Skip; a second question is never prepared before that answer/skip selects it. Generic acknowledgment rotation has ten variants and no consecutive repeats. Only already-heard acknowledgments can play from memory instantly; first use needs synthesis.

The existing continuous-recognition flow does not automatically end a turn on silence. It waits for Stop recording and Next, allowing pauses longer than two seconds, including “hold on.” This is manual turn-taking, not automatic silence detection. Passive voice-activity barge-in while the microphone is off is NOT implemented; tap Speak answer to interrupt and listen. Automatic background microphone use would conflict with the app's explicit-start rule. Bluetooth/system output routing follows the browser; no output-device selection or volume override is used. Captions remain when audio fails; unavailable local voices produce an explicit notice.

Existing emergency wording is unchanged. The audition includes the exact existing SafetySection emergency paragraph at normal pace; it is not a new triage trigger. No conversational risk or urgency classification is added.

## Auditions and actual verification

Run `node scripts/generate-voice-samples.mjs` from the project root after server-key configuration. It writes a player and score sheet for the same ten lines in marin and cedar; audio clips are written only on successful provider responses. The first real attempt returned HTTP 429, code credit_balance_exhausted, type insufficient_quota. Consequently zero OpenAI clips were generated and both OpenAI auditions remain pending account credits. The key was never printed or committed. The current public player and generation-status.json have since been replaced by ten successfully generated local Samantha clips.

Unit tests cover provider allowlisting/stream forwarding, fixed model/voice/style, missing-key/provider failure, stale-response suppression after Stop and local-voice fallback/captions. These use silent test doubles, not speaker playback. Hardware Stop-under-100ms, barge-in-under-200ms, first-audio-under-one-second, gaplessness under real network conditions, iOS Safari unlock, Bluetooth routing, and perceived warmth/femininity have NOT been verified. Sample generation metrics are unavailable because the provider rejected synthesis. The generator measures first response bytes (not actual audible playback) when generation succeeds; the runtime exposes measured firstAudioMs after scheduling starts. These are not clinical or voice-quality validation.

Earlier optional-provider software verification: 180 tests passed, TypeScript/production build/Sites packaging passed. A scan confirmed the key is absent from browser assets. Chrome with silent doubles verified no initial audio requests, only fixed spoken lines sent, local fallback and captions on simulated provider failure, a single-voice Settings panel with speed slider, and a twenty-slot player clearly labeled pending. This does not verify audible quality or hardware timing.


Final local-mode verification: 182 tests passed, TypeScript/production build/Sites packaging passed. Chrome exposed installed local Samantha. A silent browser test verified zero speech API requests, feminine voice selection, captions, tap-to-interrupt before simulated answer recording, one voice with speed controls, and ten real WAV files in the offline audition player. Actual sound quality/femininity remains for the user to judge; hardware timing, iOS and Bluetooth remain unverified.
