<USER_REQUEST>
# Parshwa Platinum Security – Test Case Specification (EP + BVA) Start QA based on the below mentioned

**Target:** web preview `http://localhost:3000` (plus PostgreSQL schema and Flutter app where marked)
**Techniques used:** EP = Equivalence Partitioning (V = valid class, I = invalid class) · BVA = Boundary Value Analysis · ST = State Transition · DT = Decision Table · UI = design-system check · SEC = security · E2E = end to end
**Type:** P = Positive (expected to succeed) · N = Negative (expected to be rejected/blocked)

---
## 0. Instructions for the executing AI tool

1. Execute cases in the order given; respect **Depends** lines. Run Section 3 (bootstrap) first.
2. For every case output one record: `ID | PASS/FAIL/BLOCKED | actual result | evidence (screenshot path, console log, DOM value, SQL output)`.
3. A case is PASS only if **every** clause in Expected holds. Never guess; if a step cannot be performed, mark BLOCKED with the reason.
4. Reset to a clean state (clear storage/DB) before Section 3 and before any section marked **[fresh]**.
5. Cases needing human hearing, a physical device, biometrics, or a real WhatsApp app are tagged **[manual]**; for audio, verify via observable proxies (AudioContext state, console log, or a visible sound indicator) and flag if no proxy exists.
6. Multi-role cases need two or more independent sessions (separate browser contexts/incognito windows).

## 1. Assumed parameters (confirm with product owner; every boundary below derives from these)

| Ref | Parameter | Assumed value |
|---|---|---|
| P1 | Admin email / PIN | `admin@parshwaplatinum.com` / `5829` (PIN = exactly 4 digits, numeric) |
| P2 | Lockout | 5 consecutive failed logins → locked 300 s; counter resets on success |
| P3 | Person name | 2–50 chars; Unicode letters, space, `.` `'` `-`; trimmed |
| P4 | Phone | exactly 10 digits, first digit 6–9, digits only |
| P5 | Resident password | 6–32 chars |
| P6 | Flat number | floor 1–7 + unit 01–04 → 28 flats (101–104 … 701–704) |
| P7 | Guard invite code | exactly 8 alphanumeric chars, case-insensitive input |
| P8 | Gate OTP | exactly 6 digits `000000`–`999999`, single-use, unique among active passes |
| P9 | Pre-approval | validity duration 15 min – 24 h; start ≥ now; max 10 active passes per flat |
| P10 | Intercom ring timeout | 60 s → status "No response" |
| P11 | Notice | title 1–100 chars, body 1–1000 chars, category ∈ {General, Urgent, Maintenance} |
| P12 | Toast | top = 54px, auto-dismiss 4000 ms (±300 ms), close (×) button |
| P13 | Buttons | weight 700; height 44px standard / 36px small; radius 12px / 10px |
| P14 | Bottom nav | ≤ 4 tabs; tap target ≥ 48dp |
| P15 | Resident SOS | max 1 per flat per 60 s; extra taps ignored with message |
| P16 | Visitor name | 2–50 chars (as P3); vehicle no. optional 0–15 alphanumeric |
| P17 | Guard incident note | 1–500 chars |
| P18 | Flats capacity | 28 |

## 2. Test data

| Actor | Details |
|---|---|
| ADMIN | per P1 |
| RES_A | Asha Patel · 9876543210 · flat **101** · password `Pass@123` |
| RES_B | Ravi Shah · 9123456780 · flat **204** · password `Pass@123` |
| RES_C | Meera Joshi · 9012345678 · flat **704** · password `Pass@123` |
| GUARD_1 | Kiran Singh · 9988776655 · password `Guard@123` · invite code read from Admin → Security |
| GUARD_2 | Sunil Rana · 9877665544 · password `Guard@123` |
| Name strings | 1 char `A`; 2 `Al`; 3 `Ali`; 49/50/51 chars = `A`×49 / ×50 / ×51 |

---
## 3. Bootstrap (run first) – **[fresh]**
1. Boot app clean. 2. Log in as ADMIN. 3. Register RES_A, RES_B, RES_C via the UI (each with correct flat). 4. Read guard invite code; register GUARD_1 and GUARD_2. 5. Approve all five in the approval queue. Cases in later sections say **Depends: BOOT** when they need these accounts approved.

---
## 4. Admin login – **[fresh]**

| ID | P/N | Tech | Input / Steps | Expected |
|---|---|---|---|---|
| AL-01 | P | EP-V | Email `admin@parshwaplatinum.com`, PIN `5829`, Login | Admin dashboard opens; session set; keypad click plays |
| AL-02 | P | EP-V | Email `ADMIN@ParshwaPlatinum.COM`, PIN `5829` | Login succeeds (email case-insensitive) |
| AL-03 | P | EP-V | Email with leading/trailing spaces, PIN `5829` | Trimmed; login succeeds |
| AL-04 | N | BVA | PIN empty (0 digits) | Rejected; validation message; no request sent |
| AL-05 | N | BVA | PIN `5` (1 digit) | Rejected |
| AL-06 | N | BVA | PIN `582` (3 digits) | Rejected; login button disabled or error |
| AL-07 | N | BVA | PIN `58290` (5 digits) | Input capped at 4 digits (then behaves as `5829`) **or** rejected; never a login with 5 stored digits |
| AL-08 | N | BVA | PIN `5828` (value just below) | Invalid credentials; buzzer; generic message |
| AL-09 | N | BVA | PIN `5830` (value just above) | Invalid credentials |
| AL-10 | N | EP-I | PIN `58a9` (letter) | Letter rejected at input or login fails |
| AL-11 | N | EP-I | PIN `58#9` / `58 9` (symbol/space) | Rejected |
| AL-12 | N | EP-I | PIN `0000` (well-formed wrong) | Invalid credentials |
| AL-13 | N | EP-I | Email empty, PIN `5829` | Field validation; no login |
| AL-14 | N | EP-I | Email `admin.parshwaplatinum.com` (no @) | Format error |
| AL-15 | N | EP-I | Email `admin@` (no domain) | Format error |
| AL-16 | N | EP-I | Email `secretary@parshwaplatinum.com`, PIN `5829` | Invalid credentials; same message as wrong PIN (no user enumeration) |
| AL-17 | N | BVA | Email of 254 chars, valid format, unknown user | Generic invalid-credentials |
| AL-18 | N | BVA | Email of 255 chars | Format/length error |
| AL-19 | N | EP-I | Both fields empty | Both fields flagged; no request |
| AL-20 | N | SEC | Email `' OR 1=1 --`, PIN `5829`; then `<script>alert(1)</script>` | Login fails; no script runs; no DB error text |
| AL-21 | N | BVA | 4 consecutive wrong PINs, then correct PIN | 4th failure NOT locked; correct PIN logs in; counter resets |
| AL-22 | N | BVA | 5 consecutive wrong PINs | 5th failure triggers lock; message shows lock/wait |
| AL-23 | N | BVA | After lock, enter correct PIN at ~299 s | Still rejected |
| AL-24 | P | BVA | After lock, enter correct PIN at ~301 s | Login succeeds; counter reset |
| AL-25 | N | BVA | 6th attempt (correct PIN) during lock | Rejected with lock message |
| AL-26 | N | SEC | Inspect page source, JS bundle, localStorage, network for plaintext `5829` | Not present in shipped client code, storage, or payloads (hash/server verify only) |
| AL-27 | N | SEC | Logged out; open admin dashboard URL directly | Redirect to login; no admin data rendered |
| AL-28 | N | SEC | Log in with RES_A credentials on Admin screen (Depends: BOOT) | Rejected |
| AL-29 | P | UI | Type PIN | Digits masked; toggle (if present) reveals/hides |
| AL-30 | P | EP-V | Login, refresh page | Session persists or clean re-auth; no crash |

---
## 5. Admin overview, directory, occupancy – **[fresh]** for AO-01..03

| ID | P/N | Tech | Input / Steps | Expected |
|---|---|---|---|---|
| AO-01 | P | BVA | Fresh boot, view overview | Occupied flats **0**/28; visitors inside **0**; no fake rows |
| AO-02 | P | EP-V | Open flats directory | Exactly 28 unique flats: 101–104 … 701–704; 7 floors × 4 |
| AO-03 | P | UI | View every list (visitors, notices, requests) | Each shows icon + prompt empty state |
| AO-04 | P | BVA | Approve RES_A only (Depends: BOOT reset) | Occupied = **1**/28; flat 101 marked occupied |
| AO-05 | P | BVA | Approve residents in 27 different flats | Occupied = **27**/28 |
| AO-06 | P | BVA | Approve resident in the 28th flat | Occupied = **28**/28 (max) |
| AO-07 | N | BVA | Approve 2nd resident in an already occupied flat | Occupied count stays same (flat counted once) |
| AO-08 | N | EP-I | Reject a pending resident | Occupied unchanged |
| AO-09 | P | BVA | Visitors inside 0 → 1 → 0 via approve/enter/checkout | Count 0, 1, 0 respectively, updated without reload |
| AO-10 | N | EP-I | Search directory `999`, `10`, empty | Empty-state or full list for empty; no crash |
| AO-11 | P | EP-V | Search `204` | Only flat 204 shown |

---
## 6. Approval queue (Admin) – Depends: pending requests

| ID | P/N | Tech | Input / Steps | Expected |
|---|---|---|---|---|
| AQ-01 | P | BVA | Fresh boot, open queue | 0 requests; empty state |
| AQ-02 | P | ST | Pending resident → **Approve** | Status approved; resident can log in; leaves queue; toast |
| AQ-03 | P | ST | Pending resident → **Reject** | Status rejected; login blocked with rejection message |
| AQ-04 | P | ST | Pending guard → **Approve** | Guard can open gate console |
| AQ-05 | P | ST | Pending guard → **Reject** | Guard login blocked |
| AQ-06 | N | ST | Pending user tries to log in | "Pending approval" screen; no dashboard/API data |
| AQ-07 | N | ST | Rejected user tries to log in | Blocked; no dashboard |
| AQ-08 | N | ST | Approve an already approved request (stale second admin tab) | "Already processed"; no state change or duplicate toast |
| AQ-09 | N | ST | Double-tap Approve | Processed exactly once |
| AQ-10 | P | DT | Decision table: {resident, guard} × {approve, reject} | 4 outcomes each yield correct final status and correct role access |
| AQ-11 | N | SEC | As RES_A/GUARD_1 call approve API/RPC | Denied (403/RLS) |
| AQ-12 | P | EP-V | New registration arrives while queue open | Appears without manual reload (or within defined refresh) |
| AQ-13 | P | BVA | Queue with 1 and with 10 pending requests | List renders; actions on the last item reachable above nav bar |

---
## 7. Notice board (Admin) – Depends: BOOT

| ID | P/N | Tech | Input / Steps | Expected |
|---|---|---|---|---|
| NB-01 | P | EP-V | Category General, title `Water tank cleaning`, body `Tomorrow 10am`, Publish | Listed for Admin, Resident, Guard; toast |
| NB-02 | P | EP-V | Category Urgent | Shown with urgent styling at/near top |
| NB-03 | P | EP-V | Category Maintenance | Correct badge |
| NB-04 | N | EP-I | No category selected | Validation error or default is explicit; not silently blank |
| NB-05 | N | BVA | Title length 0 | Rejected |
| NB-06 | P | BVA | Title length 1 (`A`) | Accepted |
| NB-07 | P | BVA | Title length 100 | Accepted; renders wrapped |
| NB-08 | N | BVA | Title length 101 | Rejected or blocked at input (max 100) |
| NB-09 | N | BVA | Body length 0 | Rejected |
| NB-10 | P | BVA | Body length 1 | Accepted |
| NB-11 | P | BVA | Body length 1000 | Accepted; no layout break |
| NB-12 | N | BVA | Body length 1001 | Rejected/blocked |
| NB-13 | N | EP-I | Title whitespace only `   ` | Rejected |
| NB-14 | N | SEC | Title `<img src=x onerror=alert(1)>` | Rendered as plain text; no script runs |
| NB-15 | P | EP-V | Title with emoji `🚧 Lift` and Gujarati/Hindi text; body with newlines | Displays correctly; newlines preserved |
| NB-16 | P | EP-V | Edit a notice; save | Updated in every role view |
| NB-17 | P | EP-V | Delete → Confirm | Removed everywhere |
| NB-18 | N | EP-I | Delete → Cancel | Notice remains |
| NB-19 | P | EP-V | Publish 3 notices in order | Newest first (urgent pinned if implemented) |
| NB-20 | N | SEC | RES_A inserts into notices via API | Denied |

---
## 8. Security settings and guard invite code – Depends: BOOT

| ID | P/N | Tech | Input / Steps | Expected |
|---|---|---|---|---|
| SC-01 | P | EP-V | Open Security | 8-char alphanumeric code shown |
| SC-02 | P | ST | Rotate → Confirm | New 8-char code ≠ old; toast |
| SC-03 | N | ST | Rotate → Cancel | Code unchanged |
| SC-04 | N | ST | Register guard with **old** code after rotation | Rejected "Invalid invite code" |
| SC-05 | P | ST | Register guard with **new** code | Request created as pending |
| SC-06 | P | UI | Tap copy | Code copied; toast |
| SC-07 | N | SEC | GUARD_1/RES_A read invite code via API | Denied |

---
## 9. Resident registration – **[fresh]** per case group

| ID | P/N | Tech | Input / Steps | Expected |
|---|---|---|---|---|
| RR-01 | P | EP-V | Name `Asha Patel`, phone `9876543210`, flat `101`, password `Pass@123` | Request created as pending; confirmation; appears in Admin queue |
| RR-02 | N | BVA | Name length 0 | Rejected |
| RR-03 | N | BVA | Name length 1 (`A`) | Rejected |
| RR-04 | P | BVA | Name length 2 (`Al`) | Accepted |
| RR-05 | P | BVA | Name length 3 | Accepted |
| RR-06 | P | BVA | Name length 49 | Accepted |
| RR-07 | P | BVA | Name length 50 | Accepted |
| RR-08 | N | BVA | Name length 51 | Rejected/blocked |
| RR-09 | N | EP-I | Name `Asha123` (digits) | Rejected |
| RR-10 | N | EP-I | Name `@#$%` / emoji only | Rejected |
| RR-11 | N | EP-I | Name spaces only | Rejected |
| RR-12 | P | EP-V | Name `  Asha  Patel  ` | Trimmed/collapsed; accepted |
| RR-13 | P | EP-V | Name with Unicode letters (`આશા પટેલ`) | Accepted; displayed correctly |
| RR-14 | N | BVA | Phone 9 digits `987654321` | Rejected |
| RR-15 | P | BVA | Phone 10 digits `9876543210` | Accepted |
| RR-16 | N | BVA | Phone 11 digits | Rejected/blocked |
| RR-17 | N | BVA | Phone starting `5` (`5876543210`) | Rejected (first digit 6–9) |
| RR-18 | P | BVA | Phone starting `6` (`6876543210`) | Accepted |
| RR-19 | N | EP-I | Phone `98765abcde`, `98765 4321`, `+919876543210` | Rejected |
| RR-20 | N | EP-I | Phone empty | Rejected |
| RR-21 | N | EP-I | Phone already used by another user | Rejected "already registered"; no duplicate row |
| RR-22 | N | BVA | Password length 5 | Rejected |
| RR-23 | P | BVA | Password length 6 | Accepted |
| RR-24 | P | BVA | Password length 7 | Accepted |
| RR-25 | P | BVA | Password length 31 / 32 | Accepted |
| RR-26 | N | BVA | Password length 33 | Rejected/blocked |
| RR-27 | N | EP-I | Password empty | Rejected |
| RR-28 | P | EP-V | Flat selector lists | Exactly 28 options 101–704 |
| RR-29 | P | BVA | Flats `101`, `104`, `201`, `404`, `701`, `704` (floor/society edges) | Each accepted |
| RR-30 | N | BVA | Flats `100`, `105`, `001`, `705`, `801`, `0`, `1000` (via API/tampering) | Each rejected by validation **and** DB constraint |
| RR-31 | N | EP-I | Flat `1O1` (letter O), empty, `-101` | Rejected |
| RR-32 | N | EP-I | No flat selected | Blocked "Select your flat" |
| RR-33 | P | EP-V | Second resident for occupied flat 101 | Accepted as pending (family); still needs approval |
| RR-34 | N | EP-I | Double-tap Register | One request only |
| RR-35 | N | SEC | Inspect DB row | Password hashed (no plaintext) |
| RR-36 | P | UI | 360px width | Fields aligned; Submit visible with keyboard open; buttons per P13 |

---
## 10. Guard registration

| ID | P/N | Tech | Input / Steps | Expected |
|---|---|---|---|---|
| GR-01 | P | EP-V | Valid details + current 8-char code | Pending request; visible to Admin |
| GR-02 | P | EP-V | Code in lowercase | Accepted (case-insensitive) |
| GR-03 | P | EP-V | Code with leading/trailing spaces | Trimmed; accepted |
| GR-04 | N | BVA | Code 7 chars | Rejected |
| GR-05 | N | BVA | Code 9 chars | Rejected |
| GR-06 | N | BVA | Code empty | Rejected |
| GR-07 | N | EP-I | Wrong 8-char code | Rejected "Invalid invite code"; no record |
| GR-08 | N | EP-I | Code with symbol `ABCD-123` | Rejected |
| GR-09 | N | ST | Pending guard logs in | Pending screen; no console |
| GR-10 | N | SEC | Guard updates own status to approved via API | Denied |
| GR-11 | N | BVA | Guard name/phone/password | Same boundaries as RR-02..RR-27 apply (run subset: name 1/2/50/51, phone 9/10/11, password 5/6/32/33) |

---
## 11. Doorbell intercom – Depends: BOOT (RES_A flat 101 and RES_B flat 204 logged in, GUARD_1 logged in, separate sessions)

| ID | P/N | Tech | Input / Steps | Expected |
|---|---|---|---|---|
| IC-01 | P | EP-V | Guard logs Guest `Rahul Mehta` for 101 and taps Ring | RES_A sees ring overlay instantly with chime; shows name, category, time |
| IC-02 | P | ST | RES_A taps Approve | Guard console shows Approved; chime stops |
| IC-03 | P | ST | RES_A taps Reject | Guard sees Rejected; entry not allowed; error tone on guard side |
| IC-04 | N | SEC | Guard rings 101 | RES_B (204) receives nothing |
| IC-05 | N | EP-I | RES_A logged out; guard rings 101 | Guard sees "unavailable/no response"; visitor stays Pending until timeout |
| IC-06 | N | BVA | No response for 59 s | Still ringing/Pending |
| IC-07 | N | BVA | No response for 60 s | Ring ends; status "No response"; chime stops |
| IC-08 | N | BVA | Response at 61 s (after timeout) | Rejected as expired; status unchanged |
| IC-09 | N | ST | Guard taps "Allow entry" while status Pending | Not possible/blocked; approval required |
| IC-10 | N | ST | Guard taps "Allow entry" after Rejected | Blocked |
| IC-11 | N | EP-I | Guard rings vacant flat (no approved resident) | Warning "No resident registered"; no ring |
| IC-12 | P | BVA | Two visitors for 101 rung 1 s apart | Both queued; each decision applies to the correct visitor |
| IC-13 | N | EP-I | RES_A double-taps Approve | One decision recorded |
| IC-14 | P | UI | Ring overlay at 375×812 | Approve/Reject ≥44px tall; not hidden behind nav |
| IC-15 | P | EP-V | Resident tab in background when ring arrives **[manual]** | Chime/notification delivered once (no duplicates) |

---
## 12. Pre-approved visitor (OTP + QR) – Depends: BOOT (RES_A)

| ID | P/N | Tech | Input / Steps | Expected |
|---|---|---|---|---|
| PA-01 | P | EP-V | Name `Rahul Mehta`, start = now, duration 1 h, Generate | 6-digit OTP + QR; listed under Active |
| PA-02 | P | EP-V | Generate 20 passes | All OTPs are 6-digit numeric; leading zeros retained; no duplicates among active |
| PA-03 | N | BVA | Visitor name length 0 / 1 | Rejected |
| PA-04 | P | BVA | Name length 2 / 50 | Accepted |
| PA-05 | N | BVA | Name length 51 | Rejected/blocked |
| PA-06 | N | EP-I | Name `<b>x</b>`; emoji only | Stored/displayed as text; emoji-only rejected |
| PA-07 | N | BVA | Duration 14 min | Rejected |
| PA-08 | P | BVA | Duration 15 min | Accepted |
| PA-09 | P | BVA | Duration 16 min | Accepted |
| PA-10 | P | BVA | Duration 24 h | Accepted |
| PA-11 | N | BVA | Duration 24 h 1 min | Rejected |
| PA-12 | N | BVA | Start time 1 minute in the past | Rejected |
| PA-13 | N | EP-I | End before start | Rejected |
| PA-14 | P | BVA | 9 active passes → generate 10th | Accepted |
| PA-15 | N | BVA | 10 active passes → generate 11th | Rejected "limit reached" |
| PA-16 | P | EP-V | Scan QR with guard scanner or QR reader | Payload resolves to this pass (visitor, flat 101, OTP/token) |
| PA-17 | P | EP-V | Tap Share **[manual]** | WhatsApp share opens with text, OTP and QR image |
| PA-18 | N | EP-I | Share when WhatsApp unavailable **[manual]** | Fallback (system share/copy); no crash |
| PA-19 | P | ST | Revoke active pass → Confirm | Status Revoked; gate verification fails |
| PA-20 | N | ST | Revoke → Cancel | Stays Active |
| PA-21 | P | UI | No passes yet | Empty state with icon/prompt |
| PA-22 | P | UI | QR in dark and light theme | High contrast; scannable; not clipped |

---
## 13. Delivery preference – Depends: BOOT

| ID | P/N | Tech | Input / Steps | Expected |
|---|---|---|---|---|
| DP-01 | P | EP-V | Default value on new resident | "Ask for approval" selected |
| DP-02 | P | EP-V | Set "Leave at security gate"; log out/in | Persisted |
| DP-03 | P | DT | Decision table: pref {Ask, Leave} × category {Delivery, Guest, Cab, Service} | Only (Leave, Delivery) skips the ring and logs "Left at gate"; the other 7 combinations ring the resident |
| DP-04 | N | SEC | RES_A sets Leave; guard logs Delivery to 204 | RES_B behaviour unchanged (rings) |
| DP-05 | P | UI | Toggle | Selected state obvious; target ≥44px |

---
## 14. Resident SOS – Depends: BOOT (guard console open)

| ID | P/N | Tech | Input / Steps | Expected |
|---|---|---|---|---|
| SO-01 | P | EP-V | Tap SOS → Confirm | Alert to guards and admin with flat 101 and time; alert tone |
| SO-02 | N | EP-I | Tap SOS → Cancel | No alert |
| SO-03 | P | ST | Guard acknowledges | Status Acknowledged; incident logged |
| SO-04 | N | BVA | Second SOS at 59 s | Ignored; message "already sent" |
| SO-05 | P | BVA | Second SOS at 60 s | Accepted |
| SO-06 | P | BVA | SOS at 61 s | Accepted |
| SO-07 | N | EP-I | Offline SOS **[manual]** | User told it failed with retry/call fallback |
| SO-08 | N | SEC | Logged out; call SOS API | Denied |
| SO-09 | P | UI | Resident home | SOS distinct, reachable, not near logout/profile actions |

---
## 15. Resident notices and visitor history – Depends: BOOT

| ID | P/N | Tech | Input / Steps | Expected |
|---|---|---|---|---|
| RH-01 | P | EP-V | Admin publishes notice; resident opens list | Visible; urgent highlighted; arrives without reload |
| RH-02 | P | BVA | 0 notices / 1 notice / 50 notices | Empty state / single card / scrollable list |
| RH-03 | P | BVA | 0 visits / 1 visit / many visits in history | Empty state / one item / paginated or scrollable |
| RH-04 | P | SEC | Visits exist for 101 and 204; log in as RES_A | Only 101 visits shown |
| RH-05 | N | SEC | Query visitors with flat_id 204 as RES_A | 0 rows |
| RH-06 | P | EP-V | Open a history item | Name, category, in/out times, decision by shown |

---
## 16. Guard walk-in logger – Depends: BOOT (GUARD_1)

| ID | P/N | Tech | Input / Steps | Expected |
|---|---|---|---|---|
| GW-01 | P | UI | Open selector | 7 floor rows × 4 flats 101–704; target ≥44px; one-hand reachable |
| GW-02 | P | BVA | Select flat 101, 104, 401, 704 in turn | Only the latest is highlighted; correct flat passed on submit |
| GW-03 | P | EP-V | Flat 203, name `Rahul Mehta`, chip Guest, Ring | Visitor Pending; RES (203) rung |
| GW-04 | P | EP-V | Repeat with chips Delivery, Cab, Service | Each stored with correct category; only one chip selectable at a time |
| GW-05 | N | EP-I | No category chip | Blocked with message |
| GW-06 | N | EP-I | No flat selected | Blocked; error buzzer |
| GW-07 | N | BVA | Name length 0 / 1 | Rejected |
| GW-08 | P | BVA | Name length 2 / 50 | Accepted |
| GW-09 | N | BVA | Name length 51 | Rejected/blocked |
| GW-10 | P | BVA | Vehicle no. length 0 (optional) / 15 | Accepted |
| GW-11 | N | BVA | Vehicle no. length 16; symbols `MH-12#` | Rejected |
| GW-12 | N | EP-I | Double-tap Ring | One visitor record |
| GW-13 | P | DT | Delivery to flat with pref Leave at gate | No ring; logged "Left at gate" |
| GW-14 | P | UI | Dark mode | Contrast ≥ 4.5:1 for text/controls; no white flash |
| GW-15 | N | ST | Attempt entry for Pending visitor (UI and API) | Blocked |

---
## 17. Guard pre-approval verifier – Depends: active pass PA-01 (OTP known)

| ID | P/N | Tech | Input / Steps | Expected |
|---|---|---|---|---|
| GV-01 | P | EP-V | Enter correct 6-digit OTP, Verify | Success shows visitor name + flat; barrier sound; appears Inside Campus |
| GV-02 | N | BVA | OTP 0 / 1 / 5 digits | Verify disabled or error |
| GV-03 | N | BVA | OTP 7 digits | Input capped at 6 or rejected |
| GV-04 | N | BVA | OTP `000000` and `999999` (unassigned) | "Invalid OTP"; buzzer |
| GV-05 | N | BVA | OTP = correct −1 and +1 | Invalid |
| GV-06 | P | BVA | Pass whose OTP has leading zero (e.g. `004512`) | Verifies correctly (not truncated) |
| GV-07 | N | EP-I | Non-numeric `12a456` | Blocked |
| GV-08 | N | BVA | Verify at expiry −1 s | Success |
| GV-09 | N | BVA | Verify at expiry exactly | Per boundary rule: **rejected as expired** |
| GV-10 | N | BVA | Verify at expiry +1 s | Rejected as expired |
| GV-11 | N | ST | Verify same OTP twice | Second attempt rejected (single-use) |
| GV-12 | N | ST | Verify revoked pass | Rejected |
| GV-13 | N | SEC | 20 wrong OTPs in a row | Throttle/lockout after 5 failures (same as P2) |
| GV-14 | P | EP-V | Scan valid QR | Laser animation; success; logged Inside |
| GV-15 | N | SEC | Scan tampered/random QR | Rejected; error buzzer |
| GV-16 | N | EP-I | Camera permission denied **[manual]** | Message + fallback to manual OTP |
| GV-17 | P | UI | Keypad taps | Click sound per key; backspace works; targets ≥48dp |

---
## 18. Inside campus tracker and checkout – Depends: BOOT

| ID | P/N | Tech | Input / Steps | Expected |
|---|---|---|---|---|
| GI-01 | P | BVA | 0 visitors inside | Empty state icon/prompt |
| GI-02 | P | BVA | 1 approved visitor entered | Listed with name, flat, category, entry time |
| GI-03 | P | BVA | 50 visitors inside | Scrolls; Exit buttons not covered by nav |
| GI-04 | P | ST | Tap Exit | Removed; exit time stored; admin count −1 |
| GI-05 | N | ST | Double-tap Exit | One exit event |
| GI-06 | N | ST | Rejected, No-response, Pending visitors | Not listed as Inside |
| GI-07 | P | EP-V | OTP-verified visitor | Listed with "pre-approved" tag |
| GI-08 | N | ST | Two guards Exit same visitor | Second gets "already exited" |

---
## 19. Guard incident logger

| ID | P/N | Tech | Input / Steps | Expected |
|---|---|---|---|---|
| GS-01 | P | EP-V | Note `Suspicious person at gate`, Save | Stored with timestamp and guard id |
| GS-02 | N | BVA | Note length 0 | Rejected |
| GS-03 | P | BVA | Note length 1 / 500 | Accepted |
| GS-04 | N | BVA | Note length 501 | Rejected/blocked |
| GS-05 | P | UI | No incidents | Empty state |
| GS-06 | N | SEC | Resident reads incident log via API | Denied |

---
## 20. Visitor state machine (ST)

Valid transitions must succeed; every invalid transition must be blocked (UI and API).

| ID | P/N | Transition | Expected |
|---|---|---|---|
| VS-01 | P | Pending → Approved | Allowed (resident) |
| VS-02 | P | Approved → Inside | Allowed (guard) |
| VS-03 | P | Inside → Exited | Allowed (guard) |
| VS-04 | P | Pending → Rejected | Allowed (resident) |
| VS-05 | P | Pending → No response | Automatic at 60 s |
| VS-06 | N | Pending → Inside | Blocked |
| VS-07 | N | Rejected → Inside | Blocked |
| VS-08 | N | No response → Inside | Blocked |
| VS-09 | N | Exited → Inside | Blocked |
| VS-10 | N | Exited → Exited | Blocked |
| VS-11 | N | Guard sets Approved | Blocked (only resident) |
| VS-12 | P | Pass: Active → Used / Expired / Revoked | Each allowed |
| VS-13 | N | Pass: Used → Active; Expired → Active; Revoked → Used | Blocked |

---
## 21. Design system, navigation, logout, toasts (UI)

| ID | P/N | Tech | Input / Steps | Expected |
|---|---|---|---|---|
| DS-01 | P | UI | Computed style of all buttons on every screen, all roles | `font-weight` = 700 |
| DS-02 | P | BVA | Standard buttons height | 44px (43px = FAIL) |
| DS-03 | P | BVA | Small buttons height | 36px (35px = FAIL) |
| DS-04 | P | UI | Border radius | Standard 12px; small 10px |
| DS-05 | P | UI | Press and hold any button | Visible active/pressed state |
| DS-06 | N | UI | Audit for non-system (inline-styled) buttons | None found |
| DS-07 | N | UI | Disabled button (e.g. empty form) | Visibly disabled; no press state; no action |
| DS-08 | P | UI | Palette: Terracotta #B96D3A/#C87E4B, Sandstone #FAF7F3/#DFCAA0, Slate #161A20/#272E38, Emerald #059669 | Used as specified; no off-palette primary colours |
| NV-01 | P | BVA | Count tabs for Admin, Resident, Guard | Each ≤ 4 (5 = FAIL) |
| NV-02 | P | UI | Active tab | Filled SVG icon inside pill indicator |
| NV-03 | P | UI | Inactive tab | Outlined SVG icon, no pill |
| NV-04 | P | BVA | Tab hit-area size | ≥ 48×48dp (47 = FAIL) |
| NV-05 | N | UI | Look for logout in bottom nav | None |
| NV-06 | N | EP-I | Tap tabs 20× quickly | No crash/flicker; final tab content correct |
| NV-07 | N | SEC | Resident opens admin route/tab | Redirect; no admin tabs |
| LO-01 | P | EP-V | Search all screens, all roles, for logout controls | Exactly **one** per role, inside Profile/Account popup |
| LO-02 | P | EP-V | Profile → Log Out | One dialog: "Yes, Log Out" / "Cancel" |
| LO-03 | P | ST | Yes, Log Out | Session/tokens cleared; login screen; Back does not restore session |
| LO-04 | N | ST | Cancel | Dialog closes; session intact; same screen |
| LO-05 | N | EP-I | Tap scrim or press Back | Dialog closes; still logged in |
| LO-06 | N | EP-I | Tap Log Out repeatedly | Only one dialog |
| LO-07 | P | UI | Logout button colour | Sandstone/terracotta family; not saturated red |
| LO-08 | N | SEC | After logout: inspect storage; visit protected URL | No tokens/user data; redirected |
| TO-01 | P | BVA | Toast `top` | 54px; header fully visible above it |
| TO-02 | P | UI | Toast on screens with primary CTA/nav | Does not overlap header, nav, or CTA |
| TO-03 | P | UI | 300-char message | Wraps; no overflow or ellipsis cut |
| TO-04 | P | BVA | Check at 3.7 s | Still visible |
| TO-05 | P | BVA | Check at 4.3 s | Dismissed |
| TO-06 | P | EP-V | Tap × | Dismissed immediately; timer cleared |
| TO-07 | P | BVA | × hit area | ≥ 44px |
| TO-08 | N | BVA | Trigger 1, 2, 5 toasts quickly | Queued/stacked; none overlaps another; all auto-dismiss |
| TO-09 | N | EP-I | Navigate while toast visible | Dismisses cleanly or persists; no ghost |
| TO-10 | P | UI | Keyboard open + toast | Toast visible; input not covered |

---
## 22. Zero mock data and workflow rules – **[fresh]**

| ID | P/N | Tech | Input / Steps | Expected |
|---|---|---|---|---|
| ZD-01 | P | BVA | Fresh boot, each role | 0 visitors, 0 pre-approvals, 0 notices, 0 registration requests |
| ZD-02 | P | EP-V | Flats roster | 28 flats present |
| ZD-03 | N | SEC | Try default logins: `guard/guard`, `resident/1234`, `admin/admin` | All fail |
| ZD-04 | P | DT | Guard entry: resident decision {approve, reject, none} × pref {Ask, Leave} × category {Delivery, other} | Entry allowed only after explicit resident approval, except (Leave, Delivery) = left at gate |
| ZD-05 | P | ST | New registration: pending → approved → login | Login only after approval |
| ZD-06 | P | EP-V | Reload/restart with data | Data intact |
| ZD-07 | N | EP-I | Clear storage/DB | Returns to clean state; no errors |

---
## 23. Audio (Web Audio API)

| ID | P/N | Tech | Input / Steps | Expected |
|---|---|---|---|---|
| AU-01 | P | EP-V | Ring arrives after a user gesture | Doorbell plays once per ring (AudioContext `running`) |
| AU-02 | P | EP-V | Valid OTP / entry allowed | Gate barrier sound |
| AU-03 | P | EP-V | Invalid OTP / wrong PIN | Error buzzer |
| AU-04 | P | EP-V | Keypad tap | Click per tap |
| AU-05 | N | EP-I | Ring arrives before any gesture | No console error; AudioContext `suspended`; resumes on first tap; visible cue if blocked |
| AU-06 | N | BVA | 1, 5, 20 rapid events | No stuck/looping audio; no leaked contexts |
| AU-07 | P | UI | Loudness of all sounds **[manual]** | No clipping; comparable levels |

---
## 24. PostgreSQL schema and RLS

**Role × table × operation matrix (DT).** Expected = ALLOW or DENY. Test each with a JWT for that role.

| ID | Table / Op | Anon | Resident (own flat) | Resident (other flat) | Guard | Admin |
|---|---|---|---|---|---|---|
| DB-01 | flats SELECT | DENY | ALLOW | ALLOW | ALLOW | ALLOW |
| DB-02 | flats INSERT/UPDATE/DELETE | DENY | DENY | DENY | DENY | DENY (seed-managed) |
| DB-03 | visitors SELECT | DENY | ALLOW | **DENY (0 rows)** | ALLOW | ALLOW |
| DB-04 | visitors INSERT | DENY | DENY | DENY | ALLOW (status = pending) | ALLOW |
| DB-05 | visitors UPDATE status → approved/rejected | DENY | ALLOW (own flat only) | DENY | DENY | ALLOW |
| DB-06 | visitors UPDATE → inside/exited | DENY | DENY | DENY | ALLOW | ALLOW |
| DB-07 | profiles UPDATE own status → approved | DENY | DENY | DENY | DENY | ALLOW |
| DB-08 | pre_approvals SELECT/INSERT | DENY | ALLOW (own flat) | DENY | SELECT/verify ALLOW | ALLOW |
| DB-09 | notices SELECT | DENY | ALLOW | ALLOW | ALLOW | ALLOW |
| DB-10 | notices INSERT/UPDATE/DELETE | DENY | DENY | DENY | DENY | ALLOW |
| DB-11 | sos_events INSERT | DENY | ALLOW (own flat) | DENY | ALLOW | ALLOW |
| DB-12 | incident_log INSERT / SELECT | DENY | DENY | DENY | ALLOW | ALLOW |
| DB-13 | settings / invite_code SELECT | DENY | DENY | DENY | DENY | ALLOW |

| ID | P/N | Tech | Input / Steps | Expected |
|---|---|---|---|---|
| DB-14 | P | EP-V | Apply schema + seed to empty DB; re-run | No errors; idempotent |
| DB-15 | P | BVA | `SELECT count(*) FROM flats` | 28; unique numbers 101–704 |
| DB-16 | P | BVA | Count rows in visitors, notices, pre_approvals, registration requests after seed | 0 each |
| DB-17 | N | BVA | Insert flats `100`, `105`, `705`, `801` | Rejected by constraint |
| DB-18 | N | BVA | Insert name of 1 and 51 chars; phone of 9 and 11 digits; password hash absent | Rejected by CHECK/NOT NULL |
| DB-19 | N | BVA | Insert OTP of 5 and 7 digits | Rejected |
| DB-20 | N | EP-I | Insert duplicate active OTP | Rejected (unique) |
| DB-21 | P | EP-V | Query `relrowsecurity` for all user-data tables | `true` for every table |
| DB-22 | N | SEC | Credential columns | Hashed and salted; no plaintext |
| DB-23 | N | SEC | Visitor name `'; DROP TABLE visitors;--` | Stored literally; table intact |
| DB-24 | P | EP-V | Delete a parent row with children | Cascade/restrict behaves as designed; no orphans |

---
## 25. Flutter app

| ID | P/N | Tech | Input / Steps | Expected |
|---|---|---|---|---|
| FL-01 | P | SEC | Inspect storage after login | PIN/tokens only in secure storage (Keychain/Keystore), not SharedPreferences/files **[manual]** |
| FL-02 | P | EP-V | Enable biometric; relaunch; authenticate **[manual]** | Unlocks |
| FL-03 | N | BVA | Biometric fails 1, 2, 3 times **[manual]** | Falls back to PIN after 3; no bypass |
| FL-04 | N | EP-I | Device without biometrics **[manual]** | Option hidden/disabled with explanation |
| FL-05 | P | ST | Background app past timeout, return | Re-auth required (if timeout defined) |
| FL-06 | P | EP-V | Ring on device **[manual]** | Sound/vibration; overlay |
| FL-07 | P | EP-V | Camera permission first use **[manual]** | Prompt; scan works |
| FL-08 | P | UI | 360×640, 412×915, tablet, landscape | No overflow; DS rules hold |
| FL-09 | P | UI | System dark mode | All roles legible; guard console high contrast |
| FL-10 | N | SEC | Inspect release build | No debug flags; no hardcoded secrets/PIN |
| FL-11 | N | EP-I | Airplane mode actions | Graceful errors; no crash |

---
## 26. Web preview (port 3000)

| ID | P/N | Tech | Input / Steps | Expected |
|---|---|---|---|---|
| WB-01 | P | EP-V | Open `http://localhost:3000` | Loads; 0 console errors |
| WB-02 | P | EP-V | Log in as each role | Correct dashboard and 4-tab nav |
| WB-03 | P | EP-V | Guard tab + Resident tab side by side; guard rings | Resident tab receives ring within 2 s |
| WB-04 | N | EP-I | Port 3000 busy at start | Clear error |
| WB-05 | P | BVA | Viewports 320, 375, 412, 768, 1280 px | No horizontal scroll; safe areas respected; nav ≥48dp |
| WB-06 | P | EP-V | Chrome, Firefox, Safari, Edge | Same behaviour and audio |
| WB-07 | N | EP-I | Throttle to Slow 3G; run key flows | Loading states; no duplicate submissions |
| WB-08 | P | UI | Lighthouse/axe | No critical a11y violations; icon buttons labelled |

---
## 27. End-to-end flows (all roles)

| ID | P/N | Tech | Input / Steps | Expected |
|---|---|---|---|---|
| E2E-01 | P | E2E | Guard logs walk-in → ring → resident approves → guard allows entry → guard checks out | States consistent in all 3 roles; history and counts correct |
| E2E-02 | P | E2E | Walk-in rejected by resident | Not Inside; history shows Rejected |
| E2E-03 | P | E2E | Walk-in unanswered 60 s | "No response"; guard can re-ring or log |
| E2E-04 | P | E2E | Resident pre-approves → shares → guard verifies OTP → checkout | Entry logged; OTP single-use afterwards |
| E2E-05 | P | E2E | Register resident → admin approves → login | Works only after approval |
| E2E-06 | P | E2E | Admin publishes Urgent notice | Resident and guard both see it |
| E2E-07 | P | E2E | Resident SOS → guard acknowledges → logged → admin sees | Complete chain |
| E2E-08 | N | E2E | Try cross-role actions via UI and API (resident approves users; guard publishes notices; admin-only settings) | All blocked |

---
## 28. Coverage summary

- **EP** applied to: email, PIN, name, phone, password, flat, invite code, OTP, notice category/title/body, visitor category, delivery preference × category, user role, approval decision.
- **BVA** applied to: PIN length (0/1/3/4/5), lockout count (4/5/6) and time (299/301 s), name (0/1/2/3/49/50/51), phone (9/10/11 + first digit), password (5/6/7/31/32/33), flat edges (100/101/104/105/701/704/705/801), invite code (7/8/9), OTP (5/6/7, 000000/999999, ±1), pre-approval duration (14 m/15 m/24 h/24 h 1 m), active passes (9/10/11), ring timeout (59/60/61 s), SOS interval (59/60/61 s), notice title (0/1/100/101), body (0/1/1000/1001), incident note (0/1/500/501), occupancy (0/1/27/28), toast (3.7/4.3 s, 54px), button heights (43/44, 35/36), nav tabs (4/5), tap target (47/48dp).
- **State transition:** registration approvals, visitor lifecycle, pass lifecycle, logout dialog.
- **Decision tables:** delivery preference × category, approval decision, role × table RLS matrix.
</USER_REQUEST>
<ADDITIONAL_METADATA>
The current local time is: 2026-09-29T16:30:11+05:30.
</ADDITIONAL_METADATA>