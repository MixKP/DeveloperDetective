"""Figure for report section 7.3, from Supabase data exported on 2026-10-02."""
from pathlib import Path

import matplotlib.pyplot as plt

OUT = Path(__file__).parent
BLUE = "#2a78d6"
INK, INK_2, GRID = "#0b0b0b", "#52514e", "#e4e3df"

plt.rcParams.update({
    "font.family": "DejaVu Sans",
    "font.size": 10,
    "text.color": INK,
    "axes.edgecolor": GRID,
    "axes.labelcolor": INK_2,
    "xtick.color": INK_2,
    "ytick.color": INK,
    "axes.spines.top": False,
    "axes.spines.right": False,
    "figure.dpi": 200,
})


def finish(ax, fig, name, title, note=None):
    ax.set_title(title, loc="left", fontsize=12, fontweight="bold", pad=12)
    if note:
        fig.text(0.01, 0.01, note, fontsize=8, color=INK_2)
    fig.tight_layout(rect=(0, 0.04 if note else 0, 1, 1))
    fig.savefig(OUT / name, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    print("wrote", name)


def hbar(ax, labels, values, texts, xmax, color=BLUE):
    y = range(len(labels))
    ax.barh(y, values, color=color, height=0.6)
    ax.set_yticks(list(y), labels)
    ax.invert_yaxis()
    ax.set_xlim(0, xmax)
    ax.xaxis.grid(True, color=GRID, linewidth=0.8)
    ax.set_axisbelow(True)
    ax.tick_params(axis="y", length=0)
    for i, (v, t) in enumerate(zip(values, texts)):
        ax.text(v + xmax * 0.01, i, t, va="center", fontsize=9, color=INK)


# Post-test accuracy by ACM/IEEE principle
principles = [  # (principle, correct, answered)
    ("Judgement", 11, 11),
    ("Product", 8, 9),
    ("Colleagues", 8, 10),
    ("Public", 10, 13),
    ("Profession", 10, 13),
    ("Management", 7, 10),
    ("Self", 6, 9),
    ("Client and Employer", 4, 9),
]
fig, ax = plt.subplots(figsize=(7, 3.8))
pct = [100 * c / n for _, c, n in principles]
hbar(ax, [p for p, _, _ in principles], pct,
     [f"{p:.0f}%  ({c}/{n})" for p, (_, c, n) in zip(pct, principles)], 115)
ax.set_xticks([0, 25, 50, 75, 100], ["0%", "25%", "50%", "75%", "100%"])
ax.set_xlabel("Answers correct")
finish(ax, fig, "fig-posttest-by-principle.png",
       "Post-test accuracy by ACM/IEEE principle",
       "n = 4 participants, 9 attempts, 84 answers")

# Highlights: the strongest and weakest principles only
highlights = [p for p in principles if p[0] in ("Judgement", "Product", "Client and Employer")]
fig, ax = plt.subplots(figsize=(7, 2.4))
pct = [100 * c / n for _, c, n in highlights]
hbar(ax, [p for p, _, _ in highlights], pct,
     [f"{p:.0f}%  ({c}/{n})" for p, (_, c, n) in zip(pct, highlights)], 115)
ax.set_xticks([0, 25, 50, 75, 100], ["0%", "25%", "50%", "75%", "100%"])
ax.set_xlabel("Correct-answer rate")
finish(ax, fig, "fig-posttest-highlights.png",
       "Post-test correct-answer rate: highest and lowest principles",
       "n = 4 participants, 9 attempts")

# Per-participant first-attempt post-test scores
firsts = [("Participant 1", 8), ("Participant 2", 8), ("Participant 3", 9), ("Participant 4", 4)]
mean = sum(s for _, s in firsts) / len(firsts)
fig, ax = plt.subplots(figsize=(7, 2.8))
hbar(ax, [p for p, _ in firsts], [s for _, s in firsts], [f"{s}/10" for _, s in firsts], 11)
ax.axvline(mean, color=INK_2, linewidth=1, linestyle="--")
ax.text(mean + 0.1, len(firsts) - 0.55, f"mean {mean:.2f}", va="bottom", fontsize=8, color=INK_2)
ax.set_xticks(range(0, 11, 2))
ax.set_xlabel("Score (out of 10)")
finish(ax, fig, "fig-posttest-participants.png",
       "Post-test score per participant (first attempt)",
       "n = 4 participants, 10 questions each")

# Post-test scores per tester, as supplied by the team (not from Supabase)
testers = [("Tester 1", 9), ("Tester 2", 7), ("Tester 3", 7), ("Tester 4", 8), ("Tester 5", 7)]
mean = sum(s for _, s in testers) / len(testers)
fig, ax = plt.subplots(figsize=(7, 3.2))
hbar(ax, [t for t, _ in testers], [s for _, s in testers],
     [f"{s}/10  ({s * 10}%)" for _, s in testers], 11.5)
ax.set_xticks(range(0, 11, 2))
ax.set_xlabel("Score (out of 10)")
finish(ax, fig, "fig-posttest-testers.png",
       "Post-test score per tester",
       f"n = 5 testers, mean {mean:.1f}/10, 38/50 correct overall (76%)")
