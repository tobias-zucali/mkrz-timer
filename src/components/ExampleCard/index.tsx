import Link from "next/link"

import { formatStepTooltip } from "./examplesData"
import type { ExampleTimer } from "./examplesData"

export default function ExampleCard({
  example,
  timerUrl,
}: {
  example: ExampleTimer
  timerUrl: string
}) {
  return (
    <Link
      className="flex flex-col rounded-2xl border border-clay-800/10 bg-white p-5 transition hover:border-primary/60 hover:shadow-md focus:outline-2 focus:-outline-offset-2 focus:outline-primary"
      href={timerUrl}
    >
      <p className="font-mono text-[0.68rem] font-bold tracking-[0.14em] text-amber-600 uppercase">
        {example.category}
      </p>
      <h3 className="mt-2 font-display text-lg/snug font-semibold text-clay-900">
        {example.title}
      </h3>
      <p className="mt-2 font-body text-sm/relaxed text-clay-500">
        {example.description}
      </p>
      <div className="mt-auto flex items-center gap-2 pt-4">
        <div className="flex flex-wrap gap-1.5">
          {example.steps.map((step, i) => (
            <span
              key={i}
              className="size-3 rounded-full"
              style={{ backgroundColor: step.color }}
              title={formatStepTooltip(step)}
            />
          ))}
        </div>
        <p className="ml-auto shrink-0 font-body text-xs text-clay-400">
          {example.groupSize}
        </p>
      </div>
    </Link>
  )
}
