import json
import sys
import urllib.request
from pathlib import Path

import pytest
import regex as uregex

CODE_DIR = Path(__file__).resolve().parent.parent
if str(CODE_DIR) not in sys.path:
    sys.path.insert(0, str(CODE_DIR))

import analyze_chat as ac
import nlp_engine as ne


SYNTHETIC_CHAT = """12/03/26, 9:00 pm - Rohan Verma: Hey Ananya! Ready for tomorrow?
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
13/03/26, 10:20 am - Ananya Iyer: Also I said bye to my friend at the gate and came home
13/03/26, 10:21 am - Rohan Verma: Cool see you tomorrow in college!
13/03/26, 10:25 am - Ananya Iyer: I am genuinely angry with you, leave it, whatever.
13/03/26, 10:30 am - Rohan Verma: I'm really sory Ananya, forgive me please
13/03/26, 10:32 am - Ananya Iyer: No I'm sorryyy too, sorry to hear about your friend's exam though
13/03/26, 10:40 am - Rohan Verma: Misssss uuuu so much, wish you were here so I could give tight hugs, lift you and carry you while looking into your eyes and hearing your voice
13/03/26, 10:42 am - Ananya Iyer: Miss you too! Wanna meet up this weekend? 😍
13/03/26, 10:45 am - Rohan Verma: Look at your smile today my cute angel 🫠😶‍🌫️🫣🙃🤭
13/03/26, 10:46 am - Ananya Iyer: Abboooooo stooop 🫠🙃
13/03/26, 11:00 pm - Rohan Verma: naa haaa aniii ahh know tell onlyy ohhh ahhh see told u're didn't onlyyy okayy alsoo u'll abt abbbbooooo misssss callll
13/03/26, 11:01 pm - Rohan Verma: Okayyy """ + ("y " * 200) + """
13/03/26, 11:05 pm - Rohan Verma: You make me so horny, want to make out and kiss your neck in bed tonight 🥵
13/03/26, 11:10 pm - Ananya Iyer: Byeeeeeeeeeeeeeeeeeeee
"""


def test_generalized_participant_protection_and_screenshot_exclusions():
    summary, _, _ = ac.analyze_text(SYNTHETIC_CHAT, top_n=100, use_neural=False)
    senders = summary["senders"]
    assert set(senders) == {"Rohan Verma", "Ananya Iyer"}

    # Participant tokens extracted dynamically (no hardcoded names)
    ptoks = set(summary["participant_tokens"])
    assert {"rohan", "verma", "ananya", "iyer"}.issubset(ptoks)
    assert "alex" not in ptoks and "taylor" not in ptoks

    rohan_words = dict(summary["per_sender"]["Rohan Verma"]["top_words"])
    ananya_words = dict(summary["per_sender"]["Ananya Iyer"]["top_words"])

    # Participant names kept & merged across stretched variants
    assert ananya_words.get("rohan", 0) >= 1
    assert rohan_words.get("ananya", 0) >= 1

    # abbooo + abbboooo + abbooooo + abbbbooooo all merged into "abbooo"
    assert rohan_words.get("abbooo", 0) == 2
    assert ananya_words.get("abbooo", 0) == 2

    # Double-ending preservation & contraction handling
    assert ne.canonicalize_word("callll") == "call"
    assert ne.canonicalize_word("misssss") == "miss"
    assert ne.canonicalize_word("i'll") == "i'll"
    assert rohan_words.get("miss", 0) >= 2
    assert rohan_words.get("call", 0) >= 1

    # All screenshot filler words and their stretched forms MUST be excluded
    excluded_check = {"na", "naa", "ha", "haa", "haaa", "ani", "aniii", "ah", "ahh", "ahhh",
                      "oh", "ohhh", "only", "onlyy", "know", "tell", "see", "told",
                      "u're", "ure", "didn't", "didnt", "okay", "okayy", "also", "alsoo",
                      "u'll", "u'l", "i'll", "i'l", "abt"}
    for bad in excluded_check:
        assert bad not in rohan_words, f"Excluded word leaked for Rohan: {bad}"
        assert bad not in ananya_words, f"Excluded word leaked for Ananya: {bad}"


def test_bye_cluster_conversation_segmentation():
    summary, _, _ = ac.analyze_text(SYNTHETIC_CHAT, use_neural=False)
    ov = summary["overview"]
    # Conversation 1 starts with Rohan, ends after mutual Byee / Byeeeeee ❤️ cluster
    # Conversation 2 starts with Ananya at 10:15 am; narrative "said bye to my friend" at 10:20 must NOT split;
    # ends with Ananya's Byeeeeeeeeeeeeeeeeeeee at 11:10 pm.
    assert ov["total_conversations"] == 2
    assert summary["per_sender"]["Rohan Verma"]["starts"] == 1
    assert summary["per_sender"]["Ananya Iyer"]["starts"] == 1
    assert summary["per_sender"]["Ananya Iyer"]["ends"] == 2


def test_apologies_sorry_and_sorry_first():
    summary, _, _ = ac.analyze_text(SYNTHETIC_CHAT, use_neural=False)
    ap = summary["apologies"]
    # Rohan said "sory" first at 10:30 (1 episode), Ananya replied "sorryyy" at 10:32 ("sorry to hear" ignored)
    assert ap["total_episodes"] == 1
    assert ap["sorry_first_leader"] == "Rohan Verma"
    assert ap["per_sender"]["Rohan Verma"]["said_sorry_first"] == 1
    assert ap["per_sender"]["Rohan Verma"]["sorry_count"] == 1
    assert ap["per_sender"]["Ananya Iyer"]["said_sorry_first"] == 0
    assert ap["per_sender"]["Ananya Iyer"]["sorry_count"] == 1


def test_intimacy_nicknames_sensory_and_blur_flagging():
    summary, _, _ = ac.analyze_text(SYNTHETIC_CHAT, use_neural=False)
    intim = summary["intimacy"]
    nick_terms = {n["term"]: n for n in intim["nicknames"]}
    assert "kutti ponnu" in nick_terms
    assert "cutee / cutie" in nick_terms
    assert "lussuuu" in nick_terms
    # Participant names & false nouns must NEVER appear as coined nicknames
    for bad_nick in ("rohan", "ananya", "nidra", "teammate", "brain", "wish", "parents", "frnds", "eyes", "gem"):
        assert bad_nick not in nick_terms

    cues = intim["sensory_and_physical_cues"]
    assert cues["hugs_cuddles"]["total"] >= 1
    assert cues["lift_carry"]["total"] >= 1
    assert cues["eyes_gaze"]["total"] >= 1
    assert cues["voice_admiration"]["total"] >= 1

    # Explicit Tier 5 line must be marked sensitive=True
    tier5_events = [ev for ev in intim["escalations"] if ev["tier"] == 5]
    assert tier5_events and all(ev["sensitive"] is True for ev in tier5_events)


def test_photo_meet_miss_you_hard_negatives():
    summary, _, _ = ac.analyze_text(SYNTHETIC_CHAT, use_neural=False)
    pr = summary["photo_requests"]
    # "I want to see you rn, send a pic please!" -> 1 photo ask for Rohan, fulfilled by Ananya's <Media omitted>
    # "Send pic of the notes please" -> hard negative rejected for Ananya!
    # "see you tomorrow in college!" -> routed to meeting, NOT photo!
    assert pr["Rohan Verma"]["total"] == 1
    assert pr["Rohan Verma"]["fulfilled_with_media"] == 1
    assert pr["Ananya Iyer"]["total"] == 0

    lm = summary["longing_and_meeting"]
    # Rohan: "Misssss uuuu" -> miss_you=1 ("missed voice call" & "missed the bus" rejected for Ananya!)
    assert lm["Rohan Verma"]["miss_you_total"] == 1
    assert lm["Rohan Verma"]["miss_you_initiated"] == 1
    # Ananya: "Miss you too!" -> reciprocal miss_you=1, "Wanna meet up" -> meet=1 ("google meet" rejected!)
    assert lm["Ananya Iyer"]["miss_you_total"] == 1
    assert lm["Ananya Iyer"]["miss_you_reciprocal"] == 1
    assert lm["Ananya Iyer"]["desire_to_meet"] == 1
    assert lm["Rohan Verma"]["desire_to_meet"] == 1  # "see you tomorrow in college"


def test_longest_messages_and_uax29_emojis():
    summary, _, _ = ac.analyze_text(SYNTHETIC_CHAT, use_neural=False)
    ov_l = summary["longest_messages"]["overall"]
    assert ov_l["sender"] == "Rohan Verma"
    # Spam "Okayyy y y y..." (201 words) MUST be rejected in favor of genuine substantive message!
    assert "y y y y" not in ov_l["text"]
    assert ov_l["unique_words"] >= 15
    assert "date_display" in ov_l and "time_display" in ov_l and "text" in ov_l
    # ❤️‍🔥 (ZWJ sequence) must count as 1 grapheme cluster emoji, not 2
    assert ne.extract_emojis("hi ❤️‍🔥👍🏻") == ["❤️‍🔥", "👍🏻"]


def test_discourse_teasing_comedy_and_flirt_score():
    summary, _, _ = ac.analyze_text(SYNTHETIC_CHAT, use_neural=False)
    disc = summary["discourse"]
    ov_pct = disc["overall_pct"]
    assert abs(sum(ov_pct.values()) - 100.0) <= 0.5
    fa = disc["flirt_analysis"]
    # Rohan initiates flirts & induces blushing/abbooo reactions -> must win Best & Most Flirt
    assert fa["most_flirt_winner"] == "Rohan Verma"
    assert fa["best_flirt_winner"] == "Rohan Verma"
    assert fa["per_sender"]["Rohan Verma"]["flusters_induced"] >= 2

    # Tease (laugh emoji 😂) -> Ananya replies 😤 gives Rohan a comedy point!
    hu = summary["fun"]["humor"]
    assert hu["Rohan Verma"]["tease_reactions_triggered"] >= 1
    assert hu["Rohan Verma"]["comedy_points"] >= 1


def test_clean_ui_no_timeline_or_decorative_emojis():
    app_js = (CODE_DIR / "app.js").read_text(encoding="utf-8")
    index_html = (CODE_DIR / "index.html").read_text(encoding="utf-8")
    assert "Chronological Escalation Timeline" not in app_js
    for content, fname in [(index_html, "index.html"), (app_js, "app.js")]:
        found = [m.group(0) for m in uregex.finditer(r"\X", content) if uregex.search(r"\p{Extended_Pictographic}", m.group(0)) and m.group(0) not in {"©", "®", "™"}]
        assert not found, f"Decorative UI emojis found in {fname}: {found}"
