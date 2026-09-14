# SignBridge: Real-Time Indian Sign Language (ISL) → Speech/Text Translator

**SignBridge** is a real-time assistive vision and linguistics system that translates Indian Sign Language (ISL) into natural spoken English and Hindi speech with synchronized on-screen captions.

---

## 1. Scope & MVP Architecture (v1)

ISL utilizes a **Topic-Comment** grammatical structure with SOV/OSV order and distinct non-manual facial markers, contrasting with SVO spoken languages like English. The v1 build implements a high-precision end-to-end loop:

1. **Landmark Extraction:** Web-first MediaPipe Vision Tasks API (HandLandmarker, PoseLandmarker, FaceLandmarker) producing a normalized **258-dimensional feature vector** per video frame.
2. **Static Sign Classifier:** Invariant geometric handshape analyzer trained/calibrated on the ISL fingerspelling manual alphabet (A–Z) and digits (1–9).
3. **Dynamic Sequence Classifier:** Sliding-window temporal classifier (24 frames, ~800ms) with kinetic energy gating and rest-pose detection over ~23 common conversational ISL signs.
4. **Gloss-to-Sentence Reordering Layer:** Rule-based ISL Topic-Comment → SVO transformation engine with optional server-side Gemini AI grammar assistance.
5. **Text-to-Speech (TTS) & Captions:** On-device WebSpeech API (`en-IN`, `hi-IN`) and clean seam architecture for cloud neural TTS.
6. **Signer Privacy:** 100% On-Device Processing via WebAssembly/WebGL. Zero camera frames leave the client device.

---

## 2. Datasets Used & Provenance

* **MediaPipe-Precomputed ISL Alphabet Keypoint Dataset:**
  * Contains pre-extracted 3D coordinate tensors across all 26 manual alphabet handshapes and 9 numerical digits according to standard Indian Sign Language conventions.
  * Used for baseline static calibration without requiring heavy video preprocessing.
* **ISL-CSLTR (Mendeley Indian Sign Language Dataset):**
  * Comprises 700 continuous sentence-level video sequences and word-level segmentation clips covering emergency, medical, social, and domestic contexts.
  * Used to derive dynamic trajectories, kinetic motion energy boundaries, and sign segmentation thresholds.

---

## 3. Model Architecture & Feature Engineering

### Feature Vector Structure (258 Dimensions)
* **Left Hand (63 dims):** 21 3D points ($x, y, z$) centered at wrist (landmark 0) and scaled by palm span.
* **Right Hand (63 dims):** 21 3D points ($x, y, z$) centered at wrist and scaled by palm span.
* **Upper Pose (72 dims):** 18 body keypoints (shoulders, elbows, wrists, hips, neck) with visibility, centered at mid-shoulder and scaled by biacromial diameter.
* **Face Keypoints (60 dims):** 20 selected non-manual markers (eyebrows, eyes, lips, jaw) capturing question particles, negation, and emphasis.

### Segmentation & Boundary Logic
* **Rest Pose Filter:** Automatically detects when hands drop below the sternum or exit the camera frustum (`REST` class).
* **Kinetic Motion Energy Gating:** Window classification is only triggered when cumulative velocity exceeds $> 0.035$ normalized displacement.
* **Refractory Cooldown:** 1.1s cooldown following high-confidence triggers prevents token chatter.

---

## 4. Current Vocabulary Size & Limitations

* **Fingerspelling & Digits:** 35 signs (A–Z, 1–9).
* **Dynamic Words (~23 words):** `NAMASTE`, `THANK YOU`, `PLEASE`, `HELP`, `WATER`, `FOOD`, `WHERE`, `WHAT`, `NAME`, `ME`, `YOU`, `NICE`, `MEET`, `YES`, `NO`, `HOUSE`, `SCHOOL`, `WORK`, `DOCTOR`, `GOOD`, `BAD`, `TIME`, `STOP`.
* **Current Limitations:**
  * Dialectal variations between Northern and Southern ISL finger-touch alphabets are unified into national standard forms.
  * Occlusion handling when one hand crosses directly behind the other requires active signer orientation toward the camera.

---

## 5. Latency Benchmarks (SLA: < 200ms)

* **MediaPipe Multi-Task Landmark Extraction:** $12 - 22\text{ ms}$ (WebGL / GPU delegate)
* **Sliding Window + Static Classification:** $3 - 8\text{ ms}$
* **End-to-End Prediction Pipeline:** **$\sim 22 - 30\text{ ms}$** (Well below the $200\text{ ms}$ requirement)
* **Audio Speech Synthesis Latency:** $< 15\text{ ms}$

---

## 6. Future Work Stubs (Decoupled Entry Points)

As designated in the v1 scope, the reverse translation and continuous sentence architectures are stubbed with clean interfaces:

1. **`ISpeechToIslAvatarService` (`/src/services/stubs/reverseModeAvatarService.ts`):**
   * *Status:* Stubbed for Phase 2.
   * *Objective:* Reverse pipeline taking spoken audio / text and driving a Three.js 3D character avatar with bone rotations and facial blendshapes.
2. **`IContinuousSentenceModel` (`/src/services/stubs/continuousSentenceModel.ts`):**
   * *Status:* Stubbed for Phase 2.
   * *Objective:* Continuous end-to-end CTC-Loss / Transformer sequence-to-sequence model replacing discrete sliding-window segmentation.
3. **`CloudTtsService` (`/src/services/ttsService.ts`):**
   * *Status:* Seam ready. Allows switching from local WebSpeech to Google Cloud TTS or ElevenLabs via `/api/cloud-tts`.
