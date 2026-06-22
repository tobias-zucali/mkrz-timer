import {
  buildTimerUrlSearchParams,
  buildUrlTimerRow,
} from "@/shared/urlState/index"
import type { SyncParams } from "@/shared/liveSession/types"
import { DEFAULT_SYNC_PARAMS } from "@/shared/security/input"

export const EXAMPLE_COLOR = {
  green: "#34b87a",
  blue: "#2f7fd6",
  yellow: "#ef9e3b",
  red: "#d61f69",
  purple: "#8a55d6",
} as const

export type ExampleStep = {
  title: string
  duration: number
  color: string
  behavior: "advance" | "stop"
}

export type ExampleScope = "local" | "live"

export type ExampleTimer = {
  id: string
  title: string
  description: string
  category: string
  groupSize: string
  scope: ExampleScope
  steps: ExampleStep[]
}

export const EXAMPLES: ExampleTimer[] = [
  {
    id: "pomodoro",
    title: "Pomodoro Study Session",
    description:
      "Focused sprints with short breaks, looping continuously — step away for a longer break whenever you need one.",
    category: "Focus & Productivity",
    groupSize: "Solo",
    scope: "local",
    steps: [
      {
        title: "Focus",
        duration: 1500,
        color: EXAMPLE_COLOR.green,
        behavior: "advance",
      },
      {
        title: "Step Away",
        duration: 300,
        color: EXAMPLE_COLOR.blue,
        behavior: "advance",
      },
    ],
  },
  {
    id: "box-breathing",
    title: "Box Breathing",
    description:
      "A calming breathing rhythm to reduce stress and reset focus — loops until you're ready.",
    category: "Mindfulness",
    groupSize: "Solo",
    scope: "local",
    steps: [
      {
        title: "Breathe in",
        duration: 4,
        color: EXAMPLE_COLOR.green,
        behavior: "advance",
      },
      {
        title: "Hold",
        duration: 4,
        color: EXAMPLE_COLOR.yellow,
        behavior: "advance",
      },
      {
        title: "Breathe out",
        duration: 6,
        color: EXAMPLE_COLOR.blue,
        behavior: "advance",
      },
      {
        title: "Hold",
        duration: 4,
        color: EXAMPLE_COLOR.yellow,
        behavior: "advance",
      },
    ],
  },
  {
    id: "sketching-under-pressure",
    title: "Sketching Under Pressure",
    description:
      "Three rounds of shrinking time push you past perfectionism into raw ideas.",
    category: "Creative Work",
    groupSize: "Solo or Small Group",
    scope: "local",
    steps: [
      {
        title: "Sketch 1 – First idea",
        duration: 300,
        color: EXAMPLE_COLOR.green,
        behavior: "advance",
      },
      {
        title: "Sketch 2 – Push further",
        duration: 180,
        color: EXAMPLE_COLOR.yellow,
        behavior: "advance",
      },
      {
        title: "Sketch 3 – Fastest version",
        duration: 60,
        color: EXAMPLE_COLOR.red,
        behavior: "stop",
      },
    ],
  },
  {
    id: "silent-reflection",
    title: "Silent Reflection",
    description:
      "Quiet individual thinking time before group discussion — no talking, just writing.",
    category: "Workshops",
    groupSize: "Any",
    scope: "local",
    steps: [
      {
        title: "Reflect & write your thoughts",
        duration: 300,
        color: EXAMPLE_COLOR.blue,
        behavior: "stop",
      },
    ],
  },
  {
    id: "timed-writing",
    title: "Timed Writing",
    description:
      "A short warm-up loosens the pen, then a longer sprint carries you into flow.",
    category: "Creative Work",
    groupSize: "Solo or Small Group",
    scope: "live",
    steps: [
      {
        title: "Warm up – write anything",
        duration: 120,
        color: EXAMPLE_COLOR.yellow,
        behavior: "advance",
      },
      {
        title: "Write – don't stop, don't edit!",
        duration: 600,
        color: EXAMPLE_COLOR.green,
        behavior: "stop",
      },
    ],
  },
  {
    id: "making-challenge",
    title: "Making Challenge",
    description:
      "A short creative sprint — grab what's near you and make something that represents your thoughts.",
    category: "Workshops",
    groupSize: "Any",
    scope: "live",
    steps: [
      {
        title: "Make Something!",
        duration: 120,
        color: EXAMPLE_COLOR.yellow,
        behavior: "advance",
      },
      {
        title: "Share your making!",
        duration: 60,
        color: EXAMPLE_COLOR.yellow,
        behavior: "stop",
      },
    ],
  },
  {
    id: "session-break",
    title: "Session – Break",
    description:
      "Keeps a full workshop day on track — loops through sessions and breaks automatically.",
    category: "Workshops",
    groupSize: "Large Group",
    scope: "live",
    steps: [
      {
        title: "Workshop Session",
        duration: 2700,
        color: EXAMPLE_COLOR.green,
        behavior: "advance",
      },
      {
        title: "Recharge Break",
        duration: 900,
        color: EXAMPLE_COLOR.blue,
        behavior: "advance",
      },
    ],
  },
  {
    id: "retrospective-pair-walk",
    title: "Retrospective Pair Walk",
    description:
      "A structured pair conversation followed by group sharing — ideal for team retrospectives.",
    category: "Lean Project Management",
    groupSize: "Small Group",
    scope: "live",
    steps: [
      {
        title: "What went well?",
        duration: 300,
        color: EXAMPLE_COLOR.green,
        behavior: "advance",
      },
      {
        title: "What didn't go well?",
        duration: 300,
        color: EXAMPLE_COLOR.red,
        behavior: "advance",
      },
      {
        title: "Actions – how to make it better?",
        duration: 300,
        color: EXAMPLE_COLOR.yellow,
        behavior: "advance",
      },
      {
        title: "Regroup",
        duration: 150,
        color: EXAMPLE_COLOR.yellow,
        behavior: "advance",
      },
      {
        title: "Group Harvest",
        duration: 1200,
        color: EXAMPLE_COLOR.purple,
        behavior: "stop",
      },
    ],
  },
  {
    id: "speaker-time-limits",
    title: "Speaker Time Limits",
    description:
      "Keeps every voice to equal time — loops through speakers until the round is done.",
    category: "Facilitation",
    groupSize: "Any",
    scope: "live",
    steps: [
      {
        title: "Speaking Time",
        duration: 600,
        color: EXAMPLE_COLOR.green,
        behavior: "advance",
      },
      {
        title: "Switch!",
        duration: 150,
        color: EXAMPLE_COLOR.yellow,
        behavior: "advance",
      },
    ],
  },
  {
    id: "standup-meeting",
    title: "Stand-up Meeting",
    description:
      "Equal speaking time for every team member — loops through the group automatically.",
    category: "Facilitation",
    groupSize: "Small Group",
    scope: "live",
    steps: [
      {
        title: "Your turn – what's your update?",
        duration: 120,
        color: EXAMPLE_COLOR.green,
        behavior: "advance",
      },
      {
        title: "Next!",
        duration: 10,
        color: EXAMPLE_COLOR.yellow,
        behavior: "advance",
      },
    ],
  },
  {
    id: "speed-networking",
    title: "Speed Networking",
    description:
      "Structured short conversations — loops through rounds until you stop.",
    category: "Conferences",
    groupSize: "Large Group",
    scope: "live",
    steps: [
      {
        title: "Find your partner",
        duration: 60,
        color: EXAMPLE_COLOR.yellow,
        behavior: "advance",
      },
      {
        title: "Connect!",
        duration: 300,
        color: EXAMPLE_COLOR.green,
        behavior: "advance",
      },
      {
        title: "Wrap up & switch",
        duration: 30,
        color: EXAMPLE_COLOR.yellow,
        behavior: "advance",
      },
    ],
  },
  {
    id: "rapid-prototyping-sprint",
    title: "Rapid Prototyping Sprint",
    description:
      "A full creative cycle — build, get feedback, refine, and present in one focused session.",
    category: "Creative Work",
    groupSize: "Small Group",
    scope: "live",
    steps: [
      {
        title: "Build it!",
        duration: 1500,
        color: EXAMPLE_COLOR.green,
        behavior: "advance",
      },
      {
        title: "Share & get feedback",
        duration: 300,
        color: EXAMPLE_COLOR.purple,
        behavior: "advance",
      },
      {
        title: "Improve it!",
        duration: 900,
        color: EXAMPLE_COLOR.yellow,
        behavior: "advance",
      },
      {
        title: "Present your work!",
        duration: 300,
        color: EXAMPLE_COLOR.yellow,
        behavior: "stop",
      },
    ],
  },
]

function formatStepDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m === 0) return `${s}s`
  if (s === 0) return `${m} min`
  return `${m}:${String(s).padStart(2, "0")}`
}

export function formatStepTooltip(step: ExampleStep): string {
  return `${step.title} · ${formatStepDuration(step.duration)}`
}

export function buildExampleTimerUrl(
  locale: string,
  example: ExampleTimer,
): string {
  const searchParams = buildTimerUrlSearchParams({
    rows: example.steps.map((step) =>
      buildUrlTimerRow({
        endBehavior: step.behavior,
        primaryColor: step.color,
        repeatCount: 1,
        title: step.title,
        totalSeconds: step.duration,
      }),
    ),
    extraParams: { title: example.title },
  })
  const hash = example.scope === "live" ? "#share" : ""
  return `/${locale}/t?${searchParams}${hash}`
}

export function buildSyncParamsFromExample(example: ExampleTimer): SyncParams {
  const firstStep = example.steps[0]
  const m = firstStep
    ? String(Math.floor(firstStep.duration / 60)).padStart(2, "0")
    : "05"
  const s = firstStep ? String(firstStep.duration % 60).padStart(2, "0") : "00"

  return {
    ...DEFAULT_SYNC_PARAMS,
    activeIndex: 0,
    title: firstStep?.title ?? "",
    m,
    s,
    pc: firstStep?.color ?? DEFAULT_SYNC_PARAMS.pc,
    rows: example.steps.map((step) => ({
      endBehavior: step.behavior,
      primaryColor: step.color,
      repeatCount: 1,
      title: step.title,
      totalSeconds: step.duration,
    })),
  }
}
