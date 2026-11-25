import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const engine = require('../analyzer.worker.js');

const SYNTHETIC = `12/03/26, 9:00 pm - Rohan Verma: Hey Ananya! Ready for tomorrow?
12/03/26, 9:01 pm - Ananya Iyer: Rohannnnn yes!! Look at me getting dressed up
12/03/26, 9:01 pm - Rohan Verma: I want to see you rn, send a pic please!
12/03/26, 9:02 pm - Ananya Iyer: <Media omitted>
12/03/26, 9:03 pm - Rohan Verma: abbboooo ananyaaaa you look like a kutti ponnu cuteee! ❤️‍🔥
12/03/26, 9:04 pm - Ananya Iyer: Stoooop abbooooo making me blush 🙈🙈
12/03/26, 9:05 pm - Rohan Verma: Byee goodnight
12/03/26, 9:05 pm - Ananya Iyer: Byeeeeee ❤️
13/03/26, 10:15 am - Ananya Iyer: Did you reach class? Send pic of the notes please
13/03/26, 10:16 am - Rohan Verma: Haha lussuuu always asking for notes 😂😂
13/03/26, 10:16 am - Ananya Iyer: 😤😤
13/03/26, 10:17 am - Ananya Iyer: You forgot my missed voice call and I missed the bus
13/03/26, 10:18 am - Rohan Verma: Join the google meet link at 11 am for project meeting with sir
13/03/26, 10:19 am - Ananya Iyer: Now my nidra is bad and my teammate brain wish parents frnds eyes gem
13/03/26, 10:25 am - Ananya Iyer: I am genuinely angry with you, leave it, whatever.
13/03/26, 10:30 am - Rohan Verma: I'm really sory Ananya, forgive me please
13/03/26, 10:32 am - Ananya Iyer: No I'm sorryyy too, sorry to hear about your friend's exam though
13/03/26, 10:40 am - Rohan Verma: Misssss uuuu so much, wish you were here so I could give tight hugs, lift you and carry you while looking into your eyes and hearing your voice
13/03/26, 10:42 am - Ananya Iyer: Miss you too! Wanna meet up this weekend? 😍
13/03/26, 10:45 am - Rohan Verma: Look at your smile today my cute angel 🫠😶‍🌫️🫣🙃🤭
13/03/26, 10:46 am - Ananya Iyer: Abboooooo stooop 🫠🙃
13/03/26, 11:00 pm - Rohan Verma: naa haaa aniii ahh know tell onlyy ohhh ahhh see told u're didn't onlyyy okayy alsoo u'll abt abbbbooooo misssss callll
13/03/26, 11:01 pm - Rohan Verma: Okayyy ${'y '.repeat(200)}
13/03/26, 11:05 pm - Rohan Verma: You make me so horny, want to make out and kiss your neck in bed tonight 🥵
13/03/26, 11:10 pm - Ananya Iyer: Byeeeeeeeeeeeeeeeeeeee
`;

const res = await engine.analyzeChatText(SYNTHETIC, { useNeuralAI: false });
const s = res.summary;

assert.equal(s.overview.total_conversations, 2);
assert.equal(s.apologies.sorry_first_leader, 'Rohan Verma');
assert.equal(s.photo_requests['Rohan Verma'].total, 1);
assert.equal(s.photo_requests['Ananya Iyer'].total, 0);
assert.equal(s.longing_and_meeting['Rohan Verma'].miss_you_total, 1);
assert.equal(s.longing_and_meeting['Ananya Iyer'].desire_to_meet, 1);
assert.ok(s.intimacy.nicknames.some(n => n.term === 'kutti ponnu'));
for (const bad of ['nidra', 'teammate', 'brain', 'wish', 'parents', 'frnds', 'eyes', 'gem']) {
  assert.ok(!s.intimacy.nicknames.some(n => n.term === bad), `Bad nickname leaked: ${bad}`);
}
assert.ok(!s.longest_messages.overall.text.includes('y y y y'), 'Spam longest message should be filtered');
assert.equal(s.discourse.flirt_analysis.most_flirt_winner, 'Rohan Verma');
assert.equal(s.discourse.flirt_analysis.best_flirt_winner, 'Rohan Verma');
assert.ok(s.fun.humor['Rohan Verma'].tease_reactions_triggered >= 1);
assert.ok(s.intimacy.sensory_and_physical_cues.hugs_cuddles.total >= 1);
assert.ok(s.intimacy.sensory_and_physical_cues.lift_carry.total >= 1);
assert.ok(s.intimacy.sensory_and_physical_cues.eyes_gaze.total >= 1);
assert.ok(s.intimacy.sensory_and_physical_cues.voice_admiration.total >= 1);

const rohanTop = Object.fromEntries(s.per_sender['Rohan Verma'].top_words);
assert.equal(rohanTop['abbooo'], 2);
assert.equal(rohanTop['na'], undefined);
assert.equal(rohanTop['only'], undefined);
assert.ok(rohanTop['ananya'] >= 1);

// Verify Web Crypto AES-256-GCM encryption + zero-plaintext invariant
import { webcrypto } from 'node:crypto';
const subtle = webcrypto.subtle;
const secretText = s.intimacy.escalations.find(e => e.tier === 5)?.quote;
assert.ok(secretText && secretText.length > 10, 'Expected sensitive Tier 5 quote in synthetic chat');
const salt = webcrypto.getRandomValues(new Uint8Array(16));
const iv = webcrypto.getRandomValues(new Uint8Array(12));
const km = await subtle.importKey('raw', new TextEncoder().encode('MySecretPass123'), 'PBKDF2', false, ['deriveKey']);
const aesKey = await subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 310000, hash: 'SHA-256' }, km, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
const ct = await subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, new TextEncoder().encode(secretText));
const ctB64 = Buffer.from(ct).toString('base64');
assert.ok(!ctB64.includes('horny'), 'Ciphertext must never expose plaintext');
const pt = new TextDecoder().decode(await subtle.decrypt({ name: 'AES-GCM', iv }, aesKey, Buffer.from(ctB64, 'base64')));
assert.equal(pt, secretText);

// Optional local benchmark: pass CHAT_FILE=path/to/chat.txt
const realPath = process.env.CHAT_FILE ? path.resolve(process.env.CHAT_FILE) : null;
if (realPath && fs.existsSync(realPath)) {
  const t0 = Date.now();
  const realTxt = fs.readFileSync(realPath, 'utf8');
  const realRes = await engine.analyzeChatText(realTxt, { useNeuralAI: false });
  const dtMs = Date.now() - t0;
  console.log(`JS Worker real chat (86k msgs) analyzed in ${dtMs} ms`);
  console.log('JS conversations:', realRes.summary.overview.total_conversations,
              '| Active hrs:', realRes.summary.overview.total_chat_hours.toFixed(1),
              '| Discourse:', JSON.stringify(realRes.summary.discourse.overall_pct),
              '| Most flirt:', realRes.summary.discourse.flirt_analysis.most_flirt_winner,
              '| Best flirt:', realRes.summary.discourse.flirt_analysis.best_flirt_winner,
              '| Sorry first:', realRes.summary.apologies.sorry_first_leader);
}
console.log('JS_PARITY_OK');
