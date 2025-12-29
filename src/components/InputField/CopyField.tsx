import { ComponentProps, useState } from "react";

import InputField from ".";

export default function CopyField(
  {
    value,
    ...otherProps
  }: ComponentProps<typeof InputField> & {
    value: string;
  }
) {
  const [isCopied, setIsCopied] = useState(false);

  return (
    <InputField
      {...otherProps}
      value={value}
      readOnly={true}
      disabled={true}
    >
      <button
        className="font-bold rounded-md w-26 ml-3 cursor-pointer bg-primary/60 hover:bg-primary"
        onClick={(e) => {
          navigator.clipboard.writeText(value);
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 2000);
          e.preventDefault();
        }}
      >
        <span id="default-message" className={isCopied ? "hidden" : ""}>
          Copy
        </span>
        <span id="success-message" className={isCopied ? "" : "hidden"}>
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
      <div
        id="tooltip-copy-npm-install-copy-button"
        role="tooltip"
        className="absolute z-10 invisible inline-block px-3 py-2 text-sm font-medium text-foreground transition-opacity duration-300 bg-dark rounded-base shadow-xs opacity-0 tooltip"
      >
        <span id="default-tooltip-message">Copy to clipboard</span>
        <span id="success-tooltip-message" className="hidden">
          Copied!
        </span>
        <div className="tooltip-arrow" data-popper-arrow></div>
      </div>
    </InputField>
  );
}
