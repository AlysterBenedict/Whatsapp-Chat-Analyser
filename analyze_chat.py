#!/usr/bin/env python3
"""
WhatsApp Chat Analyzer - all-in-one
===================================
Works with Android and iOS exports (without media), 1-on-1 or group chats.

Usage (stock_predictor_env):
    python analyze_chat.py "chat.txt"
    python analyze_chat.py                      # auto-picks a WhatsApp .txt in this folder
    python analyze_chat.py chat.txt --date-order dmy --no-charts --no-neural

Outputs:
    * A full text report in the console
    * <out>/summary.json, per_sender.csv, hourly.csv, daily.csv
    * <out>/*.png charts (needs matplotlib; skipped automatically if missing)
"""

import argparse
import csv
import json
import math
import re
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple

CODE_DIR = Path(__file__).resolve().parent
if str(CODE_DIR) not in sys.path:
    sys.path.insert(0, str(CODE_DIR))

from nlp_engine import (
    EXCLUDED_TOP_WORDS,
    STOPWORDS,
    URL_RE,
    WORD_RE,
    canonicalize_word,
    extract_emojis,
    extract_participant_tokens,
    is_question_message,
    normalize_quotes,
    run_advanced_nlp,
    segment_conversations,
)

# --------------------------------------------------------------------------
# Parsing
# --------------------------------------------------------------------------
# Invisible direction marks that WhatsApp (esp. iOS) sprinkles in exports.
INVISIBLES = dict.fromkeys(map(ord, "\u200e\u200f\u202a\u202b\u202c\u202d\u202e\ufeff"), None)

# Android: 12/03/24, 9:45 pm - Name: text     iOS: [12/03/24, 9:45:12 PM] Name: text
HEADER_RE = re.compile(
    r"^\[?(?P<d>\d{1,4}[/.\-]\d{1,2}[/.\-]\d{1,4}),?\s+"
    r"(?P<t>\d{1,2}[:.]\d{2}(?:[:.]\d{2})?)\s*(?P<ap>[APap]\.?\s?[Mm]\.?)?"
    r"(?:\]\s*|\s*-\s+)(?P<rest>.*)$"
)
MEDIA_RE = re.compile(
    r"^(<media omitted>|<attached:.*>|"
    r"(?:image|video|audio|sticker|gif|document|contact card|video note|voice message)\s+omitted|"
    r"null|view once (?:photo|video))$",
    re.IGNORECASE,
)
DELETED = {"this message was deleted", "you deleted this message", "this message was deleted.", "you deleted this message."}
EDIT_RE = re.compile(r"\s*<this message was edited>\s*$", re.IGNORECASE)


@dataclass
class Msg:
    dt: datetime
    sender: str
    text: str
    kind: str  # "text" | "media" | "deleted"
    words: int
    edited: bool = False


def split_sender(rest: str) -> Tuple[Optional[str], str]:
    """Return (sender, text) or (None, rest) for system lines."""
    low = rest.lower()
    if "end-to-end encrypted" in low or "created group" in low or "changed this group" in low:
        return None, rest
    if ": " in rest:
        name, text = rest.split(": ", 1)
        if len(name) <= 60:
            return name.strip(), text
    if rest.endswith(":") and len(rest) <= 61:
        return rest[:-1].strip(), ""
    return None, rest


def parse_raw_lines(lines: Sequence[str]) -> Tuple[List[Dict[str, Any]], List[str]]:
    raw, system = [], []
    current = None
    for line in lines:
        line = line.translate(INVISIBLES).replace("\u202f", " ").replace("\u00a0", " ").rstrip("\r\n")
        # Handle replacement char before AM/PM seen in some mobile exports
        line = re.sub(r"(\d{1,2}[:.]\d{2}(?:[:.]\d{2})?)\s*[\?\uFFFD]\s*([ap]\.?m\.?)", r"\1 \2", line, flags=re.IGNORECASE)
        m = HEADER_RE.match(line)
        if m:
            sender, text = split_sender(m.group("rest"))
            if sender is None:
                system.append(text)
                current = None
                continue
            current = {
                "d": m.group("d"),
                "t": m.group("t"),
                "ap": m.group("ap"),
                "sender": sender,
                "text": text,
            }
            raw.append(current)
        elif current is not None:
            current["text"] += "\n" + line
    return raw, system


def read_raw(path: Path) -> Tuple[List[Dict[str, Any]], List[str]]:
    with open(path, encoding="utf-8", errors="replace") as f:
        return parse_raw_lines(f)


def detect_date_order(raw: Sequence[Dict[str, Any]], forced: Optional[str]) -> str:
    if forced:
        return forced
    first_gt12 = second_gt12 = False
    for d in {r["d"] for r in raw}:
        a, b, _ = re.split(r"[/.\-]", d)
        if len(a) == 4:
            return "ymd"
        first_gt12 |= int(a) > 12
        second_gt12 |= int(b) > 12
    if first_gt12:
        return "dmy"
    if second_gt12:
        return "mdy"
    return "dmy"


def build_dt(r: Dict[str, Any], order: str) -> datetime:
    a, b, c = (int(x) for x in re.split(r"[/.\-]", r["d"]))
    if order == "ymd":
        y, mo, d = a, b, c
    elif order == "dmy":
        d, mo, y = a, b, c
    else:
        mo, d, y = a, b, c
    if y < 100:
        y += 2000
    parts = [int(x) for x in re.split(r"[:.]", r["t"])]
    h, mi, s = parts[0], parts[1], (parts[2] if len(parts) > 2 else 0)
    if r["ap"]:
        ap = r["ap"].replace(".", "").replace(" ", "").lower()
        if ap == "pm" and h < 12:
            h += 12
        elif ap == "am" and h == 12:
            h = 0
    return datetime(y, mo, d, h, mi, s)


def classify(text: str) -> Tuple[str, str, bool]:
    stripped = text.strip()
    edited = bool(EDIT_RE.search(stripped))
    text_clean = EDIT_RE.sub("", stripped)
    low = text_clean.lower()
    if MEDIA_RE.match(low) or "(file attached)" in low.split("\n")[0]:
        return "media", text_clean, edited
    if low in DELETED or "waiting for this message" in low:
        return "deleted", text_clean, edited
    return "text", text_clean, edited


def load_chat_from_lines(lines: Sequence[str], date_order: Optional[str] = None) -> Tuple[List[Msg], Dict[str, Any]]:
    raw, system = parse_raw_lines(lines)
    if not raw:
        raise ValueError("No WhatsApp messages found - is this an exported chat .txt file?")
    order = detect_date_order(raw, date_order)
    msgs, skipped = [], 0
    for r in raw:
        try:
            dt = build_dt(r, order)
        except (ValueError, IndexError):
            skipped += 1
            continue
        kind, text, edited = classify(r["text"])
        words = len(text.split()) if kind == "text" else 0
        msgs.append(Msg(dt, r["sender"], text, kind, words, edited))
    msgs.sort(key=lambda m: m.dt)
    missed_calls = sum(1 for s in system if "missed" in s.lower() and "call" in s.lower())
    return msgs, {
        "date_order": order,
        "skipped": skipped,
        "system_lines": len(system),
        "missed_calls": missed_calls,
    }


def load_chat(path: Path, date_order: Optional[str] = None) -> Tuple[List[Msg], Dict[str, Any]]:
    with open(path, encoding="utf-8", errors="replace") as f:
        return load_chat_from_lines(f, date_order)


# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------
def pct(sorted_vals: Sequence[float], p: float) -> Optional[float]:
    if not sorted_vals:
        return None
    k = (len(sorted_vals) - 1) * p / 100
    f = int(k)
    c = min(f + 1, len(sorted_vals) - 1)
    return sorted_vals[f] + (sorted_vals[c] - sorted_vals[f]) * (k - f)


def fmt_dur(sec: Optional[float]) -> str:
    if sec is None:
        return "n/a"
    sec = int(round(sec))
    if sec < 60:
        return f"{sec}s"
    m, s = divmod(sec, 60)
    if m < 60:
        return f"{m}m {s:02d}s"
    h, m = divmod(m, 60)
    if h < 24:
        return f"{h}h {m:02d}m"
    d, h = divmod(h, 24)
    return f"{d}d {h}h"


def share(a: float, b: float) -> str:
    return f"{a / b * 100:.1f}%" if b else "n/a"


def hour_label(h: int) -> str:
    return f"{h:02d}:00"


WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
BUCKETS = [
    ("Same minute", 0, 60),
    ("1-5 min", 60, 300),
    ("5-15 min", 300, 900),
    ("15-60 min", 900, 3600),
    ("1h+", 3600, float("inf")),
]


def reply_stats(vals: Sequence[float], prompt_vals: Optional[Sequence[float]] = None) -> Dict[str, Any]:
    if not vals:
        return {"count": 0}
    v = sorted(vals)
    n = len(v)
    slow = [x for x in v if x >= 60]
    geom_mean = math.exp(sum(math.log(max(x, 15.0)) for x in v) / n)
    pv = sorted(prompt_vals) if prompt_vals else v
    return {
        "count": n,
        "mean": sum(v) / n,
        "geom_mean": geom_mean,
        "median": pct(v, 50),
        "p90": pct(v, 90),
        "fastest": v[0],
        "within_1m": sum(x <= 60 for x in v) / n * 100,
        "within_5m": sum(x <= 300 for x in v) / n * 100,
        "within_1h": sum(x <= 3600 for x in v) / n * 100,
        "same_minute": sum(x < 60 for x in v) / n * 100,
        "after_pause_count": len(slow),
        "after_pause_median": pct(slow, 50) if slow else None,
        "after_pause_mean": sum(slow) / len(slow) if slow else None,
        "after_pause_p90": pct(slow, 90) if slow else None,
        "turn_prompt_median": pct(pv, 50) if pv else None,
        "buckets": [sum(lo <= x < hi for x in v) / n * 100 for _, lo, hi in BUCKETS],
    }


# --------------------------------------------------------------------------
# Main Analysis Pipeline
# --------------------------------------------------------------------------
def analyze(
    msgs: Sequence[Msg],
    reply_cap_h: float = 6.0,
    top_n: int = 15,
    extra_stop: Optional[set] = None,
    use_neural: bool = True,
    cache_dir: Optional[Path] = None,
) -> Dict[str, Any]:
    extra_stop = extra_stop or set()
    stop = STOPWORDS | EXCLUDED_TOP_WORDS | extra_stop
    reply_cap = reply_cap_h * 3600
    counts = Counter(m.sender for m in msgs)
    senders = [s for s, _ in counts.most_common()]

    participant_tokens, participant_skel_map = extract_participant_tokens(senders)

    per = {
        s: dict(
            messages=0, text_messages=0, media=0, deleted=0, edited=0,
            words=0, chars=0, links=0, questions=0, emojis_total=0,
            late_night=0, longest_msg_words=0,
            _emoji=Counter(), _words=Counter(),
        )
        for s in senders
    }
    word_variants: Dict[str, Dict[str, Counter]] = {s: defaultdict(Counter) for s in senders}
    hourly = {s: [0] * 24 for s in senders}
    weekday = {s: [0] * 7 for s in senders}
    monthly = {s: Counter() for s in senders}
    daily = {s: Counter() for s in senders}
    heat = [[0] * 24 for _ in range(7)]
    msg_emojis: List[List[str]] = [[] for _ in range(len(msgs))]

    for idx, m in enumerate(msgs):
        p = per[m.sender]
        p["messages"] += 1
        if m.edited:
            p["edited"] += 1
        hourly[m.sender][m.dt.hour] += 1
        weekday[m.sender][m.dt.weekday()] += 1
        monthly[m.sender][m.dt.strftime("%Y-%m")] += 1
        daily[m.sender][m.dt.date()] += 1
        heat[m.dt.weekday()][m.dt.hour] += 1
        if m.dt.hour < 5:
            p["late_night"] += 1
        if m.kind == "media":
            p["media"] += 1
            continue
        if m.kind == "deleted":
            p["deleted"] += 1
            continue

        p["text_messages"] += 1
        p["words"] += m.words
        p["chars"] += len(m.text)
        p["longest_msg_words"] = max(p["longest_msg_words"], m.words)
        p["links"] += len(URL_RE.findall(m.text))
        if is_question_message(m.text):
            p["questions"] += 1

        emos = extract_emojis(m.text)
        msg_emojis[idx] = emos
        for e in emos:
            p["_emoji"][e] += 1
            p["emojis_total"] += 1

        clean = normalize_quotes(URL_RE.sub(" ", m.text.lower()))
        for raw_w in WORD_RE.findall(clean):
            raw_clean = raw_w.strip("'")
            if not raw_clean:
                continue
            canon = canonicalize_word(raw_clean, participant_tokens, participant_skel_map)
            if not canon:
                continue
            is_protected = canon in participant_tokens
            if is_protected or (len(canon) >= 3 and canon not in stop):
                p["_words"][canon] += 1
                word_variants[m.sender][canon][raw_clean] += 1

    # --- Conversation Flow: Bye / Byee / Byeee... Segmentation ---
    flow = segment_conversations(msgs, reply_cap)
    starters = flow["starters"]
    enders = flow["enders"]
    bursts = flow["bursts"]
    replies = flow["replies"]
    turn_prompt_replies = flow["turn_prompt_replies"]
    total_conversations = flow["total_conversations"]
    total_chat_hours = flow["total_chat_hours"]

    # --- Time / Date Aggregates & Exact Streaks ---
    daily_total: Counter = Counter()
    for s in senders:
        daily_total.update(daily[s])
    active_days = sorted(daily_total)
    first_day, last_day = active_days[0], active_days[-1]
    span_days = (last_day - first_day).days + 1

    longest_streak = streak = 1
    cur_start = active_days[0]
    best_start = best_end = active_days[0]
    longest_silence = 0
    for a, b in zip(active_days, active_days[1:]):
        delta = (b - a).days
        if delta == 1:
            streak += 1
        else:
            streak = 1
            cur_start = b
            longest_silence = max(longest_silence, delta - 1)
        if streak > longest_streak:
            longest_streak = streak
            best_start = cur_start
            best_end = b

    overall_hour = [sum(hourly[s][h] for s in senders) for h in range(24)]
    overall_wd = [sum(weekday[s][d] for s in senders) for d in range(7)]
    monthly_total: Counter = Counter()
    for s in senders:
        monthly_total.update(monthly[s])

    total_msgs = len(msgs)
    total_words = sum(per[s]["words"] for s in senders)

    for s in senders:
        p = per[s]
        p["avg_words_per_msg"] = p["words"] / p["text_messages"] if p["text_messages"] else 0
        p["avg_chars_per_msg"] = p["chars"] / p["text_messages"] if p["text_messages"] else 0
        top_w = p.pop("_words").most_common(top_n)
        p["top_words"] = top_w
        p["top_words_variants"] = {
            w: [list(pair) for pair in word_variants[s][w].most_common(5)]
            for w, _ in top_w
        }
        p["top_emojis"] = p.pop("_emoji").most_common(top_n)
        p["peak_hour"] = max(range(24), key=lambda h: hourly[s][h])
        p["avg_burst"] = sum(bursts[s]) / len(bursts[s]) if bursts[s] else 0
        p["longest_burst"] = max(bursts[s]) if bursts[s] else 0
        p["starts"] = starters[s]
        p["ends"] = enders[s]
        p["reply"] = reply_stats(replies[s], turn_prompt_replies[s])

    # --- Advanced NLP, Pragmatics, Intimacy, Intent & Fun Engines ---
    adv = run_advanced_nlp(
        msgs=msgs,
        senders=senders,
        msg_emojis=msg_emojis,
        participant_tokens=participant_tokens,
        participant_skel_map=participant_skel_map,
        word_variants=word_variants,
        use_neural=use_neural,
        cache_dir=cache_dir,
    )
    for s in senders:
        if s in adv["longest_messages"]["per_sender"]:
            per[s]["longest_msg_words"] = adv["longest_messages"]["per_sender"][s]["words"]

    return {
        "senders": senders,
        "participant_tokens": sorted(participant_tokens),
        "overview": {
            "first_message": msgs[0].dt.isoformat(sep=" "),
            "last_message": msgs[-1].dt.isoformat(sep=" "),
            "span_days": span_days,
            "active_days": len(active_days),
            "silent_days": span_days - len(active_days),
            "total_messages": total_msgs,
            "total_words": total_words,
            "messages_per_day": total_msgs / span_days,
            "words_per_day": total_words / span_days,
            "longest_daily_streak": longest_streak,
            "streak_started": best_start.isoformat(),
            "streak_ended": best_end.isoformat(),
            "current_streak": streak,
            "longest_silence_days": longest_silence,
            "peak_hour": max(range(24), key=lambda h: overall_hour[h]),
            "peak_weekday": WEEKDAYS[max(range(7), key=lambda d: overall_wd[d])],
            "busiest_month": monthly_total.most_common(1)[0],
            "reply_cap_hours": reply_cap_h,
            "session_rule": "bye_cluster",
            "total_conversations": total_conversations,
            "total_chat_hours": total_chat_hours,
        },
        "per_sender": per,
        "hourly": hourly,
        "weekday": weekday,
        "monthly": {s: dict(monthly[s]) for s in senders},
        "monthly_total": dict(sorted(monthly_total.items())),
        "top_days": [(d.isoformat(), c) for d, c in daily_total.most_common(5)],
        **adv,
        "_daily_total": daily_total,
        "_heat": heat,
        "_overall_hour": overall_hour,
        "_overall_wd": overall_wd,
    }


def analyze_text(
    raw_text: str,
    date_order: Optional[str] = None,
    reply_cap_h: float = 6.0,
    top_n: int = 15,
    extra_stop: Optional[set] = None,
    use_neural: bool = True,
    cache_dir: Optional[Path] = None,
) -> Tuple[Dict[str, Any], Dict[str, Any], str]:
    """Analyze a raw WhatsApp chat string completely in memory and return (res, load_info, daily_csv)."""
    lines = raw_text.splitlines()
    msgs, info = load_chat_from_lines(lines, date_order=date_order)
    res = analyze(msgs, reply_cap_h=reply_cap_h, top_n=top_n, extra_stop=extra_stop, use_neural=use_neural, cache_dir=cache_dir)
    daily_lines = ["date,messages"] + [f"{d.isoformat()},{c}" for d, c in sorted(res["_daily_total"].items())]
    summary = {k: v for k, v in res.items() if not k.startswith("_")}
    summary["heatmap"] = res["_heat"]
    return summary, info, "\n".join(daily_lines)


# --------------------------------------------------------------------------
# Console Report
# --------------------------------------------------------------------------
def banner(title: str) -> None:
    print("\n" + "=" * 78)
    print(f"  {title}")
    print("=" * 78)


def table(headers: Sequence[str], rows: Sequence[Sequence[str]]) -> None:
    widths = [max(len(str(x)) for x in col) for col in zip(headers, *rows)]
    line = " | ".join(str(h).ljust(w) if i == 0 else str(h).rjust(w) for i, (h, w) in enumerate(zip(headers, widths)))
    print(line)
    print("-" * len(line))
    for r in rows:
        print(" | ".join(str(c).ljust(w) if i == 0 else str(c).rjust(w) for i, (c, w) in enumerate(zip(r, widths))))


def print_report(res: Dict[str, Any], load_info: Dict[str, Any], file_name: str, reveal_sensitive: bool = False) -> None:
    S, per, ov = res["senders"], res["per_sender"], res["overview"]
    tm, tw = ov["total_messages"], ov["total_words"]
    em = res.get("engine_meta", {})

    banner(f"WHATSAPP CHAT ANALYSIS  -  {file_name}")
    print(f"Period        : {ov['first_message'][:16]}  ->  {ov['last_message'][:16]}  ({ov['span_days']} days)")
    print(f"Date format   : {load_info['date_order'].upper()}   |  system lines ignored: {load_info['system_lines']:,}"
          f"   |  unparseable: {load_info['skipped']}")
    print(f"Participants  : {', '.join(S)}")
    print(f"Total messages: {tm:,}   ({ov['messages_per_day']:.1f}/day)")
    print(f"Total words   : {tw:,}   ({ov['words_per_day']:.1f}/day)")
    print(f"Active days   : {ov['active_days']} of {ov['span_days']}   (silent days: {ov['silent_days']})")
    print(f"Conversations : {ov['total_conversations']:,} (split after 'Bye / Byee / Byeee...')")
    print(f"Hours chatting: {ov['total_chat_hours']:,.1f} h  (active engagement hours)")
    if em.get("neural_used"):
        print(f"Neural AI     : Active ({em['neural_device'].upper()}, verified {em['ambiguous_verified']:,} ambiguous turns)")

    banner("PER PERSON")
    metrics = [
        ("Messages", lambda p: f"{p['messages']:,}"),
        ("  share of messages", lambda p: share(p["messages"], tm)),
        ("Text messages", lambda p: f"{p['text_messages']:,}"),
        ("Words", lambda p: f"{p['words']:,}"),
        ("  share of words", lambda p: share(p["words"], tw)),
        ("Avg words / message", lambda p: f"{p['avg_words_per_msg']:.2f}"),
        ("Longest message (words)", lambda p: f"{p['longest_msg_words']:,}"),
        ("Media sent", lambda p: f"{p['media']:,}"),
        ("Edited messages", lambda p: f"{p['edited']:,}"),
        ("Deleted messages", lambda p: f"{p['deleted']:,}"),
        ("Links shared", lambda p: f"{p['links']:,}"),
        ("Questions asked", lambda p: f"{p['questions']:,}"),
        ("Emojis used", lambda p: f"{p['emojis_total']:,}"),
        ("Late-night msgs (12-5am)", lambda p: f"{p['late_night']:,} ({share(p['late_night'], p['messages'])})"),
        ("Peak hour", lambda p: hour_label(p["peak_hour"])),
    ]
    table(["Metric"] + S, [[name] + [fn(per[s]) for s in S] for name, fn in metrics])

    banner("5-WAY CONVERSATIONAL VIBE & FLIRT SCORE")
    disc = res["discourse"]
    ov_d = disc["overall_pct"]
    print(
        f"Overall: Flirting {ov_d['flirting']}% | Normal {ov_d['normal']}% | Facts/Info {ov_d['facts_info']}% | "
        f"Teasing {ov_d['teasing']}% | Arguments {ov_d['arguments']}%"
    )
    fa = disc["flirt_analysis"]
    print(f"Flirts the MOST: {fa['most_flirt_winner']}  |  Flirts the BEST: {fa['best_flirt_winner']}")
    table(
        ["Vibe / Flirt Metric"] + S,
        [
            ["Flirting %"] + [f"{disc['per_sender_pct'][s]['flirting']}%" for s in S],
            ["Normal Talks %"] + [f"{disc['per_sender_pct'][s]['normal']}%" for s in S],
            ["Facts / Info %"] + [f"{disc['per_sender_pct'][s]['facts_info']}%" for s in S],
            ["Teasing & Making Fun %"] + [f"{disc['per_sender_pct'][s]['teasing']}%" for s in S],
            ["Arguments / Disagreements %"] + [f"{disc['per_sender_pct'][s]['arguments']}%" for s in S],
            ["Flirt Count"] + [f"{fa['per_sender'][s]['count']:,}" for s in S],
            ["Flirt Best (Rizz) Score"] + [f"{fa['per_sender'][s]['best_score']} / 100" for s in S],
        ],
    )

    banner("APOLOGIES & PEACEKEEPING ('SORRY' TRACKER)")
    ap = res["apologies"]
    print(f"Apology episodes: {ap['total_episodes']:,}  |  Says Sorry First Leader: {ap['sorry_first_leader']}")
    if ap["median_makeup_minutes"] is not None:
        print(f"Median post-argument apology time: {ap['median_makeup_minutes']} min")
    table(
        ["Sorry Metric"] + S,
        [
            ["Total 'Sorry' messages"] + [f"{ap['per_sender'][s]['sorry_count']:,}" for s in S],
            ["Said 'Sorry' FIRST"] + [f"{ap['per_sender'][s]['said_sorry_first']:,}" for s in S],
            ["Post-argument Peacekeeper"] + [f"{ap['per_sender'][s]['post_argument_sorry_first']:,}" for s in S],
        ],
    )

    banner("PHOTO REQUESTS & LONGING / MEETING")
    pr = res["photo_requests"]
    lm = res["longing_and_meeting"]
    table(
        ["Intent Metric"] + S,
        [
            ["Asked for a picture (Total)"] + [f"{pr[s]['total']:,} ({pr[s]['fulfillment_pct']}% fulfilled)" for s in S],
            ["  Direct pic asks"] + [f"{pr[s]['direct_asks']:,}" for s in S],
            ["  'Want to see you' asks"] + [f"{pr[s]['visual_desire_asks']:,}" for s in S],
            ["'Missing You' total"] + [f"{lm[s]['miss_you_total']:,} ({lm[s]['miss_you_initiated']:,} unprompted)" for s in S],
            ["Desire to Meet Up"] + [f"{lm[s]['desire_to_meet']:,}" for s in S],
        ],
    )

    banner("INTIMACY, PET NAMES & SENSORY ESCALATIONS")
    intim = res["intimacy"]
    print(f"Escalation Leader: {intim['escalation_leader']}  |  Tracked events: {len(intim['escalations'])}")
    print("Top Pet Names:", ", ".join(f"{n['term']} ({n['total_count']:,})" for n in intim["nicknames"][:10]))
    for skey, sinfo in intim["sensory_and_physical_cues"].items():
        counts_str = ", ".join(f"{s}: {sinfo['per_sender'][s]}" for s in S)
        print(f"  {sinfo['label']:<32}: {sinfo['total']:,}  ({counts_str})")

    banner("MONUMENTAL LONGEST MESSAGES")
    ov_l = res["longest_messages"]["overall"]
    if ov_l:
        print(f"#1 Overall: {ov_l['sender']} on {ov_l['date_display']} at {ov_l['time_display']} ({ov_l['words']} words, {ov_l.get('unique_words', '?')} unique)")
    for s in S:
        lm_s = res["longest_messages"]["per_sender"].get(s)
        if lm_s:
            preview = "[SENSITIVE BLURRED]" if (lm_s["sensitive"] and not reveal_sensitive) else lm_s["text"][:160].replace("\n", " ")
            print(f"  {s}: {lm_s['words']} words ({lm_s['date_display']} {lm_s['time_display']}) -> {preview}...")

    banner("CONVERSATION DYNAMICS  (new conversation = after 'Bye / Byee / Byeee...')")
    total_starts = sum(per[s]["starts"] for s in S)
    total_ends = sum(per[s]["ends"] for s in S)
    table(
        ["Metric"] + S,
        [
            ["Conversations started"] + [f"{per[s]['starts']:,} ({share(per[s]['starts'], total_starts)})" for s in S],
            ["Last word of a conversation"] + [f"{per[s]['ends']:,} ({share(per[s]['ends'], total_ends)})" for s in S],
            ["Avg messages in a row"] + [f"{per[s]['avg_burst']:.2f}" for s in S],
            ["Longest run in a row"] + [f"{per[s]['longest_burst']:,}" for s in S],
            ["Median reply (after pause)"] + [fmt_dur(per[s]["reply"].get("after_pause_median")) for s in S],
        ],
    )

    banner("TOP WORDS & EMOJIS (generalized participant names + abbooo kept; filler words removed)")
    for s in S:
        print(f"\n{s}")
        print("  Words : " + ", ".join(f"{w} ({c:,})" for w, c in per[s]["top_words"]))
        print("  Emojis: " + (", ".join(f"{e} {c:,}" for e, c in per[s]["top_emojis"]) or "none"))
    print()


# --------------------------------------------------------------------------
# Exports & Charts
# --------------------------------------------------------------------------
def save_data(res: Dict[str, Any], outdir: Path) -> None:
    S, per = res["senders"], res["per_sender"]
    summary = {k: v for k, v in res.items() if not k.startswith("_")}
    summary["heatmap"] = res["_heat"]
    (outdir / "summary.json").write_text(json.dumps(summary, indent=2, ensure_ascii=False, default=str), encoding="utf-8")

    cols = [
        "messages", "text_messages", "words", "chars", "avg_words_per_msg", "media", "edited", "deleted",
        "links", "questions", "emojis_total", "late_night", "peak_hour", "starts", "ends", "avg_burst", "longest_burst",
    ]
    with open(outdir / "per_sender.csv", "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow(["sender"] + cols + ["reply_median_s", "reply_mean_s", "reply_p90_s"])
        for s in S:
            r = per[s]["reply"]
            w.writerow([s] + [per[s][c] for c in cols] + [r.get("median", ""), r.get("mean", ""), r.get("p90", "")])

    with open(outdir / "hourly.csv", "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow(["hour"] + S)
        for h in range(24):
            w.writerow([h] + [res["hourly"][s][h] for s in S])

    with open(outdir / "daily.csv", "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow(["date", "total"])
        for d, c in sorted(res["_daily_total"].items()):
            w.writerow([d.isoformat(), c])


def make_charts(res: Dict[str, Any], outdir: Path) -> List[str]:
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
    except ImportError:
        print("matplotlib not installed - skipping charts.")
        return []

    S = res["senders"]
    cmap = plt.get_cmap("tab10")
    saved = []

    def save(fig, name):
        fig.tight_layout()
        fig.savefig(outdir / name, dpi=150)
        plt.close(fig)
        saved.append(name)

    fig, ax = plt.subplots(figsize=(11, 5))
    n = len(S)
    w = 0.8 / max(1, n)
    for i, s in enumerate(S):
        ax.bar([h + (i - (n - 1) / 2) * w for h in range(24)], res["hourly"][s], width=w, label=s, color=cmap(i))
    ax.set_xticks(range(24))
    ax.set_xlabel("Hour of day")
    ax.set_ylabel("Messages")
    ax.set_title("When do you talk? Messages by hour")
    ax.legend()
    save(fig, "1_messages_by_hour.png")

    fig, ax = plt.subplots(figsize=(11, 4.5))
    im = ax.imshow(res["_heat"], aspect="auto", cmap="magma")
    ax.set_yticks(range(7))
    ax.set_yticklabels(WEEKDAYS)
    ax.set_xticks(range(24))
    ax.set_xlabel("Hour of day")
    ax.set_title("Activity heatmap (weekday x hour)")
    fig.colorbar(im, ax=ax, label="Messages")
    save(fig, "2_heatmap_weekday_hour.png")

    months = list(res["monthly_total"])
    fig, ax = plt.subplots(figsize=(11, 5))
    bottom = [0] * len(months)
    for i, s in enumerate(S):
        vals = [res["monthly"][s].get(m, 0) for m in months]
        ax.bar(months, vals, bottom=bottom, label=s, color=cmap(i))
        bottom = [b + v for b, v in zip(bottom, vals)]
    ax.set_ylabel("Messages")
    ax.set_title("Messages per month")
    ax.tick_params(axis="x", rotation=45)
    ax.legend()
    save(fig, "3_messages_per_month.png")

    daily = res["_daily_total"]
    first, last = min(daily), max(daily)
    days = [first + timedelta(days=i) for i in range((last - first).days + 1)]
    vals = [daily.get(d, 0) for d in days]
    roll = [sum(vals[max(0, i - 6) : i + 1]) / len(vals[max(0, i - 6) : i + 1]) for i in range(len(vals))]
    fig, ax = plt.subplots(figsize=(11, 5))
    ax.plot(days, vals, alpha=0.35, label="Daily")
    ax.plot(days, roll, linewidth=2, label="7-day average")
    ax.set_ylabel("Messages")
    ax.set_title("Daily message volume")
    ax.legend()
    save(fig, "4_daily_timeline.png")

    labels = [b[0] for b in BUCKETS]
    fig, ax = plt.subplots(figsize=(9, 5))
    for i, s_ in enumerate(S):
        vals = res["per_sender"][s_]["reply"].get("buckets", [0] * len(labels))
        bars = ax.bar([k + (i - (n - 1) / 2) * w for k in range(len(labels))], vals, width=w, label=s_, color=cmap(i))
        ax.bar_label(bars, fmt="%.0f%%", fontsize=8)
    ax.set_xticks(range(len(labels)))
    ax.set_xticklabels(labels)
    ax.set_ylabel("% of replies")
    ax.set_title("How fast do you reply?")
    ax.legend()
    save(fig, "5_reply_time_distribution.png")

    fig, axes = plt.subplots(1, 2, figsize=(9, 4.5))
    for ax, key, title in zip(axes, ["messages", "words"], ["Messages", "Words"]):
        ax.pie([res["per_sender"][s][key] for s in S], labels=S, autopct="%1.1f%%", colors=[cmap(i) for i in range(len(S))], startangle=90)
        ax.set_title(title)
    save(fig, "6_share_messages_words.png")
    return saved


def find_default_file() -> Optional[Path]:
    search_dirs = [Path.cwd(), Path.cwd().parent, CODE_DIR, CODE_DIR.parent]
    cands: List[Path] = []
    for d in search_dirs:
        if d.exists():
            cands.extend(d.glob("*.txt"))
    # Deduplicate by resolved path
    seen = {}
    for p in cands:
        rp = p.resolve()
        if "readme" not in rp.name.lower() and "requirements" not in rp.name.lower():
            seen[rp] = rp
    unique = sorted(seen.values(), key=lambda p: (p.stat().st_mtime, p.stat().st_size), reverse=True)
    pref = [p for p in unique if "whatsapp" in p.name.lower() or p.name.lower().startswith("_chat") or "chat" in p.name.lower()]
    return (pref or unique or [None])[0]


def main() -> None:
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

    ap = argparse.ArgumentParser(description="All-in-one WhatsApp chat analyzer")
    ap.add_argument("file", nargs="?", help="exported WhatsApp chat .txt (auto-detected if omitted)")
    ap.add_argument("--date-order", choices=["dmy", "mdy"], help="force DD/MM or MM/DD (default: auto-detect)")
    ap.add_argument("--reply-cap-hours", type=float, default=6, help="ignore reply gaps longer than this (default 6)")
    ap.add_argument("--top", type=int, default=15, help="how many top words/emojis to list (default 15)")
    ap.add_argument("--stopwords", default="", help="extra comma-separated words to ignore in top words")
    ap.add_argument("--out", help="output folder (default: chat_analysis_output next to the chat file)")
    ap.add_argument("--no-charts", action="store_true", help="skip PNG charts")
    ap.add_argument("--no-neural", action="store_true", help="skip optional local neural prototype verification")
    ap.add_argument("--reveal-sensitive", action="store_true", help="print sensitive longest message previews unmasked in terminal")
    args = ap.parse_args()

    path = Path(args.file) if args.file else find_default_file()
    if not path or not path.exists():
        sys.exit("Chat file not found. Pass the path: python analyze_chat.py <chat.txt>")

    outdir = Path(args.out) if args.out else path.resolve().parent / "chat_analysis_output"
    outdir.mkdir(parents=True, exist_ok=True)
    cache_dir = CODE_DIR / ".cache"

    print(f"Reading {path} ...")
    msgs, info = load_chat(path, args.date_order)
    extra = {w.strip().lower() for w in args.stopwords.split(",") if w.strip()}
    res = analyze(
        msgs,
        reply_cap_h=args.reply_cap_hours,
        top_n=args.top,
        extra_stop=extra,
        use_neural=not args.no_neural,
        cache_dir=cache_dir,
    )

    print_report(res, info, path.name, reveal_sensitive=args.reveal_sensitive)
    save_data(res, outdir)
    charts = [] if args.no_charts else make_charts(res, outdir)
    print(f"Saved summary.json + CSVs{' + ' + str(len(charts)) + ' charts' if charts else ''} to: {outdir}")


if __name__ == "__main__":
    main()
