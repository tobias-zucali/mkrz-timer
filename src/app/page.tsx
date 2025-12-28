"use client";

import { useState } from "react";
import Link from "next/link";
import classNames from "classnames";

import useParams from "@/utils/useParams";
import HelpText from "@/components/HelpText";

const InputField = ({
  containerClassName,
  label,
  id,
  className,
  children,
  ...otherProps
}: {
  containerClassName?: string;
  label: string;
  id: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  children?: React.ReactNode;
} & React.InputHTMLAttributes<HTMLInputElement>) => (
  <div className={classNames("pt-2 w-full", containerClassName)}>
    <label htmlFor={id} className="block text-sm/6 font-medium">
      {label}
    </label>
    <div className="flex items-stretch">
      <input
        id={id}
        type="text"
        name={id}
        autoComplete="given-name"
        className={classNames(
          otherProps.type !== "color" && "pl-3",
          otherProps.type !== "color" && otherProps.type !== "number" && "pr-3",
          "block w-full rounded-md h-10",
          "bg-foreground/15 text-base text-foreground",
          "outline-1 -outline-offset-1 outline-foreground/10 placeholder:text-foreground/50",
          "focus:outline-2 focus:-outline-offset-2 focus:outline-primary sm:text-sm/6",
          className
        )}
        {...otherProps}
      />
      {children}
    </div>
  </div>
);

export default function Home() {
  const { params, setParams, getPathWithParams, getUrlWithParams } =
    useParams();
  const [isCopied, setIsCopied] = useState(false);

  return (
    <div className="flex min-h-screen items-center justify-center font-sans">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 sm:items-start">
        <form className="w-full">
          <div className="space-y-12">
            <div className="flex flex-wrap pb-3 -mx-3">
              <InputField
                label="Title"
                id="title"
                containerClassName="px-3"
                value={params.title}
                onChange={(e) => setParams({ title: e.target.value })}
              />
              <InputField
                label="Minutes"
                id="minutes"
                type="number"
                containerClassName="md:w-1/2 px-3"
                value={params.m || 1}
                onChange={(e) => setParams({ m: e.target.value })}
              />
              <InputField
                label="Seconds"
                id="seconds"
                type="number"
                containerClassName="md:w-1/2 px-3"
                value={params.s || 0}
                onChange={(e) => setParams({ s: e.target.value })}
              />
              <InputField
                label="Background Color"
                id="bg"
                type="color"
                containerClassName="md:w-1/3 px-3"
                value={params.bg}
                onChange={(e) => setParams({ bg: e.target.value })}
              />
              <InputField
                label="Foreground Color"
                id="fg"
                type="color"
                containerClassName="md:w-1/3 px-3"
                value={params.fg}
                onChange={(e) => setParams({ fg: e.target.value })}
              />
              <InputField
                label="Primary Color"
                id="p"
                type="color"
                containerClassName="md:w-1/3 px-3"
                value={params.p}
                onChange={(e) => setParams({ p: e.target.value })}
              />
              <InputField
                label="Timer URL"
                id="timer_url"
                containerClassName="px-3"
                value={getUrlWithParams()}
                readOnly={true}
                disabled={true}
              >
                <button
                  className="font-bold rounded-md w-26 ml-3 cursor-pointer bg-primary/60 hover:bg-primary"
                  onClick={(e) => {
                    navigator.clipboard.writeText(getUrlWithParams());
                    setIsCopied(true);
                    setTimeout(() => setIsCopied(false), 2000);
                    e.preventDefault();
                  }}
                >
                  <span
                    id="default-message"
                    className={isCopied ? "hidden" : ""}
                  >
                    Copy
                  </span>
                  <span
                    id="success-message"
                    className={isCopied ? "" : "hidden"}
                  >
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
            </div>
            <Link
              href={getPathWithParams("/run")}
              className="block mb-8 rounded-lg px-8 py-4 text-center font-bold bg-primary hover:bg-primary/80 text-foreground"
            >
              Run Timer
            </Link>
          </div>
        </form>
        <HelpText 
        />
      </main>
    </div>
  );
}
