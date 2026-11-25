/*
 * WhatsApp Chat Analyzer - 100% Parity Browser Engine (Web Worker + Transformers.js WebGPU/WASM)
 * Runs non-blocking inside a Web Worker on http(s):// or asynchronously on file:// / standalone exports.
 * Zero chat data ever leaves browser memory.
 */
(function (globalScope) {
  'use strict';

  const URL_RE_G = /(https?:\/\/\S+|www\.\S+)/gi;
  const URL_TEST_RE = /(https?:\/\/\S+|www\.\S+)/i;
  const WORD_RE_G = /[a-zA-Z']+/g;
  const CHAR_STRETCH_RE = /([a-z])\1{2,}/g;
  const TRAILING_REPEAT_RE = /([a-z])\1+$/;
  const SKELETON_RE = /(.)\1+/g;
  const ABBO_RE = /^a+b{2,}o+$/;
  const SKIN_TONES = new Set(['\u{1F3FB}', '\u{1F3FC}', '\u{1F3FD}', '\u{1F3FE}', '\u{1F3FF}']);
  const BMP_HEART_NORMALIZE = { '\u2764': '\u2764\uFE0F', '\u263A': '\u263A\uFE0F', '\u270C': '\u270C\uFE0F', '\u270B': '\u270B\uFE0F' };
  const EXT_PICT_RE = /\p{Extended_Pictographic}/u;
  const FALLBACK_EMOJI_G = /(?:[\u{1F300}-\u{1FAFF}\u2600-\u27BF\u2B50\u2B55](?:\uFE0F|\u{1F3FB}|\u{1F3FC}|\u{1F3FD}|\u{1F3FE}|\u{1F3FF})?(?:\u200D[\u{1F300}-\u{1FAFF}\u2600-\u27BF\u2640\u2642]\uFE0F?)*)/gu;

  const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const BUCKETS = [
    ['Same minute', 0, 60],
    ['1-5 min', 60, 300],
    ['5-15 min', 300, 900],
    ['15-60 min', 900, 3600],
    ['1h+', 3600, Infinity],
  ];

  const STOPWORDS = new Set((
    "a about above after again all also am an and any are aren't as at be because been before being below " +
    "between both but by can can't cannot could couldn't did didn't do does doesn't doing don't down during " +
    "each few for from further get got had hadn't has hasn't have haven't having he her here hers him his how " +
    "i i'd i'll i'm i've if in into is isn't it it's its just let like me more most my no nor not now of off " +
    "on once only or other our ours out over own same she should shouldn't so some such than that that's the " +
    "their theirs them then there these they this those through to too under until up very was wasn't we we'd " +
    "we'll we're we've were weren't what when where which while who whom why will with won't would wouldn't you " +
    "you'd you'll you're you've your yours yeah yes ok okay oh one go going want"
  ).split(' '));

  const EXCLUDED_TOP_WORDS = new Set([
    'na', 'naa', 'ha', 'haa', 'ani', 'anii', 'ah', 'ahh', 'oh', 'ohh',
    'only', 'know', 'tell', 'see', 'told',
    "u're", 'ure', "you're", 'youre', "didn't", 'didnt',
    "u'll", 'ull', "you'll", 'youll', "u'l", "i'l", 'abt', 'okay', 'ok', 'also',
    "don't", 'dont', "can't", 'cant', "won't", 'wont', "i'm", 'im',
    "i've", 'ive', "i'd", 'id', "i'll", 'ill', "that's", 'thats',
    "it's", 'its', "he's", 'hes', "she's", 'shes', "we're", "we'll", "they're", "they'll",
    'is', 'am', 'are', 'was', 'were', 'the', 'and', 'but', 'not',
    'yeah', 'yea', 'yep', 'nope', 'nah', 'hmm', 'hmmm', 'umm', 'uhh',
  ]);

  const VALID_DOUBLE_ENDINGS = new Set([
    'all', 'ball', 'call', 'fall', 'hall', 'mall', 'small', 'tall', 'wall',
    'bell', 'cell', 'fell', 'hell', 'sell', 'shell', 'smell', 'spell', 'tell', 'well', 'yell',
    'bill', 'chill', 'drill', 'fill', 'grill', 'hill', 'ill', 'kill', 'mill', 'pill', 'skill', 'spill', 'still', 'till', 'will',
    'doll', 'poll', 'roll', 'scroll', 'toll', 'bull', 'dull', 'full', 'null', 'pull', 'skull',
    'ass', 'bass', 'brass', 'class', 'glass', 'grass', 'mass', 'pass',
    'less', 'bless', 'chess', 'dress', 'guess', 'mess', 'press', 'stress',
    'bliss', 'hiss', 'kiss', 'miss', 'boss', 'cross', 'floss', 'gloss', 'loss', 'moss', 'toss',
    'bus', 'fuss', 'plus',
    'bee', 'fee', 'flee', 'free', 'gee', 'knee', 'see', 'tee', 'three', 'tree', 'agree', 'coffee', 'degree', 'guarantee', 'pee', 'wee',
    'boo', 'coo', 'goo', 'moo', 'shoo', 'too', 'woo', 'zoo',
    'off', 'buff', 'cuff', 'fluff', 'puff', 'sniff', 'staff', 'stiff', 'stuff', 'cliff',
    'add', 'odd', 'egg', 'inn', 'err', 'purr', 'buzz', 'fuzz', 'jazz', 'quiz',
  ]);

  const graphemeSeg = (typeof Intl !== 'undefined' && Intl.Segmenter)
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    : null;

  function normalizeQuotes(text) {
    return text.replace(/\u2019|\u2018/g, "'").replace(/\u201c|\u201d/g, '"');
  }

  function wordSkeleton(w) {
    return w.replace(SKELETON_RE, '$1');
  }

  function extractParticipantTokens(senders) {
    const tokens = new Set();
    const skelMap = new Map();
    for (const s of senders) {
      for (const part of s.split(/[^a-zA-Z]+/)) {
        const tok = part.toLowerCase().replace(/^'+|'+$/g, '');
        if (tok.length >= 3 && !STOPWORDS.has(tok) && !EXCLUDED_TOP_WORDS.has(tok)) {
          tokens.add(tok);
          const skel = wordSkeleton(tok);
          if (skel.length >= 3 && !skelMap.has(skel)) {
            skelMap.set(skel, tok);
          }
        }
      }
    }
    return { tokens, skelMap };
  }

  function canonicalizeWord(rawWord, participantTokens, participantSkelMap) {
    const w = normalizeQuotes(rawWord.toLowerCase()).replace(/^'+|'+$/g, '');
    if (!w) return '';
    if (participantTokens && participantTokens.has(w)) return w;
    if (participantSkelMap) {
      const skel = wordSkeleton(w);
      if (participantSkelMap.has(skel)) return participantSkelMap.get(skel);
    }
    if (ABBO_RE.test(w)) return 'abbooo';

    let collapsed = w.replace(CHAR_STRETCH_RE, '$1$1');
    if (collapsed.endsWith("'ll")) return collapsed;
    const m = collapsed.match(TRAILING_REPEAT_RE);
    if (m) {
      const ch = m[1];
      const base = collapsed.slice(0, m.index);
      const stem2 = base + ch + ch;
      const stem1 = base + ch;
      if (VALID_DOUBLE_ENDINGS.has(stem2)) collapsed = stem2;
      else if (stem1.length >= 2) collapsed = stem1;
    }
    return collapsed;
  }

  function extractEmojis(text) {
    if (!text) return [];
    const out = [];
    if (graphemeSeg) {
      for (const seg of graphemeSeg.segment(text)) {
        const g = seg.segment;
        if (SKIN_TONES.has(g)) continue;
        if (EXT_PICT_RE.test(g) && g !== '\u00A9' && g !== '\u00AE' && g !== '\u2122' && g !== '\u00A9\uFE0F' && g !== '\u00AE\uFE0F' && g !== '\u2122\uFE0F') {
          out.push(BMP_HEART_NORMALIZE[g] || g);
        }
      }
    } else {
      const ms = text.match(FALLBACK_EMOJI_G) || [];
      for (const g of ms) {
        if (!SKIN_TONES.has(g)) out.push(BMP_HEART_NORMALIZE[g] || g);
      }
    }
    return out;
  }

  function localDateKey(dt) {
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function localMonthKey(dt) {
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
  }

  function isoTimestamp(dt) {
    const y = dt.getFullYear();
    const mo = String(dt.getMonth() + 1).padStart(2, '0');
    const da = String(dt.getDate()).padStart(2, '0');
    const h = String(dt.getHours()).padStart(2, '0');
    const mi = String(dt.getMinutes()).padStart(2, '0');
    const s = String(dt.getSeconds()).padStart(2, '0');
    return `${y}-${mo}-${da} ${h}:${mi}:${s}`;
  }

  function fmtDateDisplay(dt) {
    const d = String(dt.getDate()).padStart(2, '0');
    return `${d} ${MONTHS_SHORT[dt.getMonth()]} ${dt.getFullYear()}`;
  }

  function fmtTimeDisplay(dt) {
    let h = dt.getHours();
    const m = String(dt.getMinutes()).padStart(2, '0');
    const ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m} ${ap}`;
  }

  function safePreview(text, maxLen = 150) {
    const flat = text.replace(/\s+/g, ' ').trim();
    return flat.length <= maxLen ? flat : flat.slice(0, maxLen - 1) + '…';
  }

  // --- Parsing ---
  const MEDIA_EXACT_RE = /^(?:<media omitted>|<attached:.*>|(?:image|video|audio|sticker|gif|document|contact card|video note|voice message)\s+omitted|null|view once (?:photo|video))$/i;
  const DELETED_SET = new Set(['this message was deleted', 'you deleted this message', 'this message was deleted.', 'you deleted this message.']);
  const EDIT_RE = /\s*<this message was edited>\s*$/i;
  const UNPUNCTUATED_Q_RE = /^(?:what|where|when|why|who|whom|whose|which|how|did|do|does|are|is|was|were|will|would|can|could|should|shall|have|has|wanna|wyd|wya|hru)\s+(?:u|ur|you|your|we|they|he|she|it|is|are|did|do|was|were|happened|going|doing|time)\b/i;

  function isQuestionMessage(text) {
    if (!text) return false;
    const clean = text.replace(URL_RE_G, ' ').trim();
    if (!clean) return false;
    if (clean.includes('?')) return /[a-zA-Z]{2,}/.test(clean);
    const words = clean.split(/\s+/);
    return words.length >= 2 && words.length <= 18 && UNPUNCTUATED_Q_RE.test(clean);
  }

  function parseMessages(rawText) {
    const clean = rawText
      .replace(/[\u200e\u200f\u202a\u202b\u202c\u202d\u202e\ufeff]/g, '')
      .replace(/[\u202f\u00a0\u1680\u2000-\u200a\u2028\u2029\u205f\u3000]/g, ' ')
      .replace(/(\d{1,2}[:.]\d{2}(?:[:.]\d{2})?)\s*[\?\uFFFD]\s*([ap]\.?m\.?)/gi, '$1 $2');
    const lines = clean.split(/\r?\n/);
    const headerRe = /^\[?(\d{1,4}[/.\-]\d{1,2}[/.\-]\d{1,4}),?\s+(\d{1,2}[:.]\d{2}(?:[:.]\d{2})?)\s*([APap]\.?\s?[Mm]\.?)?(?:\]\s*|\s*-\s+)(.*)$/;

    const raw = [];
    let systemLines = 0;
    let cur = null;
    for (const line of lines) {
      const m = line.match(headerRe);
      if (m) {
        const rest = m[4];
        const low = rest.toLowerCase();
        if (low.includes('end-to-end encrypted') || low.includes('created group') || low.includes('changed this group')) {
          systemLines++;
          cur = null;
          continue;
        }
        let sender = null;
        let body = rest;
        const idx = rest.indexOf(': ');
        if (idx !== -1 && idx <= 60) {
          sender = rest.slice(0, idx).trim();
          body = rest.slice(idx + 2);
        } else if (rest.endsWith(':') && rest.length <= 61) {
          sender = rest.slice(0, -1).trim();
          body = '';
        }
        if (sender) {
          cur = { d: m[1], t: m[2], ap: m[3], sender, text: body };
          raw.push(cur);
        } else {
          systemLines++;
          cur = null;
        }
      } else if (cur) {
        cur.text += '\n' + line;
      }
    }

    if (!raw.length) throw new Error('No WhatsApp messages could be parsed from this file.');

    let order = 'dmy';
    let firstGt12 = false, secondGt12 = false, foundYmd = false;
    const seenDates = new Set(raw.map(r => r.d));
    for (const ds of seenDates) {
      const p = ds.split(/[/.-]/);
      if (p[0].length === 4) { foundYmd = true; break; }
      if (+p[0] > 12) firstGt12 = true;
      if (+p[1] > 12) secondGt12 = true;
    }
    if (foundYmd) order = 'ymd';
    else if (firstGt12) order = 'dmy';
    else if (secondGt12) order = 'mdy';

    const msgs = [];
    let skipped = 0;
    for (const r of raw) {
      try {
        const p = r.d.split(/[/.\-]/).map(Number);
        let y, mo, d;
        if (order === 'ymd') [y, mo, d] = p;
        else if (order === 'dmy') [d, mo, y] = p;
        else [mo, d, y] = p;
        if (y < 100) y += 2000;
        const tp = r.t.split(/[:.]/).map(Number);
        let h = tp[0], mi = tp[1], s = tp[2] || 0;
        if (r.ap) {
          const ap = r.ap.replace(/[.\s?]/g, '').toLowerCase();
          if (ap === 'pm' && h < 12) h += 12;
          else if (ap === 'am' && h === 12) h = 0;
        }
        const dt = new Date(y, mo - 1, d, h, mi, s);
        if (Number.isNaN(dt.getTime())) { skipped++; continue; }

        const stripped = r.text.trim();
        const edited = EDIT_RE.test(stripped);
        const textClean = stripped.replace(EDIT_RE, '');
        const lowClean = textClean.toLowerCase();
        const firstLine = lowClean.split('\n')[0];
        let kind = 'text';
        if (MEDIA_EXACT_RE.test(lowClean) || firstLine.includes('(file attached)')) kind = 'media';
        else if (DELETED_SET.has(lowClean) || lowClean.includes('waiting for this message')) kind = 'deleted';
        const words = kind === 'text' ? (textClean.trim() ? textClean.trim().split(/\s+/).length : 0) : 0;
        msgs.push({ dt, sender: r.sender, text: textClean, kind, words, edited });
      } catch (_) {
        skipped++;
      }
    }
    msgs.sort((a, b) => a.dt - b.dt);
    return { msgs, loadInfo: { date_order: order, skipped, system_lines: systemLines } };
  }

  // --- Conversation Segmentation: Bye / Byee / Byeee... ---
  const BYE_RE = /\bb+y+e+\b/i;
  const NARRATIVE_BYE_RE = /\b(?:said|told|saying|say|says|waved)\s+b+y+e+\s+to\b/i;
  const SIGNOFF_FOLLOWUP_RE = /\b(?:b+y+e+|g+n+|good\s*night|nighty+|sweet\s*dreams|sleep\s*(?:well|tight)|t+c+|take\s*care|love\s*(?:u+|you+)|lub\s*(?:u+|you+)|c+y+a+|see\s*(?:ya|u|you)\s*(?:tmrw|tomorrow|soon|later)?|ttyl)\b/i;
  const FAREWELL_GRACE_SEC = 300;

  function isFarewellTrigger(m, nextMsg) {
    if (m.kind !== 'text' || !BYE_RE.test(m.text)) return false;
    if (m.words > 10 && NARRATIVE_BYE_RE.test(m.text)) {
      if (nextMsg && (nextMsg.dt - m.dt) / 1000 <= 90 && !BYE_RE.test(nextMsg.text)) return false;
    }
    return true;
  }

  function isSignoffFollowup(m) {
    if (m.kind === 'media') return true;
    if (m.kind !== 'text') return false;
    if (BYE_RE.test(m.text)) return true;
    if (m.words <= 8 && SIGNOFF_FOLLOWUP_RE.test(m.text)) return true;
    const noAlpha = m.text.replace(/[a-zA-Z0-9\s]+/g, '');
    return m.words <= 2 && noAlpha.length > 0 && m.text.length <= 16;
  }

  function segmentConversations(msgs, senders, replyCapSec) {
    const starters = {}, enders = {}, bursts = {}, replies = {}, turnPromptReplies = {};
    senders.forEach(s => { starters[s] = 0; enders[s] = 0; bursts[s] = []; replies[s] = []; turnPromptReplies[s] = []; });

    let inFarewell = false;
    let burst = 0;
    let prev = null;
    let turnStartDt = msgs[0].dt;
    let totalConversations = 1;
    let activeChatSecs = 0;

    for (let i = 0; i < msgs.length; i++) {
      const m = msgs[i];
      const nxt = i + 1 < msgs.length ? msgs[i + 1] : null;
      const composeSec = m.kind !== 'text' ? 4.0 : Math.min(25.0, Math.max(3.0, m.text.length / 14.0));
      activeChatSecs += composeSec;

      if (!prev) {
        starters[m.sender]++;
        burst = 1;
        turnStartDt = m.dt;
      } else {
        const gap = (m.dt - prev.dt) / 1000;
        if (gap >= 0 && gap <= 600) activeChatSecs += Math.max(0, gap - composeSec);
        else if (gap > 600 && gap <= 1800) activeChatSecs += 300 * Math.exp(-(gap - 600) / 600);

        let newConv = false;
        if (inFarewell) {
          if (gap <= FAREWELL_GRACE_SEC && isSignoffFollowup(m)) {
            // absorb reciprocal farewell turn
          } else {
            newConv = true;
            inFarewell = false;
          }
        }
        if (newConv) {
          enders[prev.sender]++;
          bursts[prev.sender].push(burst);
          starters[m.sender]++;
          burst = 1;
          turnStartDt = m.dt;
          totalConversations++;
        } else if (m.sender !== prev.sender) {
          if (gap >= 0 && gap <= replyCapSec) {
            replies[m.sender].push(gap);
            const promptGap = Math.min(replyCapSec, Math.max(0, (m.dt - turnStartDt) / 1000));
            turnPromptReplies[m.sender].push(promptGap);
          }
          bursts[prev.sender].push(burst);
          burst = 1;
          turnStartDt = m.dt;
        } else {
          burst++;
        }
      }
      if (isFarewellTrigger(m, nxt)) inFarewell = true;
      prev = m;
    }
    if (prev) {
      enders[prev.sender]++;
      bursts[prev.sender].push(burst);
    }

    return { starters, enders, bursts, replies, turnPromptReplies, totalConversations, totalChatHours: activeChatSecs / 3600 };
  }

  // --- Discourse, Intimacy, Intent, Fun Lexicons ---
  const DISCOURSE_LABELS = ['flirting', 'teasing', 'arguments', 'facts_info', 'normal'];
  const LAUGH_EMOJI_SET = new Set(['😂', '🤣', '💀', '😹', '😝', '😜', '😅', '😁']);
  const SHY_FLIRT_EMOJIS = new Set(['🫠', '😶‍🌫️', '😶‍🌫', '🫣', '🙃', '🤭']);
  const FLIRT_EMOJI_SET = new Set([...SHY_FLIRT_EMOJIS, '😘', '😍', '🥰', '🥵', '🙈', '💋', '❤️‍🔥', '🫶', '💕', '💖', '💘', '💓', '💞', '❤️', '♥️', '🔥', '🥺', '😳', '🥹']);
  const FLUSTER_REACTION_EMOJIS = new Set([...SHY_FLIRT_EMOJIS, '🙈', '😳', '🥺', '🥰', '🥹', '😘', '😍', '❤️', '💖', '🫶', '💕']);
  const ARG_DOWN_EMOJI_SET = new Set(['😠', '😡', '🤬', '💔']);
  const MOCK_INDIGNATION_EMOJIS = new Set(['😤', '😒', '🙄', '😑', '🤨', '🤦', '🤦‍♀️', '🤦🏻‍♀️', '🤦‍♂️', '🤦🏻‍♂️']);
  const BLUSH_REACTION_EMOJIS = FLUSTER_REACTION_EMOJIS;

  const FLIRT_LEX_G = /\b(?:cute+|cutie+|cutest|adorable|pretty|prettiest|gorgeous|beautiful|handsome|hot+|hottie|sexy+|stunning|attractive|crush(?:ing)?|flirt(?:ing)?|butterflies|blush(?:ing)?|shy+|kutt+[iy]\s*ponn+u+|babe+|baby+|sweetheart|darling|honey|jaan+u*|shona+|chinnu|muddu|pookie|wifey|hubby|loml|love\s+(?:u+|you+)|luv\s+(?:u+|you+)|kiss(?:es|ing)?|hug+|cuddle+|hold\s+me|lift\s+(?:u|you|me)|carry\s+(?:u|you|me)|(?:ur|your)\s+(?:eyes|voice|smile|lips|laugh|hair|face)|look(?:ing)?\s+(?:into|in)\s+(?:ur|your)\s+eyes|mine|yours|dream(?:ing)?\s+(?:of|about)\s+(?:u|you)|can'?t\s+stop\s+thinking|heart\s+beat(?:ing)?|make\s+me|come\s+here)\b/gi;
  const FLIRT_LEX_TEST = /\b(?:cute+|cutie+|cutest|adorable|pretty|prettiest|gorgeous|beautiful|handsome|hot+|hottie|sexy+|stunning|attractive|crush(?:ing)?|flirt(?:ing)?|butterflies|blush(?:ing)?|shy+|kutt+[iy]\s*ponn+u+|babe+|baby+|sweetheart|darling|honey|jaan+u*|shona+|chinnu|muddu|pookie|wifey|hubby|loml|love\s+(?:u+|you+)|luv\s+(?:u+|you+)|kiss(?:es|ing)?|hug+|cuddle+|hold\s+me|lift\s+(?:u|you|me)|carry\s+(?:u|you|me)|(?:ur|your)\s+(?:eyes|voice|smile|lips|laugh|hair|face)|look(?:ing)?\s+(?:into|in)\s+(?:ur|your)\s+eyes|mine|yours|dream(?:ing)?\s+(?:of|about)\s+(?:u|you)|can'?t\s+stop\s+thinking|heart\s+beat(?:ing)?|make\s+me|come\s+here)\b/i;

  const TEASE_LEX_G = /\b(?:luss+u+|pagal+|mad|mental|psycho|idiot|stupid|dumb+|dumbo|drama\s*queen|cry\s*baby|clown|joker|weirdo|nerd|dork|shorty|chotu|mote|fatty|lazy|sleepyhead|monkey|donkey|bullshit|bs|shut\s*up|shutup|overacting|nautanki|roast|teas(?:e|ing)|kidding|joking|jk|jk+|sarcasm|haha+|hehe+|hihi+|lmao+|lmfao+|rofl+|lolz?)\b/gi;
  const LAUGH_REACT_RE = /\b(?:haha+|hehe+|lmao+|lmfao+|rofl+|lol+|ded+|dying)\b/i;

  const ARG_LEX_RE = /\b(?:whatever|leave\s+it|forget\s+it|don'?t\s+talk|stop\s+talking|don'?t\s+text|i'?m\s+done|im\s+done|fed\s+up|sick\s+of|tired\s+of|you\s+always|you\s+never|u\s+always|u\s+never|your\s+fault|ur\s+fault|blam(?:e|ing)|hurt\s+(?:me|my)|pissed|angry|mad\s+at\s+(?:u|you)|annoyed|irritated|disappointed|ignore|ignoring|shut\s+the\s+fuck|fuck\s+off|go\s+away|argue|arguing|argument|fight(?:ing)?|overthink(?:ing)?|never\s+listen|don'?t\s+care)\b/i;
  const ARG_STRONG_G = /\b(?:whatever|leave\s+it|forget\s+it|don'?t\s+talk\s+to\s+me|stop\s+talking|i'?m\s+done|im\s+done|you\s+always|you\s+never|u\s+always|u\s+never|your\s+fault|ur\s+fault|hurt\s+me|pissed\s+off|angry\s+with|mad\s+at\s+(?:u|you)|fed\s+up|sick\s+of\s+this|why\s+did\s+you\s+do|didn'?t\s+expect\s+this|not\s+in\s+the\s+mood|leave\s+me\s+alone|stop\s+lying)\b/gi;

  const FACTS_INFO_G = /\b(?:exam|test|class|lecture|college|campus|university|assignment|homework|project|lab|viva|marks|result|grade|cgpa|syllabus|notes|pdf|doc|file|slide|ppt|code|bug|error|server|github|api|python|office|meeting|client|deadline|salary|interview|resume|cv|internship|train|bus|flight|metro|cab|uber|ola|ticket|booking|platform|station|airport|route|map|location|hospital|doctor|medicine|tablet|fever|clinic|pharmacy|bank|upi|gpay|paytm|account|otp|password|price|cost|rs|rupees|inr|usd|percent|km|minutes|hours|pm|am|monday|tuesday|wednesday|thursday|friday|saturday|sunday|timetable|schedule|calendar|link|zoom|teams|sir|hod|mam|ma'am|maam|professor)\b/gi;
  const NORMAL_CHECKIN_G = /\b(?:ate|eat(?:ing)?|had\s+(?:lunch|dinner|breakfast)|lunch|dinner|breakfast|snacks|sleep(?:ing)?|slept|woke\s+up|wake\s+up|reached|home|bath|shower|ready|came\s+back|mom|mum|dad|papa|amma|appa|sis|bro|family|friend|frnd|morning|gm|afternoon|evening|night|gn|what\s+doing|wyd|doing\s+nothing|just\s+chilling|bored|hungry|tired|sleepy)\b/gi;

  const APOLOGY_RE = /\b(?:s+o+r+y+|s+r+y+|s+o+z+|apologi[sz](?:e|es|ed|ing)|my\s+bad|forgive\s+me|maaf)\b/i;
  const APOLOGY_SYMPATHY_NEG_RE = /\b(?:sorry\s+(?:to\s+hear|for\s+your\s+loss|about\s+(?:that|him|her|them|your\s+(?:friend|dog|cat|exam|dad|mom)))|feel(?:ing)?\s+sorry\s+for)\b/i;

  const SENSITIVE_EXPLICIT_RE = /\b(?:sex(?:y+)?|horny|naked|nude+s?|undress|strip|boob+s?|breast|nipple|thigh+s?|waist|collarbone|neck\s+kiss|kiss\s+(?:ur|your)\s+(?:neck|lips|body|chest)|make\s*out|makeout|french\s+kiss|bite\s+(?:u|you|ur|your)|lick|suck|moan(?:ing)?|turn(?:s|ed)?\s+me\s+on|turned\s+on|cuddle\s+in\s+bed|in\s+bed\s+with|on\s+top\s+of|pin\s+(?:u|you)|choke|spank|naughty|wild\s+thoughts|dirty\s+thoughts|fuck(?:ing)?\s+(?:u|you|me)|cock|dick|pussy|cum|orgasm)\b/i;
  const TIER4_SPICY_RE = /\b(?:sexy+|hot+|hottie|lips|neck|waist|bite\s+(?:u|you|ur)|make\s*out|makeout|turn(?:s|ed)?\s+me\s+on|turned\s+on|in\s+bed|shirtless|pull\s+(?:u|you)\s+closer|pin\s+(?:u|you)|breath(?:ing)?\s+heavy|craving\s+(?:u|you)|want\s+(?:u|you)\s+(?:so\s+)?bad|naughty|tempting|tease\s+me|touch\s+(?:me|u|you)|kiss(?:ing)?\s+(?:ur|your)\s+(?:neck|lips|shoulder))\b/i;
  const TIER3_TENDER_RE = /\b(?:i\s+love\s+(?:u+|you+)|love\s+(?:u+|you+)\s+(?:so+\s+much|sm|more|forever|always)|hug+|hugging|cuddle+|cuddling|hold\s+(?:ur|your)\s+hand|hold\s+me\s+tight|lift\s+(?:u|you|me)|pick\s+(?:u|you|me)\s+up|carry\s+(?:u|you|me)|carried\s+(?:u|you|me)|forehead\s+kiss|kiss\s+(?:ur|your)\s+(?:forehead|cheek|hand)|sleep\s+in\s+(?:ur|your)\s+arms|rest\s+(?:my|ur|your)\s+head|chest|lap|never\s+let\s+(?:u|you)\s+go)\b/i;
  const TIER2_ROMANTIC_RE = /\b(?:kutt+[iy]\s*ponn+u+|babe+|baby+|sweetheart|darling|princess|handsome|jaan+u*|shona+|chinnu|muddu|bujji|pookie|loml|look(?:ing)?\s+(?:into|in)\s+(?:ur|your|my)\s+eyes|(?:lost|drown(?:ing)?)\s+in\s+(?:ur|your)\s+eyes|(?:ur|your)\s+(?:pretty|beautiful|deep|cute)?\s*eyes|eye\s+contact|(?:ur|your)\s+(?:sweet|cute|soft|lovely|hot|deep)?\s*voice|hear(?:ing)?\s+(?:ur|your)\s+voice|love\s+(?:ur|your)\s+voice|sleep\s+to\s+(?:ur|your)\s+voice|butterflies|blush(?:ing)?|crush\s+on\s+(?:u|you)|fall(?:ing)?\s+for\s+(?:u|you)|my\s+(?:girl|boy|heart|world))\b/i;
  const TIER1_WARM_RE = /\b(?:cut+(?:ie+|e+|u+)|adorable|pretty|prettiest|cutest|sweetest|sweet\s+of\s+(?:u|you)|(?:ur|your)\s+smile|love\s+talking\s+to\s+(?:u|you)|glad\s+i\s+met\s+(?:u|you)|care\s+(?:about|for)\s+(?:u|you)|special\s+to\s+me)\b/i;
  const BLUSH_REACTION_RE = /\b(?:a+b{2,}o+|st+o+p+|blush(?:ing)?|sh+y+|aw+w+|omg+|he+he+|ay+i+o+)\b/i;

  const SENSORY_MOTIFS = [
    ['hugs_cuddles', 'Hugs & Cuddles', /\b(?:hug+|hugs+|hugging|cuddle+|cuddling|hold\s+me\s+tight|tight\s+hug|warm\s+hug|wrap\s+(?:my|ur|your)\s+arms)\b/i, /\bgroup\s+hug\b/i, 3],
    ['lift_carry', 'Lift & Carry', /\b(?:lift\s+(?:u|you|me)(?:\s+up)?|pick\s+(?:u|you|me)\s+up|carry\s+(?:u|you|me)|carried\s+(?:u|you|me)|in\s+(?:my|ur|your)\s+arms)\b/i, null, 3],
    ['eyes_gaze', 'Looking Into Eyes', /\b(?:look(?:ing)?\s+(?:into|in)\s+(?:ur|your|my)\s+eyes|(?:lost|drown(?:ing)?)\s+in\s+(?:ur|your)\s+eyes|(?:ur|your)\s+(?:pretty|beautiful|deep|cute|gorgeous)?\s*eyes|eye\s+contact|star(?:e|ing)\s+at\s+(?:u|you))\b/i, /\b(?:roll(?:ing|ed)?\s+(?:my|ur|your)\s+eyes|eye\s+pain|eye\s+drops|dry\s+eyes)\b/i, 2],
    ['voice_admiration', 'Voice Admiration', /\b(?:(?:ur|your)\s+(?:sweet|cute|soft|lovely|hot|deep|pretty|soothing)?\s*voice|hear(?:ing)?\s+(?:ur|your)\s+voice|love\s+(?:ur|your)\s+voice|miss\s+(?:ur|your)\s+voice|sleep\s+to\s+(?:ur|your)\s+voice)\b/i, /\bvoice\s+(?:message|note|call|mail)\b/i, 2],
    ['cute_compliments', 'Cutee & Kutti Ponnu Compliments', /\b(?:cut+(?:ie+|e{2,}|u+)|so+\s+cute+|kutt+[iy]\s*ponn+u+|cutest|adorable)\b/i, null, 2],
  ];

  const NICKNAME_PATTERNS = [
    ['kutti ponnu', /\bkutt+[iy]\s*ponn+u+\b/gi],
    ['kutti paiyan', /\bkutt+[iy]\s*paiy+a+n+\b/gi],
    ['cutee / cutie', /\bcut+(?:ie+|e{2,}|u+)\b/gi],
    ['lussuuu', /\bluss+u+\b/gi],
    ['babe', /\bbab+e+s?\b/gi],
    ['baby', /\bbab+y+\b/gi],
    ['sweetheart', /\bsweet+\s*heart+\b/gi],
    ['honey', /\bhoney+\b/gi],
    ['darling', /\bdarling+\b/gi],
    ['princess', /\bprincess+\b/gi],
    ['handsome', /\bhandsome+\b/gi],
    ['pookie', /\bpook+ie+\b/gi],
    ['jaan / jaanu', /\bjaan+u*\b/gi],
    ['shona', /\bshona+\b/gi],
    ['chinnu', /\bchinn+u+\b/gi],
    ['muddu', /\bmudd+u+\b/gi],
    ['bujji', /\bbujj+i+\b/gi],
    ['chella / chellam', /\bchell+a+m?\b/gi],
    ['kanna / kannamma', /\bkann+a+(?:mma+)?\b/gi],
    ['kalla / kalli', /\bkall+[ai]+\b/gi],
    ['wifey', /\bwifey+\b/gi],
    ['hubby', /\bhubby+\b/gi],
    ['good boy', /\bgood\s+bo+y+\b/gi],
    ['good girl', /\bgood\s+gi+rl+\b/gi],
    ['my girl', /\bmy\s+gi+rl+\b/gi],
    ['my boy', /\bmy\s+bo+y+\b/gi],
    ['my love', /\bmy\s+lo+ve+\b/gi],
    ['loml', /\bloml\b/gi],
    ['drama queen', /\bdrama\s*queen\b/gi],
    ['crybaby', /\bcry\s*baby\b/gi],
    ['sunshine', /\bsunshine\b/gi],
  ];

  const STRICT_VOCATIVE_RE = /^(?:hey+|hi+|oi+|oy+|hello+|b+y+e+|g+n+|good\s*night|good\s*morning|g+m+|miss\s+(?:u+|you+)|love\s+(?:u+|you+))\s+([a-z]{3,14})[!,.?]*$/i;
  const VOCATIVE_NON_NICK = new Set([
    ...STOPWORDS, ...EXCLUDED_TOP_WORDS,
    'bro', 'bhai', 'sis', 'sister', 'brother', 'dude', 'man', 'guy', 'guys', 'sir', 'mam', 'maam',
    'mom', 'mum', 'mother', 'dad', 'father', 'amma', 'appa', 'god', 'lord', 'friend', 'frnd', 'frnds', 'friends',
    'day', 'night', 'morning', 'evening', 'afternoon', 'time', 'today', 'tomorrow', 'yesterday',
    'phone', 'call', 'text', 'msg', 'message', 'life', 'world', 'heart', 'soul', 'head', 'hand',
    'name', 'work', 'home', 'room', 'college', 'class', 'school', 'food', 'sleep', 'water', 'good', 'bad',
    'one', 'two', 'thing', 'stuff', 'place', 'way', 'part', 'side', 'end', 'back', 'soon', 'much',
    'more', 'most', 'very', 'too', 'also', 'dear', 'sweet', 'new', 'old', 'big', 'small', 'long',
    'first', 'last', 'next', 'same', 'real', 'true', 'fine', 'okay', 'bye', 'byee', 'sorry', 'thanks',
    'please', 'pls', 'plz', 'photo', 'pic', 'video', 'voice', 'notes', 'exam', 'test', 'year', 'month',
    'wish', 'brain', 'parents', 'teammate', 'nidra', 'luck', 'fault', 'turn', 'own', 'bed', 'family',
    'eyes', 'gem', 'ears', 'legs', 'face', 'hair', 'akka', 'anna', 'chelli', 'madam', 'everyone',
    'there', 'here', 'again', 'seriously', 'senior', 'junior', 'unnava', 'nijamma', 're', 'ra', 'da', 'di', 'po',
  ]);

  const PHOTO_DIRECT_RE = /\b(?:send|show|drop|share|give|click|take|upload|want|need|bhej|kaluhisu)\s+(?:me\s+|one\s+)?(?:a\s+|an\s+|one\s+|some\s+|ur\s+|your\s+|another\s+)?(?:pic+s?|picz|piks|picture+s?|photo+s?|selfie+s?|snap+s?|fit\s*check)\b|\b(?:one|another|new|a)\s+(?:pic+s?|picz|piks|picture+s?|photo+s?|selfie+s?)\s*(?:pls|please|plz|na+|fast|rn|now|send)?\b|\b(?:(?:ur|your)\s+)?(?:pic+s?|picz|piks|picture+s?|photo+s?|selfie+s?)\s+(?:pls|please|plz|send|fast|rn|now)\b|\bfit\s*check\b/i;
  const PHOTO_VISUAL_RE = /\b(?:(?:i\s+)?(?:want\s+to|wanna|lemme|let\s+me|need\s+to|dying\s+to)\s+see\s+(?:u+|you+|ur\s+face|your\s+face|how\s+(?:u|you)\s+look|ur\s+(?:outfit|dress|fit|hair|smile|look)|your\s+(?:outfit|dress|fit|hair|smile|look))|show\s+(?:me\s+)?(?:how\s+(?:u|you)\s+look|(?:ur|your)\s+(?:face|outfit|dress|fit|hair|look|selfie|smile)|yourself)|how\s+do\s+(?:u|you)\s+look\s+(?:rn|right\s+now|today|in\s+(?:it|that)))\b/i;
  const PHOTO_ELLIPSIS_RE = /\b(?:show+|pic+s?|picz|piks|photo+s?|selfie+s?)\b/i;
  const PHOTO_APPEARANCE_CTX_RE = /\b(?:got\s+ready|getting\s+ready|dressed\s+up|wore|wearing|new\s+(?:dress|shirt|top|kurti|saree|outfit|haircut|hair|specs)|shaved|trimmed|salon|parlour|makeup|mirror|ready\s+for|look(?:ing)?\s+(?:good|cute|nice|hot))\b/i;
  const PHOTO_HARD_NEG_RE = /\b(?:(?:pic+|pics|picture|photo+|image|snap|screenshot)\s+of\s+(?:the|this|that|my|a|an|ur|your)?\s*(?:notes|book|page|screen|laptop|monitor|pc|code|error|bug|question|qsn|paper|answer|marks|timetable|schedule|food|plate|dish|lunch|dinner|breakfast|coffee|tea|cat|dog|pet|room|desk|sky|moon|clouds|sunset|car|bike|bill|receipt|id|card|ticket|qr|form|document|doc|pdf|assignment|slide|board|ppt))\b|\bscreenshot\b/i;
  const INPERSON_MEET_TIME_RE = /\bsee\s+(?:u+|you+)\s+(?:tomorrow|tmrw|tonight|soon|later|on\s+\w+day|next\s+week|this\s+weekend|in\s+(?:college|class|campus|person|evening|morning)|there|at\s+\d)\b/i;
  const PHOTO_SHY_REFUSAL_RE = /\b(?:messy|ugly|no\s+makeup|after\s+bath|looking\s+bad|wait+|later|tomorrow|nooo+|shyyy)\b/i;

  const MISS_YOU_RE = /\b(?:miss+|missing|missed)\s+(?:(?:seeing|talking\s+to|hearing|hugging|cuddling|meeting)\s+)?(?:u+|you+|ur\s+(?:voice|face|hugs?|presence|smile|cuddles?|scent|lap)|your\s+(?:voice|face|hugs?|presence|smile|cuddles?|scent|lap))\b|\bwish\s+(?:u|you)\s+were\s+here\b|\bfeeling\s+(?:ur|your)\s+absence\b|\bcome\s+back\s+soon\b/i;
  const MISS_YOU_NEG_RE = /\b(?:missed\s+(?:call|voice|video|the|my|our|class|bus|train|exam|lecture|deadline|chance|point)|don'?t\s+miss\s+(?:it|out|the|this)|miss\s+(?:the|my|our|this|that)\s+(?:class|bus|train|exam|call|lecture))\b/i;
  const MEET_DESIRE_RE = /\b(?:(?:want\s+to|wanna|let'?s|lets|can'?t\s+wait\s+to|dying\s+to|need\s+to|eager\s+to|when\s+(?:will|can|do|are|shall)\s+we|when\s+(?:am\s+i|r\s+we)\s+going\s+to)\s+(?:meet(?:\s+up)?|see\s+(?:u+|you+)|hang\s*out|go\s+out|go\s+on\s+a\s+date|hug\s+(?:u+|you+))|come\s+(?:meet\s+me|over|here\s+rn|see\s+me)|(?:i\s+)?(?:want\s+to|wanna)\s+see\s+(?:u+|you+)\s+(?:tomorrow|tmrw|soon|this\s+week|this\s+weekend|in\s+person|on\s+\w+day)|miss(?:ing)?\s+meeting\s+(?:u+|you+)|wanna\s+hang\s*out)\b/i;
  const MEET_NEG_RE = /\b(?:google\s+meet|zoom\s+meet|teams\s+meet|team\s+meet(?:ing)?|parents?\s+meet(?:ing)?|staff\s+meet(?:ing)?|client\s+meet(?:ing)?|meet(?:ing)?\s+with\s+(?:sir|mam|ma'am|maam|hod|prof|manager|doctor)|nice\s+to\s+meet|pleased\s+to\s+meet)\b/i;

  const LSM_CATEGORIES = {
    ppron: new Set(['i', 'me', 'my', 'mine', 'you', 'u', 'ur', 'your', 'yours', 'we', 'us', 'our', 'ours', 'he', 'him', 'his', 'she', 'her', 'hers', 'they', 'them', 'their']),
    ipron: new Set(['it', 'its', 'this', 'that', 'these', 'those', 'something', 'anything', 'nothing', 'everything', 'someone', 'anyone', 'everyone', 'what', 'which', 'who']),
    article: new Set(['a', 'an', 'the']),
    prep: new Set(['to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'up', 'about', 'into', 'over', 'after', 'under', 'between', 'through', 'without', 'before']),
    auxverb: new Set(['is', 'am', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'can', 'could', 'should', 'may', 'might', 'must']),
    negate: new Set(['no', 'not', 'never', 'neither', 'nor', 'nothing', 'none', "don't", 'dont', "didn't", 'didnt', "can't", 'cant', "won't", 'wont', "isn't", "wasn't", "aren't", 'na', 'nah']),
    conj: new Set(['and', 'but', 'or', 'so', 'because', 'if', 'while', 'although', 'though', 'unless', 'until', 'since', 'yet', 'nor']),
    adverb: new Set(['very', 'really', 'just', 'so', 'too', 'also', 'only', 'even', 'still', 'already', 'always', 'never', 'often', 'sometimes', 'here', 'there', 'now', 'then', 'soon']),
    interrog: new Set(['what', 'when', 'where', 'why', 'who', 'whom', 'whose', 'which', 'how']),
  };

  function isSensitiveMessage(text, tier = 0) {
    return tier >= 4 || SENSITIVE_EXPLICIT_RE.test(text);
  }

  function isSubstantiveLongest(text, words) {
    const toks = text.toLowerCase().match(/[a-zA-Z]{2,}/g) || [];
    const counts = new Map();
    for (const t of toks) counts.set(t, (counts.get(t) || 0) + 1);
    const uniq = counts.size;
    if (words <= 15) return [uniq >= Math.max(1, Math.floor(words * 0.5)), uniq];
    if (uniq < 15) return [false, uniq];
    const div = uniq / Math.max(1, words);
    let maxC = 0;
    for (const v of counts.values()) if (v > maxC) maxC = v;
    return [div >= 0.25 && (maxC / Math.max(1, words)) <= 0.35, uniq];
  }

  function computeMattr(tokens, window = 50) {
    if (!tokens.length) return 0;
    if (tokens.length <= window) return new Set(tokens).size / tokens.length;
    const freq = new Map();
    for (let i = 0; i < window; i++) freq.set(tokens[i], (freq.get(tokens[i]) || 0) + 1);
    let ttrSum = freq.size / window;
    let steps = 1;
    for (let i = window; i < tokens.length; i++) {
      const outT = tokens[i - window];
      const nextC = freq.get(outT) - 1;
      if (nextC <= 0) freq.delete(outT);
      else freq.set(outT, nextC);
      freq.set(tokens[i], (freq.get(tokens[i]) || 0) + 1);
      ttrSum += freq.size / window;
      steps++;
    }
    return ttrSum / steps;
  }

  function hasMockIndignationEmoji(emojis) {
    return emojis.some(e => MOCK_INDIGNATION_EMOJIS.has(e) || e.startsWith('🤦'));
  }

  function scorePragmaticDiscourse(m, emojis, low, periodRateSender) {
    const scores = { flirting: 0.0, teasing: 0.0, arguments: 0.0, facts_info: 0.0, normal: 0.90 };
    const hasLaughEmoji = emojis.some(e => LAUGH_EMOJI_SET.has(e));
    const hasLaugh = hasLaughEmoji || LAUGH_REACT_RE.test(low);
    const shyFlirtCnt = emojis.filter(e => SHY_FLIRT_EMOJIS.has(e)).length;
    const classicFlirtCnt = emojis.filter(e => FLIRT_EMOJI_SET.has(e) && !SHY_FLIRT_EMOJIS.has(e)).length;
    const argEmoCnt = emojis.filter(e => ARG_DOWN_EMOJI_SET.has(e)).length;
    const mockMadCnt = emojis.filter(e => MOCK_INDIGNATION_EMOJIS.has(e) || e.startsWith('🤦')).length;

    const flirtHits = (low.match(FLIRT_LEX_G) || []).length;
    const teaseHits = (low.match(TEASE_LEX_G) || []).length;
    const argStrong = (low.match(ARG_STRONG_G) || []).length;
    const argHits = ARG_LEX_RE.test(low) ? 1 : 0;
    const factHits = (low.match(FACTS_INFO_G) || []).length;
    const normHits = (low.match(NORMAL_CHECKIN_G) || []).length;

    if (flirtHits) scores.flirting += 1.4 + 0.55 * Math.min(3, flirtHits);
    if (classicFlirtCnt) scores.flirting += 0.7 * Math.min(3, classicFlirtCnt);
    if (shyFlirtCnt && (m.words >= 3 || flirtHits > 0 || /\ba+b{2,}o+\b/.test(low))) {
      scores.flirting += 0.65 + 0.45 * Math.min(3, shyFlirtCnt);
    }
    if (isSensitiveMessage(low, 0)) scores.flirting += 1.4;

    if (teaseHits) scores.teasing += 1.25 + 0.45 * Math.min(3, teaseHits);
    if (hasLaugh) scores.teasing += 1.05;
    if (mockMadCnt && !argStrong && !argHits) scores.teasing += 0.55;

    if (argStrong) scores.arguments += 1.65 + 0.55 * Math.min(3, argStrong);
    else if (argHits) scores.arguments += 1.05;
    if (argEmoCnt) scores.arguments += 0.85 * Math.min(2, argEmoCnt);
    else if (mockMadCnt && (argStrong || argHits)) scores.arguments += 0.45;
    const strippedLow = low.trim();
    if ((strippedLow === 'fine.' || strippedLow === 'ok.' || strippedLow === 'k.' || strippedLow === 'whatever.' || strippedLow === 'bye.') && periodRateSender < 0.12 && !hasLaugh && !(shyFlirtCnt || classicFlirtCnt)) {
      scores.arguments += 0.95;
    }

    if (hasLaugh && scores.arguments > 0) {
      scores.arguments *= 0.2;
      scores.teasing += 0.85;
    }

    if (factHits) scores.facts_info += 0.95 + 0.45 * Math.min(3, factHits);
    if (URL_TEST_RE.test(m.text)) scores.facts_info += 1.15;
    if (/\b\d{2,}\b/.test(low) && !flirtHits && !argStrong) scores.facts_info += 0.45;
    if (m.words >= 14 && !flirtHits && !argStrong && !teaseHits && !(shyFlirtCnt || classicFlirtCnt)) scores.facts_info += 0.5;

    if (normHits) scores.normal += 0.75 + 0.3 * Math.min(3, normHits);
    return scores;
  }

  function softmaxDict(scores) {
    const keys = Object.keys(scores);
    const mx = Math.max(...keys.map(k => scores[k]));
    const exps = {};
    let tot = 0;
    for (const k of keys) {
      const v = Math.exp(Math.min(12, scores[k] - mx));
      exps[k] = v;
      tot += v;
    }
    tot = tot || 1;
    const out = {};
    for (const k of keys) out[k] = exps[k] / tot;
    return out;
  }

  // --- Optional In-Browser Neural Smart Cascade (Transformers.js WebGPU / WASM) ---
  const DISCOURSE_PROTOTYPES = {
    flirting: [
      'you look so gorgeous and cute today i cannot stop thinking about you',
      'looking into your eyes and hearing your sweet voice gives me butterflies',
      'come here let me hug you tight lift you up and kiss your forehead',
      'i want to cuddle with you all night my kutti ponnu sweetheart',
      'stop being this hot and charming you make me blush every single time',
    ],
    teasing: [
      'haha you are such a clumsy drama queen crybaby lussu idiot lol',
      'omg look at this clown acting smart again lmao stop roasting yourself',
      'you wish you were that tall shorty keep dreaming hahaha',
      'shut up dummy you fell for that prank so easily haha',
    ],
    arguments: [
      'you never listen to what i say and always blame me for everything',
      'leave it forget it i am done talking right now you hurt my feelings',
      'why did you lie to me i am genuinely angry and disappointed in you',
      'stop ignoring my messages whatever do what you want i do not care',
    ],
    facts_info: [
      'the exam timetable and assignment submission deadline is tomorrow at 10 am',
      'take the metro to the station and send me the pdf document on email',
      'here is the link to the python code repository and server api documentation',
      'the doctor prescribed this medicine and the ticket price is five hundred rupees',
    ],
    normal: [
      'hey good morning did you eat breakfast yet what are you doing right now',
      'just reached home safely going to take a bath and sleep early tonight',
      'talked to mom and dad today everything at home is going fine',
      'okay let me know once you finish dinner and wake up tomorrow',
    ],
  };

  const INTENT_PROTOTYPES = {
    photo_pos: ['send me a selfie or picture of yourself i want to see how you look right now', 'drop a fit check photo show me your new dress haircut and cute smile'],
    photo_neg: ['send a photo or screenshot of the lecture notes textbook page and timetable', 'i will see you tomorrow morning in college campus in person'],
    miss_pos: ['i am missing you so much right now i wish you were here with me', 'i miss your warm hugs your voice and having you around me'],
    miss_neg: ['i missed your voice call and missed the morning bus to college', 'do not miss the assignment deadline or the lecture tomorrow'],
    meet_pos: ['i really want to meet you soon let us go out on a date this weekend', 'when will i see you in person i cannot wait to meet up and hug you'],
    meet_neg: ['join the google meet link for the team project meeting with professor sir', 'it was nice to meet your colleague at the office meeting today'],
  };

  function meanVec(vecs) {
    const dim = vecs[0].length;
    const m = new Float32Array(dim);
    for (const v of vecs) for (let d = 0; d < dim; d++) m[d] += v[d];
    let norm = 0;
    for (let d = 0; d < dim; d++) { m[d] /= vecs.length; norm += m[d] * m[d]; }
    norm = Math.sqrt(norm) || 1;
    for (let d = 0; d < dim; d++) m[d] /= norm;
    return m;
  }

  function dot(a, b) {
    let s = 0;
    for (let i = 0; i < a.length; i++) s += a[i] * b[i];
    return s;
  }

  async function runBrowserNeuralCascade(msgs, ambiguousIdx, photoCandIdx, missCandIdx, meetCandIdx, onProgress) {
    try {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return null;
      if (typeof location !== 'undefined' && location.protocol === 'file:') return null;
      onProgress(40, 'Loading in-browser Transformers.js neural model (WebGPU/WASM)...');
      const tf = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.4.0');
      let device = 'wasm';
      if (typeof navigator !== 'undefined' && navigator.gpu) {
        try {
          const adapter = await navigator.gpu.requestAdapter();
          if (adapter) device = 'webgpu';
        } catch (_) {}
      }
      const extractor = await tf.pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { dtype: 'q8', device });
      const encodeList = async (texts) => {
        const res = [];
        for (let i = 0; i < texts.length; i += 64) {
          const slice = texts.slice(i, i + 64);
          const out = await extractor(slice, { pooling: 'mean', normalize: true });
          const data = out.data;
          const dim = out.dims[1];
          for (let r = 0; r < slice.length; r++) {
            res.push(data.slice(r * dim, (r + 1) * dim));
          }
          if (texts.length > 100) {
            const pct = 48 + Math.round((i / texts.length) * 32);
            onProgress(pct, `Neural AI (${device.toUpperCase()}): verified ${Math.min(i + 64, texts.length)} / ${texts.length} ambiguous turns...`);
          }
        }
        return res;
      };

      const discProtos = {};
      for (const lbl of DISCOURSE_LABELS) discProtos[lbl] = meanVec(await encodeList(DISCOURSE_PROTOTYPES[lbl]));
      const intProtos = {};
      for (const [k, sents] of Object.entries(INTENT_PROTOTYPES)) intProtos[k] = meanVec(await encodeList(sents));

      // Deduplicate all candidate strings
      const uniqueMap = new Map();
      const allNeed = new Set([...ambiguousIdx, ...photoCandIdx, ...missCandIdx, ...meetCandIdx]);
      const cappedNeed = [...allNeed].slice(0, 2600);
      for (const idx of cappedNeed) {
        const txt = msgs[idx].text.slice(0, 220);
        if (!uniqueMap.has(txt)) uniqueMap.set(txt, null);
      }
      const uTexts = [...uniqueMap.keys()];
      if (uTexts.length) {
        const uVecs = await encodeList(uTexts);
        uTexts.forEach((t, k) => uniqueMap.set(t, uVecs[k]));
      }

      const discMap = new Map();
      for (const idx of ambiguousIdx) {
        const v = uniqueMap.get(msgs[idx].text.slice(0, 220));
        if (!v) continue;
        const sims = {};
        for (const lbl of DISCOURSE_LABELS) sims[lbl] = dot(v, discProtos[lbl]) / 0.12;
        discMap.set(idx, softmaxDict(sims));
      }
      const calcMargin = (indices, key) => {
        const mp = new Map();
        for (const idx of indices) {
          const v = uniqueMap.get(msgs[idx].text.slice(0, 220));
          if (v) mp.set(idx, dot(v, intProtos[key + '_pos']) - 0.65 * dot(v, intProtos[key + '_neg']));
        }
        return mp;
      };

      return {
        device,
        discMap,
        photoMargins: calcMargin(photoCandIdx, 'photo'),
        missMargins: calcMargin(missCandIdx, 'miss'),
        meetMargins: calcMargin(meetCandIdx, 'meet'),
      };
    } catch (_) {
      return null;
    }
  }

  async function analyzeChatText(rawText, opts = {}, onProgress = () => {}) {
    const useNeuralAI = opts.useNeuralAI !== false;
    onProgress(8, 'Parsing WhatsApp timestamps and participants...');
    const { msgs, loadInfo } = parseMessages(rawText);
    const n = msgs.length;

    const counts = {};
    for (const m of msgs) counts[m.sender] = (counts[m.sender] || 0) + 1;
    const senders = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    const { tokens: participantTokens, skelMap: participantSkelMap } = extractParticipantTokens(senders);
    const stopAll = new Set([...STOPWORDS, ...EXCLUDED_TOP_WORDS]);

    const per = {};
    const hourly = {};
    const weekday = {};
    const monthly = {};
    const daily = {};
    const wordCounts = {};
    const wordVariants = {};
    const emojiCounts = {};
    const heatMap = Array.from({ length: 7 }, () => Array(24).fill(0));
    const msgEmojis = new Array(n);

    senders.forEach(s => {
      per[s] = {
        messages: 0, text_messages: 0, media: 0, deleted: 0, edited: 0,
        words: 0, chars: 0, links: 0, questions: 0, emojis_total: 0,
        late_night: 0, longest_msg_words: 0, starts: 0, ends: 0,
        reply: {}, top_words: [], top_words_variants: {}, top_emojis: [],
        avg_burst: 0, longest_burst: 0,
      };
      hourly[s] = Array(24).fill(0);
      weekday[s] = Array(7).fill(0);
      monthly[s] = {};
      daily[s] = {};
      wordCounts[s] = {};
      wordVariants[s] = {};
      emojiCounts[s] = {};
    });

    onProgress(20, 'Tokenizing expressive words & UAX-29 emojis...');
    for (let i = 0; i < n; i++) {
      const m = msgs[i];
      const s = m.sender;
      const p = per[s];
      p.messages++;
      if (m.edited) p.edited++;
      const hr = m.dt.getHours();
      const wd = (m.dt.getDay() + 6) % 7;
      const mStr = localMonthKey(m.dt);
      const dStr = localDateKey(m.dt);

      hourly[s][hr]++;
      weekday[s][wd]++;
      monthly[s][mStr] = (monthly[s][mStr] || 0) + 1;
      daily[s][dStr] = (daily[s][dStr] || 0) + 1;
      heatMap[wd][hr]++;
      if (hr < 5) p.late_night++;

      if (m.kind === 'media') { p.media++; msgEmojis[i] = []; continue; }
      if (m.kind === 'deleted') { p.deleted++; msgEmojis[i] = []; continue; }

      p.text_messages++;
      p.words += m.words;
      p.chars += m.text.length;
      if (m.words > p.longest_msg_words) p.longest_msg_words = m.words;
      p.links += (m.text.match(URL_RE_G) || []).length;
      if (isQuestionMessage(m.text)) p.questions++;

      const emos = extractEmojis(m.text);
      msgEmojis[i] = emos;
      p.emojis_total += emos.length;
      for (const e of emos) emojiCounts[s][e] = (emojiCounts[s][e] || 0) + 1;

      const cleanWStr = normalizeQuotes(m.text.toLowerCase()).replace(URL_RE_G, ' ');
      const words = cleanWStr.match(WORD_RE_G) || [];
      for (const rawW of words) {
        const rawClean = rawW.replace(/^'+|'+$/g, '');
        if (!rawClean) continue;
        const canon = canonicalizeWord(rawClean, participantTokens, participantSkelMap);
        if (!canon) continue;
        if (participantTokens.has(canon) || (canon.length >= 3 && !stopAll.has(canon))) {
          wordCounts[s][canon] = (wordCounts[s][canon] || 0) + 1;
          if (!wordVariants[s][canon]) wordVariants[s][canon] = {};
          wordVariants[s][canon][rawClean] = (wordVariants[s][canon][rawClean] || 0) + 1;
        }
      }
    }

    onProgress(32, "Segmenting conversations ('Bye / Byee / Byeee...')...");
    const REPLY_CAP_SEC = 6 * 3600;
    const flow = segmentConversations(msgs, senders, REPLY_CAP_SEC);

    const pctile = (sorted, p) => {
      if (!sorted.length) return null;
      const k = ((sorted.length - 1) * p) / 100;
      const f = Math.floor(k);
      const c = Math.min(f + 1, sorted.length - 1);
      return sorted[f] + (sorted[c] - sorted[f]) * (k - f);
    };

    const sumArr = a => a.reduce((x, y) => x + y, 0);

    senders.forEach(s => {
      const v = flow.replies[s].slice().sort((a, b) => a - b);
      const pv = flow.turnPromptReplies[s].slice().sort((a, b) => a - b);
      const len = v.length;
      const slow = v.filter(x => x >= 60);
      const bk = [0, 0, 0, 0, 0];
      let logSum = 0;
      for (const x of v) {
        logSum += Math.log(Math.max(x, 15));
        if (x < 60) bk[0]++;
        else if (x < 300) bk[1]++;
        else if (x < 900) bk[2]++;
        else if (x < 3600) bk[3]++;
        else bk[4]++;
      }
      per[s].reply = {
        count: len,
        median: pctile(v, 50) ?? 0,
        mean: len ? sumArr(v) / len : 0,
        geom_mean: len ? Math.exp(logSum / len) : 0,
        p90: pctile(v, 90) ?? 0,
        after_pause_median: slow.length ? pctile(slow, 50) : null,
        after_pause_mean: slow.length ? sumArr(slow) / slow.length : null,
        after_pause_p90: slow.length ? pctile(slow, 90) : null,
        turn_prompt_median: pv.length ? pctile(pv, 50) : null,
        same_minute: len ? (v.filter(x => x < 60).length / len) * 100 : 0,
        buckets: len ? bk.map(b => (b / len) * 100) : [0, 0, 0, 0, 0],
      };
      per[s].starts = flow.starters[s];
      per[s].ends = flow.enders[s];
      per[s].avg_words_per_msg = per[s].text_messages ? per[s].words / per[s].text_messages : 0;
      per[s].avg_chars_per_msg = per[s].text_messages ? per[s].chars / per[s].text_messages : 0;
      per[s].peak_hour = hourly[s].indexOf(Math.max(...hourly[s]));
      per[s].avg_burst = flow.bursts[s].length ? sumArr(flow.bursts[s]) / flow.bursts[s].length : 0;
      per[s].longest_burst = flow.bursts[s].length ? Math.max(...flow.bursts[s]) : 0;

      const topW = Object.entries(wordCounts[s]).sort((a, b) => b[1] - a[1]).slice(0, 15);
      per[s].top_words = topW;
      for (const [w] of topW) {
        per[s].top_words_variants[w] = Object.entries(wordVariants[s][w] || {}).sort((a, b) => b[1] - a[1]).slice(0, 5);
      }
      per[s].top_emojis = Object.entries(emojiCounts[s]).sort((a, b) => b[1] - a[1]).slice(0, 15);
    });

    // --- Daily, Streaks & Temporal ---
    const dailyTotals = {};
    senders.forEach(s => {
      for (const [d, c] of Object.entries(daily[s])) dailyTotals[d] = (dailyTotals[d] || 0) + c;
    });
    const sortedDates = Object.keys(dailyTotals).sort();
    const parseLocalYMD = ds => {
      const [y, m, d] = ds.split('-').map(Number);
      return Date.UTC(y, m - 1, d);
    };
    const spanDays = Math.max(1, Math.round((parseLocalYMD(sortedDates[sortedDates.length - 1]) - parseLocalYMD(sortedDates[0])) / 864e5) + 1);
    let streak = 1, maxStreak = 1, longestSilence = 0;
    let curStart = sortedDates[0], bestStart = sortedDates[0], bestEnd = sortedDates[0];
    for (let i = 1; i < sortedDates.length; i++) {
      const diff = Math.round((parseLocalYMD(sortedDates[i]) - parseLocalYMD(sortedDates[i - 1])) / 864e5);
      if (diff === 1) {
        streak++;
      } else {
        longestSilence = Math.max(longestSilence, diff - 1);
        streak = 1;
        curStart = sortedDates[i];
      }
      if (streak > maxStreak) {
        maxStreak = streak;
        bestStart = curStart;
        bestEnd = sortedDates[i];
      }
    }

    const monthlyTotal = {};
    senders.forEach(s => {
      for (const [m, c] of Object.entries(monthly[s])) monthlyTotal[m] = (monthlyTotal[m] || 0) + c;
    });
    const overallHour = Array(24).fill(0);
    senders.forEach(s => hourly[s].forEach((c, h) => { overallHour[h] += c; }));
    const peakHour = overallHour.indexOf(Math.max(...overallHour));
    const overallWd = Array(7).fill(0);
    senders.forEach(s => weekday[s].forEach((c, w) => { overallWd[w] += c; }));
    const peakWd = WEEKDAYS[overallWd.indexOf(Math.max(...overallWd))];
    const topDays = Object.entries(dailyTotals).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const busiestMonth = Object.entries(monthlyTotal).sort((a, b) => b[1] - a[1])[0] || ['n/a', 0];

    // --- Advanced NLP Pass 1 ---
    onProgress(36, 'Analyzing discourse vibes, flirting & intents...');
    const textIndices = [];
    const periodCnt = {}, textCnt = {};
    senders.forEach(s => { periodCnt[s] = 0; textCnt[s] = 0; });
    for (let i = 0; i < n; i++) {
      if (msgs[i].kind === 'text') {
        textIndices.push(i);
        textCnt[msgs[i].sender]++;
        if (msgs[i].text.trim().endsWith('.')) periodCnt[msgs[i].sender]++;
      }
    }
    const periodRate = {};
    senders.forEach(s => { periodRate[s] = textCnt[s] ? periodCnt[s] / textCnt[s] : 0; });

    const pragProbs = new Map();
    const lowTexts = new Map();
    const ambiguousIdx = [];
    const photoCandIdx = [];
    const missCandIdx = [];
    const meetCandIdx = [];

    for (const i of textIndices) {
      const m = msgs[i];
      const low = normalizeQuotes(m.text.toLowerCase());
      lowTexts.set(i, low);
      const probs = softmaxDict(scorePragmaticDiscourse(m, msgEmojis[i], low, periodRate[m.sender]));
      pragProbs.set(i, probs);
      const sortedP = Object.values(probs).sort((a, b) => b - a);
      if (m.words >= 4 && sortedP[0] - sortedP[1] < 0.30 && ambiguousIdx.length < 2200) ambiguousIdx.push(i);
      if (PHOTO_DIRECT_RE.test(low)) photoCandIdx.push(i);
      if (MISS_YOU_RE.test(low)) missCandIdx.push(i);
      if (MEET_DESIRE_RE.test(low) || PHOTO_VISUAL_RE.test(low)) meetCandIdx.push(i);
    }

    let neuralRes = null;
    if (useNeuralAI && ambiguousIdx.length) {
      neuralRes = await runBrowserNeuralCascade(msgs, ambiguousIdx, photoCandIdx, missCandIdx, meetCandIdx, onProgress);
    }

    onProgress(84, 'Computing flirt craft, apologies, intimacy & contagion...');
    const finalProbs = new Map();
    const finalLabel = new Map();
    const discCounts = {}, discHardCounts = {};
    senders.forEach(s => {
      discCounts[s] = { flirting: 0, teasing: 0, arguments: 0, facts_info: 0, normal: 0 };
      discHardCounts[s] = { flirting: 0, teasing: 0, arguments: 0, facts_info: 0, normal: 0 };
    });

    for (const i of textIndices) {
      const base = { ...pragProbs.get(i) };
      if (neuralRes && neuralRes.discMap.has(i)) {
        const np = neuralRes.discMap.get(i);
        for (const k of DISCOURSE_LABELS) base[k] = 0.55 * base[k] + 0.45 * np[k];
      }
      if (i > 0 && pragProbs.has(i - 1) && (msgs[i].dt - msgs[i - 1].dt) / 1000 <= 180) {
        const prevP = pragProbs.get(i - 1);
        for (const k of ['flirting', 'arguments', 'teasing']) base[k] += 0.14 * prevP[k];
        if (
          msgs[i - 1].sender !== msgs[i].sender &&
          hasMockIndignationEmoji(msgEmojis[i]) &&
          !ARG_STRONG_G.test(lowTexts.get(i)) &&
          (msgEmojis[i - 1].some(e => LAUGH_EMOJI_SET.has(e)) || LAUGH_REACT_RE.test(lowTexts.get(i - 1)) || /\b(?:luss+u+|pagal+|mad|idiot|stupid|dumb+|clown|joker|shut\s*up|roast|teas(?:e|ing)|kidding|joking|haha+|hehe+|lmao+|rofl+|lol+)\b/i.test(lowTexts.get(i - 1)))
        ) {
          base.teasing += 0.55;
          base.arguments *= 0.25;
        }
      }
      let tot = 0;
      for (const k of DISCOURSE_LABELS) tot += base[k];
      tot = tot || 1;
      const normP = {};
      let bestK = 'normal', bestV = -1;
      for (const k of DISCOURSE_LABELS) {
        normP[k] = base[k] / tot;
        discCounts[msgs[i].sender][k] += normP[k];
        if (normP[k] > bestV) { bestV = normP[k]; bestK = k; }
      }
      finalProbs.set(i, normP);
      finalLabel.set(i, bestK);
      discHardCounts[msgs[i].sender][bestK]++;
    }

    const overallDiscPct = {}, perSenderDiscPct = {};
    const overallTotals = {};
    let overallSum = 0;
    for (const k of DISCOURSE_LABELS) {
      overallTotals[k] = sumArr(senders.map(s => discCounts[s][k]));
      overallSum += overallTotals[k];
    }
    overallSum = overallSum || 1;
    for (const k of DISCOURSE_LABELS) overallDiscPct[k] = +(overallTotals[k] / overallSum * 100).toFixed(1);
    senders.forEach(s => {
      perSenderDiscPct[s] = {};
      const ss = sumArr(DISCOURSE_LABELS.map(k => discCounts[s][k])) || 1;
      for (const k of DISCOURSE_LABELS) perSenderDiscPct[s][k] = +(discCounts[s][k] / ss * 100).toFixed(1);
    });

    // Flirt Best & Most: Causal Turn-Aware Generalized Rizz Engine
    function partnerFlusterScore(idx, senderName) {
      const m = msgs[idx];
      for (let j = idx + 1; j < Math.min(n, idx + 4); j++) {
        const nm = msgs[j];
        if ((nm.dt - m.dt) / 1000 > 600) break;
        if (nm.sender !== senderName && nm.kind === 'text') {
          const nEmos = msgEmojis[j], nLow = lowTexts.get(j) || '';
          let sc = 0;
          if (nEmos.some(e => FLUSTER_REACTION_EMOJIS.has(e))) sc += 0.55;
          if (BLUSH_REACTION_RE.test(nLow)) sc += 0.55;
          if (/([a-z])\1{3,}/.test(nLow)) sc += 0.20;
          if (sc > 0 && (nm.dt - m.dt) / 1000 <= 90) sc += 0.15;
          return Math.min(1.0, sc);
        }
      }
      return 0;
    }

    const isReactiveFluster = new Set();
    for (const i of textIndices) {
      if (finalLabel.get(i) !== 'flirting') continue;
      if (i > 0 && msgs[i - 1].kind === 'text' && msgs[i - 1].sender !== msgs[i].sender) {
        if ((msgs[i].dt - msgs[i - 1].dt) / 1000 <= 300 && finalLabel.get(i - 1) === 'flirting') {
          const low = lowTexts.get(i);
          const hasReact = BLUSH_REACTION_RE.test(low) || msgEmojis[i].some(e => FLUSTER_REACTION_EMOJIS.has(e));
          const hasNewComp = msgs[i].words >= 6 && FLIRT_LEX_TEST.test(low) && /\b(?:u|ur|you|your)\b/.test(low);
          if (hasReact && !hasNewComp) isReactiveFluster.add(i);
        }
      }
    }

    const flirtTotalCnt = {}, proactiveFlirtCnt = {}, flirtInits = {}, flirtReacts = {}, baseReacts = {};
    const flustersInduced = {}, flirtTokens = {}, flirtBigrams = {}, flirtSegueOpp = {}, flirtSegueHit = {}, flirtSpec = {}, flirtHighlights = {};
    senders.forEach(s => {
      flirtTotalCnt[s] = 0; proactiveFlirtCnt[s] = 0; flirtInits[s] = 0; flirtReacts[s] = []; baseReacts[s] = [];
      flustersInduced[s] = 0; flirtTokens[s] = []; flirtBigrams[s] = new Set();
      flirtSegueOpp[s] = 0; flirtSegueHit[s] = 0; flirtSpec[s] = 0; flirtHighlights[s] = [];
    });

    for (const i of textIndices) {
      const m = msgs[i], s = m.sender, low = lowTexts.get(i), lbl = finalLabel.get(i);
      if (lbl === 'normal' || lbl === 'facts_info') {
        baseReacts[s].push(partnerFlusterScore(i, s));
        continue;
      }
      if (lbl !== 'flirting') continue;
      flirtTotalCnt[s]++;
      if (isReactiveFluster.has(i)) continue;

      proactiveFlirtCnt[s]++;
      const prevLbl = finalLabel.get(i - 1) || 'normal';
      const prevGap = i > 0 ? (m.dt - msgs[i - 1].dt) / 1000 : 99999;
      const isSegue = i > 0 && (prevLbl === 'normal' || prevLbl === 'facts_info') && prevGap <= 600 && m.words >= 4;
      if (prevLbl !== 'flirting' || prevGap > 3600) flirtInits[s]++;

      const wtoks = (low.match(WORD_RE_G) || []).map(w => w.replace(/^'+|'+$/g, '')).filter(w => w.length >= 2);
      for (const wt of wtoks) flirtTokens[s].push(wt);
      for (let k = 1; k < wtoks.length; k++) flirtBigrams[s].add(wtoks[k - 1] + ' ' + wtoks[k]);
      if (m.words >= 5 && (/\b(?:u|ur|you|your)\b/.test(low) || FLIRT_LEX_TEST.test(low))) flirtSpec[s]++;

      const react = partnerFlusterScore(i, s);
      flirtReacts[s].push(react);
      if (react >= 0.45) flustersInduced[s]++;
      if (isSegue) { flirtSegueOpp[s]++; if (react >= 0.45) flirtSegueHit[s]++; }
      const sens = isSensitiveMessage(low, TIER4_SPICY_RE.test(low) ? 4 : 2);
      if (!sens && m.words >= 4 && m.words <= 26 && react >= 0.45 && flirtHighlights[s].length < 20) {
        flirtHighlights[s].push({
          sender: s, dt: isoTimestamp(m.dt), date_display: fmtDateDisplay(m.dt),
          text: safePreview(m.text, 150), reaction_score: Math.round(react * 100), sensitive: false,
        });
      }
    }

    const maxInduced = Math.max(...senders.map(s => flustersInduced[s]), 1);
    const maxBigrams = Math.max(...senders.map(s => flirtBigrams[s].size), 1);
    const maxSmooth = Math.max(...senders.map(s => flirtSegueHit[s]), 1);
    const maxSpec = Math.max(...senders.map(s => flirtSpec[s]), 1);

    const flirtPerSender = {};
    senders.forEach(s => {
      const fc = proactiveFlirtCnt[s] || flirtTotalCnt[s], tc = textCnt[s] || 1;
      const fRate = flirtReacts[s].length ? sumArr(flirtReacts[s]) / flirtReacts[s].length : 0;
      const nRate = baseReacts[s].length ? sumArr(baseReacts[s]) / baseReacts[s].length : 0;
      const lift = (fRate + 0.01) / (nRate + 0.01);
      const liftSc = Math.min(100, Math.max(0, (lift - 1) * 32));
      const volSc = (flustersInduced[s] / maxInduced) * 100;
      const partnerReaction = +(0.50 * liftSc + 0.50 * volSc).toFixed(1);

      const mattrSc = Math.min(100, computeMattr(flirtTokens[s], 50) * 115);
      const breadthSc = Math.sqrt(flirtBigrams[s].size / maxBigrams) * 100;
      const creativity = +(0.40 * mattrSc + 0.60 * breadthSc).toFixed(1);

      const segueRate = flirtSegueOpp[s] ? (flirtSegueHit[s] / flirtSegueOpp[s]) * 100 : 0;
      const segueVol = (flirtSegueHit[s] / maxSmooth) * 100;
      const smoothSegue = +(0.45 * Math.min(100, segueRate * 2) + 0.55 * segueVol).toFixed(1);

      const specRate = fc ? (flirtSpec[s] / fc) * 100 : 0;
      const specVol = (flirtSpec[s] / maxSpec) * 100;
      const specificity = +(0.45 * Math.min(100, specRate * 1.4) + 0.55 * specVol).toFixed(1);

      const bestScore = +(0.40 * partnerReaction + 0.25 * creativity + 0.20 * smoothSegue + 0.15 * specificity).toFixed(1);
      flirtHighlights[s].sort((a, b) => b.reaction_score - a.reaction_score);
      flirtPerSender[s] = {
        count: fc,
        total_flirt_turns: flirtTotalCnt[s],
        flusters_induced: flustersInduced[s],
        pct_of_messages: +(fc / tc * 100).toFixed(1),
        initiations: flirtInits[s],
        best_score: bestScore,
        components: {
          partner_reaction: partnerReaction,
          creativity,
          smooth_segue: smoothSegue,
          specificity,
        },
        highlights: flirtHighlights[s].slice(0, 3),
      };
    });
    const mostFlirtWinner = senders.slice().sort((a, b) => (flirtPerSender[b].count - flirtPerSender[a].count) || (flirtPerSender[b].pct_of_messages - flirtPerSender[a].pct_of_messages))[0] || '';
    const bestFlirtWinner = senders.slice().sort((a, b) => (flirtPerSender[b].best_score - flirtPerSender[a].best_score) || (flirtPerSender[b].count - flirtPerSender[a].count))[0] || '';

    // Apologies / Sorry Tracker
    const sorryCounts = {}, sorryFirst = {}, postArgSorryFirst = {}, sorryMonthly = {};
    senders.forEach(s => { sorryCounts[s] = 0; sorryFirst[s] = 0; postArgSorryFirst[s] = 0; sorryMonthly[s] = {}; });
    let apologyEpisodes = 0, lastApolDt = null, lastArgDt = null;
    const recoveryMins = [];
    for (const i of textIndices) {
      const m = msgs[i], low = lowTexts.get(i);
      if (finalLabel.get(i) === 'arguments') lastArgDt = m.dt;
      const cleanedApol = low.replace(APOLOGY_SYMPATHY_NEG_RE, ' ');
      if (APOLOGY_RE.test(cleanedApol)) {
        sorryCounts[m.sender]++;
        const mk = localMonthKey(m.dt);
        sorryMonthly[m.sender][mk] = (sorryMonthly[m.sender][mk] || 0) + 1;
        if (!lastApolDt || (m.dt - lastApolDt) / 1000 > 1800) {
          apologyEpisodes++;
          sorryFirst[m.sender]++;
          if (lastArgDt && (m.dt - lastArgDt) / 1000 >= 0 && (m.dt - lastArgDt) / 1000 <= 7200) {
            postArgSorryFirst[m.sender]++;
            recoveryMins.push((m.dt - lastArgDt) / 60000);
          }
        }
        lastApolDt = m.dt;
      }
    }
    recoveryMins.sort((a, b) => a - b);
    const medianRecoveryMin = recoveryMins.length ? +recoveryMins[Math.floor(recoveryMins.length / 2)].toFixed(1) : null;
    const sorryFirstLeader = senders.slice().sort((a, b) => (sorryFirst[b] - sorryFirst[a]) || (sorryCounts[b] - sorryCounts[a]))[0] || '';

    // Longest Substantive Messages
    const longestBySender = {};
    const fallbackBySender = {};
    for (const i of textIndices) {
      const m = msgs[i], s = m.sender;
      const [okSub, uniqW] = isSubstantiveLongest(m.text, m.words);
      const cand = {
        sender: s, dt: isoTimestamp(m.dt), date_display: fmtDateDisplay(m.dt), time_display: fmtTimeDisplay(m.dt),
        words: m.words, unique_words: uniqW, chars: m.text.length, text: m.text,
        sensitive: isSensitiveMessage(lowTexts.get(i), TIER4_SPICY_RE.test(lowTexts.get(i)) ? 4 : 1),
      };
      const fbCur = fallbackBySender[s];
      if (!fbCur || m.words > fbCur.words || (m.words === fbCur.words && m.text.length > fbCur.chars)) fallbackBySender[s] = cand;
      if (okSub) {
        const cur = longestBySender[s];
        if (!cur || m.words > cur.words || (m.words === cur.words && uniqW > cur.unique_words) || (m.words === cur.words && uniqW === cur.unique_words && m.text.length > cur.chars)) {
          longestBySender[s] = cand;
        }
      }
    }
    senders.forEach(s => {
      if (!longestBySender[s] && fallbackBySender[s]) longestBySender[s] = fallbackBySender[s];
      if (longestBySender[s]) per[s].longest_msg_words = longestBySender[s].words;
    });
    const overallLongest = Object.values(longestBySender).sort((a, b) => (b.words - a.words) || (b.unique_words - a.unique_words) || (b.chars - a.chars))[0] || null;

    // Intimacy, Nicknames (Strict Direct-Address) & Sensory Motifs
    const vocativeCounts = {};
    for (const i of textIndices) {
      const vm = lowTexts.get(i).trim().match(STRICT_VOCATIVE_RE);
      if (vm) {
        const canon = canonicalizeWord(vm[1], participantTokens, participantSkelMap);
        if (canon.length >= 3 && !participantTokens.has(canon) && !VOCATIVE_NON_NICK.has(canon)) {
          vocativeCounts[canon] = (vocativeCounts[canon] || 0) + 1;
        }
      }
    }

    const nicknameMap = {};
    for (const i of textIndices) {
      const m = msgs[i], low = lowTexts.get(i), s = m.sender;
      for (const [label, pat] of NICKNAME_PATTERNS) {
        const hits = low.match(pat);
        if (hits && hits.length) {
          if (!nicknameMap[label]) {
            nicknameMap[label] = {
              term: label, coined_by: s, first_dt: isoTimestamp(m.dt), date_display: fmtDateDisplay(m.dt),
              time_display: fmtTimeDisplay(m.dt), first_quote: safePreview(m.text, 140),
              sensitive: isSensitiveMessage(low, 2), total_count: 0,
              per_sender: Object.fromEntries(senders.map(sn => [sn, 0])),
            };
          }
          nicknameMap[label].total_count += hits.length;
          nicknameMap[label].per_sender[s] += hits.length;
        }
      }
    }

    const curatedFlat = new Set(NICKNAME_PATTERNS.flatMap(([lbl]) => lbl.match(/[a-z]+/g) || []));
    const curatedSkels = new Set([...curatedFlat].map(wordSkeleton));
    const topMined = Object.entries(vocativeCounts).sort((a, b) => b[1] - a[1]).slice(0, 15);
    for (const [canon, cnt] of topMined) {
      if (cnt < 8 || curatedFlat.has(canon) || curatedSkels.has(wordSkeleton(canon))) continue;
      const skelPat = new RegExp('\\b' + wordSkeleton(canon).split('').map(c => c + '+').join('') + '\\b', 'gi');
      let firstIdx = null, tot = 0;
      const ps = Object.fromEntries(senders.map(sn => [sn, 0]));
      for (const i of textIndices) {
        const hits = lowTexts.get(i).match(skelPat);
        if (hits && hits.length) {
          if (firstIdx === null) firstIdx = i;
          tot += hits.length;
          ps[msgs[i].sender] += hits.length;
        }
      }
      if (tot >= 8 && firstIdx !== null) {
        const fm = msgs[firstIdx];
        nicknameMap[canon] = {
          term: canon, coined_by: fm.sender, first_dt: isoTimestamp(fm.dt), date_display: fmtDateDisplay(fm.dt),
          time_display: fmtTimeDisplay(fm.dt), first_quote: safePreview(fm.text, 140),
          sensitive: isSensitiveMessage(lowTexts.get(firstIdx), 2), total_count: tot, per_sender: ps, auto_discovered: true,
        };
      }
    }

    const sensorySummary = {};
    const escalationEvents = [];
    const escalationsPerSender = Object.fromEntries(senders.map(s => [s, 0]));

    for (const [key, label, posRe, negRe, tierVal] of SENSORY_MOTIFS) {
      const perS = Object.fromEntries(senders.map(s => [s, 0]));
      let firstEv = null;
      for (const i of textIndices) {
        const low = lowTexts.get(i);
        if (posRe.test(low) && (!negRe || !negRe.test(low))) {
          const m = msgs[i];
          perS[m.sender]++;
          if (!firstEv) {
            firstEv = {
              sender: m.sender, dt: isoTimestamp(m.dt), date_display: fmtDateDisplay(m.dt),
              time_display: fmtTimeDisplay(m.dt), quote: safePreview(m.text, 140),
              sensitive: isSensitiveMessage(low, 2),
            };
          }
        }
      }
      sensorySummary[key] = { label, total: sumArr(Object.values(perS)), per_sender: perS, first_unlock: firstEv };
      if (firstEv) {
        escalationEvents.push({
          type: 'sensory', tier: tierVal, badge: `First ${label}`, sender: firstEv.sender,
          dt: firstEv.dt, date_display: firstEv.date_display, time_display: firstEv.time_display,
          quote: firstEv.quote, sensitive: firstEv.sensitive,
        });
      }
    }

    const sortedNicks = Object.values(nicknameMap).sort((a, b) => b.total_count - a.total_count);
    sortedNicks.slice().sort((a, b) => a.first_dt.localeCompare(b.first_dt)).slice(0, 15).forEach(ne => {
      escalationEvents.push({
        type: 'nickname', tier: 2, badge: `New Pet Name: ${ne.term}`, sender: ne.coined_by,
        dt: ne.first_dt, date_display: ne.date_display, time_display: ne.time_display,
        quote: ne.first_quote, sensitive: ne.sensitive,
      });
      escalationsPerSender[ne.coined_by]++;
    });

    const TIER_NAMES = {
      1: 'Tier 1 · Warm Compliment',
      2: 'Tier 2 · Pet Names & Sensory Affection',
      3: 'Tier 3 · Physical Tenderness & Devotion',
      4: 'Tier 4 · Heated / Spicy Flirting',
      5: 'Tier 5 · Peak Explicit Intimacy',
    };
    const unlockedGlobal = new Set();
    const unlockedSender = Object.fromEntries(senders.map(s => [s, new Set()]));
    const monthlyIntimSum = {}, monthlyIntimCnt = {};
    const rollingScores = [];
    let lastSpikeDt = null;

    for (const i of textIndices) {
      const m = msgs[i], low = lowTexts.get(i), emos = msgEmojis[i];
      let tier = 0, cont = 0;
      if (SENSITIVE_EXPLICIT_RE.test(low) || emos.some(e => e === '🍆' || e === '🍑' || e === '💦')) { tier = 5; cont = 5; }
      else if (TIER4_SPICY_RE.test(low) || (emos.includes('🥵') && finalLabel.get(i) === 'flirting')) { tier = 4; cont = 4; }
      else if (TIER3_TENDER_RE.test(low)) { tier = 3; cont = 3; }
      else if (TIER2_ROMANTIC_RE.test(low) || emos.some(e => e === '😘' || e === '💋' || e === '❤️‍🔥')) { tier = 2; cont = 2; }
      else if (TIER1_WARM_RE.test(low) || finalLabel.get(i) === 'flirting') { tier = 1; cont = 1; }

      const mk = localMonthKey(m.dt);
      monthlyIntimSum[mk] = (monthlyIntimSum[mk] || 0) + cont;
      monthlyIntimCnt[mk] = (monthlyIntimCnt[mk] || 0) + 1;

      if (tier >= 2) {
        const sens = isSensitiveMessage(low, tier);
        const fg = !unlockedGlobal.has(tier), fs = !unlockedSender[m.sender].has(tier);
        if (fg || fs) {
          unlockedGlobal.add(tier);
          unlockedSender[m.sender].add(tier);
          escalationEvents.push({
            type: 'tier_unlock', tier, badge: `${fg ? 'First Ever ' : 'Personal First · '}${TIER_NAMES[tier]}`,
            sender: m.sender, dt: isoTimestamp(m.dt), date_display: fmtDateDisplay(m.dt),
            time_display: fmtTimeDisplay(m.dt), quote: safePreview(m.text, 150), sensitive: sens,
          });
          escalationsPerSender[m.sender]++;
        }
        if (tier >= 3 && rollingScores.length >= 80) {
          const win = rollingScores.slice(-250);
          const meanW = sumArr(win) / win.length;
          const varW = sumArr(win.map(x => (x - meanW) ** 2)) / win.length;
          const stdW = Math.sqrt(varW) || 0.35;
          const z = (cont - meanW) / stdW;
          if (z >= 2.5 && (!lastSpikeDt || (m.dt - lastSpikeDt) / 1000 >= 43200)) {
            lastSpikeDt = m.dt;
            escalationsPerSender[m.sender]++;
            escalationEvents.push({
              type: 'heat_spike', tier, badge: `Intimacy Escalation Spike (Tier ${tier})`,
              sender: m.sender, dt: isoTimestamp(m.dt), date_display: fmtDateDisplay(m.dt),
              time_display: fmtTimeDisplay(m.dt), quote: safePreview(m.text, 150), sensitive: sens,
            });
          }
        }
      }
      rollingScores.push(cont);
    }
    escalationEvents.sort((a, b) => a.dt.localeCompare(b.dt));
    const monthlyIntimTrajectory = {};
    for (const mk of Object.keys(monthlyIntimCnt).sort()) {
      monthlyIntimTrajectory[mk] = +((monthlyIntimSum[mk] / monthlyIntimCnt[mk]) * 25).toFixed(2);
    }

    // Photo Requests (Req 7)
    const photoCounts = {}, photoDirect = {}, photoVisual = {}, photoFulfilled = {}, photoSamples = {};
    senders.forEach(s => { photoCounts[s] = 0; photoDirect[s] = 0; photoVisual[s] = 0; photoFulfilled[s] = 0; photoSamples[s] = []; });

    for (const i of textIndices) {
      const m = msgs[i], low = lowTexts.get(i);
      if (PHOTO_HARD_NEG_RE.test(low) || INPERSON_MEET_TIME_RE.test(low)) continue;
      const isDirect = PHOTO_DIRECT_RE.test(low);
      let isEllipsis = false;
      if (!isDirect && m.words <= 4 && PHOTO_ELLIPSIS_RE.test(low)) {
        for (let pj = Math.max(0, i - 3); pj < i; pj++) {
          const pm = msgs[pj];
          if (pm.sender !== m.sender && (m.dt - pm.dt) / 1000 <= 600 && pm.kind === 'text' && PHOTO_APPEARANCE_CTX_RE.test(lowTexts.get(pj) || '')) {
            isEllipsis = true; break;
          }
        }
      }
      if (!isDirect && !isEllipsis) continue;
      if (neuralRes && neuralRes.photoMargins.has(i) && neuralRes.photoMargins.get(i) < -0.05 && !isDirect) continue;

      let fulfilled = false, shyConfirmed = false;
      for (let nj = i + 1; nj < Math.min(n, i + 6); nj++) {
        const nm = msgs[nj];
        if ((nm.dt - m.dt) / 1000 > 900) break;
        if (nm.sender !== m.sender) {
          if (nm.kind === 'media') { fulfilled = true; break; }
          if (nm.kind === 'text' && PHOTO_SHY_REFUSAL_RE.test(lowTexts.get(nj) || '')) shyConfirmed = true;
        }
      }
      photoCounts[m.sender]++;
      photoDirect[m.sender]++;
      if (fulfilled) photoFulfilled[m.sender]++;
      if (photoSamples[m.sender].length < 6 && !isSensitiveMessage(low, 2)) {
        photoSamples[m.sender].push({
          dt: isoTimestamp(m.dt), date_display: fmtDateDisplay(m.dt),
          text: safePreview(m.text, 120), fulfilled: fulfilled || shyConfirmed, sensitive: false,
        });
      }
    }

    // Longing & Meet Desire (Req 8)
    const missTotal = {}, missInit = {}, missRecip = {}, meetTotal = {};
    senders.forEach(s => { missTotal[s] = 0; missInit[s] = 0; missRecip[s] = 0; meetTotal[s] = 0; });
    let lastMissDt = null, lastMissSender = null;
    for (const i of textIndices) {
      const m = msgs[i], low = lowTexts.get(i);
      if (MISS_YOU_RE.test(low) && !MISS_YOU_NEG_RE.test(low)) {
        if (!neuralRes || !neuralRes.missMargins.has(i) || neuralRes.missMargins.get(i) >= -0.05) {
          missTotal[m.sender]++;
          const isRecip = (lastMissDt && lastMissSender !== m.sender && (m.dt - lastMissDt) / 1000 <= 900) || /\b(?:too+|more+|same)\b/.test(low);
          if (isRecip) missRecip[m.sender]++; else missInit[m.sender]++;
          lastMissDt = m.dt; lastMissSender = m.sender;
        }
      }
      if ((MEET_DESIRE_RE.test(low) || PHOTO_VISUAL_RE.test(low)) && !MEET_NEG_RE.test(low)) {
        if (!neuralRes || !neuralRes.meetMargins.has(i) || neuralRes.meetMargins.get(i) >= -0.05) {
          meetTotal[m.sender]++;
        }
      }
    }

    // Fun: LSM, Contagion, Humor, Chaser, 2 AM Shift, Trophies, Quiz
    const lsmCounts = {}, lsmTotals = {};
    senders.forEach(s => { lsmCounts[s] = {}; lsmTotals[s] = 0; for (const k of Object.keys(LSM_CATEGORIES)) lsmCounts[s][k] = 0; });
    for (const i of textIndices) {
      const m = msgs[i], s = m.sender, wtoks = lowTexts.get(i).match(WORD_RE_G) || [];
      lsmTotals[s] += wtoks.length;
      for (const w of wtoks) {
        for (const [cat, wset] of Object.entries(LSM_CATEGORIES)) if (wset.has(w)) lsmCounts[s][cat]++;
      }
    }
    let lsmScore = null;
    const lsmBreakdown = {};
    if (senders.length >= 2) {
      const [s1, s2] = senders, t1 = lsmTotals[s1] || 1, t2 = lsmTotals[s2] || 1;
      const cats = [];
      for (const cat of Object.keys(LSM_CATEGORIES)) {
        const r1 = lsmCounts[s1][cat] / t1, r2 = lsmCounts[s2][cat] / t2;
        const val = 1 - Math.abs(r1 - r2) / (r1 + r2 + 0.0001);
        lsmBreakdown[cat] = +(val * 100).toFixed(1);
        cats.push(val);
      }
      lsmScore = +(sumArr(cats) / cats.length * 100).toFixed(1);
    }

    const contagionItems = [];
    if (senders.length >= 2) {
      const [s1, s2] = senders;
      const wordDts = new Map(), emojiDts = new Map();
      for (const i of textIndices) {
        const m = msgs[i];
        if (m.sender !== s1 && m.sender !== s2) continue;
        const ts = m.dt.getTime();
        const wtoks = lowTexts.get(i).replace(URL_RE_G, ' ').match(WORD_RE_G) || [];
        for (const rawW of wtoks) {
          const canon = canonicalizeWord(rawW, participantTokens, participantSkelMap);
          if (canon.length >= 4 && !stopAll.has(canon) && !participantTokens.has(canon)) {
            if (!wordDts.has(canon)) wordDts.set(canon, { [s1]: [], [s2]: [] });
            wordDts.get(canon)[m.sender].push(ts);
          }
        }
        for (const e of msgEmojis[i]) {
          if (!emojiDts.has(e)) emojiDts.set(e, { [s1]: [], [s2]: [] });
          emojiDts.get(e)[m.sender].push(ts);
        }
      }
      for (const [kind, store] of [['word', wordDts], ['emoji', emojiDts]]) {
        for (const [token, dmap] of store.entries()) {
          const c1 = dmap[s1].length, c2 = dmap[s2].length;
          if (c1 < 15 || c2 < 15 || c1 + c2 < 50) continue;
          const leadDays = (dmap[s2][0] - dmap[s1][0]) / 864e5;
          if (Math.abs(leadDays) >= 10) {
            const orig = leadDays > 0 ? s1 : s2, adpt = orig === s1 ? s2 : s1;
            const cutoff = dmap[orig][0] + 30 * 864e5;
            const earlyOrig = dmap[orig].filter(t => t <= cutoff).length;
            const earlyAdpt = dmap[adpt].filter(t => t <= cutoff).length;
            if (earlyOrig >= 5 && earlyOrig >= earlyAdpt * 2) {
              contagionItems.push({
                token, kind, originator: orig, adopter: adpt, lead_days: Math.round(Math.abs(leadDays)),
                originator_count: dmap[orig].length, adopter_count: dmap[adpt].length, total: c1 + c2,
              });
            }
          }
        }
      }
      contagionItems.sort((a, b) => (Math.min(b.lead_days, 180) * Math.log1p(b.adopter_count)) - (Math.min(a.lead_days, 180) * Math.log1p(a.adopter_count)));
    }

    const laughsMade = {}, teaseReactTrig = {}, comedyPoints = {}, laughsSent = {}, dblTexts = {}, vanishes = {}, dryReplies = {}, turnRepliesCnt = {};
    const nightStats = {}, dayStats = {};
    senders.forEach(s => {
      laughsMade[s] = 0; teaseReactTrig[s] = 0; comedyPoints[s] = 0; laughsSent[s] = 0;
      dblTexts[s] = 0; vanishes[s] = 0; dryReplies[s] = 0; turnRepliesCnt[s] = 0;
      nightStats[s] = { msgs: 0, flirt: 0, words: 0, intim2: 0 };
      dayStats[s] = { msgs: 0, flirt: 0, words: 0, intim2: 0 };
    });

    for (const i of textIndices) {
      const m = msgs[i], s = m.sender, low = lowTexts.get(i), emos = msgEmojis[i];
      const isDirectLaugh = emos.some(e => e === '😂' || e === '🤣' || e === '💀' || e === '😹') || LAUGH_REACT_RE.test(low);
      const isMockMad = hasMockIndignationEmoji(emos) || /\b(?:shut\s*up|luss+u+|a+b{2,}o+|hate\s+(?:u|you))\b/.test(low);
      if (isDirectLaugh || emos.some(e => LAUGH_EMOJI_SET.has(e))) laughsSent[s]++;
      if (i > 0 && msgs[i - 1].kind === 'text' && msgs[i - 1].sender !== s && (m.dt - msgs[i - 1].dt) / 1000 <= 300) {
        const prevS = msgs[i - 1].sender, prevLow = lowTexts.get(i - 1) || '', prevEmos = msgEmojis[i - 1];
        const prevWasTease = prevEmos.some(e => LAUGH_EMOJI_SET.has(e)) || LAUGH_REACT_RE.test(prevLow) || /\b(?:luss+u+|pagal+|mad|idiot|stupid|dumb+|clown|joker|shut\s*up|roast|teas(?:e|ing)|kidding|joking|haha+|hehe+|lmao+|rofl+|lol+)\b/i.test(prevLow);
        if (isDirectLaugh) { laughsMade[prevS]++; comedyPoints[prevS]++; }
        else if (prevWasTease && isMockMad && !/\b(?:whatever|leave\s+it|forget\s+it|don'?t\s+talk\s+to\s+me|stop\s+talking|i'?m\s+done|im\s+done|you\s+always|you\s+never|your\s+fault|hurt\s+me|pissed\s+off|angry\s+with|mad\s+at\s+(?:u|you)|fed\s+up|sick\s+of\s+this|why\s+did\s+you\s+do|didn'?t\s+expect\s+this|not\s+in\s+the\s+mood|leave\s+me\s+alone|stop\s+lying)\b/i.test(low)) {
          teaseReactTrig[prevS]++; comedyPoints[prevS]++;
        }
      }
      const bkt = m.dt.getHours() < 5 ? nightStats[s] : dayStats[s];
      bkt.msgs++; bkt.words += m.words; bkt.flirt += finalProbs.get(i).flirting;
      if (TIER2_ROMANTIC_RE.test(low) || TIER3_TENDER_RE.test(low) || TIER4_SPICY_RE.test(low)) bkt.intim2++;
    }

    for (let i = 1; i < n; i++) {
      const pm = msgs[i - 1], cm = msgs[i], gap = (cm.dt - pm.dt) / 1000;
      const prevBye = pm.kind === 'text' && BYE_RE.test(pm.text);
      if (cm.sender === pm.sender) {
        if (gap >= 1800 && gap <= 21600 && !prevBye) dblTexts[cm.sender]++;
      } else {
        if (cm.kind === 'text') {
          turnRepliesCnt[cm.sender]++;
          if (cm.words === 1 && cm.text.trim().length <= 5 && !msgEmojis[i].some(e => FLIRT_EMOJI_SET.has(e))) dryReplies[cm.sender]++;
        }
        if (gap > 21600 && !prevBye && senders.length === 2) {
          const vanisher = pm.sender === senders[0] ? senders[1] : senders[0];
          vanishes[vanisher]++;
        }
      }
    }

    const chaserMetrics = {}, nightShift = {};
    senders.forEach(s => {
      chaserMetrics[s] = {
        double_texts_30m: dblTexts[s],
        unannounced_vanishes_6h: vanishes[s],
        dry_reply_pct: turnRepliesCnt[s] ? +(dryReplies[s] / turnRepliesCnt[s] * 100).toFixed(1) : 0,
      };
      const ns = nightStats[s], ds = dayStats[s];
      nightShift[s] = {
        night_msgs: ns.msgs,
        night_flirt_pct: ns.msgs ? +(ns.flirt / ns.msgs * 100).toFixed(1) : 0,
        day_flirt_pct: ds.msgs ? +(ds.flirt / ds.msgs * 100).toFixed(1) : 0,
        night_avg_words: ns.msgs ? +(ns.words / ns.msgs).toFixed(2) : 0,
        day_avg_words: ds.msgs ? +(ds.words / ds.msgs).toFixed(2) : 0,
        night_intimacy_pct: ns.msgs ? +(ns.intim2 / ns.msgs * 100).toFixed(1) : 0,
        day_intimacy_pct: ds.msgs ? +(ds.intim2 / ds.msgs * 100).toFixed(1) : 0,
      };
    });

    const trophies = [];
    if (senders.length) {
      trophies.push({ icon: 'RIZZ', title: 'Smooth Operator (Best Flirt)', winner: bestFlirtWinner, stat: `${flirtPerSender[bestFlirtWinner].best_score} / 100 Rizz Score` });
      trophies.push({ icon: 'CHARM', title: 'Relentless Charmer (Most Flirts)', winner: mostFlirtWinner, stat: `${flirtPerSender[mostFlirtWinner].count.toLocaleString()} proactive flirts (${flirtPerSender[mostFlirtWinner].flusters_induced.toLocaleString()} flustered reactions)` });
      const peaceW = senders.slice().sort((a, b) => sorryFirst[b] - sorryFirst[a])[0];
      trophies.push({ icon: 'PEACE', title: 'Chief Peacekeeper', winner: peaceW, stat: `Said sorry first ${sorryFirst[peaceW].toLocaleString()} times` });
      const laughW = senders.slice().sort((a, b) => comedyPoints[b] - comedyPoints[a])[0];
      trophies.push({ icon: 'COMEDY', title: 'Certified Comedian', winner: laughW, stat: `${comedyPoints[laughW].toLocaleString()} comedy moments (${laughsMade[laughW].toLocaleString()} laughs + ${teaseReactTrig[laughW].toLocaleString()} tease reactions)` });
      const missW = senders.slice().sort((a, b) => (missTotal[b] + meetTotal[b]) - (missTotal[a] + meetTotal[a]))[0];
      trophies.push({ icon: 'YEARNING', title: 'Most Yearning', winner: missW, stat: `${(missTotal[missW] + meetTotal[missW]).toLocaleString()} 'Miss You' & meet-up asks` });
      const picW = senders.slice().sort((a, b) => photoCounts[b] - photoCounts[a])[0];
      trophies.push({ icon: 'PHOTO', title: 'Paparazzi', winner: picW, stat: `Asked for pics ${photoCounts[picW].toLocaleString()} times` });
    }

    const shuffleArr = arr => {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
      }
      return arr;
    };
    const quizPool = [];
    if (senders.length >= 2) {
      const bySender = Object.fromEntries(senders.map(s => [s, []]));
      for (let ti = 0; ti < textIndices.length; ti++) {
        const idx = textIndices[ti], m = msgs[idx], s = m.sender, low = lowTexts.get(idx);
        if (m.words < 8 || m.words > 28 || m.text.length > 190) continue;
        if (URL_TEST_RE.test(m.text) || isSensitiveMessage(low, 3)) continue;
        let hasName = false;
        for (const pt of participantTokens) if (low.includes(pt)) { hasName = true; break; }
        if (hasName) continue;
        bySender[s].push(idx);
      }
      const perCap = Math.max(40, Math.floor(250 / senders.length));
      for (const s of senders) {
        const cand = shuffleArr(bySender[s]).slice(0, perCap);
        for (const idx of cand) {
          const m = msgs[idx];
          quizPool.push({ text: m.text.trim(), sender: s, date_display: fmtDateDisplay(m.dt), vibe: finalLabel.get(idx) });
        }
      }
      shuffleArr(quizPool);
    }

    const totalWords = sumArr(senders.map(s => per[s].words));
    const summary = {
      senders,
      participant_tokens: [...participantTokens].sort(),
      overview: {
        first_message: isoTimestamp(msgs[0].dt),
        last_message: isoTimestamp(msgs[n - 1].dt),
        span_days: spanDays,
        active_days: sortedDates.length,
        silent_days: spanDays - sortedDates.length,
        total_messages: n,
        total_words: totalWords,
        messages_per_day: n / spanDays,
        words_per_day: totalWords / spanDays,
        longest_daily_streak: maxStreak,
        streak_started: bestStart,
        streak_ended: bestEnd,
        current_streak: streak,
        longest_silence_days: longestSilence,
        peak_hour: peakHour,
        peak_weekday: peakWd,
        busiest_month: busiestMonth,
        reply_cap_hours: 6,
        session_rule: 'bye_cluster',
        total_conversations: flow.totalConversations,
        total_chat_hours: flow.totalChatHours,
      },
      per_sender: per,
      hourly,
      weekday,
      monthly,
      monthly_total: monthlyTotal,
      top_days: topDays,
      heatmap: heatMap,
      engine_meta: {
        neural_used: Boolean(neuralRes),
        neural_device: neuralRes ? neuralRes.device : 'none',
        ambiguous_verified: neuralRes ? neuralRes.discMap.size : 0,
      },
      discourse: {
        overall_pct: overallDiscPct,
        per_sender_pct: perSenderDiscPct,
        per_sender_counts: discHardCounts,
        flirt_analysis: {
          most_flirt_winner: mostFlirtWinner,
          best_flirt_winner: bestFlirtWinner,
          per_sender: flirtPerSender,
        },
      },
      apologies: {
        total_episodes: apologyEpisodes,
        sorry_first_leader: sorryFirstLeader,
        median_makeup_minutes: medianRecoveryMin,
        per_sender: Object.fromEntries(senders.map(s => [s, {
          sorry_count: sorryCounts[s],
          said_sorry_first: sorryFirst[s],
          post_argument_sorry_first: postArgSorryFirst[s],
          monthly: sorryMonthly[s],
        }])),
      },
      longest_messages: { overall: overallLongest, per_sender: longestBySender },
      intimacy: {
        escalations_per_sender: escalationsPerSender,
        escalation_leader: senders.slice().sort((a, b) => escalationsPerSender[b] - escalationsPerSender[a])[0] || '',
        nicknames: sortedNicks.slice(0, 18),
        sensory_and_physical_cues: sensorySummary,
        escalations: escalationEvents.slice(0, 120),
        monthly_trajectory: monthlyIntimTrajectory,
      },
      photo_requests: Object.fromEntries(senders.map(s => [s, {
        total: photoCounts[s],
        direct_asks: photoDirect[s],
        visual_desire_asks: photoVisual[s],
        fulfilled_with_media: photoFulfilled[s],
        fulfillment_pct: photoCounts[s] ? +(photoFulfilled[s] / photoCounts[s] * 100).toFixed(1) : 0,
        samples: photoSamples[s],
      }])),
      longing_and_meeting: Object.fromEntries(senders.map(s => [s, {
        miss_you_total: missTotal[s],
        miss_you_initiated: missInit[s],
        miss_you_reciprocal: missRecip[s],
        desire_to_meet: meetTotal[s],
        combined_total: missTotal[s] + meetTotal[s],
      }])),
      fun: {
        lsm_score_pct: lsmScore,
        lsm_breakdown: lsmBreakdown,
        contagion: contagionItems.slice(0, 12),
        humor: Object.fromEntries(senders.map(s => [s, {
          laughs_triggered: laughsMade[s],
          tease_reactions_triggered: teaseReactTrig[s],
          comedy_points: comedyPoints[s],
          laughs_sent: laughsSent[s],
        }])),
        chaser: chaserMetrics,
        night_shift: nightShift,
        trophies,
        quiz_pool: quizPool,
      },
    };

    const dailyCSV = 'date,messages\n' + sortedDates.map(d => `${d},${dailyTotals[d]}`).join('\n');
    onProgress(100, 'Done!');
    return { summary, dailyCSV, loadInfo };
  }

  globalScope.WhatsAppAnalyzerEngine = {
    analyzeChatText,
    canonicalizeWord,
    extractParticipantTokens,
    extractEmojis,
    isQuestionMessage,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = globalScope.WhatsAppAnalyzerEngine;
  }

  const isWorker = typeof WorkerGlobalScope !== 'undefined' && globalScope instanceof WorkerGlobalScope;
  if (isWorker) {
    globalScope.onmessage = async function (ev) {
      const data = ev.data || {};
      if (data.type !== 'analyze') return;
      try {
        const result = await analyzeChatText(data.text, data.opts || {}, (pct, label) => {
          globalScope.postMessage({ type: 'progress', pct, label });
        });
        globalScope.postMessage({ type: 'result', ...result });
      } catch (err) {
        globalScope.postMessage({ type: 'error', error: err && err.message ? err.message : String(err) });
      }
    };
  }
})(typeof self !== 'undefined' ? self : globalThis);
