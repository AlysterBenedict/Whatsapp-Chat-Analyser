#!/usr/bin/env python3
"""
State-of-the-Art Conversational NLP, Pragmatics & Intimacy Engine
=================================================================
Generalized (zero hardcoded participant names), privacy-first local engine
combining:
  - Dynamic participant token extraction & expressive de-elongation
  - UAX #29 grapheme-cluster emoji extraction (via `regex`)
  - Farewell-cluster ("Bye / Byee / Byeee...") conversation segmentation
  - Hawkes-inspired active engagement time & turn-prompt latency
  - Multi-turn contextual pragmatic scoring + optional local CUDA/CPU
    Transformer prototype disambiguation (Smart Cascade)
  - 5-way discourse breakdown, Flirt Best/Most, Apologies ("Sorry" & "Sorry First")
  - Multi-word & vocative-mined nicknames + 5-tier sensory/physical intimacy
  - Hard-negative photo-request & meet/miss-you intent classifiers
  - Language Style Matching (LSM), Word/Emoji Contagion, Humor, Chaser Index,
    2 AM Persona Shift, Trophies, and "Guess Who Said It?" quiz pool
"""

from __future__ import annotations

import hashlib
import math
import random
import re
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple

try:
    import regex as uregex
except ImportError:
    uregex = None

# ---------------------------------------------------------------------------
# Constants, Stopwords & Screenshot Exclusions
# ---------------------------------------------------------------------------

URL_RE = re.compile(r"(https?://\S+|www\.\S+)", re.IGNORECASE)
WORD_RE = re.compile(r"[a-zA-Z']+")
CHAR_STRETCH_RE = re.compile(r"([a-z])\1{2,}")
TRAILING_REPEAT_RE = re.compile(r"([a-z])\1+$")
SKELETON_RE = re.compile(r"(.)\1+")
ABBO_RE = re.compile(r"^a+b{2,}o+$")

SKIN_TONES = set("\U0001F3FB\U0001F3FC\U0001F3FD\U0001F3FE\U0001F3FF")
FALLBACK_EMOJI_RE = re.compile(
    r"(?:[\U0001F300-\U0001FAFF\u2600-\u27BF\u2B50\u2B55]"
    r"(?:\uFE0F|\U0001F3FB|\U0001F3FC|\U0001F3FD|\U0001F3FE|\U0001F3FF)?"
    r"(?:\u200D[\U0001F300-\U0001FAFF\u2600-\u27BF\u2640\u2642]\uFE0F?)*)"
)
BMP_HEART_NORMALIZE = {"\u2764": "\u2764\uFE0F", "\u263a": "\u263a\uFE0F", "\u270c": "\u270c\uFE0F", "\u270b": "\u270b\uFE0F"}

STOPWORDS = {
    "a", "about", "above", "after", "again", "all", "also", "am", "an", "and", "any", "are", "aren't",
    "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", "by",
    "can", "can't", "cannot", "could", "couldn't", "did", "didn't", "do", "does", "doesn't", "doing",
    "don't", "down", "during", "each", "few", "for", "from", "further", "get", "got", "had", "hadn't",
    "has", "hasn't", "have", "haven't", "having", "he", "her", "here", "hers", "him", "his", "how",
    "i", "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't", "it", "it's", "its", "just",
    "let", "like", "me", "more", "most", "my", "no", "nor", "not", "now", "of", "off", "on", "once",
    "only", "or", "other", "our", "ours", "out", "over", "own", "same", "she", "should", "shouldn't",
    "so", "some", "such", "than", "that", "that's", "the", "their", "theirs", "them", "then", "there",
    "these", "they", "this", "those", "through", "to", "too", "under", "until", "up", "very", "was",
    "wasn't", "we", "we'd", "we'll", "we're", "we've", "were", "weren't", "what", "when", "where",
    "which", "while", "who", "whom", "why", "will", "with", "won't", "would", "wouldn't", "you",
    "you'd", "you'll", "you're", "you've", "your", "yours", "yeah", "yes", "ok", "okay", "oh", "one",
    "go", "going", "want",
}

# Screenshot words (and their canonical roots/contractions) excluded from Top Words
# (Participant names + abbooo are explicitly protected and NOT excluded.)
EXCLUDED_TOP_WORDS = {
    "na", "naa", "ha", "haa", "ani", "anii", "ah", "ahh", "oh", "ohh",
    "only", "know", "tell", "see", "told",
    "u're", "ure", "you're", "youre", "didn't", "didnt",
    "u'll", "ull", "you'll", "youll", "u'l", "i'l", "abt", "okay", "ok", "also",
    "don't", "dont", "can't", "cant", "won't", "wont", "i'm", "im",
    "i've", "ive", "i'd", "id", "i'll", "ill", "that's", "thats",
    "it's", "its", "he's", "hes", "she's", "shes", "we're", "we'll", "they're", "they'll",
    "is", "am", "are", "was", "were", "the", "and", "but", "not",
    "yeah", "yea", "yep", "nope", "nah", "hmm", "hmmm", "umm", "uhh",
}

# Roots that legitimately end in double identical letters
VALID_DOUBLE_ENDINGS = {
    "all", "ball", "call", "fall", "hall", "mall", "small", "tall", "wall",
    "bell", "cell", "fell", "hell", "sell", "shell", "smell", "spell", "tell", "well", "yell",
    "bill", "chill", "drill", "fill", "grill", "hill", "ill", "kill", "mill", "pill", "skill", "spill", "still", "till", "will",
    "doll", "poll", "roll", "scroll", "toll", "bull", "dull", "full", "null", "pull", "skull",
    "ass", "bass", "brass", "class", "glass", "grass", "mass", "pass",
    "less", "bless", "chess", "dress", "guess", "mess", "press", "stress",
    "bliss", "hiss", "kiss", "miss", "boss", "cross", "floss", "gloss", "loss", "moss", "toss",
    "bus", "fuss", "plus",
    "bee", "fee", "flee", "free", "gee", "knee", "see", "tee", "three", "tree", "agree", "coffee", "degree", "guarantee", "pee", "wee",
    "boo", "coo", "goo", "moo", "shoo", "too", "woo", "zoo",
    "off", "buff", "cuff", "fluff", "puff", "sniff", "staff", "stiff", "stuff", "cliff",
    "add", "odd", "egg", "inn", "err", "purr", "buzz", "fuzz", "jazz", "quiz",
}

# ---------------------------------------------------------------------------
# Lexical Canonicalization & UAX-29 Emoji Extraction
# ---------------------------------------------------------------------------

def normalize_quotes(text: str) -> str:
    return text.replace("\u2019", "'").replace("\u2018", "'").replace("\u201c", '"').replace("\u201d", '"')


def word_skeleton(w: str) -> str:
    return SKELETON_RE.sub(r"\1", w)


def extract_participant_tokens(senders: Sequence[str]) -> Tuple[set[str], Dict[str, str]]:
    """Dynamically extract lowercase participant name tokens and their stretch skeletons."""
    tokens: set[str] = set()
    skel_map: Dict[str, str] = {}
    for s in senders:
        for part in re.split(r"[^a-zA-Z]+", s):
            tok = part.lower().strip("'")
            if len(tok) >= 3 and tok not in STOPWORDS and tok not in EXCLUDED_TOP_WORDS:
                tokens.add(tok)
                skel = word_skeleton(tok)
                if len(skel) >= 3 and skel not in skel_map:
                    skel_map[skel] = tok
    return tokens, skel_map


def canonicalize_word(
    raw_word: str,
    participant_tokens: Optional[set[str]] = None,
    participant_skel_map: Optional[Dict[str, str]] = None,
) -> str:
    """Collapse expressive character repetitions back to the core word."""
    w = normalize_quotes(raw_word.lower()).strip("'")
    if not w:
        return ""

    # 1. Exact or stretched participant name match (generalized for any chat)
    if participant_tokens and w in participant_tokens:
        return w
    if participant_skel_map:
        skel = word_skeleton(w)
        if skel in participant_skel_map:
            return participant_skel_map[skel]

    # 2. Exaggerated exclamation family: abbooo / abbboooo / abbbbooooo -> abbooo
    if ABBO_RE.match(w):
        return "abbooo"

    # 3. Collapse internal runs of 3+ identical letters down to 2 (e.g. misssss -> miss, lusssuuuu -> lussuu)
    collapsed = CHAR_STRETCH_RE.sub(r"\1\1", w)
    if collapsed.endswith("'ll"):
        return collapsed

    # 4. Collapse repeated trailing letter (e.g. onlyy -> only, okayy -> okay, lussuu -> lussu)
    m = TRAILING_REPEAT_RE.search(collapsed)
    if m:
        ch = m.group(1)
        base = collapsed[: m.start()]
        stem2 = base + ch + ch
        stem1 = base + ch
        if stem2 in VALID_DOUBLE_ENDINGS:
            collapsed = stem2
        elif len(stem1) >= 2:
            collapsed = stem1

    return collapsed


def extract_emojis(text: str) -> List[str]:
    """Extract UAX #29 grapheme-cluster emojis with skin-tone deduplication and ZWJ preservation."""
    if not text:
        return []
    out: List[str] = []
    if uregex is not None:
        for g in uregex.findall(r"\X", text):
            # Must contain an Extended_Pictographic char, exclude standalone skin tones & ©®™
            if any(c in SKIN_TONES for c in g) and len(g) == 1:
                continue
            if uregex.search(r"\p{Extended_Pictographic}", g) and g not in {"©", "®", "™", "©️", "®️", "™️"}:
                norm = BMP_HEART_NORMALIZE.get(g, g)
                out.append(norm)
    else:
        for g in FALLBACK_EMOJI_RE.findall(text):
            if g not in SKIN_TONES:
                out.append(BMP_HEART_NORMALIZE.get(g, g))
    return out


# ---------------------------------------------------------------------------
# True Question Detector (URL-stripped + unpunctuated syntax frames)
# ---------------------------------------------------------------------------

UNPUNCTUATED_Q_RE = re.compile(
    r"^(?:what|where|when|why|who|whom|whose|which|how|did|do|does|are|is|was|were|"
    r"will|would|can|could|should|shall|have|has|wanna|wyd|wya|hru)\s+"
    r"(?:u|ur|you|your|we|they|he|she|it|is|are|did|do|was|were|happened|going|doing|time)\b",
    re.IGNORECASE,
)


def is_question_message(text: str) -> bool:
    """Detect real questions while ignoring URL query strings and bare ??? bursts."""
    if not text:
        return False
    clean = URL_RE.sub(" ", text).strip()
    if not clean:
        return False
    if "?" in clean:
        # Ensure at least one >=2-letter alphabetic word (not bare "???" noise)
        return bool(re.search(r"[a-zA-Z]{2,}", clean))
    words = clean.split()
    if 2 <= len(words) <= 18 and UNPUNCTUATED_Q_RE.match(clean):
        return True
    return False


# ---------------------------------------------------------------------------
# Conversation Segmentation: Bye / Byee / Byeee... Farewell-Cluster Engine
# ---------------------------------------------------------------------------

BYE_RE = re.compile(r"\bb+y+e+\b", re.IGNORECASE)
NARRATIVE_BYE_RE = re.compile(r"\b(?:said|told|saying|say|says|waved)\s+b+y+e+\s+to\b", re.IGNORECASE)
SIGNOFF_FOLLOWUP_RE = re.compile(
    r"\b(?:b+y+e+|g+n+|good\s*night|nighty+|sweet\s*dreams|sleep\s*(?:well|tight)|"
    r"t+c+|take\s*care|love\s*(?:u+|you+)|lub\s*(?:u+|you+)|c+y+a+|see\s*(?:ya|u|you)\s*(?:tmrw|tomorrow|soon|later)?|ttyl)\b",
    re.IGNORECASE,
)
FAREWELL_GRACE_SEC = 300  # 5 minutes to absorb reciprocal Bye / Gn / Heart replies


def is_farewell_trigger(m: Any, next_msg: Optional[Any]) -> bool:
    if m.kind != "text":
        return False
    if not BYE_RE.search(m.text):
        return False
    if m.words > 10 and NARRATIVE_BYE_RE.search(m.text):
        if next_msg is not None and (next_msg.dt - m.dt).total_seconds() <= 90 and not BYE_RE.search(next_msg.text):
            return False
    return True


def is_signoff_followup(m: Any) -> bool:
    if m.kind == "media":
        return True
    if m.kind != "text":
        return False
    if BYE_RE.search(m.text):
        return True
    if m.words <= 8 and SIGNOFF_FOLLOWUP_RE.search(m.text):
        return True
    # Emoji-only / short affectionate punctuation sign-off
    no_alpha = re.sub(r"[a-zA-Z0-9\s]+", "", m.text)
    if m.words <= 2 and len(no_alpha) > 0 and len(m.text) <= 16:
        return True
    return False


def segment_conversations(msgs: Sequence[Any], reply_cap_s: float) -> Dict[str, Any]:
    """
    Segment conversations using the 'Bye / Byee / Byeee...' farewell-cluster rule.
    Also computes Hawkes-inspired active chat hours and turn-level reply latencies.
    """
    if not msgs:
        return {}

    starters: Counter = Counter()
    enders: Counter = Counter()
    bursts: Dict[str, List[int]] = defaultdict(list)
    replies: Dict[str, List[float]] = defaultdict(list)
    turn_prompt_replies: Dict[str, List[float]] = defaultdict(list)
    conv_boundaries: List[int] = [0]  # indices where each conversation starts

    in_farewell = False
    burst = 0
    prev = None
    turn_start_dt = msgs[0].dt
    active_chat_secs = 0.0

    n = len(msgs)
    for i, m in enumerate(msgs):
        compose_sec = 4.0 if m.kind != "text" else min(25.0, max(3.0, len(m.text) / 14.0))
        active_chat_secs += compose_sec

        nxt = msgs[i + 1] if i + 1 < n else None
        if prev is None:
            starters[m.sender] += 1
            burst = 1
            turn_start_dt = m.dt
        else:
            gap = (m.dt - prev.dt).total_seconds()
            # Hawkes-inspired live presence time
            if 0 <= gap <= 600:
                active_chat_secs += max(0.0, gap - compose_sec)
            elif 600 < gap <= 1800:
                active_chat_secs += 300.0 * math.exp(-(gap - 600.0) / 600.0)

            new_conv = False
            if in_farewell:
                if gap <= FAREWELL_GRACE_SEC and is_signoff_followup(m):
                    # Stay in current farewell closing cluster
                    pass
                else:
                    new_conv = True
                    in_farewell = False

            if new_conv:
                enders[prev.sender] += 1
                bursts[prev.sender].append(burst)
                starters[m.sender] += 1
                burst = 1
                turn_start_dt = m.dt
                conv_boundaries.append(i)
            else:
                if m.sender != prev.sender:
                    if 0 <= gap <= reply_cap_s:
                        replies[m.sender].append(gap)
                        prompt_gap = min(reply_cap_s, max(0.0, (m.dt - turn_start_dt).total_seconds()))
                        turn_prompt_replies[m.sender].append(prompt_gap)
                    bursts[prev.sender].append(burst)
                    burst = 1
                    turn_start_dt = m.dt
                else:
                    burst += 1

        if is_farewell_trigger(m, nxt):
            in_farewell = True
        prev = m

    if prev is not None:
        enders[prev.sender] += 1
        bursts[prev.sender].append(burst)

    return {
        "starters": starters,
        "enders": enders,
        "bursts": bursts,
        "replies": replies,
        "turn_prompt_replies": turn_prompt_replies,
        "total_conversations": len(conv_boundaries),
        "conv_boundaries": conv_boundaries,
        "total_chat_hours": active_chat_secs / 3600.0,
    }


# ---------------------------------------------------------------------------
# Discourse, Flirt, Apologies, Intimacy, Photo, Meet/Miss-You, Fun Engines
# ---------------------------------------------------------------------------

LAUGH_EMOJI_SET = {"😂", "🤣", "💀", "😹", "😝", "😜", "😅", "😁"}
SHY_FLIRT_EMOJIS = {"🫠", "😶‍🌫️", "😶‍🌫", "🫣", "🙃", "🤭"}
FLIRT_EMOJI_SET = SHY_FLIRT_EMOJIS | {
    "😘", "😍", "🥰", "🥵", "🙈", "💋", "❤️‍🔥", "🫶", "💕", "💖", "💘", "💓", "💞", "❤️", "♥️", "🔥", "🥺", "😳", "🥹",
}
FLUSTER_REACTION_EMOJIS = SHY_FLIRT_EMOJIS | {
    "🙈", "😳", "🥺", "🥰", "🥹", "😘", "😍", "❤️", "💖", "🫶", "💕",
}
ARG_DOWN_EMOJI_SET = {"😠", "😡", "🤬", "💔"}
MOCK_INDIGNATION_EMOJIS = {"😤", "😒", "🙄", "😑", "🤨", "🤦", "🤦‍♀️", "🤦🏻‍♀️", "🤦‍♂️", "🤦🏻‍♂️"}

FLIRT_LEX_RE = re.compile(
    r"\b(?:cute+|cutie+|cutest|adorable|pretty|prettiest|gorgeous|beautiful|handsome|hot+|hottie|sexy+|"
    r"stunning|attractive|crush(?:ing)?|flirt(?:ing)?|butterflies|blush(?:ing)?|shy+|"
    r"kutt+[iy]\s*ponn+u+|babe+|baby+|sweetheart|darling|honey|jaan+u*|shona+|chinnu|muddu|pookie|wifey|hubby|loml|"
    r"love\s+(?:u+|you+)|luv\s+(?:u+|you+)|kiss(?:es|ing)?|hug+|cuddle+|hold\s+me|"
    r"lift\s+(?:u|you|me)|carry\s+(?:u|you|me)|(?:ur|your)\s+(?:eyes|voice|smile|lips|laugh|hair|face)|"
    r"look(?:ing)?\s+(?:into|in)\s+(?:ur|your)\s+eyes|mine|yours|dream(?:ing)?\s+(?:of|about)\s+(?:u|you)|"
    r"can'?t\s+stop\s+thinking|heart\s+beat(?:ing)?|make\s+me|come\s+here)\b",
    re.IGNORECASE,
)

TEASE_LEX_RE = re.compile(
    r"\b(?:luss+u+|pagal+|mad|mental|psycho|idiot|stupid|dumb+|dumbo|drama\s*queen|cry\s*baby|"
    r"clown|joker|weirdo|nerd|dork|shorty|chotu|mote|fatty|lazy|sleepyhead|monkey|donkey|bullshit|bs|"
    r"shut\s*up|shutup|overacting|nautanki|roast|teas(?:e|ing)|kidding|joking|jk|jk+|sarcasm|"
    r"haha+|hehe+|hihi+|lmao+|lmfao+|rofl+|lolz?)\b",
    re.IGNORECASE,
)

LAUGH_REACT_RE = re.compile(r"\b(?:haha+|hehe+|lmao+|lmfao+|rofl+|lol+|ded+|dying)\b", re.IGNORECASE)

ARG_LEX_RE = re.compile(
    r"\b(?:whatever|leave\s+it|forget\s+it|don'?t\s+talk|stop\s+talking|don'?t\s+text|"
    r"i'?m\s+done|im\s+done|fed\s+up|sick\s+of|tired\s+of|you\s+always|you\s+never|u\s+always|u\s+never|"
    r"your\s+fault|ur\s+fault|blam(?:e|ing)|hurt\s+(?:me|my)|pissed|angry|mad\s+at\s+(?:u|you)|"
    r"annoyed|irritated|disappointed|ignore|ignoring|shut\s+the\s+fuck|fuck\s+off|go\s+away|"
    r"argue|arguing|argument|fight(?:ing)?|overthink(?:ing)?|never\s+listen|don'?t\s+care)\b",
    re.IGNORECASE,
)
ARG_STRONG_RE = re.compile(
    r"\b(?:whatever|leave\s+it|forget\s+it|don'?t\s+talk\s+to\s+me|stop\s+talking|i'?m\s+done|im\s+done|"
    r"you\s+always|you\s+never|u\s+always|u\s+never|your\s+fault|ur\s+fault|hurt\s+me|pissed\s+off|"
    r"angry\s+with|mad\s+at\s+(?:u|you)|fed\s+up|sick\s+of\s+this|why\s+did\s+you\s+do|didn'?t\s+expect\s+this|"
    r"not\s+in\s+the\s+mood|leave\s+me\s+alone|stop\s+lying)\b",
    re.IGNORECASE,
)

FACTS_INFO_RE = re.compile(
    r"\b(?:exam|test|class|lecture|college|campus|university|assignment|homework|project|lab|viva|marks|"
    r"result|grade|cgpa|syllabus|notes|pdf|doc|file|slide|ppt|code|bug|error|server|github|api|python|"
    r"office|meeting|client|deadline|salary|interview|resume|cv|internship|"
    r"train|bus|flight|metro|cab|uber|ola|ticket|booking|platform|station|airport|route|map|location|"
    r"hospital|doctor|medicine|tablet|fever|clinic|pharmacy|bank|upi|gpay|paytm|account|otp|password|"
    r"price|cost|rs|rupees|inr|usd|percent|km|minutes|hours|pm|am|monday|tuesday|wednesday|thursday|friday|saturday|sunday|"
    r"timetable|schedule|calendar|link|zoom|teams|sir|hod|mam|ma'am|maam|professor)\b",
    re.IGNORECASE,
)

NORMAL_CHECKIN_RE = re.compile(
    r"\b(?:ate|eat(?:ing)?|had\s+(?:lunch|dinner|breakfast)|lunch|dinner|breakfast|snacks|"
    r"sleep(?:ing)?|slept|woke\s+up|wake\s+up|reached|home|bath|shower|ready|came\s+back|"
    r"mom|mum|dad|papa|amma|appa|sis|bro|family|friend|frnd|morning|gm|afternoon|evening|night|gn|"
    r"what\s+doing|wyd|doing\s+nothing|just\s+chilling|bored|hungry|tired|sleepy)\b",
    re.IGNORECASE,
)

# Apologies ("Sorry")
APOLOGY_RE = re.compile(r"\b(?:s+o+r+y+|s+r+y+|s+o+z+|apologi[sz](?:e|es|ed|ing)|my\s+bad|forgive\s+me|maaf)\b", re.IGNORECASE)
APOLOGY_SYMPATHY_NEG_RE = re.compile(
    r"\b(?:sorry\s+(?:to\s+hear|for\s+your\s+loss|about\s+(?:that|him|her|them|your\s+(?:friend|dog|cat|exam|dad|mom)))|"
    r"feel(?:ing)?\s+sorry\s+for)\b",
    re.IGNORECASE,
)

# Sensitive / Explicit classifier & Intimacy Tiers
SENSITIVE_EXPLICIT_RE = re.compile(
    r"\b(?:sex(?:y+)?|horny|naked|nude+s?|undress|strip|boob+s?|breast|nipple|thigh+s?|waist|collarbone|"
    r"neck\s+kiss|kiss\s+(?:ur|your)\s+(?:neck|lips|body|chest)|make\s*out|makeout|french\s+kiss|"
    r"bite\s+(?:u|you|ur|your)|lick|suck|moan(?:ing)?|turn(?:s|ed)?\s+me\s+on|turned\s+on|"
    r"cuddle\s+in\s+bed|in\s+bed\s+with|on\s+top\s+of|pin\s+(?:u|you)|choke|spank|"
    r"naughty|wild\s+thoughts|dirty\s+thoughts|fuck(?:ing)?\s+(?:u|you|me)|cock|dick|pussy|cum|orgasm)\b",
    re.IGNORECASE,
)

TIER4_SPICY_RE = re.compile(
    r"\b(?:sexy+|hot+|hottie|lips|neck|waist|bite\s+(?:u|you|ur)|make\s*out|makeout|"
    r"turn(?:s|ed)?\s+me\s+on|turned\s+on|in\s+bed|shirtless|pull\s+(?:u|you)\s+closer|"
    r"pin\s+(?:u|you)|breath(?:ing)?\s+heavy|craving\s+(?:u|you)|want\s+(?:u|you)\s+(?:so\s+)?bad|"
    r"naughty|tempting|tease\s+me|touch\s+(?:me|u|you)|kiss(?:ing)?\s+(?:ur|your)\s+(?:neck|lips|shoulder))\b",
    re.IGNORECASE,
)

TIER3_TENDER_RE = re.compile(
    r"\b(?:i\s+love\s+(?:u+|you+)|love\s+(?:u+|you+)\s+(?:so+\s+much|sm|more|forever|always)|"
    r"hug+|hugging|cuddle+|cuddling|hold\s+(?:ur|your)\s+hand|hold\s+me\s+tight|"
    r"lift\s+(?:u|you|me)|pick\s+(?:u|you|me)\s+up|carry\s+(?:u|you|me)|carried\s+(?:u|you|me)|"
    r"forehead\s+kiss|kiss\s+(?:ur|your)\s+(?:forehead|cheek|hand)|sleep\s+in\s+(?:ur|your)\s+arms|"
    r"rest\s+(?:my|ur|your)\s+head|chest|lap|never\s+let\s+(?:u|you)\s+go)\b",
    re.IGNORECASE,
)

TIER2_ROMANTIC_RE = re.compile(
    r"\b(?:kutt+[iy]\s*ponn+u+|babe+|baby+|sweetheart|darling|princess|handsome|jaan+u*|shona+|chinnu|muddu|bujji|pookie|loml|"
    r"look(?:ing)?\s+(?:into|in)\s+(?:ur|your|my)\s+eyes|(?:lost|drown(?:ing)?)\s+in\s+(?:ur|your)\s+eyes|"
    r"(?:ur|your)\s+(?:pretty|beautiful|deep|cute)?\s*eyes|eye\s+contact|"
    r"(?:ur|your)\s+(?:sweet|cute|soft|lovely|hot|deep)?\s*voice|hear(?:ing)?\s+(?:ur|your)\s+voice|"
    r"love\s+(?:ur|your)\s+voice|sleep\s+to\s+(?:ur|your)\s+voice|"
    r"butterflies|blush(?:ing)?|crush\s+on\s+(?:u|you)|fall(?:ing)?\s+for\s+(?:u|you)|my\s+(?:girl|boy|heart|world))\b",
    re.IGNORECASE,
)

TIER1_WARM_RE = re.compile(
    r"\b(?:cut+(?:ie+|e+|u+)|adorable|pretty|prettiest|cutest|sweetest|sweet\s+of\s+(?:u|you)|"
    r"(?:ur|your)\s+smile|love\s+talking\s+to\s+(?:u|you)|glad\s+i\s+met\s+(?:u|you)|"
    r"care\s+(?:about|for)\s+(?:u|you)|special\s+to\s+me)\b",
    re.IGNORECASE,
)

# Sensory & Physical Motifs (Requirement 6 + user comment)
SENSORY_MOTIFS = {
    "hugs_cuddles": ("Hugs & Cuddles", re.compile(r"\b(?:hug+|hugs+|hugging|cuddle+|cuddling|hold\s+me\s+tight|tight\s+hug|warm\s+hug|wrap\s+(?:my|ur|your)\s+arms)\b", re.IGNORECASE), re.compile(r"\bgroup\s+hug\b", re.IGNORECASE)),
    "lift_carry": ("Lift & Carry", re.compile(r"\b(?:lift\s+(?:u|you|me)(?:\s+up)?|pick\s+(?:u|you|me)\s+up|carry\s+(?:u|you|me)|carried\s+(?:u|you|me)|in\s+(?:my|ur|your)\s+arms)\b", re.IGNORECASE), None),
    "eyes_gaze": ("Looking Into Eyes", re.compile(r"\b(?:look(?:ing)?\s+(?:into|in)\s+(?:ur|your|my)\s+eyes|(?:lost|drown(?:ing)?)\s+in\s+(?:ur|your)\s+eyes|(?:ur|your)\s+(?:pretty|beautiful|deep|cute|gorgeous)?\s*eyes|eye\s+contact|star(?:e|ing)\s+at\s+(?:u|you))\b", re.IGNORECASE), re.compile(r"\b(?:roll(?:ing|ed)?\s+(?:my|ur|your)\s+eyes|eye\s+pain|eye\s+drops|dry\s+eyes)\b", re.IGNORECASE)),
    "voice_admiration": ("Voice Admiration", re.compile(r"\b(?:(?:ur|your)\s+(?:sweet|cute|soft|lovely|hot|deep|pretty|soothing)?\s*voice|hear(?:ing)?\s+(?:ur|your)\s+voice|love\s+(?:ur|your)\s+voice|miss\s+(?:ur|your)\s+voice|sleep\s+to\s+(?:ur|your)\s+voice)\b", re.IGNORECASE), re.compile(r"\bvoice\s+(?:message|note|call|mail)\b", re.IGNORECASE)),
    "cute_compliments": ("Cutee & Kutti Ponnu Compliments", re.compile(r"\b(?:cut+(?:ie+|e{2,}|u+)|so+\s+cute+|kutt+[iy]\s*ponn+u+|cutest|adorable)\b", re.IGNORECASE), None),
}

# Multi-word & Single-word Pet-Name Lexicon
NICKNAME_PATTERNS: List[Tuple[str, re.Pattern]] = [
    ("kutti ponnu", re.compile(r"\bkutt+[iy]\s*ponn+u+\b", re.IGNORECASE)),
    ("kutti paiyan", re.compile(r"\bkutt+[iy]\s*paiy+a+n+\b", re.IGNORECASE)),
    ("cutee / cutie", re.compile(r"\bcut+(?:ie+|e{2,}|u+)\b", re.IGNORECASE)),
    ("lussuuu", re.compile(r"\bluss+u+\b", re.IGNORECASE)),
    ("babe", re.compile(r"\bbab+e+s?\b", re.IGNORECASE)),
    ("baby", re.compile(r"\bbab+y+\b", re.IGNORECASE)),
    ("sweetheart", re.compile(r"\bsweet+\s*heart+\b", re.IGNORECASE)),
    ("honey", re.compile(r"\bhoney+\b", re.IGNORECASE)),
    ("darling", re.compile(r"\bdarling+\b", re.IGNORECASE)),
    ("princess", re.compile(r"\bprincess+\b", re.IGNORECASE)),
    ("handsome", re.compile(r"\bhandsome+\b", re.IGNORECASE)),
    ("pookie", re.compile(r"\bpook+ie+\b", re.IGNORECASE)),
    ("jaan / jaanu", re.compile(r"\bjaan+u*\b", re.IGNORECASE)),
    ("shona", re.compile(r"\bshona+\b", re.IGNORECASE)),
    ("chinnu", re.compile(r"\bchinn+u+\b", re.IGNORECASE)),
    ("muddu", re.compile(r"\bmudd+u+\b", re.IGNORECASE)),
    ("bujji", re.compile(r"\bbujj+i+\b", re.IGNORECASE)),
    ("chella / chellam", re.compile(r"\bchell+a+m?\b", re.IGNORECASE)),
    ("kanna / kannamma", re.compile(r"\bkann+a+(?:mma+)?\b", re.IGNORECASE)),
    ("kalla / kalli", re.compile(r"\bkall+[ai]+\b", re.IGNORECASE)),
    ("wifey", re.compile(r"\bwifey+\b", re.IGNORECASE)),
    ("hubby", re.compile(r"\bhubby+\b", re.IGNORECASE)),
    ("good boy", re.compile(r"\bgood\s+bo+y+\b", re.IGNORECASE)),
    ("good girl", re.compile(r"\bgood\s+gi+rl+\b", re.IGNORECASE)),
    ("my girl", re.compile(r"\bmy\s+gi+rl+\b", re.IGNORECASE)),
    ("my boy", re.compile(r"\bmy\s+bo+y+\b", re.IGNORECASE)),
    ("my love", re.compile(r"\bmy\s+lo+ve+\b", re.IGNORECASE)),
    ("loml", re.compile(r"\bloml\b", re.IGNORECASE)),
    ("drama queen", re.compile(r"\bdrama\s*queen\b", re.IGNORECASE)),
    ("crybaby", re.compile(r"\bcry\s*baby\b", re.IGNORECASE)),
    ("sunshine", re.compile(r"\bsunshine\b", re.IGNORECASE)),
]

STRICT_VOCATIVE_RE = re.compile(
    r"^(?:hey+|hi+|oi+|oy+|hello+|b+y+e+|g+n+|good\s*night|good\s*morning|g+m+|"
    r"miss\s+(?:u+|you+)|love\s+(?:u+|you+))\s+([a-z]{3,14})[!,.?]*$",
    re.IGNORECASE,
)
VOCATIVE_NON_NICKNAME = STOPWORDS | EXCLUDED_TOP_WORDS | {
    "bro", "bhai", "sis", "sister", "brother", "dude", "man", "guy", "guys", "sir", "mam", "maam",
    "mom", "mum", "mother", "dad", "father", "amma", "appa", "god", "lord", "friend", "frnd", "frnds", "friends",
    "day", "night", "morning", "evening", "afternoon", "time", "today", "tomorrow", "yesterday",
    "phone", "call", "text", "msg", "message", "life", "world", "heart", "soul", "head", "hand",
    "name", "work", "home", "room", "college", "class", "school", "food", "sleep", "water", "good", "bad",
    "one", "two", "thing", "stuff", "place", "way", "part", "side", "end", "back", "soon", "much",
    "more", "most", "very", "too", "also", "dear", "sweet", "new", "old", "big", "small", "long",
    "first", "last", "next", "same", "real", "true", "fine", "okay", "bye", "byee", "sorry", "thanks",
    "please", "pls", "plz", "photo", "pic", "video", "voice", "notes", "exam", "test", "year", "month",
    "wish", "brain", "parents", "teammate", "nidra", "luck", "fault", "turn", "own", "bed", "family",
    "eyes", "gem", "ears", "legs", "face", "hair", "akka", "anna", "chelli", "madam", "everyone",
    "there", "here", "again", "seriously", "senior", "junior", "unnava", "nijamma", "re", "ra", "da", "di", "po",
}

# Photo / Picture Request Intent (Requirement 7 — direct picture asks only)
PHOTO_DIRECT_RE = re.compile(
    r"\b(?:send|show|drop|share|give|click|take|upload|want|need|bhej|kaluhisu)\s+(?:me\s+|one\s+)?(?:a\s+|an\s+|one\s+|some\s+|ur\s+|your\s+|another\s+)?"
    r"(?:pic+s?|picz|piks|picture+s?|photo+s?|selfie+s?|snap+s?|fit\s*check)\b|"
    r"\b(?:one|another|new|a)\s+(?:pic+s?|picz|piks|picture+s?|photo+s?|selfie+s?)\s*(?:pls|please|plz|na+|fast|rn|now|send)?\b|"
    r"\b(?:(?:ur|your)\s+)?(?:pic+s?|picz|piks|picture+s?|photo+s?|selfie+s?)\s+(?:pls|please|plz|send|fast|rn|now)\b|"
    r"\bfit\s*check\b",
    re.IGNORECASE,
)
PHOTO_VISUAL_RE = re.compile(
    r"\b(?:(?:i\s+)?(?:want\s+to|wanna|lemme|let\s+me|need\s+to|dying\s+to)\s+see\s+"
    r"(?:u+|you+|ur\s+face|your\s+face|how\s+(?:u|you)\s+look|ur\s+(?:outfit|dress|fit|hair|smile|look)|your\s+(?:outfit|dress|fit|hair|smile|look))|"
    r"show\s+(?:me\s+)?(?:how\s+(?:u|you)\s+look|(?:ur|your)\s+(?:face|outfit|dress|fit|hair|look|selfie|smile)|yourself)|"
    r"how\s+do\s+(?:u|you)\s+look\s+(?:rn|right\s+now|today|in\s+(?:it|that)))\b",
    re.IGNORECASE,
)
PHOTO_ELLIPSIS_RE = re.compile(r"\b(?:show+|pic+s?|picz|piks|photo+s?|selfie+s?)\b", re.IGNORECASE)
PHOTO_APPEARANCE_CTX_RE = re.compile(
    r"\b(?:got\s+ready|getting\s+ready|dressed\s+up|wore|wearing|new\s+(?:dress|shirt|top|kurti|saree|outfit|haircut|hair|specs)|"
    r"shaved|trimmed|salon|parlour|makeup|mirror|ready\s+for|look(?:ing)?\s+(?:good|cute|nice|hot))\b",
    re.IGNORECASE,
)
PHOTO_HARD_NEG_RE = re.compile(
    r"\b(?:(?:pic+|pics|picture|photo+|image|snap|screenshot)\s+of\s+(?:the|this|that|my|a|an|ur|your)?\s*"
    r"(?:notes|book|page|screen|laptop|monitor|pc|code|error|bug|question|qsn|paper|answer|marks|timetable|schedule|"
    r"food|plate|dish|lunch|dinner|breakfast|coffee|tea|cat|dog|pet|room|desk|sky|moon|clouds|sunset|car|bike|"
    r"bill|receipt|id|card|ticket|qr|form|document|doc|pdf|assignment|slide|board|ppt))\b|"
    r"\bscreenshot\b",
    re.IGNORECASE,
)
INPERSON_MEET_TIME_RE = re.compile(
    r"\bsee\s+(?:u+|you+)\s+(?:tomorrow|tmrw|tonight|soon|later|on\s+\w+day|next\s+week|this\s+weekend|"
    r"in\s+(?:college|class|campus|person|evening|morning|person)|there|at\s+\d)\b",
    re.IGNORECASE,
)
PHOTO_SHY_REFUSAL_RE = re.compile(
    r"\b(?:messy|ugly|no\s+makeup|after\s+bath|looking\s+bad|wait+|later|tomorrow|nooo+|shyyy)\b",
    re.IGNORECASE,
)

# Miss You & Meet Desire (Requirement 8)
MISS_YOU_RE = re.compile(
    r"\b(?:miss+|missing|missed)\s+(?:(?:seeing|talking\s+to|hearing|hugging|cuddling|meeting)\s+)?"
    r"(?:u+|you+|ur\s+(?:voice|face|hugs?|presence|smile|cuddles?|scent|lap)|"
    r"your\s+(?:voice|face|hugs?|presence|smile|cuddles?|scent|lap))\b|"
    r"\bwish\s+(?:u|you)\s+were\s+here\b|\bfeeling\s+(?:ur|your)\s+absence\b|\bcome\s+back\s+soon\b",
    re.IGNORECASE,
)
MISS_YOU_NEG_RE = re.compile(
    r"\b(?:missed\s+(?:call|voice|video|the|my|our|class|bus|train|exam|lecture|deadline|chance|point)|"
    r"don'?t\s+miss\s+(?:it|out|the|this)|miss\s+(?:the|my|our|this|that)\s+(?:class|bus|train|exam|call|lecture))\b",
    re.IGNORECASE,
)
MEET_DESIRE_RE = re.compile(
    r"\b(?:(?:want\s+to|wanna|let'?s|lets|can'?t\s+wait\s+to|dying\s+to|need\s+to|eager\s+to|"
    r"when\s+(?:will|can|do|are|shall)\s+we|when\s+(?:am\s+i|r\s+we)\s+going\s+to)\s+"
    r"(?:meet(?:\s+up)?|see\s+(?:u+|you+)|hang\s*out|go\s+out|go\s+on\s+a\s+date|hug\s+(?:u+|you+))|"
    r"come\s+(?:meet\s+me|over|here\s+rn|see\s+me)|"
    r"(?:i\s+)?(?:want\s+to|wanna)\s+see\s+(?:u+|you+)\s+(?:tomorrow|tmrw|soon|this\s+week|this\s+weekend|in\s+person|on\s+\w+day)|"
    r"miss(?:ing)?\s+meeting\s+(?:u+|you+)|wanna\s+hang\s*out)\b",
    re.IGNORECASE,
)
MEET_NEG_RE = re.compile(
    r"\b(?:google\s+meet|zoom\s+meet|teams\s+meet|team\s+meet(?:ing)?|parents?\s+meet(?:ing)?|"
    r"staff\s+meet(?:ing)?|client\s+meet(?:ing)?|meet(?:ing)?\s+with\s+(?:sir|mam|ma'am|maam|hod|prof|manager|doctor)|"
    r"nice\s+to\s+meet|pleased\s+to\s+meet)\b",
    re.IGNORECASE,
)

# Pennebaker's Language Style Matching (LSM) function word categories
LSM_CATEGORIES = {
    "ppron": {"i", "me", "my", "mine", "you", "u", "ur", "your", "yours", "we", "us", "our", "ours", "he", "him", "his", "she", "her", "hers", "they", "them", "their"},
    "ipron": {"it", "its", "this", "that", "these", "those", "something", "anything", "nothing", "everything", "someone", "anyone", "everyone", "what", "which", "who"},
    "article": {"a", "an", "the"},
    "prep": {"to", "of", "in", "for", "on", "with", "at", "by", "from", "up", "about", "into", "over", "after", "under", "between", "through", "without", "before"},
    "auxverb": {"is", "am", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did", "will", "would", "can", "could", "should", "may", "might", "must"},
    "negate": {"no", "not", "never", "neither", "nor", "nothing", "none", "don't", "dont", "didn't", "didnt", "can't", "cant", "won't", "wont", "isn't", "wasn't", "aren't", "na", "nah"},
    "conj": {"and", "but", "or", "so", "because", "if", "while", "although", "though", "unless", "until", "since", "yet", "nor"},
    "adverb": {"very", "really", "just", "so", "too", "also", "only", "even", "still", "already", "always", "never", "often", "sometimes", "here", "there", "now", "then", "soon"},
    "interrog": {"what", "when", "where", "why", "who", "whom", "whose", "which", "how"},
}


# ---------------------------------------------------------------------------
# Optional Local Neural Transformer Prototype Scorer (PyTorch CUDA / CPU)
# ---------------------------------------------------------------------------

DISCOURSE_LABELS = ["flirting", "teasing", "arguments", "facts_info", "normal"]

DISCOURSE_PROTOTYPES = {
    "flirting": [
        "you look so gorgeous and cute today i cannot stop thinking about you",
        "looking into your eyes and hearing your sweet voice gives me butterflies",
        "come here let me hug you tight lift you up and kiss your forehead",
        "i want to cuddle with you all night my kutti ponnu sweetheart",
        "stop being this hot and charming you make me blush every single time",
    ],
    "teasing": [
        "haha you are such a clumsy drama queen crybaby lussu idiot lol",
        "omg look at this clown acting smart again lmao stop roasting yourself",
        "you wish you were that tall shorty keep dreaming hahaha",
        "shut up dummy you fell for that prank so easily haha",
    ],
    "arguments": [
        "you never listen to what i say and always blame me for everything",
        "leave it forget it i am done talking right now you hurt my feelings",
        "why did you lie to me i am genuinely angry and disappointed in you",
        "stop ignoring my messages whatever do what you want i do not care",
    ],
    "facts_info": [
        "the exam timetable and assignment submission deadline is tomorrow at 10 am",
        "take the metro to the station and send me the pdf document on email",
        "here is the link to the python code repository and server api documentation",
        "the doctor prescribed this medicine and the ticket price is five hundred rupees",
    ],
    "normal": [
        "hey good morning did you eat breakfast yet what are you doing right now",
        "just reached home safely going to take a bath and sleep early tonight",
        "talked to mom and dad today everything at home is going fine",
        "okay let me know once you finish dinner and wake up tomorrow",
    ],
}

INTENT_PROTOTYPES = {
    "photo_pos": [
        "send me a selfie or picture of yourself i want to see how you look right now",
        "drop a fit check photo show me your new dress haircut and cute smile",
        "i miss your face please send one pic of you right now",
    ],
    "photo_neg": [
        "send a photo or screenshot of the lecture notes textbook page and timetable",
        "let me see the error code screenshot and assignment pdf document",
        "i will see you tomorrow morning in college campus in person",
    ],
    "miss_pos": [
        "i am missing you so much right now i wish you were here with me",
        "i miss your warm hugs your voice and having you around me",
    ],
    "miss_neg": [
        "i missed your voice call and missed the morning bus to college",
        "do not miss the assignment deadline or the lecture tomorrow",
    ],
    "meet_pos": [
        "i really want to meet you soon let us go out on a date this weekend",
        "when will i see you in person i cannot wait to meet up and hug you",
    ],
    "meet_neg": [
        "join the google meet link for the team project meeting with professor sir",
        "it was nice to meet your colleague at the office meeting today",
    ],
}


class SmartCascadeEmbedder:
    """Local GPU/CPU dense semantic verifier using HuggingFace Transformers."""

    def __init__(self, model_name: str = "sentence-transformers/all-MiniLM-L6-v2", cache_dir: Optional[Path] = None):
        self.model_name = model_name
        self.cache_dir = cache_dir
        self.available = False
        self.device = "cpu"
        self._torch = None
        self._tokenizer = None
        self._model = None
        self._np = None
        self._cache: Dict[str, Any] = {}
        self._proto_vecs: Dict[str, Any] = {}

    def _init_model(self) -> bool:
        if self.available:
            return True
        try:
            import numpy as np
            import torch
            from transformers import AutoModel, AutoTokenizer

            self._np = np
            self._torch = torch
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
            self._tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            self._model = AutoModel.from_pretrained(self.model_name)
            if self.device == "cuda":
                self._model = self._model.half()
            self._model.to(self.device)
            self._model.eval()
            self._load_disk_cache()
            self._build_prototypes()
            self.available = True
            return True
        except Exception:
            self.available = False
            return False

    def _cache_file(self) -> Optional[Path]:
        if not self.cache_dir:
            return None
        return self.cache_dir / "emb_cache_v1.npz"

    def _load_disk_cache(self) -> None:
        cf = self._cache_file()
        if cf and cf.exists():
            try:
                data = self._np.load(cf, allow_pickle=False)
                keys = data["keys"]
                vecs = data["vecs"]
                for k, v in zip(keys, vecs):
                    self._cache[str(k)] = v
            except Exception:
                self._cache.clear()

    def _save_disk_cache(self) -> None:
        cf = self._cache_file()
        if not cf or not self._cache:
            return
        try:
            cf.parent.mkdir(parents=True, exist_ok=True)
            # Cap disk cache size at 50k hashed vectors to stay lightweight
            items = list(self._cache.items())[-50000:]
            keys = self._np.array([k for k, _ in items])
            vecs = self._np.stack([v.astype(self._np.float16) for _, v in items])
            self._np.savez(cf, keys=keys, vecs=vecs)
        except Exception:
            pass

    def encode_texts(self, texts: Sequence[str], batch_size: int = 256) -> Any:
        np = self._np
        torch = self._torch
        hashes = [hashlib.sha256(t.encode("utf-8", errors="ignore")).hexdigest()[:24] for t in texts]
        missing_idx = [i for i, h in enumerate(hashes) if h not in self._cache]
        if missing_idx:
            unique_missing: Dict[str, str] = {}
            for i in missing_idx:
                unique_missing.setdefault(hashes[i], texts[i])
            m_items = list(unique_missing.items())
            for start in range(0, len(m_items), batch_size):
                chunk = m_items[start : start + batch_size]
                batch_texts = [t for _, t in chunk]
                enc = self._tokenizer(
                    batch_texts, padding=True, truncation=True, max_length=96, return_tensors="pt"
                )
                enc = {k: v.to(self.device) for k, v in enc.items()}
                with torch.no_grad():
                    out = self._model(**enc)
                    mask = enc["attention_mask"].unsqueeze(-1).expand(out.last_hidden_state.size()).float()
                    summed = torch.sum(out.last_hidden_state.float() * mask, dim=1)
                    counts = torch.clamp(mask.sum(dim=1), min=1e-9)
                    emb = torch.nn.functional.normalize(summed / counts, p=2, dim=1)
                    arr = emb.cpu().numpy().astype(np.float16)
                for (h, _), v in zip(chunk, arr):
                    self._cache[h] = v
            self._save_disk_cache()
        return np.stack([self._cache[h].astype(np.float32) for h in hashes])

    def _build_prototypes(self) -> None:
        np = self._np
        for lbl, sents in DISCOURSE_PROTOTYPES.items():
            vecs = self.encode_texts(sents, batch_size=32)
            mean_v = vecs.mean(axis=0)
            self._proto_vecs[f"disc_{lbl}"] = mean_v / (np.linalg.norm(mean_v) + 1e-9)
        for key, sents in INTENT_PROTOTYPES.items():
            vecs = self.encode_texts(sents, batch_size=32)
            mean_v = vecs.mean(axis=0)
            self._proto_vecs[f"intent_{key}"] = mean_v / (np.linalg.norm(mean_v) + 1e-9)

    def score_discourse_batch(self, texts: Sequence[str]) -> List[Dict[str, float]]:
        if not texts or not self._init_model():
            return []
        np = self._np
        vecs = self.encode_texts(texts)
        proto_mat = np.stack([self._proto_vecs[f"disc_{lbl}"] for lbl in DISCOURSE_LABELS])  # (5, D)
        sims = vecs @ proto_mat.T  # cosine similarities
        # Softmax with temperature 0.12 for calibrated probabilities
        scaled = (sims - sims.max(axis=1, keepdims=True)) / 0.12
        exps = np.exp(scaled)
        probs = exps / exps.sum(axis=1, keepdims=True)
        out = []
        for row in probs:
            out.append({lbl: float(row[j]) for j, lbl in enumerate(DISCOURSE_LABELS)})
        return out

    def intent_margin_batch(self, texts: Sequence[str], intent_key: str) -> List[float]:
        """Compute cos(text, pos_proto) - 0.65 * cos(text, hard_neg_proto)."""
        if not texts or not self._init_model():
            return []
        vecs = self.encode_texts(texts)
        pos_v = self._proto_vecs[f"intent_{intent_key}_pos"]
        neg_v = self._proto_vecs[f"intent_{intent_key}_neg"]
        margins = (vecs @ pos_v) - 0.65 * (vecs @ neg_v)
        return [float(x) for x in margins]


# ---------------------------------------------------------------------------
# Pragmatic Discourse, Flirt, Sorry, Intimacy, Intent & Fun Orchestrator
# ---------------------------------------------------------------------------

def _fmt_date_display(dt: datetime) -> str:
    return dt.strftime("%d %b %Y")


def _fmt_time_display(dt: datetime) -> str:
    return dt.strftime("%I:%M %p").lstrip("0")


def _safe_preview(text: str, max_len: int = 160) -> str:
    flat = " ".join(text.split())
    return flat if len(flat) <= max_len else flat[: max_len - 1] + "…"


def is_sensitive_message(text: str, tier: int = 0) -> bool:
    return tier >= 4 or bool(SENSITIVE_EXPLICIT_RE.search(text))


def is_substantive_longest(text: str, words: int) -> Tuple[bool, int]:
    """Filter out single-letter / repeated-token spam for Longest Message records."""
    toks = re.findall(r"[a-zA-Z]{2,}", text.lower())
    uniq = len(set(toks))
    if words <= 15:
        return (uniq >= max(1, int(words * 0.5))), uniq
    if uniq < 15:
        return False, uniq
    div = uniq / max(1, words)
    top_cnt = Counter(toks).most_common(1)[0][1] if toks else words
    return (div >= 0.25 and (top_cnt / max(1, words)) <= 0.35), uniq


def _compute_mattr(tokens: Sequence[str], window: int = 50) -> float:
    """Length-invariant Moving-Average Type-Token Ratio (0..1)."""
    if not tokens:
        return 0.0
    if len(tokens) <= window:
        return len(set(tokens)) / len(tokens)
    freq: Counter = Counter(tokens[:window])
    ttr_sum = len(freq) / window
    steps = 1
    for idx in range(window, len(tokens)):
        out_t = tokens[idx - window]
        freq[out_t] -= 1
        if freq[out_t] == 0:
            del freq[out_t]
        freq[tokens[idx]] += 1
        ttr_sum += len(freq) / window
        steps += 1
    return ttr_sum / steps


def _has_mock_indignation_emoji(emojis: Sequence[str]) -> bool:
    return any(e in MOCK_INDIGNATION_EMOJIS or e.startswith("🤦") for e in emojis)


def _score_pragmatic_discourse(m: Any, emojis: List[str], low: str, period_rate_sender: float) -> Dict[str, float]:
    """Compute raw unnormalized pragmatic scores for the 5 discourse categories."""
    scores = {"flirting": 0.0, "teasing": 0.0, "arguments": 0.0, "facts_info": 0.0, "normal": 0.90}

    has_laugh_emoji = any(e in LAUGH_EMOJI_SET for e in emojis)
    has_laugh_text = bool(LAUGH_REACT_RE.search(low))
    has_laugh = has_laugh_emoji or has_laugh_text
    shy_flirt_cnt = sum(1 for e in emojis if e in SHY_FLIRT_EMOJIS)
    classic_flirt_cnt = sum(1 for e in emojis if (e in FLIRT_EMOJI_SET and e not in SHY_FLIRT_EMOJIS))
    arg_emo_cnt = sum(1 for e in emojis if e in ARG_DOWN_EMOJI_SET)
    mock_mad_cnt = sum(1 for e in emojis if e in MOCK_INDIGNATION_EMOJIS or e.startswith("🤦"))

    flirt_hits = len(FLIRT_LEX_RE.findall(low))
    tease_hits = len(TEASE_LEX_RE.findall(low))
    arg_strong = len(ARG_STRONG_RE.findall(low))
    arg_hits = len(ARG_LEX_RE.findall(low))
    fact_hits = len(FACTS_INFO_RE.findall(low))
    norm_hits = len(NORMAL_CHECKIN_RE.findall(low))

    if flirt_hits:
        scores["flirting"] += 1.4 + 0.55 * min(3, flirt_hits)
    if classic_flirt_cnt:
        scores["flirting"] += 0.7 * min(3, classic_flirt_cnt)
    if shy_flirt_cnt and (m.words >= 3 or flirt_hits > 0 or re.search(r"\ba+b{2,}o+\b", low)):
        scores["flirting"] += 0.65 + 0.45 * min(3, shy_flirt_cnt)
    if is_sensitive_message(low, 0):
        scores["flirting"] += 1.4

    if tease_hits:
        scores["teasing"] += 1.25 + 0.45 * min(3, tease_hits)
    if has_laugh:
        scores["teasing"] += 1.05
    if mock_mad_cnt and not arg_strong and not arg_hits:
        scores["teasing"] += 0.55

    if arg_strong:
        scores["arguments"] += 1.65 + 0.55 * min(3, arg_strong)
    elif arg_hits:
        scores["arguments"] += 1.05
    if arg_emo_cnt:
        scores["arguments"] += 0.85 * min(2, arg_emo_cnt)
    elif mock_mad_cnt and (arg_strong or arg_hits):
        scores["arguments"] += 0.45
    # Cold trailing period on terse 1-2 word dismissal when sender rarely uses periods
    stripped_low = low.strip()
    if stripped_low in {"fine.", "ok.", "k.", "whatever.", "bye."} and period_rate_sender < 0.12 and not has_laugh and not (shy_flirt_cnt or classic_flirt_cnt):
        scores["arguments"] += 0.95

    # Crucial separation rule: laughter downweights genuine anger/argument sharply and boosts teasing
    if has_laugh and scores["arguments"] > 0:
        scores["arguments"] *= 0.2
        scores["teasing"] += 0.85

    if fact_hits:
        scores["facts_info"] += 0.95 + 0.45 * min(3, fact_hits)
    if URL_RE.search(m.text):
        scores["facts_info"] += 1.15
    if re.search(r"\b\d{2,}\b", low) and not flirt_hits and not arg_strong:
        scores["facts_info"] += 0.45
    if m.words >= 14 and flirt_hits == 0 and arg_strong == 0 and tease_hits == 0 and not (shy_flirt_cnt or classic_flirt_cnt):
        scores["facts_info"] += 0.5

    if norm_hits:
        scores["normal"] += 0.75 + 0.3 * min(3, norm_hits)

    return scores


def _softmax_dict(scores: Dict[str, float]) -> Dict[str, float]:
    mx = max(scores.values())
    exps = {k: math.exp(min(12.0, v - mx)) for k, v in scores.items()}
    tot = sum(exps.values()) or 1.0
    return {k: v / tot for k, v in exps.items()}


def run_advanced_nlp(
    msgs: Sequence[Any],
    senders: Sequence[str],
    msg_emojis: Sequence[List[str]],
    participant_tokens: set[str],
    participant_skel_map: Dict[str, str],
    word_variants: Dict[str, Dict[str, Counter]],
    use_neural: bool = True,
    cache_dir: Optional[Path] = None,
) -> Dict[str, Any]:
    """Compute all SOTA conversation intelligence metrics in unified passes."""
    n = len(msgs)
    text_indices = [i for i, m in enumerate(msgs) if m.kind == "text"]
    period_counts = Counter()
    text_counts = Counter()
    for i in text_indices:
        m = msgs[i]
        text_counts[m.sender] += 1
        if m.text.strip().endswith("."):
            period_counts[m.sender] += 1
    period_rate = {s: (period_counts[s] / text_counts[s] if text_counts[s] else 0.0) for s in senders}

    # --- Pass 1: Pragmatic discourse probabilities + candidate collection ---
    prag_probs: Dict[int, Dict[str, float]] = {}
    low_texts: Dict[int, str] = {}
    ambiguous_indices: List[int] = []
    photo_cand_indices: List[int] = []
    miss_cand_indices: List[int] = []
    meet_cand_indices: List[int] = []

    for i in text_indices:
        m = msgs[i]
        low = normalize_quotes(m.text.lower())
        low_texts[i] = low
        raw_sc = _score_pragmatic_discourse(m, msg_emojis[i], low, period_rate[m.sender])
        probs = _softmax_dict(raw_sc)
        prag_probs[i] = probs

        sorted_p = sorted(probs.values(), reverse=True)
        margin = sorted_p[0] - sorted_p[1]
        if m.words >= 4 and margin < 0.30 and len(ambiguous_indices) < 12000:
            ambiguous_indices.append(i)

        if PHOTO_DIRECT_RE.search(low):
            photo_cand_indices.append(i)
        if MISS_YOU_RE.search(low):
            miss_cand_indices.append(i)
        if MEET_DESIRE_RE.search(low) or PHOTO_VISUAL_RE.search(low):
            meet_cand_indices.append(i)

    # --- Optional Smart Cascade Local Transformer Verification ---
    neural_used = False
    neural_device = "none"
    neural_disc_map: Dict[int, Dict[str, float]] = {}
    photo_margins: Dict[int, float] = {}
    miss_margins: Dict[int, float] = {}
    meet_margins: Dict[int, float] = {}

    if use_neural and ambiguous_indices:
        embedder = SmartCascadeEmbedder(cache_dir=cache_dir)
        if ambiguous_indices:
            cand_texts = [msgs[i].text[:250] for i in ambiguous_indices]
            res_list = embedder.score_discourse_batch(cand_texts)
            if res_list:
                neural_used = True
                neural_device = embedder.device
                for idx, d_prob in zip(ambiguous_indices, res_list):
                    neural_disc_map[idx] = d_prob
                if photo_cand_indices:
                    p_m = embedder.intent_margin_batch([msgs[i].text[:250] for i in photo_cand_indices], "photo")
                    photo_margins = dict(zip(photo_cand_indices, p_m))
                if miss_cand_indices:
                    m_m = embedder.intent_margin_batch([msgs[i].text[:250] for i in miss_cand_indices], "miss")
                    miss_margins = dict(zip(miss_cand_indices, m_m))
                if meet_cand_indices:
                    mt_m = embedder.intent_margin_batch([msgs[i].text[:250] for i in meet_cand_indices], "meet")
                    meet_margins = dict(zip(meet_cand_indices, mt_m))

    # --- Pass 2: Multi-Turn Context Fusion for 5-Way Discourse ---
    final_probs: Dict[int, Dict[str, float]] = {}
    final_label: Dict[int, str] = {}
    for i in text_indices:
        base = dict(prag_probs[i])
        if i in neural_disc_map:
            np_d = neural_disc_map[i]
            for k in DISCOURSE_LABELS:
                base[k] = 0.55 * base[k] + 0.45 * np_d[k]
        # Contextual carry-over & teasing mock-indignation disambiguation
        if i > 0 and (i - 1) in prag_probs and (msgs[i].dt - msgs[i - 1].dt).total_seconds() <= 180:
            prev_p = prag_probs[i - 1]
            for k in ("flirting", "arguments", "teasing"):
                base[k] += 0.14 * prev_p[k]
            if (
                msgs[i - 1].sender != msgs[i].sender
                and _has_mock_indignation_emoji(msg_emojis[i])
                and not ARG_STRONG_RE.search(low_texts[i])
                and (any(e in LAUGH_EMOJI_SET for e in msg_emojis[i - 1]) or LAUGH_REACT_RE.search(low_texts[i - 1]) or TEASE_LEX_RE.search(low_texts[i - 1]))
            ):
                base["teasing"] += 0.55
                base["arguments"] *= 0.25
        tot = sum(base.values()) or 1.0
        norm_p = {k: v / tot for k, v in base.items()}
        final_probs[i] = norm_p
        final_label[i] = max(DISCOURSE_LABELS, key=lambda k: norm_p[k])

    disc_counts = {s: {k: 0.0 for k in DISCOURSE_LABELS} for s in senders}
    disc_hard_counts = {s: Counter() for s in senders}
    for i in text_indices:
        s = msgs[i].sender
        for k in DISCOURSE_LABELS:
            disc_counts[s][k] += final_probs[i][k]
        disc_hard_counts[s][final_label[i]] += 1

    overall_disc_pct = {}
    per_sender_disc_pct = {s: {} for s in senders}
    overall_totals = {k: sum(disc_counts[s][k] for s in senders) for k in DISCOURSE_LABELS}
    overall_sum = sum(overall_totals.values()) or 1.0
    for k in DISCOURSE_LABELS:
        overall_disc_pct[k] = round(overall_totals[k] / overall_sum * 100, 1)
    for s in senders:
        s_sum = sum(disc_counts[s].values()) or 1.0
        for k in DISCOURSE_LABELS:
            per_sender_disc_pct[s][k] = round(disc_counts[s][k] / s_sum * 100, 1)

    # --- Flirt Best & Most: Causal Turn-Aware Generalized Rizz Engine (Req 4) ---
    BLUSH_REACTION_RE = re.compile(
        r"\b(?:a+b{2,}o+|st+o+p+|blush(?:ing)?|sh+y+|aw+w+|omg+|he+he+|ay+i+o+)\b",
        re.IGNORECASE,
    )

    def _partner_fluster_score(idx: int, sender_name: str) -> float:
        msg_m = msgs[idx]
        for j in range(idx + 1, min(n, idx + 4)):
            nxt = msgs[j]
            if (nxt.dt - msg_m.dt).total_seconds() > 600:
                break
            if nxt.sender != sender_name and nxt.kind == "text":
                n_emos = msg_emojis[j]
                n_low = low_texts.get(j, "")
                sc = 0.0
                if any(e in FLUSTER_REACTION_EMOJIS for e in n_emos):
                    sc += 0.55
                if BLUSH_REACTION_RE.search(n_low):
                    sc += 0.55
                if CHAR_STRETCH_RE.search(n_low):
                    sc += 0.20
                if sc > 0.0 and (nxt.dt - msg_m.dt).total_seconds() <= 90:
                    sc += 0.15
                return min(1.0, sc)
        return 0.0

    # Identify reactive fluster replies (e.g. "abbooo 🫠" replying to partner's flirt) vs proactive flirts
    is_reactive_fluster: set[int] = set()
    for i in text_indices:
        if final_label[i] != "flirting":
            continue
        if i > 0 and msgs[i - 1].kind == "text" and msgs[i - 1].sender != msgs[i].sender:
            if (msgs[i].dt - msgs[i - 1].dt).total_seconds() <= 300 and final_label.get(i - 1) == "flirting":
                low = low_texts[i]
                has_react = bool(BLUSH_REACTION_RE.search(low)) or any(e in FLUSTER_REACTION_EMOJIS for e in msg_emojis[i])
                has_new_compliment = msgs[i].words >= 6 and bool(FLIRT_LEX_RE.search(low)) and bool(re.search(r"\b(?:u|ur|you|your)\b", low))
                if has_react and not has_new_compliment:
                    is_reactive_fluster.add(i)

    flirt_total_counts: Counter = Counter()
    proactive_flirt_counts: Counter = Counter()
    flirt_initiations: Counter = Counter()
    flirt_react_vals: Dict[str, List[float]] = {s: [] for s in senders}
    baseline_react_vals: Dict[str, List[float]] = {s: [] for s in senders}
    flusters_induced: Counter = Counter()
    flirt_tokens: Dict[str, List[str]] = {s: [] for s in senders}
    flirt_bigrams: Dict[str, set] = {s: set() for s in senders}
    flirt_smooth_segues: Counter = Counter()
    flirt_smooth_opps: Counter = Counter()
    flirt_specific_cnt: Counter = Counter()
    flirt_highlights: Dict[str, List[Dict[str, Any]]] = {s: [] for s in senders}

    for i in text_indices:
        m = msgs[i]
        s = m.sender
        low = low_texts[i]
        lbl = final_label[i]

        if lbl in ("normal", "facts_info"):
            baseline_react_vals[s].append(_partner_fluster_score(i, s))
            continue

        if lbl != "flirting":
            continue

        flirt_total_counts[s] += 1
        if i in is_reactive_fluster:
            continue

        proactive_flirt_counts[s] += 1
        prev_lbl = final_label.get(i - 1, "normal")
        prev_gap = (m.dt - msgs[i - 1].dt).total_seconds() if i > 0 else 99999
        is_segue_context = i > 0 and prev_lbl in ("normal", "facts_info") and prev_gap <= 600 and m.words >= 4
        if prev_lbl != "flirting" or prev_gap > 3600:
            flirt_initiations[s] += 1

        wtoks = [w.strip("'") for w in WORD_RE.findall(low) if len(w.strip("'")) >= 2]
        flirt_tokens[s].extend(wtoks)
        for a, b in zip(wtoks, wtoks[1:]):
            flirt_bigrams[s].add((a, b))

        if m.words >= 5 and (re.search(r"\b(?:u|ur|you|your)\b", low) or FLIRT_LEX_RE.search(low)):
            flirt_specific_cnt[s] += 1

        react_score = _partner_fluster_score(i, s)
        flirt_react_vals[s].append(react_score)
        if react_score >= 0.45:
            flusters_induced[s] += 1
        if is_segue_context:
            flirt_smooth_opps[s] += 1
            if react_score >= 0.45:
                flirt_smooth_segues[s] += 1

        sens = is_sensitive_message(low, 4 if TIER4_SPICY_RE.search(low) else 2)
        if not sens and 4 <= m.words <= 26 and react_score >= 0.45 and len(flirt_highlights[s]) < 20:
            flirt_highlights[s].append({
                "sender": s,
                "dt": m.dt.isoformat(sep=" "),
                "date_display": _fmt_date_display(m.dt),
                "text": _safe_preview(m.text, 150),
                "reaction_score": round(react_score * 100),
                "sensitive": False,
            })

    max_induced = max((flusters_induced[s] for s in senders), default=1) or 1
    max_bigrams = max((len(flirt_bigrams[s]) for s in senders), default=1) or 1
    max_smooth = max((flirt_smooth_segues[s] for s in senders), default=1) or 1
    max_spec = max((flirt_specific_cnt[s] for s in senders), default=1) or 1

    flirt_metrics: Dict[str, Any] = {}
    for s in senders:
        fc = proactive_flirt_counts[s] or flirt_total_counts[s]
        tc = text_counts[s] or 1
        f_rate = (sum(flirt_react_vals[s]) / len(flirt_react_vals[s])) if flirt_react_vals[s] else 0.0
        n_rate = (sum(baseline_react_vals[s]) / len(baseline_react_vals[s])) if baseline_react_vals[s] else 0.0
        lift = (f_rate + 0.01) / (n_rate + 0.01)
        lift_sc = min(100.0, max(0.0, (lift - 1.0) * 32.0))
        vol_sc = (flusters_induced[s] / max_induced) * 100.0
        partner_reaction = round(0.50 * lift_sc + 0.50 * vol_sc, 1)

        mattr_sc = min(100.0, _compute_mattr(flirt_tokens[s], 50) * 115.0)
        breadth_sc = math.sqrt(len(flirt_bigrams[s]) / max_bigrams) * 100.0
        creativity = round(0.40 * mattr_sc + 0.60 * breadth_sc, 1)

        segue_rate = (flirt_smooth_segues[s] / flirt_smooth_opps[s] * 100) if flirt_smooth_opps[s] else 0.0
        segue_vol = (flirt_smooth_segues[s] / max_smooth) * 100.0
        smooth_segue = round(0.45 * min(100.0, segue_rate * 2.0) + 0.55 * segue_vol, 1)

        spec_rate = (flirt_specific_cnt[s] / fc * 100) if fc else 0.0
        spec_vol = (flirt_specific_cnt[s] / max_spec) * 100.0
        specificity = round(0.45 * min(100.0, spec_rate * 1.4) + 0.55 * spec_vol, 1)

        best_score = round(0.40 * partner_reaction + 0.25 * creativity + 0.20 * smooth_segue + 0.15 * specificity, 1)

        flirt_highlights[s].sort(key=lambda x: x["reaction_score"], reverse=True)
        flirt_metrics[s] = {
            "count": fc,
            "total_flirt_turns": flirt_total_counts[s],
            "flusters_induced": flusters_induced[s],
            "pct_of_messages": round(fc / tc * 100, 1),
            "initiations": flirt_initiations[s],
            "best_score": best_score,
            "components": {
                "partner_reaction": partner_reaction,
                "creativity": creativity,
                "smooth_segue": smooth_segue,
                "specificity": specificity,
            },
            "highlights": flirt_highlights[s][:3],
        }

    most_flirt_winner = max(senders, key=lambda s: (flirt_metrics[s]["count"], flirt_metrics[s]["pct_of_messages"])) if senders else ""
    best_flirt_winner = max(senders, key=lambda s: (flirt_metrics[s]["best_score"], flirt_metrics[s]["count"])) if senders else ""

    # --- Apologies / "Sorry" & "Who Says Sorry First" Tracker ---
    sorry_counts: Counter = Counter()
    sorry_first_counts: Counter = Counter()
    post_arg_sorry_first: Counter = Counter()
    recovery_minutes: List[float] = []
    sorry_monthly: Dict[str, Counter] = {s: Counter() for s in senders}
    last_apology_dt: Optional[datetime] = None
    last_arg_dt: Optional[datetime] = None
    apology_episodes = 0

    for i in text_indices:
        m = msgs[i]
        low = low_texts[i]
        if final_label[i] == "arguments":
            last_arg_dt = m.dt
        cleaned_apol = APOLOGY_SYMPATHY_NEG_RE.sub(" ", low)
        if APOLOGY_RE.search(cleaned_apol):
            sorry_counts[m.sender] += 1
            sorry_monthly[m.sender][m.dt.strftime("%Y-%m")] += 1
            if last_apology_dt is None or (m.dt - last_apology_dt).total_seconds() > 1800:
                apology_episodes += 1
                sorry_first_counts[m.sender] += 1
                if last_arg_dt is not None and 0 <= (m.dt - last_arg_dt).total_seconds() <= 7200:
                    post_arg_sorry_first[m.sender] += 1
                    recovery_minutes.append((m.dt - last_arg_dt).total_seconds() / 60.0)
            last_apology_dt = m.dt

    recovery_sorted = sorted(recovery_minutes)
    median_recovery_min = round(recovery_sorted[len(recovery_sorted) // 2], 1) if recovery_sorted else None
    sorry_first_leader = max(senders, key=lambda s: (sorry_first_counts[s], sorry_counts[s])) if senders else ""

    # --- Longest Substantive Message of All Parties (Requirement 5) ---
    longest_by_sender: Dict[str, Dict[str, Any]] = {}
    fallback_by_sender: Dict[str, Dict[str, Any]] = {}
    for i in text_indices:
        m = msgs[i]
        s = m.sender
        ok_sub, uniq_w = is_substantive_longest(m.text, m.words)
        sens = is_sensitive_message(low_texts[i], 4 if TIER4_SPICY_RE.search(low_texts[i]) else 1)
        cand = {
            "sender": s,
            "dt": m.dt.isoformat(sep=" "),
            "date_display": _fmt_date_display(m.dt),
            "time_display": _fmt_time_display(m.dt),
            "words": m.words,
            "unique_words": uniq_w,
            "chars": len(m.text),
            "text": m.text,
            "sensitive": sens,
        }
        fb_cur = fallback_by_sender.get(s)
        if fb_cur is None or (m.words, len(m.text)) > (fb_cur["words"], fb_cur["chars"]):
            fallback_by_sender[s] = cand
        if ok_sub:
            cur = longest_by_sender.get(s)
            if cur is None or (m.words, uniq_w, len(m.text)) > (cur["words"], cur["unique_words"], cur["chars"]):
                longest_by_sender[s] = cand
    for s in senders:
        if s not in longest_by_sender and s in fallback_by_sender:
            longest_by_sender[s] = fallback_by_sender[s]
    overall_longest = max(longest_by_sender.values(), key=lambda x: (x["words"], x["unique_words"], x["chars"]), default=None)

    # --- Intimacy, Multi-Word & Strict Direct-Address Nicknames (Requirement 6) ---
    vocative_counts: Counter = Counter()
    for i in text_indices:
        stripped = low_texts[i].strip()
        vm = STRICT_VOCATIVE_RE.match(stripped)
        if vm:
            raw_cand = vm.group(1)
            canon = canonicalize_word(raw_cand, participant_tokens, participant_skel_map)
            if (
                len(canon) >= 3
                and canon not in participant_tokens
                and canon not in VOCATIVE_NON_NICKNAME
            ):
                vocative_counts[canon] += 1

    # Combine curated lexicon + top mined strict direct-address vocatives
    nickname_stats: Dict[str, Dict[str, Any]] = {}
    curated_keys = {k for k, _ in NICKNAME_PATTERNS}

    for i in text_indices:
        m = msgs[i]
        low = low_texts[i]
        s = m.sender
        for label, pat in NICKNAME_PATTERNS:
            hits = pat.findall(low)
            if hits:
                entry = nickname_stats.setdefault(label, {
                    "term": label,
                    "coined_by": s,
                    "first_dt": m.dt.isoformat(sep=" "),
                    "date_display": _fmt_date_display(m.dt),
                    "time_display": _fmt_time_display(m.dt),
                    "first_quote": _safe_preview(m.text, 140),
                    "sensitive": is_sensitive_message(low, 2),
                    "total_count": 0,
                    "per_sender": {sn: 0 for sn in senders},
                })
                entry["total_count"] += len(hits)
                entry["per_sender"][s] += len(hits)

    # Add dynamically discovered strict direct-address nicknames that don't overlap curated patterns
    curated_flat = {w for lbl in curated_keys for w in re.findall(r"[a-z]+", lbl)}
    curated_skels = {word_skeleton(w) for w in curated_flat}
    for canon, cnt in vocative_counts.most_common(15):
        if cnt < 8 or canon in curated_flat or word_skeleton(canon) in curated_skels:
            continue
        # Count total occurrences of that mined nickname across chat
        pat = re.compile(r"\b" + "+".join(re.escape(c) for c in word_skeleton(canon)) + r"+\b", re.IGNORECASE)
        first_idx = None
        tot = 0
        ps = {sn: 0 for sn in senders}
        for i in text_indices:
            hits = pat.findall(low_texts[i])
            if hits:
                if first_idx is None:
                    first_idx = i
                tot += len(hits)
                ps[msgs[i].sender] += len(hits)
        if tot >= 8 and first_idx is not None:
            fm = msgs[first_idx]
            nickname_stats[canon] = {
                "term": canon,
                "coined_by": fm.sender,
                "first_dt": fm.dt.isoformat(sep=" "),
                "date_display": _fmt_date_display(fm.dt),
                "time_display": _fmt_time_display(fm.dt),
                "first_quote": _safe_preview(fm.text, 140),
                "sensitive": is_sensitive_message(low_texts[first_idx], 2),
                "total_count": tot,
                "per_sender": ps,
                "auto_discovered": True,
            }

    # 2. Sensory & Physical Motifs (hugs, lift, carry, looking into eyes, voice, cutee/kutti ponnu)
    sensory_summary: Dict[str, Dict[str, Any]] = {}
    for key, (label, pos_re, neg_re) in SENSORY_MOTIFS.items():
        per_s = {sn: 0 for sn in senders}
        first_ev = None
        for i in text_indices:
            low = low_texts[i]
            if pos_re.search(low) and (neg_re is None or not neg_re.search(low)):
                m = msgs[i]
                per_s[m.sender] += 1
                if first_ev is None:
                    first_ev = {
                        "sender": m.sender,
                        "dt": m.dt.isoformat(sep=" "),
                        "date_display": _fmt_date_display(m.dt),
                        "time_display": _fmt_time_display(m.dt),
                        "quote": _safe_preview(m.text, 140),
                        "sensitive": is_sensitive_message(low, 2),
                    }
        sensory_summary[key] = {
            "label": label,
            "total": sum(per_s.values()),
            "per_sender": per_s,
            "first_unlock": first_ev,
        }

    # 3. 5-Tier Intimacy Ladder & CUSUM / Rolling Z-Score Escalations
    TIER_NAMES = {
        1: "Tier 1 · Warm Compliment",
        2: "Tier 2 · Pet Names & Sensory Affection",
        3: "Tier 3 · Physical Tenderness & Devotion",
        4: "Tier 4 · Heated / Spicy Flirting",
        5: "Tier 5 · Peak Explicit Intimacy",
    }
    escalation_events: List[Dict[str, Any]] = []
    escalations_per_sender: Counter = Counter()
    unlocked_tiers_global: set[int] = set()
    unlocked_tiers_sender: Dict[str, set[int]] = {s: set() for s in senders}
    monthly_intimacy_sum: Counter = Counter()
    monthly_intimacy_cnt: Counter = Counter()
    rolling_scores: List[float] = []
    last_spike_dt: Optional[datetime] = None

    # Pre-seed nickname unlock events
    for nick_entry in sorted(nickname_stats.values(), key=lambda x: x["first_dt"])[:15]:
        escalation_events.append({
            "type": "nickname",
            "tier": 2,
            "badge": f"New Pet Name: {nick_entry['term']}",
            "sender": nick_entry["coined_by"],
            "dt": nick_entry["first_dt"],
            "date_display": nick_entry["date_display"],
            "time_display": nick_entry["time_display"],
            "quote": nick_entry["first_quote"],
            "sensitive": nick_entry["sensitive"],
        })
        escalations_per_sender[nick_entry["coined_by"]] += 1

    # Sensory motif first unlocks
    for skey, sinfo in sensory_summary.items():
        fu = sinfo.get("first_unlock")
        if fu:
            tier_val = 3 if skey in ("hugs_cuddles", "lift_carry") else 2
            escalation_events.append({
                "type": "sensory",
                "tier": tier_val,
                "badge": f"First {sinfo['label']}",
                "sender": fu["sender"],
                "dt": fu["dt"],
                "date_display": fu["date_display"],
                "time_display": fu["time_display"],
                "quote": fu["quote"],
                "sensitive": fu["sensitive"],
            })

    for i in text_indices:
        m = msgs[i]
        low = low_texts[i]
        emos = msg_emojis[i]
        tier = 0
        cont_score = 0.0

        if SENSITIVE_EXPLICIT_RE.search(low) or any(e in {"🍆", "🍑", "💦"} for e in emos):
            tier = 5
            cont_score = 5.0
        elif TIER4_SPICY_RE.search(low) or ("🥵" in emos and final_label[i] == "flirting"):
            tier = 4
            cont_score = 4.0
        elif TIER3_TENDER_RE.search(low):
            tier = 3
            cont_score = 3.0
        elif TIER2_ROMANTIC_RE.search(low) or any(e in {"😘", "💋", "❤️‍🔥"} for e in emos):
            tier = 2
            cont_score = 2.0
        elif TIER1_WARM_RE.search(low) or final_label[i] == "flirting":
            tier = 1
            cont_score = 1.0

        mkey = m.dt.strftime("%Y-%m")
        monthly_intimacy_sum[mkey] += cont_score
        monthly_intimacy_cnt[mkey] += 1

        if tier >= 2:
            sens = is_sensitive_message(low, tier)
            # First-time tier milestone globally or per-sender
            is_first_global = tier not in unlocked_tiers_global
            is_first_sender = tier not in unlocked_tiers_sender[m.sender]
            if is_first_global or is_first_sender:
                unlocked_tiers_global.add(tier)
                unlocked_tiers_sender[m.sender].add(tier)
                escalation_events.append({
                    "type": "tier_unlock",
                    "tier": tier,
                    "badge": f"{'First Ever ' if is_first_global else 'Personal First · '}{TIER_NAMES[tier]}",
                    "sender": m.sender,
                    "dt": m.dt.isoformat(sep=" "),
                    "date_display": _fmt_date_display(m.dt),
                    "time_display": _fmt_time_display(m.dt),
                    "quote": _safe_preview(m.text, 150),
                    "sensitive": sens,
                })
                escalations_per_sender[m.sender] += 1

            # Rolling Z-score heat-spike escalation (for Tier >= 3 episodes >= 12h apart)
            if tier >= 3 and len(rolling_scores) >= 80:
                window = rolling_scores[-250:]
                mean_w = sum(window) / len(window)
                var_w = sum((x - mean_w) ** 2 for x in window) / len(window)
                std_w = math.sqrt(var_w) or 0.35
                z = (cont_score - mean_w) / std_w
                if z >= 2.5 and (last_spike_dt is None or (m.dt - last_spike_dt).total_seconds() >= 43200):
                    last_spike_dt = m.dt
                    escalations_per_sender[m.sender] += 1
                    escalation_events.append({
                        "type": "heat_spike",
                        "tier": tier,
                        "badge": f"Intimacy Escalation Spike (Tier {tier})",
                        "sender": m.sender,
                        "dt": m.dt.isoformat(sep=" "),
                        "date_display": _fmt_date_display(m.dt),
                        "time_display": _fmt_time_display(m.dt),
                        "quote": _safe_preview(m.text, 150),
                        "sensitive": sens,
                    })

        rolling_scores.append(cont_score)

    escalation_events.sort(key=lambda x: x["dt"])
    monthly_intimacy_trajectory = {
        mkey: round(monthly_intimacy_sum[mkey] / monthly_intimacy_cnt[mkey] * 25.0, 2)
        for mkey in sorted(monthly_intimacy_cnt)
    }

    # --- Photo / Picture Requests (Requirement 7) ---
    photo_counts: Counter = Counter()
    photo_direct: Counter = Counter()
    photo_visual: Counter = Counter()
    photo_fulfilled: Counter = Counter()
    photo_samples: Dict[str, List[Dict[str, Any]]] = {s: [] for s in senders}

    for i in text_indices:
        m = msgs[i]
        low = low_texts[i]
        if PHOTO_HARD_NEG_RE.search(low) or INPERSON_MEET_TIME_RE.search(low):
            continue

        is_direct = bool(PHOTO_DIRECT_RE.search(low))
        is_ellipsis = False
        if not is_direct and m.words <= 4 and PHOTO_ELLIPSIS_RE.search(low):
            # Look back 1..2 messages within 10 mins from partner about getting ready / outfit
            for prev_j in range(max(0, i - 3), i):
                pm = msgs[prev_j]
                if pm.sender != m.sender and (m.dt - pm.dt).total_seconds() <= 600 and pm.kind == "text":
                    if PHOTO_APPEARANCE_CTX_RE.search(low_texts.get(prev_j, "")):
                        is_ellipsis = True
                        break

        if not (is_direct or is_ellipsis):
            continue

        # Check neural margin if evaluated
        if i in photo_margins and photo_margins[i] < -0.05 and not is_direct:
            continue

        # Next-turn confirmation: did partner send media or give shy refusal within 15 min?
        fulfilled = False
        shy_confirmed = False
        for nxt_j in range(i + 1, min(n, i + 6)):
            nm = msgs[nxt_j]
            if (nm.dt - m.dt).total_seconds() > 900:
                break
            if nm.sender != m.sender:
                if nm.kind == "media":
                    fulfilled = True
                    break
                if nm.kind == "text" and PHOTO_SHY_REFUSAL_RE.search(low_texts.get(nxt_j, "")):
                    shy_confirmed = True

        photo_counts[m.sender] += 1
        photo_direct[m.sender] += 1
        if fulfilled:
            photo_fulfilled[m.sender] += 1

        if len(photo_samples[m.sender]) < 6 and not is_sensitive_message(low, 2):
            photo_samples[m.sender].append({
                "dt": m.dt.isoformat(sep=" "),
                "date_display": _fmt_date_display(m.dt),
                "text": _safe_preview(m.text, 120),
                "fulfilled": fulfilled or shy_confirmed,
                "sensitive": False,
            })

    # --- Desire to Meet & "Missing You" (Requirement 8) ---
    miss_total: Counter = Counter()
    miss_initiated: Counter = Counter()
    miss_reciprocal: Counter = Counter()
    meet_total: Counter = Counter()
    last_miss_dt: Optional[datetime] = None
    last_miss_sender: Optional[str] = None

    for i in text_indices:
        m = msgs[i]
        low = low_texts[i]
        if MISS_YOU_RE.search(low) and not MISS_YOU_NEG_RE.search(low):
            if i not in miss_margins or miss_margins[i] >= -0.05:
                miss_total[m.sender] += 1
                is_recip = (
                    last_miss_dt is not None
                    and last_miss_sender != m.sender
                    and (m.dt - last_miss_dt).total_seconds() <= 900
                ) or bool(re.search(r"\b(?:too+|more+|same)\b", low))
                if is_recip:
                    miss_reciprocal[m.sender] += 1
                else:
                    miss_initiated[m.sender] += 1
                last_miss_dt = m.dt
                last_miss_sender = m.sender

        if (MEET_DESIRE_RE.search(low) or PHOTO_VISUAL_RE.search(low)) and not MEET_NEG_RE.search(low):
            if i not in meet_margins or meet_margins[i] >= -0.05:
                meet_total[m.sender] += 1

    # --- Requirement 9: Innovative Psycholinguistic & Fun Metrics ---
    # 1. Language Style Matching (LSM %)
    lsm_counts = {s: Counter() for s in senders}
    lsm_word_totals = Counter()
    for i in text_indices:
        m = msgs[i]
        s = m.sender
        wtoks = WORD_RE.findall(low_texts[i])
        lsm_word_totals[s] += len(wtoks)
        for w in wtoks:
            for cat, wset in LSM_CATEGORIES.items():
                if w in wset:
                    lsm_counts[s][cat] += 1

    lsm_score = None
    lsm_breakdown = {}
    if len(senders) >= 2:
        s1, s2 = senders[0], senders[1]
        t1, t2 = lsm_word_totals[s1] or 1, lsm_word_totals[s2] or 1
        cats = []
        for cat in LSM_CATEGORIES:
            r1 = lsm_counts[s1][cat] / t1
            r2 = lsm_counts[s2][cat] / t2
            val = 1.0 - abs(r1 - r2) / (r1 + r2 + 0.0001)
            lsm_breakdown[cat] = round(val * 100, 1)
            cats.append(val)
        lsm_score = round(sum(cats) / len(cats) * 100, 1)

    # 2. Linguistic & Emoji Contagion ("Who Infected Whom?")
    contagion_items: List[Dict[str, Any]] = []
    if len(senders) >= 2:
        s1, s2 = senders[0], senders[1]
        word_first_dts: Dict[str, Dict[str, List[datetime]]] = defaultdict(lambda: {s1: [], s2: []})
        emoji_first_dts: Dict[str, Dict[str, List[datetime]]] = defaultdict(lambda: {s1: [], s2: []})
        for i in text_indices:
            m = msgs[i]
            if m.sender not in (s1, s2):
                continue
            clean = URL_RE.sub(" ", low_texts[i])
            for raw_w in WORD_RE.findall(clean):
                canon = canonicalize_word(raw_w, participant_tokens, participant_skel_map)
                if (
                    len(canon) >= 4
                    and canon not in STOPWORDS
                    and canon not in EXCLUDED_TOP_WORDS
                    and canon not in participant_tokens
                ):
                    word_first_dts[canon][m.sender].append(m.dt)
            for e in msg_emojis[i]:
                emoji_first_dts[e][m.sender].append(m.dt)

        for kind, store in (("word", word_first_dts), ("emoji", emoji_first_dts)):
            for token, dmap in store.items():
                c1, c2 = len(dmap[s1]), len(dmap[s2])
                if c1 < 15 or c2 < 15 or (c1 + c2) < 50:
                    continue
                first1, first2 = dmap[s1][0], dmap[s2][0]
                lead_days = (first2 - first1).total_seconds() / 86400.0
                if abs(lead_days) >= 10:
                    originator = s1 if lead_days > 0 else s2
                    adopter = s2 if originator == s1 else s1
                    # Also check 30-day early dominance
                    cutoff = (first1 if originator == s1 else first2).timestamp() + 30 * 86400
                    early_orig = sum(1 for d in dmap[originator] if d.timestamp() <= cutoff)
                    early_adpt = sum(1 for d in dmap[adopter] if d.timestamp() <= cutoff)
                    if early_orig >= 5 and early_orig >= early_adpt * 2:
                        contagion_items.append({
                            "token": token,
                            "kind": kind,
                            "originator": originator,
                            "adopter": adopter,
                            "lead_days": round(abs(lead_days)),
                            "originator_count": len(dmap[originator]),
                            "adopter_count": len(dmap[adopter]),
                            "total": c1 + c2,
                        })
        contagion_items.sort(key=lambda x: (min(x["lead_days"], 180) * math.log1p(x["adopter_count"])), reverse=True)
        contagion_items = contagion_items[:12]

    # 3. Humor / Comedy Engine (laughs + playful mock-indignation tease reactions) & Chaser vs Chased & 2 AM Shift
    laughs_made: Counter = Counter()
    tease_reactions_triggered: Counter = Counter()
    comedy_points: Counter = Counter()
    laughs_sent: Counter = Counter()
    double_texts_30m: Counter = Counter()
    unannounced_vanishes_6h: Counter = Counter()
    dry_replies: Counter = Counter()
    turn_replies_cnt: Counter = Counter()

    night_stats = {s: {"msgs": 0, "flirt": 0.0, "words": 0, "intimacy_ge2": 0} for s in senders}
    day_stats = {s: {"msgs": 0, "flirt": 0.0, "words": 0, "intimacy_ge2": 0} for s in senders}

    for i in text_indices:
        m = msgs[i]
        s = m.sender
        low = low_texts[i]
        emos = msg_emojis[i]

        is_direct_laugh = any(e in {"😂", "🤣", "💀", "😹"} for e in emos) or bool(LAUGH_REACT_RE.search(low))
        is_mock_mad = _has_mock_indignation_emoji(emos) or bool(re.search(r"\b(?:shut\s*up|luss+u+|a+b{2,}o+|hate\s+(?:u|you))\b", low))

        if is_direct_laugh or any(e in LAUGH_EMOJI_SET for e in emos):
            laughs_sent[s] += 1

        if i > 0 and msgs[i - 1].kind == "text" and msgs[i - 1].sender != s and (m.dt - msgs[i - 1].dt).total_seconds() <= 300:
            prev_s = msgs[i - 1].sender
            prev_low = low_texts.get(i - 1, "")
            prev_emos = msg_emojis[i - 1]
            prev_was_tease = (
                any(e in LAUGH_EMOJI_SET for e in prev_emos)
                or bool(LAUGH_REACT_RE.search(prev_low))
                or bool(TEASE_LEX_RE.search(prev_low))
            )
            if is_direct_laugh:
                laughs_made[prev_s] += 1
                comedy_points[prev_s] += 1
            elif prev_was_tease and is_mock_mad and not ARG_STRONG_RE.search(low):
                tease_reactions_triggered[prev_s] += 1
                comedy_points[prev_s] += 1

        # 2 AM Persona Shift (00:00-04:59 vs rest)
        bucket = night_stats[s] if m.dt.hour < 5 else day_stats[s]
        bucket["msgs"] += 1
        bucket["words"] += m.words
        bucket["flirt"] += final_probs[i]["flirting"]
        if TIER2_ROMANTIC_RE.search(low) or TIER3_TENDER_RE.search(low) or TIER4_SPICY_RE.search(low):
            bucket["intimacy_ge2"] += 1

    # Chaser metrics across all messages
    for i in range(1, n):
        prev_m = msgs[i - 1]
        cur_m = msgs[i]
        gap = (cur_m.dt - prev_m.dt).total_seconds()
        prev_was_bye = prev_m.kind == "text" and bool(BYE_RE.search(prev_m.text))
        if cur_m.sender == prev_m.sender:
            if 1800 <= gap <= 21600 and not prev_was_bye:
                double_texts_30m[cur_m.sender] += 1
        else:
            if cur_m.kind == "text":
                turn_replies_cnt[cur_m.sender] += 1
                if cur_m.words == 1 and len(cur_m.text.strip()) <= 5 and not any(e in FLIRT_EMOJI_SET for e in msg_emojis[i]):
                    dry_replies[cur_m.sender] += 1
            if gap > 21600 and not prev_was_bye and len(senders) == 2:
                # prev_m's partner didn't reply for >6h without anyone saying Bye
                vanisher = senders[1] if prev_m.sender == senders[0] else senders[0]
                unannounced_vanishes_6h[vanisher] += 1

    chaser_metrics = {}
    night_shift = {}
    for s in senders:
        chaser_metrics[s] = {
            "double_texts_30m": double_texts_30m[s],
            "unannounced_vanishes_6h": unannounced_vanishes_6h[s],
            "dry_reply_pct": round(dry_replies[s] / turn_replies_cnt[s] * 100, 1) if turn_replies_cnt[s] else 0.0,
        }
        ns, ds = night_stats[s], day_stats[s]
        night_shift[s] = {
            "night_msgs": ns["msgs"],
            "night_flirt_pct": round(ns["flirt"] / ns["msgs"] * 100, 1) if ns["msgs"] else 0.0,
            "day_flirt_pct": round(ds["flirt"] / ds["msgs"] * 100, 1) if ds["msgs"] else 0.0,
            "night_avg_words": round(ns["words"] / ns["msgs"], 2) if ns["msgs"] else 0.0,
            "day_avg_words": round(ds["words"] / ds["msgs"], 2) if ds["msgs"] else 0.0,
            "night_intimacy_pct": round(ns["intimacy_ge2"] / ns["msgs"] * 100, 1) if ns["msgs"] else 0.0,
            "day_intimacy_pct": round(ds["intimacy_ge2"] / ds["msgs"] * 100, 1) if ds["msgs"] else 0.0,
        }

    # 4. Superlative Trophy Cabinet (clean text tags — zero decorative emojis)
    trophies: List[Dict[str, Any]] = []
    if senders:
        trophies.append({
            "icon": "RIZZ", "title": "Smooth Operator (Best Flirt)", "winner": best_flirt_winner,
            "stat": f"{flirt_metrics[best_flirt_winner]['best_score']} / 100 Rizz Score",
        })
        trophies.append({
            "icon": "CHARM", "title": "Relentless Charmer (Most Flirts)", "winner": most_flirt_winner,
            "stat": f"{flirt_metrics[most_flirt_winner]['count']:,} proactive flirts ({flirt_metrics[most_flirt_winner]['flusters_induced']:,} flustered reactions)",
        })
        peace_w = max(senders, key=lambda s: sorry_first_counts[s])
        trophies.append({
            "icon": "PEACE", "title": "Chief Peacekeeper", "winner": peace_w,
            "stat": f"Said sorry first {sorry_first_counts[peace_w]:,} times",
        })
        laugh_w = max(senders, key=lambda s: comedy_points[s])
        trophies.append({
            "icon": "COMEDY", "title": "Certified Comedian", "winner": laugh_w,
            "stat": f"{comedy_points[laugh_w]:,} comedy moments ({laughs_made[laugh_w]:,} laughs + {tease_reactions_triggered[laugh_w]:,} tease reactions)",
        })
        miss_w = max(senders, key=lambda s: miss_total[s] + meet_total[s])
        trophies.append({
            "icon": "YEARNING", "title": "Most Yearning", "winner": miss_w,
            "stat": f"{miss_total[miss_w] + meet_total[miss_w]:,} 'Miss You' & meet-up asks",
        })
        pic_w = max(senders, key=lambda s: photo_counts[s])
        trophies.append({
            "icon": "PHOTO", "title": "Paparazzi", "winner": pic_w,
            "stat": f"Asked for pics {photo_counts[pic_w]:,} times",
        })

    # 5. "Guess Who Said It?" Quiz Pool (clean, distinctive, non-sensitive lines across whole chat)
    quiz_pool: List[Dict[str, Any]] = []
    if len(senders) >= 2:
        by_sender: Dict[str, List[int]] = {s: [] for s in senders}
        for i in text_indices:
            m = msgs[i]
            low = low_texts[i]
            if not (8 <= m.words <= 28) or len(m.text) > 190:
                continue
            if URL_RE.search(m.text) or is_sensitive_message(low, 3):
                continue
            if any(pt in low for pt in participant_tokens):
                continue
            by_sender[m.sender].append(i)
        per_cap = max(40, 250 // len(senders))
        for s in senders:
            cand = by_sender[s]
            random.shuffle(cand)
            for i in cand[:per_cap]:
                m = msgs[i]
                quiz_pool.append({
                    "text": m.text.strip(),
                    "sender": s,
                    "date_display": _fmt_date_display(m.dt),
                    "vibe": final_label[i],
                })
        random.shuffle(quiz_pool)

    return {
        "engine_meta": {
            "neural_used": neural_used,
            "neural_device": neural_device,
            "ambiguous_verified": len(neural_disc_map),
        },
        "discourse": {
            "overall_pct": overall_disc_pct,
            "per_sender_pct": per_sender_disc_pct,
            "per_sender_counts": {s: dict(disc_hard_counts[s]) for s in senders},
            "flirt_analysis": {
                "most_flirt_winner": most_flirt_winner,
                "best_flirt_winner": best_flirt_winner,
                "per_sender": flirt_metrics,
            },
        },
        "apologies": {
            "total_episodes": apology_episodes,
            "sorry_first_leader": sorry_first_leader,
            "median_makeup_minutes": median_recovery_min,
            "per_sender": {
                s: {
                    "sorry_count": sorry_counts[s],
                    "said_sorry_first": sorry_first_counts[s],
                    "post_argument_sorry_first": post_arg_sorry_first[s],
                    "monthly": dict(sorry_monthly[s]),
                }
                for s in senders
            },
        },
        "longest_messages": {
            "overall": overall_longest,
            "per_sender": longest_by_sender,
        },
        "intimacy": {
            "escalations_per_sender": {s: escalations_per_sender[s] for s in senders},
            "escalation_leader": max(senders, key=lambda s: escalations_per_sender[s]) if senders else "",
            "nicknames": sorted(nickname_stats.values(), key=lambda x: x["total_count"], reverse=True)[:18],
            "sensory_and_physical_cues": sensory_summary,
            "escalations": escalation_events[:120],
            "monthly_trajectory": monthly_intimacy_trajectory,
        },
        "photo_requests": {
            s: {
                "total": photo_counts[s],
                "direct_asks": photo_direct[s],
                "visual_desire_asks": photo_visual[s],
                "fulfilled_with_media": photo_fulfilled[s],
                "fulfillment_pct": round(photo_fulfilled[s] / photo_counts[s] * 100, 1) if photo_counts[s] else 0.0,
                "samples": photo_samples[s],
            }
            for s in senders
        },
        "longing_and_meeting": {
            s: {
                "miss_you_total": miss_total[s],
                "miss_you_initiated": miss_initiated[s],
                "miss_you_reciprocal": miss_reciprocal[s],
                "desire_to_meet": meet_total[s],
                "combined_total": miss_total[s] + meet_total[s],
            }
            for s in senders
        },
        "fun": {
            "lsm_score_pct": lsm_score,
            "lsm_breakdown": lsm_breakdown,
            "contagion": contagion_items,
            "humor": {
                s: {
                    "laughs_triggered": laughs_made[s],
                    "tease_reactions_triggered": tease_reactions_triggered[s],
                    "comedy_points": comedy_points[s],
                    "laughs_sent": laughs_sent[s],
                }
                for s in senders
            },
            "chaser": chaser_metrics,
            "night_shift": night_shift,
            "trophies": trophies,
            "quiz_pool": quiz_pool,
        },
    }
