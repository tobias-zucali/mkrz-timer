import { ComponentProps, useState } from "react";

import InputField from ".";
import Link from "next/link";

export default function CopyField(
  {
    value,
    showOpenButton = false,
    ...otherProps
  }: ComponentProps<typeof InputField> & {
    showOpenButton?: boolean;
    value: string;
  }
) {
  const [isCopied, setIsCopied] = useState(false);

  const buttonClassName = "flex items-center content-center font-bold rounded-md w-26 ml-3 cursor-pointer bg-primary/60 hover:bg-primary"

  return (
    <InputField
      {...otherProps}
      value={value}
      readOnly={true}
      disabled={true}
    >
      <button
        className={buttonClassName}
        onClick={(e) => {
          navigator.clipboard.writeText(value);
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 2000);
          e.preventDefault();
        }}
      >
        <span className={isCopied ? "hidden" : ""}>
          Copy
        </span>
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
      {showOpenButton && (
        <Link
          className={buttonClassName}
          href={value}
          target="_blank"
        >
          Open
        </Link>
      )}
    </InputField>
  );
}
