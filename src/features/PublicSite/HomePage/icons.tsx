export function WavyUnderline() {
  return (
    <svg
      aria-hidden="true"
      className="absolute -bottom-3.5 left-0 w-full"
      fill="none"
      height="18"
      preserveAspectRatio="none"
      viewBox="0 0 260 18"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 10 Q 33 2 64 10 T 128 10 T 192 10 T 256 10"
        stroke="#d61f69"
        strokeLinecap="round"
        strokeWidth="5"
      />
    </svg>
  )
}

export function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      className="mt-0.5 size-4 shrink-0 text-primary"
      fill="none"
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="8" cy="8" fill="currentColor" fillOpacity="0.15" r="8" />
      <path
        d="M5 8l2 2 4-4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  )
}

export function DeviceIcon() {
  return (
    <div className="flex size-9 items-center justify-center rounded-full bg-primary/10">
      <svg
        aria-hidden="true"
        className="size-5 text-primary"
        fill="none"
        viewBox="0 0 20 20"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect
          height="14"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.5"
          width="10"
          x="5"
          y="3"
        />
        <circle cx="10" cy="14.5" fill="currentColor" r="0.75" />
      </svg>
    </div>
  )
}

export function GroupIcon() {
  return (
    <div className="flex size-9 items-center justify-center rounded-full bg-primary/10">
      <svg
        aria-hidden="true"
        className="size-5 text-primary"
        fill="none"
        viewBox="0 0 20 20"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          cx="7.5"
          cy="7"
          r="2.5"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M2 16c0-3 2.5-5 5.5-5s5.5 2 5.5 5"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.5"
        />
        <circle cx="14" cy="7" r="2" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M17 16c0-2.5-1.5-4-3.5-4.5"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.5"
        />
      </svg>
    </div>
  )
}
