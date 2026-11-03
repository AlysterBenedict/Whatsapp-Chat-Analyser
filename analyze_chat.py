#!/usr/bin/env python3
"""
WhatsApp Chat Analyzer - all-in-one
===================================
Works with Android and iOS exports (without media), 1-on-1 or group chats.

Usage (PowerShell / Anaconda Prompt):
    python analyze_chat.py "chat.txt"
    python analyze_chat.py                      # auto-picks a WhatsApp .txt in this folder
    python analyze_chat.py chat.txt --date-order dmy --no-charts

Outputs:
    * A full text report in the console
    * <out>/summary.json, per_sender.csv, hourly.csv, daily.csv
    * <out>/*.png charts (needs matplotlib; skipped automatically if missing)
"""

import argparse
import csv
import json
import re
import sys
from collections import Counter
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from pathlib import Path

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
    r"(image|video|audio|sticker|gif|document|contact card|video note|voice message)\s+omitted)$"
)
DELETED = {"this message was deleted", "you deleted this message", "this message was deleted."}
EDIT_RE = re.compile(r"\s*<this message was edited>\s*$", re.I)
URL_RE = re.compile(r"(https?://\S+|www\.\S+)", re.I)
WORD_RE = re.compile(r"[a-zA-Z']+")
EMOJI_RE = re.compile("[\U0001F300-\U0001FAFF\u2600-\u27BF\u2B50\u2B55]")
SKIN_TONES = set("\U0001F3FB\U0001F3FC\U0001F3FD\U0001F3FE\U0001F3FF")

STOPWORDS = set("""
a about above after again all also am an and any are aren't as at be because been before being below
between both but by can can't cannot could couldn't did didn't do does doesn't doing don't down during
each few for from further get got had hadn't has hasn't have haven't having he her here hers him his how
i i'd i'll i'm i've if in into is isn't it it's its just let like me more most my no nor not now of off
on once only or other our ours out over own same she should shouldn't so some such than that that's the
their theirs them then there these they this those through to too under until up very was wasn't we we'd
we'll we're we've were weren't what when where which while who whom why will with won't would wouldn't
you you'd you'll you're you've your yours yeah yes ok okay oh one will go going want
""".split())


@dataclass
class Msg:
    dt: datetime
    sender: str
    text: str
    kind: str  # "text" | "media" | "deleted"
    words: int


def split_sender(rest):
    """Return (sender, text) or (None, rest) for system lines."""
    if "end-to-end encrypted" in rest.lower():
        return None, rest
    if ": " in rest:
        name, text = rest.split(": ", 1)
        if len(name) <= 60:
            return name.strip(), text
    if rest.endswith(":") and len(rest) <= 61:
        return rest[:-1].strip(), ""
    return None, rest


def read_raw(path):
    raw, system = [], []
    current = None
    with open(path, encoding="utf-8", errors="replace") as f:
        for line in f:
            line = line.translate(INVISIBLES).replace("\u202f", " ").replace("\u00a0", " ").rstrip("\r\n")
            m = HEADER_RE.match(line)
            if m:
                sender, text = split_sender(m.group("rest"))
                if sender is None:          # system line (join/leave/call/encryption notice...)
                    system.append(text)
                    current = None
                    continue
                current = {"d": m.group("d"), "t": m.group("t"), "ap": m.group("ap"),
                           "sender": sender, "text": text}
                raw.append(current)
            elif current is not None:       # continuation of a multi-line message
                current["text"] += "\n" + line
    return raw, system


def detect_date_order(raw, forced):
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
    print("! Date order is ambiguous in this file - assuming DD/MM (use --date-order mdy to change).")
    return "dmy"


def build_dt(r, order):
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


def classify(text):
    text = EDIT_RE.sub("", text.strip())
    low = text.lower()
    if MEDIA_RE.match(low) or "(file attached)" in low.split("\n")[0]:
        return "media", text
    if low in DELETED:
        return "deleted", text
    return "text", text


def load_chat(path, date_order=None):
    raw, system = read_raw(path)
    if not raw:
        sys.exit("No WhatsApp messages found - is this an exported chat .txt file?")
    order = detect_date_order(raw, date_order)
    msgs, skipped = [], 0
    for r in raw:
        try:
            dt = build_dt(r, order)
        except (ValueError, IndexError):
            skipped += 1
            continue
        kind, text = classify(r["text"])
        words = len(text.split()) if kind == "text" else 0
        msgs.append(Msg(dt, r["sender"], text, kind, words))
    msgs.sort(key=lambda m: m.dt)  # stable: keeps file order for equal timestamps
    missed_calls = sum(1 for s in system if "missed" in s.lower() and "call" in s.lower())
    return msgs, {"date_order": order, "skipped": skipped, "system_lines": len(system),
                  "missed_calls": missed_calls}


# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------
def pct(sorted_vals, p):
    if not sorted_vals:
        return None
    k = (len(sorted_vals) - 1) * p / 100
    f = int(k)
    c = min(f + 1, len(sorted_vals) - 1)
    return sorted_vals[f] + (sorted_vals[c] - sorted_vals[f]) * (k - f)


def fmt_dur(sec):
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


def share(a, b):
    return f"{a / b * 100:.1f}%" if b else "n/a"


def hour_label(h):
    return f"{h:02d}:00"


WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


# --------------------------------------------------------------------------
# Analysis
# --------------------------------------------------------------------------
# WhatsApp timestamps have no seconds, so a reply in the same minute shows as a 0s gap.
BUCKETS = [("Same minute", 0, 60), ("1-5 min", 60, 300), ("5-15 min", 300, 900),
           ("15-60 min", 900, 3600), ("1h+", 3600, float("inf"))]


def reply_stats(vals):
    if not vals:
        return {"count": 0}
    v = sorted(vals)
    n = len(v)
    slow = [x for x in v if x >= 60]  # replies after a real pause (not rapid-fire)
    return {
        "count": n, "mean": sum(v) / n, "median": pct(v, 50), "p90": pct(v, 90), "fastest": v[0],
        "within_1m": sum(x <= 60 for x in v) / n * 100,
        "within_5m": sum(x <= 300 for x in v) / n * 100,
        "within_1h": sum(x <= 3600 for x in v) / n * 100,
        "same_minute": sum(x < 60 for x in v) / n * 100,
        "after_pause_count": len(slow),
        "after_pause_median": pct(slow, 50) if slow else None,
        "after_pause_mean": sum(slow) / len(slow) if slow else None,
        "after_pause_p90": pct(slow, 90) if slow else None,
        "buckets": [sum(lo <= x < hi for x in v) / n * 100 for _, lo, hi in BUCKETS],
    }


def analyze(msgs, reply_cap_h, session_gap_h, top_n, extra_stop):
    stop = STOPWORDS | extra_stop
    reply_cap, session_gap = reply_cap_h * 3600, session_gap_h * 3600
    counts = Counter(m.sender for m in msgs)
    senders = [s for s, _ in counts.most_common()]

    per = {s: dict(messages=0, text_messages=0, media=0, deleted=0, words=0, chars=0, links=0,
                   questions=0, emojis_total=0, late_night=0, longest_msg_words=0,
                   _emoji=Counter(), _words=Counter()) for s in senders}
    hourly = {s: [0] * 24 for s in senders}
    weekday = {s: [0] * 7 for s in senders}
    monthly = {s: Counter() for s in senders}
    daily = {s: Counter() for s in senders}
    heat = [[0] * 24 for _ in range(7)]

    for m in msgs:
        p = per[m.sender]
        p["messages"] += 1
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
        p["questions"] += "?" in m.text
        for e in EMOJI_RE.findall(m.text):
            if e not in SKIN_TONES:
                p["_emoji"][e] += 1
                p["emojis_total"] += 1
        clean = URL_RE.sub(" ", m.text.lower())
        for w in WORD_RE.findall(clean):
            w = w.strip("'")
            if len(w) >= 3 and w not in stop:
                p["_words"][w] += 1

    # --- conversation flow: replies, initiations, bursts ------------------
    replies = {s: [] for s in senders}
    starters, enders = Counter(), Counter()
    bursts = {s: [] for s in senders}
    prev, burst = None, 0
    for m in msgs:
        if prev is None:
            starters[m.sender] += 1
            burst = 1
        else:
            gap = (m.dt - prev.dt).total_seconds()
            new_session = gap > session_gap
            if new_session:
                starters[m.sender] += 1
                enders[prev.sender] += 1
            if m.sender != prev.sender and 0 <= gap <= reply_cap:
                replies[m.sender].append(gap)
            if new_session or m.sender != prev.sender:
                bursts[prev.sender].append(burst)
                burst = 1
            else:
                burst += 1
        prev = m
    enders[prev.sender] += 1
    bursts[prev.sender].append(burst)

    # --- time/date aggregates ----------------------------------------------
    daily_total = Counter()
    for s in senders:
        daily_total.update(daily[s])
    active_days = sorted(daily_total)
    first_day, last_day = active_days[0], active_days[-1]
    span_days = (last_day - first_day).days + 1

    longest_streak = streak = 1
    streak_end = active_days[0]
    longest_silence = 0
    for a, b in zip(active_days, active_days[1:]):
        delta = (b - a).days
        if delta == 1:
            streak += 1
        else:
            streak = 1
            longest_silence = max(longest_silence, delta - 1)
        if streak > longest_streak:
            longest_streak, streak_end = streak, b

    overall_hour = [sum(hourly[s][h] for s in senders) for h in range(24)]
    overall_wd = [sum(weekday[s][d] for s in senders) for d in range(7)]
    monthly_total = Counter()
    for s in senders:
        monthly_total.update(monthly[s])

    total_msgs = len(msgs)
    total_words = sum(per[s]["words"] for s in senders)

    for s in senders:
        p = per[s]
        p["avg_words_per_msg"] = p["words"] / p["text_messages"] if p["text_messages"] else 0
        p["avg_chars_per_msg"] = p["chars"] / p["text_messages"] if p["text_messages"] else 0
        p["top_words"] = p.pop("_words").most_common(top_n)
        p["top_emojis"] = p.pop("_emoji").most_common(top_n)
        p["peak_hour"] = max(range(24), key=lambda h: hourly[s][h])
        p["avg_burst"] = sum(bursts[s]) / len(bursts[s]) if bursts[s] else 0
        p["longest_burst"] = max(bursts[s]) if bursts[s] else 0
        p["starts"] = starters[s]
        p["ends"] = enders[s]
        p["reply"] = reply_stats(replies[s])

    # Total chat hours: sum of session durations (session = messages within session_gap of each other).
    # Only counts wall-clock time while the conversation was actively live; ignores silence between sessions.
    _chat_secs = 0
    _sess_start = msgs[0].dt
    _sess_last = msgs[0].dt
    for _m in msgs[1:]:
        _gap = (_m.dt - _sess_last).total_seconds()
        if _gap > session_gap:
            _chat_secs += (_sess_last - _sess_start).total_seconds()
            _sess_start = _m.dt
        _sess_last = _m.dt
    _chat_secs += (_sess_last - _sess_start).total_seconds()
    total_chat_hours = _chat_secs / 3600

    return {
        "senders": senders,
        "overview": {
            "first_message": msgs[0].dt.isoformat(sep=" "), "last_message": msgs[-1].dt.isoformat(sep=" "),
            "span_days": span_days, "active_days": len(active_days), "silent_days": span_days - len(active_days),
            "total_messages": total_msgs, "total_words": total_words,
            "messages_per_day": total_msgs / span_days, "words_per_day": total_words / span_days,
            "longest_daily_streak": longest_streak, "streak_ended": streak_end.isoformat(),
            "longest_silence_days": longest_silence,
            "peak_hour": max(range(24), key=lambda h: overall_hour[h]),
            "peak_weekday": WEEKDAYS[max(range(7), key=lambda d: overall_wd[d])],
            "busiest_month": monthly_total.most_common(1)[0],
            "reply_cap_hours": reply_cap_h, "session_gap_hours": session_gap_h,
            "total_chat_hours": total_chat_hours,
        },
        "per_sender": per,
        "hourly": hourly, "weekday": weekday,
        "monthly": {s: dict(monthly[s]) for s in senders},
        "monthly_total": dict(sorted(monthly_total.items())),
        "top_days": [(d.isoformat(), c) for d, c in daily_total.most_common(5)],
        "_daily_total": daily_total, "_heat": heat,
        "_overall_hour": overall_hour, "_overall_wd": overall_wd,
    }


# --------------------------------------------------------------------------
# Report
# --------------------------------------------------------------------------
def banner(title):
    print("\n" + "=" * 78)
    print(f"  {title}")
    print("=" * 78)


def table(headers, rows):
    widths = [max(len(str(x)) for x in col) for col in zip(headers, *rows)]
    line = " | ".join(str(h).ljust(w) if i == 0 else str(h).rjust(w) for i, (h, w) in enumerate(zip(headers, widths)))
    print(line)
    print("-" * len(line))
    for r in rows:
        print(" | ".join(str(c).ljust(w) if i == 0 else str(c).rjust(w) for i, (c, w) in enumerate(zip(r, widths))))


def print_report(res, load_info, file_name):
    S, per, ov = res["senders"], res["per_sender"], res["overview"]
    tm, tw = ov["total_messages"], ov["total_words"]

    banner(f"WHATSAPP CHAT ANALYSIS  -  {file_name}")
    print(f"Period        : {ov['first_message'][:16]}  ->  {ov['last_message'][:16]}  ({ov['span_days']} days)")
    print(f"Date format   : {load_info['date_order'].upper()}   |  system lines ignored: {load_info['system_lines']:,}"
          f"   |  unparseable: {load_info['skipped']}")
    print(f"Participants  : {', '.join(S)}")
    print(f"Total messages: {tm:,}   ({ov['messages_per_day']:.1f}/day)")
    print(f"Total words   : {tw:,}   ({ov['words_per_day']:.1f}/day)   [whitespace-separated words in text messages]")
    print(f"Active days   : {ov['active_days']} of {ov['span_days']}   (silent days: {ov['silent_days']})")
    if load_info["missed_calls"]:
        print(f"Missed calls  : {load_info['missed_calls']}")
    total_h = ov.get("total_chat_hours")
    if total_h is not None:
        print(f"Hours chatting: {total_h:,.1f} h  (~{total_h/24:.1f} days of active chat time)")

    banner("PER PERSON")
    metrics = [
        ("Messages", lambda p: f"{p['messages']:,}"),
        ("  share of messages", lambda p: share(p["messages"], tm)),
        ("Text messages", lambda p: f"{p['text_messages']:,}"),
        ("Words", lambda p: f"{p['words']:,}"),
        ("  share of words", lambda p: share(p["words"], tw)),
        ("Avg words / message", lambda p: f"{p['avg_words_per_msg']:.2f}"),
        ("Avg chars / message", lambda p: f"{p['avg_chars_per_msg']:.1f}"),
        ("Longest message (words)", lambda p: f"{p['longest_msg_words']:,}"),
        ("Media sent", lambda p: f"{p['media']:,}"),
        ("Deleted messages", lambda p: f"{p['deleted']:,}"),
        ("Links shared", lambda p: f"{p['links']:,}"),
        ("Questions asked (?)", lambda p: f"{p['questions']:,}"),
        ("Emojis used", lambda p: f"{p['emojis_total']:,}"),
        ("Late-night msgs (12-5am)", lambda p: f"{p['late_night']:,} ({share(p['late_night'], p['messages'])})"),
        ("Peak hour", lambda p: hour_label(p["peak_hour"])),
    ]
    table(["Metric"] + S, [[name] + [fn(per[s]) for s in S] for name, fn in metrics])

    banner(f"RESPONSE TIME  (replies within {ov['reply_cap_hours']}h of the other person's last message)")
    rows = []
    for label, key, f in [("Replies counted", "count", lambda v: f"{v:,}"),
                          ("Average", "mean", fmt_dur), ("Median", "median", fmt_dur),
                          ("90th percentile", "p90", fmt_dur), ("Fastest", "fastest", fmt_dur),
                          ("Replied in same minute", "same_minute", lambda v: f"{v:.1f}%"),
                          ("Replied within 1 min", "within_1m", lambda v: f"{v:.1f}%"),
                          ("Replied within 5 min", "within_5m", lambda v: f"{v:.1f}%"),
                          ("Replied within 1 hour", "within_1h", lambda v: f"{v:.1f}%"),
                          ("Replies after a pause (1 min+)", "after_pause_count", lambda v: f"{v:,}"),
                          ("  Median after a pause", "after_pause_median", fmt_dur),
                          ("  Average after a pause", "after_pause_mean", fmt_dur),
                          ("  90th pct after a pause", "after_pause_p90", fmt_dur)]:
        rows.append([label] + [f(per[s]["reply"][key]) if per[s]["reply"].get(key) is not None else "n/a" for s in S])
    table(["Metric"] + S, rows)
    print("Note: WhatsApp timestamps have no seconds, so a reply in the same minute counts as 0s. The"
          "\n'after a pause' rows skip that rapid-fire back-and-forth and show how long real gaps take.")

    banner(f"CONVERSATION DYNAMICS  (new conversation = {ov['session_gap_hours']}h+ of silence)")
    total_starts = sum(per[s]["starts"] for s in S)
    total_ends = sum(per[s]["ends"] for s in S)
    table(["Metric"] + S, [
        ["Conversations started"] + [f"{per[s]['starts']:,} ({share(per[s]['starts'], total_starts)})" for s in S],
        ["Last word of a conversation"] + [f"{per[s]['ends']:,} ({share(per[s]['ends'], total_ends)})" for s in S],
        ["Avg messages in a row"] + [f"{per[s]['avg_burst']:.2f}" for s in S],
        ["Longest run in a row"] + [f"{per[s]['longest_burst']:,}" for s in S],
    ])

    banner("ACTIVITY BY HOUR OF DAY")
    peak = max(res["_overall_hour"]) or 1
    print(f"{'Hour':<6}" + "".join(f"{s[:12]:>13}" for s in S) + f"{'Total':>9}   Activity")
    for h in range(24):
        tot = res["_overall_hour"][h]
        print(f"{hour_label(h):<6}" + "".join(f"{res['hourly'][s][h]:>13,}" for s in S)
              + f"{tot:>9,}   " + "█" * round(tot / peak * 30))
    print(f"\nPeak hour overall: {hour_label(ov['peak_hour'])}")

    banner("ACTIVITY BY WEEKDAY")
    peak = max(res["_overall_wd"]) or 1
    for d in range(7):
        tot = res["_overall_wd"][d]
        print(f"{WEEKDAYS[d]:<5}" + "".join(f"{res['weekday'][s][d]:>13,}" for s in S)
              + f"{tot:>9,}   " + "█" * round(tot / peak * 30))
    print(f"\nBusiest weekday: {ov['peak_weekday']}")

    banner("MESSAGES PER MONTH")
    peak = max(res["monthly_total"].values())
    for mth, tot in res["monthly_total"].items():
        print(f"{mth}  " + "".join(f"{res['monthly'][s].get(mth, 0):>10,}" for s in S)
              + f"{tot:>9,}   " + "█" * round(tot / peak * 30))
    print(f"\nBusiest month: {ov['busiest_month'][0]} ({ov['busiest_month'][1]:,} messages)")

    banner("RECORDS & STREAKS")
    print("Top 5 busiest days:")
    for d, c in res["top_days"]:
        print(f"   {d}  ->  {c:,} messages")
    print(f"Longest daily streak (talked every day): {ov['longest_daily_streak']} days (ended {ov['streak_ended']})")
    print(f"Longest silence between active days    : {ov['longest_silence_days']} days")

    banner("TOP WORDS & EMOJIS (stop-words removed)")
    for s in S:
        print(f"\n{s}")
        print("  Words : " + ", ".join(f"{w} ({c:,})" for w, c in per[s]["top_words"]))
        print("  Emojis: " + (", ".join(f"{e} {c:,}" for e, c in per[s]["top_emojis"]) or "none"))
    print()


# --------------------------------------------------------------------------
# Exports
# --------------------------------------------------------------------------
def save_data(res, outdir):
    S, per = res["senders"], res["per_sender"]
    summary = {k: v for k, v in res.items() if not k.startswith("_")}
    summary["heatmap"] = res["_heat"]  # weekday x hour grid for the dashboard
    (outdir / "summary.json").write_text(json.dumps(summary, indent=2, ensure_ascii=False, default=str), encoding="utf-8")

    cols = ["messages", "text_messages", "words", "chars", "avg_words_per_msg", "media", "deleted", "links",
            "questions", "emojis_total", "late_night", "peak_hour", "starts", "ends", "avg_burst", "longest_burst"]
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


def make_charts(res, outdir):
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
    except ImportError:
        print("matplotlib not installed - skipping charts (pip install matplotlib).")
        return []

    S = res["senders"]
    cmap = plt.get_cmap("tab10")
    saved = []

    def save(fig, name):
        fig.tight_layout()
        fig.savefig(outdir / name, dpi=150)
        plt.close(fig)
        saved.append(name)

    # 1. Messages by hour
    fig, ax = plt.subplots(figsize=(11, 5))
    n = len(S)
    w = 0.8 / n
    for i, s in enumerate(S):
        ax.bar([h + (i - (n - 1) / 2) * w for h in range(24)], res["hourly"][s], width=w, label=s, color=cmap(i))
    ax.set_xticks(range(24))
    ax.set_xlabel("Hour of day")
    ax.set_ylabel("Messages")
    ax.set_title("When do you talk? Messages by hour")
    ax.legend()
    save(fig, "1_messages_by_hour.png")

    # 2. Weekday x hour heatmap
    fig, ax = plt.subplots(figsize=(11, 4.5))
    im = ax.imshow(res["_heat"], aspect="auto", cmap="magma")
    ax.set_yticks(range(7))
    ax.set_yticklabels(WEEKDAYS)
    ax.set_xticks(range(24))
    ax.set_xlabel("Hour of day")
    ax.set_title("Activity heatmap (weekday x hour)")
    fig.colorbar(im, ax=ax, label="Messages")
    save(fig, "2_heatmap_weekday_hour.png")

    # 3. Messages per month (stacked)
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

    # 4. Daily timeline + 7-day average
    daily = res["_daily_total"]
    first, last = min(daily), max(daily)
    days = [first + timedelta(days=i) for i in range((last - first).days + 1)]
    vals = [daily.get(d, 0) for d in days]
    roll = [sum(vals[max(0, i - 6):i + 1]) / len(vals[max(0, i - 6):i + 1]) for i in range(len(vals))]
    fig, ax = plt.subplots(figsize=(11, 5))
    ax.plot(days, vals, alpha=0.35, label="Daily")
    ax.plot(days, roll, linewidth=2, label="7-day average")
    ax.set_ylabel("Messages")
    ax.set_title("Daily message volume")
    ax.legend()
    save(fig, "4_daily_timeline.png")

    # 5. Reply-time distribution (median is useless when most replies are same-minute)
    labels = [b[0] for b in BUCKETS]
    fig, ax = plt.subplots(figsize=(9, 5))
    n = len(S)
    w = 0.8 / n
    for i, s_ in enumerate(S):
        vals = res["per_sender"][s_]["reply"].get("buckets", [0] * len(labels))
        bars = ax.bar([k + (i - (n - 1) / 2) * w for k in range(len(labels))], vals, width=w,
                      label=s_, color=cmap(i))
        ax.bar_label(bars, fmt="%.0f%%", fontsize=8)
    ax.set_xticks(range(len(labels)))
    ax.set_xticklabels(labels)
    ax.set_ylabel("% of replies")
    ax.set_title("How fast do you reply?")
    ax.legend()
    save(fig, "5_reply_time_distribution.png")

    # 6. Share of messages vs words
    fig, axes = plt.subplots(1, 2, figsize=(9, 4.5))
    for ax, key, title in zip(axes, ["messages", "words"], ["Messages", "Words"]):
        ax.pie([res["per_sender"][s][key] for s in S], labels=S, autopct="%1.1f%%",
               colors=[cmap(i) for i in range(len(S))], startangle=90)
        ax.set_title(title)
    save(fig, "6_share_messages_words.png")
    return saved


# --------------------------------------------------------------------------
# Main
# --------------------------------------------------------------------------
def find_default_file():
    # Search current directory and parent directory for .txt files
    search_dirs = [Path.cwd(), Path.cwd().parent]
    cands = []
    for d in search_dirs:
        cands.extend(d.glob("*.txt"))
    cands = sorted(cands, key=lambda p: (p.stat().st_mtime, p.stat().st_size), reverse=True)
    pref = [p for p in cands if "whatsapp" in p.name.lower() or p.name.lower().startswith("_chat") or "chat" in p.name.lower()]
    return (pref or cands or [None])[0]


def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")  # emojis on Windows consoles
    except Exception:
        pass

    ap = argparse.ArgumentParser(description="All-in-one WhatsApp chat analyzer")
    ap.add_argument("file", nargs="?", help="exported WhatsApp chat .txt (auto-detected if omitted)")
    ap.add_argument("--date-order", choices=["dmy", "mdy"], help="force DD/MM or MM/DD (default: auto-detect)")
    ap.add_argument("--reply-cap-hours", type=float, default=6, help="ignore reply gaps longer than this (default 6)")
    ap.add_argument("--session-gap-hours", type=float, default=2, help="silence that starts a new conversation (default 2)")
    ap.add_argument("--top", type=int, default=15, help="how many top words/emojis to list (default 15)")
    ap.add_argument("--stopwords", default="", help="extra comma-separated words to ignore in top words")
    ap.add_argument("--out", help="output folder (default: chat_analysis_output next to the chat file)")
    ap.add_argument("--no-charts", action="store_true", help="skip PNG charts")
    args = ap.parse_args()

    path = Path(args.file) if args.file else find_default_file()
    if not path or not path.exists():
        sys.exit("Chat file not found. Pass the path: python analyze_chat.py <chat.txt>")

    outdir = Path(args.out) if args.out else path.resolve().parent / "chat_analysis_output"
    outdir.mkdir(parents=True, exist_ok=True)

    print(f"Reading {path} ...")
    msgs, info = load_chat(path, args.date_order)
    extra = {w.strip().lower() for w in args.stopwords.split(",") if w.strip()}
    res = analyze(msgs, args.reply_cap_hours, args.session_gap_hours, args.top, extra)

    print_report(res, info, path.name)
    save_data(res, outdir)
    charts = [] if args.no_charts else make_charts(res, outdir)
    print(f"Saved summary.json + CSVs{' + ' + str(len(charts)) + ' charts' if charts else ''} to: {outdir}")


if __name__ == "__main__":
    main()
