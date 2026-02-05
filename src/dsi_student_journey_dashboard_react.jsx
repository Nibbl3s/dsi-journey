import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Flag,
  Link2,
  Rocket,
  RotateCcw,
  Sparkles,
  Target,
  Timer,
} from "lucide-react";

/**
 * DSI Student Journey Dashboard
 * - Week-by-week accordion
 * - Persistent checklist state (localStorage)
 * - Evidence links + reflections
 * - Prerequisite blockers (can't tick before prerequisites)
 * - Next action engine (highlights the next required item)
 */

const STORAGE_KEY = "dsi_journey_progress_v1";

type PhaseKey = "understand" | "analyze" | "ideate" | "design" | "decide" | "defend";

type ChecklistItem = {
  id: string;
  label: string;
  required?: boolean;
  eta?: string; // e.g. "10m", "30m"
  prerequisites?: string[]; // checklist item ids
  evidence?: {
    enabled: boolean;
    placeholder?: string;
  };
};

type Week = {
  id: string;
  phase: PhaseKey;
  phaseLabel: string;
  weekLabel: string;
  dates: string;
  title: string;
  subtitle: string;
  businessCase: {
    stage: string;
    output: string;
    goalQuote: string;
  };
  due?: {
    label: string;
    date: string;
  };
  checklist: ChecklistItem[];
  resources?: { label: string; href?: string }[];
  selfCheck?: string[];
};

type ProgressState = {
  checked: Record<string, boolean>;
  evidence: Record<string, string>;
  reflections: Record<string, string>;
  confidence: Record<string, "low" | "medium" | "high">;
  lastUpdatedISO?: string;
};

const PHASES: { key: PhaseKey; label: string; icon: React.ReactNode }[] = [
  { key: "understand", label: "Understand", icon: <Target className="h-4 w-4" /> },
  { key: "analyze", label: "Analyze", icon: <Sparkles className="h-4 w-4" /> },
  { key: "ideate", label: "Ideate", icon: <Sparkles className="h-4 w-4" /> },
  { key: "design", label: "Design", icon: <ClipboardList className="h-4 w-4" /> },
  { key: "decide", label: "Decide", icon: <CheckCircle2 className="h-4 w-4" /> },
  { key: "defend", label: "Defend", icon: <Rocket className="h-4 w-4" /> },
];

// --- DATA: You can edit this array to match your official deliverables/templates/links.
const WEEKS: Week[] = [
  {
    id: "w1",
    phase: "understand",
    phaseLabel: "Understand",
    weekLabel: "Week 1",
    dates: "09/02 – 13/02",
    title: "Framing the Challenge",
    subtitle: "Understanding digital strategy & the business case context",
    businessCase: {
      stage: "Stage 1: Research & Analysis",
      output: "Initial research & first business model exploration.",
      goalQuote: "Start the analysis. Define the problem, context, and initial assumptions.",
    },
    checklist: [
      {
        id: "w1_case_summary",
        label: "Summarise the case context in 5 bullet points (industry + company).",
        required: true,
        eta: "15m",
        evidence: { enabled: true, placeholder: "Paste link to your case summary" },
      },
      {
        id: "w1_problem_statement",
        label: "Write a clear problem statement (who, what, why now).",
        required: true,
        eta: "20m",
        prerequisites: ["w1_case_summary"],
        evidence: { enabled: true, placeholder: "Paste link to your problem statement" },
      },
      {
        id: "w1_assumptions",
        label: "List 3 assumptions you’re making (and why they matter).",
        required: true,
        eta: "15m",
        prerequisites: ["w1_problem_statement"],
        evidence: { enabled: true, placeholder: "Paste link to your assumptions" },
      },
      {
        id: "w1_bm_sketch",
        label: "Create a 1-page digital business model sketch.",
        required: true,
        eta: "45m",
        prerequisites: ["w1_assumptions"],
        evidence: { enabled: true, placeholder: "Paste link to your business model sketch" },
      },
      {
        id: "w1_quality_gate",
        label: "Quality gate: Your problem statement is specific (not generic) and measurable.",
        required: true,
        eta: "5m",
        prerequisites: ["w1_bm_sketch"],
      },
    ],
    selfCheck: [
      "If someone outside your group reads it, can they immediately understand the problem?",
      "Are you describing the real case, or something that could fit any company?",
    ],
  },
  {
    id: "w2",
    phase: "analyze",
    phaseLabel: "Analyze",
    weekLabel: "Week 2",
    dates: "16/02 – 20/02",
    title: "Evaluating Opportunities & Risks",
    subtitle: "Critical evaluation of business models and trends",
    businessCase: {
      stage: "Stage 1: Research & Analysis",
      output: "Opportunity/risk mapping tied to trends and forces.",
      goalQuote: "Identify what could help you win — and what could break your plan.",
    },
    checklist: [
      {
        id: "w2_opportunities",
        label: "Identify at least 5 opportunities tied to trends/forces.",
        required: true,
        eta: "30m",
        prerequisites: ["w1_quality_gate"],
        evidence: { enabled: true, placeholder: "Paste link to your opportunity list" },
      },
      {
        id: "w2_risks",
        label: "Identify at least 5 risks (market, tech, legal, operational).",
        required: true,
        eta: "30m",
        prerequisites: ["w2_opportunities"],
        evidence: { enabled: true, placeholder: "Paste link to your risk list" },
      },
      {
        id: "w2_matrix",
        label: "Rate each item (impact × likelihood) and justify the ratings.",
        required: true,
        eta: "30m",
        prerequisites: ["w2_risks"],
        evidence: { enabled: true, placeholder: "Paste link to your matrix" },
      },
      {
        id: "w2_test_questions",
        label: "Translate 2 insights into testable questions.",
        required: true,
        eta: "15m",
        prerequisites: ["w2_matrix"],
        evidence: { enabled: true, placeholder: "Paste link to your test questions" },
      },
      {
        id: "w2_quality_gate",
        label: "Quality gate: Every opportunity/risk is case-specific and not generic.",
        required: true,
        eta: "5m",
        prerequisites: ["w2_test_questions"],
      },
    ],
  },
  {
    id: "w3",
    phase: "analyze",
    phaseLabel: "Analyze / Position",
    weekLabel: "Week 3",
    dates: "23/02 – 27/02",
    title: "Making Sense & Positioning",
    subtitle: "Synthesising insights and choosing a strategic focus",
    due: { label: "Due", date: "Wednesday 25 Feb" },
    businessCase: {
      stage: "Stage 1: Research & Analysis",
      output: "Strategic focus choice + argument.",
      goalQuote: "Synthesize your insights into a defensible focus.",
    },
    checklist: [
      {
        id: "w3_synthesis",
        label: "Write a 1-paragraph synthesis: what matters most and why.",
        required: true,
        eta: "20m",
        prerequisites: ["w2_quality_gate"],
        evidence: { enabled: true, placeholder: "Paste link to your synthesis" },
      },
      {
        id: "w3_focus",
        label: "Choose one strategic focus (positioning statement).",
        required: true,
        eta: "20m",
        prerequisites: ["w3_synthesis"],
        evidence: { enabled: true, placeholder: "Paste link to your positioning statement" },
      },
      {
        id: "w3_arguments",
        label: "Support it with 3 strongest arguments + 1 counterargument.",
        required: true,
        eta: "25m",
        prerequisites: ["w3_focus"],
        evidence: { enabled: true, placeholder: "Paste link to your arguments" },
      },
      {
        id: "w3_visual",
        label: "Create a simple positioning map or logic diagram.",
        required: true,
        eta: "30m",
        prerequisites: ["w3_arguments"],
        evidence: { enabled: true, placeholder: "Paste link to your visual" },
      },
      {
        id: "w3_quality_gate",
        label: "Quality gate: Your focus choice remains defensible under critique.",
        required: true,
        eta: "5m",
        prerequisites: ["w3_visual"],
      },
    ],
  },
  {
    id: "w4",
    phase: "ideate",
    phaseLabel: "Ideate",
    weekLabel: "Week 4",
    dates: "02/03 – 06/03",
    title: "From Insight to Ideas",
    subtitle: "Moving from analysis to creativity",
    businessCase: {
      stage: "Stage 2: Ideation",
      output: "Idea portfolio derived from insights.",
      goalQuote: "Generate options, then narrow down intentionally.",
    },
    checklist: [
      {
        id: "w4_ideas_10",
        label: "Generate 10 ideas (fast + diverse).",
        required: true,
        eta: "25m",
        prerequisites: ["w3_quality_gate"],
        evidence: { enabled: true, placeholder: "Paste link to your idea list" },
      },
      {
        id: "w4_cluster",
        label: "Cluster ideas into 3 themes.",
        required: true,
        eta: "15m",
        prerequisites: ["w4_ideas_10"],
        evidence: { enabled: true, placeholder: "Paste link to your clustering" },
      },
      {
        id: "w4_top3",
        label: "Select top 3 using clear criteria (value, feasibility, fit).",
        required: true,
        eta: "20m",
        prerequisites: ["w4_cluster"],
        evidence: { enabled: true, placeholder: "Paste link to your selection rationale" },
      },
      {
        id: "w4_concept_cards",
        label: "Write 1 concept card per top idea (problem, solution, customer, proof).",
        required: true,
        eta: "45m",
        prerequisites: ["w4_top3"],
        evidence: { enabled: true, placeholder: "Paste link to your concept cards" },
      },
      {
        id: "w4_quality_gate",
        label: "Quality gate: Each idea links back to your Week 3 positioning.",
        required: true,
        eta: "5m",
        prerequisites: ["w4_concept_cards"],
      },
    ],
  },
  {
    id: "w5",
    phase: "design",
    phaseLabel: "Design",
    weekLabel: "Week 5",
    dates: "09/03 – 13/03",
    title: "Designing Strategic Options",
    subtitle: "Developing and testing solutions",
    due: { label: "Due", date: "Thursday 12 March (On Campus)" },
    businessCase: {
      stage: "Stage 2: Ideation → Option Design",
      output: "2–3 strategic options with rationale and trade-offs.",
      goalQuote: "Build options that are truly different — not small variations.",
    },
    checklist: [
      {
        id: "w5_options",
        label: "Build 2–3 options that are meaningfully different.",
        required: true,
        eta: "35m",
        prerequisites: ["w4_quality_gate"],
        evidence: { enabled: true, placeholder: "Paste link to your options" },
      },
      {
        id: "w5_details",
        label: "For each option: customer, value proposition, key activities, key resources.",
        required: true,
        eta: "45m",
        prerequisites: ["w5_options"],
        evidence: { enabled: true, placeholder: "Paste link to your option details" },
      },
      {
        id: "w5_tradeoffs",
        label: "Assess trade-offs (cost, speed, risk, differentiation).",
        required: true,
        eta: "30m",
        prerequisites: ["w5_details"],
        evidence: { enabled: true, placeholder: "Paste link to your trade-off table" },
      },
      {
        id: "w5_tests",
        label: "Propose 1 validation test per option.",
        required: true,
        eta: "20m",
        prerequisites: ["w5_tradeoffs"],
        evidence: { enabled: true, placeholder: "Paste link to your validation tests" },
      },
      {
        id: "w5_quality_gate",
        label: "Quality gate: Options show real strategic choices (not a wishlist).",
        required: true,
        eta: "5m",
        prerequisites: ["w5_tests"],
      },
    ],
  },
  {
    id: "w6",
    phase: "decide",
    phaseLabel: "Decide",
    weekLabel: "Week 6",
    dates: "16/03 – 20/03",
    title: "Choosing the Comeback Strategy",
    subtitle: "Strategic decision-making and ownership",
    due: { label: "Due", date: "Wednesday 18 March" },
    businessCase: {
      stage: "Stage 3: Final Strategy",
      output: "Single chosen strategy + plan.",
      goalQuote: "Choose, commit, and make it measurable.",
    },
    checklist: [
      {
        id: "w6_choose",
        label: "Select the best option and explain why the others lose.",
        required: true,
        eta: "25m",
        prerequisites: ["w5_quality_gate"],
        evidence: { enabled: true, placeholder: "Paste link to your decision" },
      },
      {
        id: "w6_narrative",
        label: "Write a one-page strategy narrative (beginning → tension → choice → plan).",
        required: true,
        eta: "35m",
        prerequisites: ["w6_choose"],
        evidence: { enabled: true, placeholder: "Paste link to your narrative" },
      },
      {
        id: "w6_kpis",
        label: "Define 3 KPIs + timeline (what success looks like and when).",
        required: true,
        eta: "25m",
        prerequisites: ["w6_narrative"],
        evidence: { enabled: true, placeholder: "Paste link to your KPIs/timeline" },
      },
      {
        id: "w6_risks",
        label: "Identify key risks + mitigations.",
        required: true,
        eta: "20m",
        prerequisites: ["w6_kpis"],
        evidence: { enabled: true, placeholder: "Paste link to your risk plan" },
      },
      {
        id: "w6_quality_gate",
        label: "Quality gate: Your plan has priorities, ownership, and measurable outcomes.",
        required: true,
        eta: "5m",
        prerequisites: ["w6_risks"],
      },
    ],
  },
  {
    id: "w7",
    phase: "defend",
    phaseLabel: "Defend",
    weekLabel: "Week 7",
    dates: "23/03 – 27/03",
    title: "Defending Your Strategy",
    subtitle: "Strategic storytelling & defense",
    due: { label: "Due", date: "Monday 23 March" },
    businessCase: {
      stage: "Stage 3: Final Pitch",
      output: "Pitch-ready story + defense readiness.",
      goalQuote: "Make your strategy unbreakable under questions.",
    },
    checklist: [
      {
        id: "w7_deck",
        label: "Create a pitch deck with a clear storyline (problem → insight → strategy → plan → ask).",
        required: true,
        eta: "60m",
        prerequisites: ["w6_quality_gate"],
        evidence: { enabled: true, placeholder: "Paste link to your deck" },
      },
      {
        id: "w7_questions",
        label: "Prepare answers for 6 predictable questions (risk, feasibility, budget, competition, timing, proof).",
        required: true,
        eta: "30m",
        prerequisites: ["w7_deck"],
        evidence: { enabled: true, placeholder: "Paste link to your Q&A notes" },
      },
      {
        id: "w7_rehearsal",
        label: "Run a 5-minute rehearsal and improve 2 weak slides.",
        required: true,
        eta: "20m",
        prerequisites: ["w7_questions"],
      },
      {
        id: "w7_evidence_pack",
        label: "Assemble all evidence links in one place.",
        required: true,
        eta: "15m",
        prerequisites: ["w7_rehearsal"],
        evidence: { enabled: true, placeholder: "Paste link to your evidence hub" },
      },
      {
        id: "w7_quality_gate",
        label: "Quality gate: You can defend assumptions and trade-offs without improvising.",
        required: true,
        eta: "5m",
        prerequisites: ["w7_evidence_pack"],
      },
    ],
  },
];

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function nowISO() {
  return new Date().toISOString();
}

function isBlocked(item: ChecklistItem, checked: Record<string, boolean>) {
  const prereqs = item.prerequisites ?? [];
  if (prereqs.length === 0) return false;
  return prereqs.some((id) => !checked[id]);
}

function computeTotals(weeks: Week[], checked: Record<string, boolean>) {
  const requiredItems = weeks.flatMap((w) => w.checklist.filter((i) => i.required !== false));
  const total = requiredItems.length;
  const done = requiredItems.filter((i) => checked[i.id]).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return { total, done, pct };
}

function findNextAction(weeks: Week[], checked: Record<string, boolean>) {
  for (const w of weeks) {
    for (const item of w.checklist) {
      const required = item.required !== false;
      if (!required) continue;
      if (checked[item.id]) continue;
      if (isBlocked(item, checked)) continue;
      return { weekId: w.id, item };
    }
  }
  return null;
}

function buildProgressSummary(weeks: Week[], state: ProgressState) {
  const lines: string[] = [];
  lines.push("DSI Journey Progress Summary");
  lines.push(`Last updated: ${state.lastUpdatedISO ?? "—"}`);
  lines.push("—");

  for (const w of weeks) {
    const required = w.checklist.filter((i) => i.required !== false);
    const done = required.filter((i) => state.checked[i.id]).length;
    lines.push(`${w.weekLabel} — ${w.title}: ${done}/${required.length} completed`);

    const pending = required.filter((i) => !state.checked[i.id]).slice(0, 3);
    if (pending.length) {
      lines.push("  Next to do:");
      for (const p of pending) lines.push(`  - ${p.label}`);
    }

    const evidenceLinks = required
      .filter((i) => i.evidence?.enabled)
      .map((i) => ({ id: i.id, label: i.label, link: state.evidence[i.id] }))
      .filter((x) => (x.link ?? "").trim().length > 0);

    if (evidenceLinks.length) {
      lines.push("  Evidence:");
      for (const e of evidenceLinks.slice(0, 5)) {
        lines.push(`  - ${e.label}: ${e.link}`);
      }
    }

    const refl = (state.reflections[w.id] ?? "").trim();
    if (refl) {
      lines.push("  Reflection:");
      lines.push(`  ${refl}`);
    }

    const conf = state.confidence[w.id];
    if (conf) lines.push(`  Confidence: ${conf}`);

    lines.push(" ");
  }

  return lines.join("\n");
}

export default function DSIStudentJourneyDashboard() {
  const [state, setState] = useState<ProgressState>(() =>
    safeParse<ProgressState>(
      typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null,
      {
        checked: {},
        evidence: {},
        reflections: {},
        confidence: {},
        lastUpdatedISO: undefined,
      }
    )
  );

  // Persist
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const totals = useMemo(() => computeTotals(WEEKS, state.checked), [state.checked]);
  const nextAction = useMemo(() => findNextAction(WEEKS, state.checked), [state.checked]);

  const upcomingDue = useMemo(() => {
    // Keep simple: show all due items in order of week occurrence.
    return WEEKS.filter((w) => w.due).map((w) => ({
      weekId: w.id,
      title: `${w.weekLabel}: ${w.title}`,
      date: w.due!.date,
    }));
  }, []);

  function updateChecked(id: string, value: boolean) {
    setState((prev) => ({
      ...prev,
      checked: { ...prev.checked, [id]: value },
      lastUpdatedISO: nowISO(),
    }));
  }

  function updateEvidence(id: string, value: string) {
    setState((prev) => ({
      ...prev,
      evidence: { ...prev.evidence, [id]: value },
      lastUpdatedISO: nowISO(),
    }));
  }

  function updateReflection(weekId: string, value: string) {
    setState((prev) => ({
      ...prev,
      reflections: { ...prev.reflections, [weekId]: value },
      lastUpdatedISO: nowISO(),
    }));
  }

  function updateConfidence(weekId: string, value: "low" | "medium" | "high") {
    setState((prev) => ({
      ...prev,
      confidence: { ...prev.confidence, [weekId]: value },
      lastUpdatedISO: nowISO(),
    }));
  }

  async function copySummary() {
    const text = buildProgressSummary(WEEKS, state);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // fallback: do nothing
    }
  }

  function resetAll() {
    setState({ checked: {}, evidence: {}, reflections: {}, confidence: {}, lastUpdatedISO: nowISO() });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="bg-muted/40 border-b">
        <div className="mx-auto max-w-5xl px-4 py-10">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                Digital Strategy &amp; Innovation — Student Journey
              </h1>
              <p className="text-muted-foreground mt-2 max-w-2xl">
                One continuous sprint: every week builds toward your final strategic comeback plan.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={copySummary} className="gap-2">
                <ClipboardList className="h-4 w-4" /> Copy progress summary
              </Button>
              <Button variant="outline" onClick={resetAll} className="gap-2">
                <RotateCcw className="h-4 w-4" /> Reset
              </Button>
            </div>
          </div>

          {/* Phases */}
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {PHASES.map((p) => (
              <Card key={p.key} className="rounded-2xl">
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{p.icon}</span>
                    <span className="text-xs font-semibold uppercase tracking-wide">
                      {p.label}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Progress + Next Up */}
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="rounded-2xl lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" /> Your progress
                </CardTitle>
                <CardDescription>
                  {totals.done}/{totals.total} required items completed.
                  {state.lastUpdatedISO ? ` Last updated: ${new Date(state.lastUpdatedISO).toLocaleString()}` : ""}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Progress value={totals.pct} />
                <div className="mt-2 text-sm text-muted-foreground">{totals.pct}% complete</div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" /> Next action
                </CardTitle>
                <CardDescription>
                  Do the next available required step to keep moving.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {nextAction ? (
                  <div className="space-y-3">
                    <div className="text-sm">
                      <div className="font-semibold">
                        {WEEKS.find((w) => w.id === nextAction.weekId)?.weekLabel}: {WEEKS.find((w) => w.id === nextAction.weekId)?.title}
                      </div>
                      <div className="text-muted-foreground mt-1">{nextAction.item.label}</div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Timer className="h-4 w-4" />
                      <span>{nextAction.item.eta ?? "—"}</span>
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => updateChecked(nextAction.item.id, true)}
                    >
                      Mark done
                    </Button>
                    <div className="text-xs text-muted-foreground">
                      Tip: Only tick this if you can show evidence (link) or explain it clearly.
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    Nothing left that’s currently unblocked. If you’re done, prepare your pitch and defense.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Deadlines */}
          <Card className="rounded-2xl mt-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" /> Upcoming deadlines
              </CardTitle>
              <CardDescription>
                These are key moments where you submit or show progress.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {upcomingDue.length ? (
                  upcomingDue.map((d) => (
                    <Badge key={d.weekId} variant="secondary" className="gap-2 py-2">
                      <Flag className="h-4 w-4" />
                      <span className="font-semibold">{d.date}</span>
                      <span className="text-muted-foreground">— {d.title}</span>
                    </Badge>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground">No deadlines configured.</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Info Callout */}
          <div className="mt-4 flex items-start gap-3 rounded-2xl border bg-card p-4">
            <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <div className="font-semibold">One continuous journey</div>
              <div className="text-sm text-muted-foreground">
                This is not separate assignments. Each week builds directly toward your final strategy and defense.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold">Weekly roadmap</h2>
            <p className="text-muted-foreground">Open a week, follow the checklist, add evidence links, and reflect.</p>
          </div>
        </div>

        <div className="mt-6">
          <Accordion type="multiple" className="space-y-3">
            {WEEKS.map((week) => (
              <AccordionItem key={week.id} value={week.id} className="border rounded-2xl bg-card">
                <AccordionTrigger className="px-4 py-4 hover:no-underline">
                  <div className="flex w-full items-start justify-between gap-4">
                    <div className="flex flex-col text-left">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="rounded-full">{week.phaseLabel}</Badge>
                        <span className="text-sm text-muted-foreground">{week.weekLabel}: {week.dates}</span>
                        {week.due ? (
                          <Badge className="rounded-full gap-2" variant="destructive">
                            <Flag className="h-3.5 w-3.5" /> {week.due.label}: {week.due.date}
                          </Badge>
                        ) : null}
                      </div>
                      <div className="mt-2">
                        <div className="text-lg font-semibold">{week.title}</div>
                        <div className="text-sm text-muted-foreground">{week.subtitle}</div>
                      </div>
                    </div>

                    <WeekMiniProgress week={week} checked={state.checked} />
                  </div>
                </AccordionTrigger>

                <AccordionContent>
                  <div className="px-4 pb-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      {/* Business case card */}
                      <Card className="rounded-2xl lg:col-span-1">
                        <CardHeader>
                          <CardTitle className="text-base">Business case connection</CardTitle>
                          <CardDescription>How this week fits in your case.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div>
                            <div className="text-xs text-muted-foreground font-semibold uppercase">Current stage</div>
                            <div className="font-semibold">{week.businessCase.stage}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground font-semibold uppercase">Student output</div>
                            <div className="text-sm text-muted-foreground">{week.businessCase.output}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground font-semibold uppercase">Weekly goal</div>
                            <div className="text-sm italic">“{week.businessCase.goalQuote}”</div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Checklist */}
                      <Card className="rounded-2xl lg:col-span-2">
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <ClipboardList className="h-4 w-4" /> Checklist
                          </CardTitle>
                          <CardDescription>
                            Required items are gated by prerequisites. Add evidence links where asked.
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-3">
                            {week.checklist.map((item) => {
                              const checked = !!state.checked[item.id];
                              const blocked = isBlocked(item, state.checked);
                              const isNext = nextAction?.item.id === item.id;

                              return (
                                <motion.div
                                  key={item.id}
                                  layout
                                  initial={{ opacity: 0, y: 6 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ duration: 0.18 }}
                                  className={
                                    "rounded-2xl border p-3 " +
                                    (isNext ? "border-primary/40 bg-primary/5" : "bg-background")
                                  }
                                >
                                  <div className="flex items-start gap-3">
                                    <Checkbox
                                      checked={checked}
                                      disabled={blocked}
                                      onCheckedChange={(v) => updateChecked(item.id, Boolean(v))}
                                      className="mt-1"
                                    />
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="font-medium leading-snug">
                                          {item.label}
                                        </div>
                                        <div className="flex items-center gap-2">
                                          {item.eta ? (
                                            <Badge variant="outline" className="gap-1 rounded-full">
                                              <Timer className="h-3.5 w-3.5" /> {item.eta}
                                            </Badge>
                                          ) : null}
                                          {blocked ? (
                                            <Badge variant="secondary" className="rounded-full">
                                              Blocked
                                            </Badge>
                                          ) : null}
                                        </div>
                                      </div>

                                      {blocked ? (
                                        <div className="mt-2 text-xs text-muted-foreground">
                                          Finish prerequisites first.
                                        </div>
                                      ) : null}

                                      {item.evidence?.enabled ? (
                                        <div className="mt-3">
                                          <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
                                            <Link2 className="h-3.5 w-3.5" /> Evidence link
                                          </div>
                                          <Input
                                            className="mt-2"
                                            value={state.evidence[item.id] ?? ""}
                                            placeholder={item.evidence.placeholder ?? "Paste link"}
                                            onChange={(e) => updateEvidence(item.id, e.target.value)}
                                          />
                                        </div>
                                      ) : null}
                                    </div>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>

                          <Separator />

                          {/* Reflection & confidence */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-2">
                              <div className="text-sm font-semibold">Reflection (2–4 sentences)</div>
                              <div className="text-xs text-muted-foreground">
                                What did you learn? What still feels uncertain?
                              </div>
                              <Textarea
                                className="mt-2 min-h-[96px]"
                                value={state.reflections[week.id] ?? ""}
                                onChange={(e) => updateReflection(week.id, e.target.value)}
                                placeholder="Example: We realised our initial assumption about X was weak, so we…"
                              />
                            </div>
                            <div>
                              <div className="text-sm font-semibold">Confidence</div>
                              <div className="text-xs text-muted-foreground">How ready do you feel?</div>
                              <div className="mt-2 flex flex-col gap-2">
                                {(["low", "medium", "high"] as const).map((lvl) => (
                                  <Button
                                    key={lvl}
                                    variant={state.confidence[week.id] === lvl ? "default" : "outline"}
                                    onClick={() => updateConfidence(week.id, lvl)}
                                    className="justify-start"
                                  >
                                    {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Self-check prompts */}
                          {week.selfCheck?.length ? (
                            <div className="mt-2 rounded-2xl border bg-muted/30 p-4">
                              <div className="font-semibold">Self-check questions</div>
                              <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground space-y-1">
                                {week.selfCheck.map((q) => (
                                  <li key={q}>{q}</li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                        </CardContent>
                      </Card>
                    </div>

                    {/* Optional resources placeholder */}
                    {week.resources?.length ? (
                      <div className="mt-4">
                        <Card className="rounded-2xl">
                          <CardHeader>
                            <CardTitle className="text-base">Resources</CardTitle>
                            <CardDescription>Slides, templates, examples (optional).</CardDescription>
                          </CardHeader>
                          <CardContent className="flex flex-wrap gap-2">
                            {week.resources.map((r) => (
                              <Badge key={r.label} variant="secondary" className="rounded-full">
                                {r.label}
                              </Badge>
                            ))}
                          </CardContent>
                        </Card>
                      </div>
                    ) : null}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* Assessment weights */}
        <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="rounded-2xl">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">15%</div>
              <div className="text-xs text-muted-foreground uppercase font-bold mt-1">Stage 1</div>
              <div className="text-xs text-muted-foreground/70">Analysis</div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">15%</div>
              <div className="text-xs text-muted-foreground uppercase font-bold mt-1">Stage 2</div>
              <div className="text-xs text-muted-foreground/70">Ideation</div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">40%</div>
              <div className="text-xs text-muted-foreground uppercase font-bold mt-1">Written exam</div>
              <div className="text-xs text-muted-foreground/70">Theory</div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-primary/30 bg-primary/5">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">25%</div>
              <div className="text-xs uppercase font-bold mt-1">Final pitch</div>
              <div className="text-xs text-muted-foreground/70">Stage 3</div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-xs text-muted-foreground">
          Privacy note: progress is stored in your browser (localStorage). Clearing browser data will reset it.
        </div>
      </div>
    </div>
  );
}

function WeekMiniProgress({ week, checked }: { week: Week; checked: Record<string, boolean> }) {
  const required = week.checklist.filter((i) => i.required !== false);
  const done = required.filter((i) => checked[i.id]).length;
  const pct = required.length === 0 ? 0 : Math.round((done / required.length) * 100);

  return (
    <div className="min-w-[140px] text-right">
      <div className="text-sm font-semibold">{done}/{required.length}</div>
      <div className="text-xs text-muted-foreground">{pct}%</div>
      <div className="mt-2">
        <Progress value={pct} />
      </div>
    </div>
  );
}
