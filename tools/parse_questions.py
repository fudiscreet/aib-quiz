import re, json, glob, os

# Place the 6 AIB-C01_予想問題_SetN.md files in ../source-md (relative to this
# script), or change SRC_DIR to wherever they live.
SRC_DIR = os.path.join(os.path.dirname(__file__), "..", "source-md")
files = sorted(glob.glob(os.path.join(SRC_DIR, "AIB-C01_予想問題_Set*.md")))

domain_names = {
    1: "AIの基礎とリテラシー",
    2: "AI戦略とビジネス価値の創出",
    3: "AIガバナンスと責任あるAIのリーダーシップ",
    4: "ビジネス準備態勢、リーダーシップ、AIトランスフォーメーション",
}

def domain_for_q(qnum):
    # 20/24/20/21 split, cumulative: 20,44,64,85
    if qnum <= 20: return 1
    if qnum <= 44: return 2
    if qnum <= 64: return 3
    return 85 >= qnum > 64 and 4 or 4

all_questions = []

for fpath in files:
    fname = os.path.basename(fpath)
    m = re.search(r'Set(\d)', fname)
    set_num = int(m.group(1))
    with open(fpath, encoding='utf-8') as f:
        text = f.read()

    # split part1 / part2
    part1_marker = "## 第1部 問題編"
    part2_marker = "## 第2部 解答・解説編"
    i1 = text.index(part1_marker)
    i2 = text.index(part2_marker)
    part1 = text[i1:i2]
    # answer key table starts after part2, sometimes with "## 解答一覧"
    part2_end_marker = "## 解答一覧"
    if part2_end_marker in text:
        i3 = text.index(part2_end_marker, i2)
        part2 = text[i2:i3]
    else:
        part2 = text[i2:]

    # Parse questions from part1
    # Pattern: **Qn.** question text \n\n - A. ... \n - B. ... ... \n\n*(Skill x.x.x)*
    q_pattern = re.compile(
        r'\*\*Q(\d+)\.\*\*\s*(.+?)\n\n((?:- [A-E]\..+?\n)+)\n\*\(Skill ([\d.]+)[^)]*\)\*',
        re.DOTALL
    )
    questions = {}
    for mm in q_pattern.finditer(part1):
        qnum = int(mm.group(1))
        qtext = mm.group(2).strip()
        opts_block = mm.group(3)
        skill = mm.group(4)
        opts = {}
        for om in re.finditer(r'- ([A-E])\.\s*(.+)', opts_block):
            opts[om.group(1)] = om.group(2).strip()
        questions[qnum] = {
            "num": qnum,
            "text": qtext,
            "options": opts,
            "skill": skill,
        }

    # Parse answers from part2
    # Pattern: **Qn. B** — explanation... *(x.x.x)*  (explanation may span to next **Qn or ---)
    a_pattern = re.compile(
        r'\*\*Q(\d+)\.\s*([A-E](?:,\s*[A-E])*)\*\*\s*[—\-–]\s*(.+?)(?=\n\n\*\*Q\d+\.|\n\n---|\Z)',
        re.DOTALL
    )
    answers = {}
    for mm in a_pattern.finditer(part2):
        qnum = int(mm.group(1))
        ans = [a.strip() for a in mm.group(2).split(',')]
        expl = mm.group(3).strip()
        # remove trailing skill tag like *(1.1.1)* at the end, keep in explanation actually fine
        answers[qnum] = {"answer": ans, "explanation": expl}

    missing = set(questions.keys()) ^ set(answers.keys())
    if missing:
        print(f"WARNING {fname}: mismatched question/answer numbers: {sorted(missing)[:10]} total={len(missing)}")

    count_q = len(questions)
    count_a = len(answers)
    print(f"{fname}: questions={count_q} answers={count_a}")

    for qnum in sorted(questions.keys()):
        q = questions[qnum]
        a = answers.get(qnum)
        if not a:
            print(f"  MISSING ANSWER for Q{qnum} in {fname}")
            continue
        domain = domain_for_q(qnum)
        all_questions.append({
            "id": f"S{set_num}Q{qnum:03d}",
            "set": set_num,
            "num": qnum,
            "domain": domain,
            "domainName": domain_names[domain],
            "skill": q["skill"],
            "text": q["text"],
            "options": q["options"],
            "answer": a["answer"],
            "multi": len(a["answer"]) > 1,
            "explanation": a["explanation"],
        })

print(f"\nTOTAL questions parsed: {len(all_questions)}")

out_path = os.path.join(os.path.dirname(__file__), "..", "data", "questions.json")
with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(all_questions, f, ensure_ascii=False, indent=1)

print(f"Written to {out_path}")
