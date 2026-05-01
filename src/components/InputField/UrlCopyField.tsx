import { ComponentProps, useEffect, useState } from "react"

import InputField from "."
import Link from "next/link"

export default function CopyField({
  value,
  showOpenButton = false,
  ...otherProps
}: ComponentProps<typeof InputField> & {
  showOpenButton?: boolean
  value: string
}) {
  const [isCopied, setIsCopied] = useState(false)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsClient(true)
    }
  }, [])

  const buttonClassName =
    "flex items-center justify-center font-bold rounded-md w-26 ml-3 cursor-pointer bg-primary/60 hover:bg-primary"

  return (
    <InputField
      {...otherProps}
      value={isClient ? value : ""}
      readOnly={true}
      disabled={true}
    >
      {navigator.clipboard && (
        <button
          className={buttonClassName}
          onClick={() => {
            navigator.clipboard.writeText(value)
            setIsCopied(true)
            setTimeout(() => setIsCopied(false), 2000)
          }}
          type="button"
        >
          <span className={isCopied ? "hidden" : ""}>Copy</span>
          <span className={isCopied ? "" : "hidden"}>
            <div className="inline-flex items-center">
              <svg
                className="w-3 h-3 me-1"
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
                  d="M5 11.917 9.724 16.5 19 7.5"
                />
              </svg>
              Copied!
            </div>
          </span>
        </button>
      )}
      {showOpenButton && (
        <Link
          className={buttonClassName}
          href={isClient ? value : ""}
          target="_blank"
        >
          Open
        </Link>
      )}
    </InputField>
  )
}
