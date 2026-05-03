import type { ButtonHTMLAttributes } from "react"

export default function CloseButton({
  title = "Close",
  ...otherProps
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className="absolute top-0 left-0 p-4 text-foreground/50 hover:text-primary cursor-pointer"
      type="button"
      title={title}
      {...otherProps}
    >
      <svg
        className="w-6 h-6"
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        fill="none"
        viewBox="0 0 24 24"
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="m15 9-6 6m0-6 6 6m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
        />
      </svg>
    </button>
  )
}
