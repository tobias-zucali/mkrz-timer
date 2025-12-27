"use client"

import Link from "next/link";
import classNames from "classnames";

import useParams from "@/utils/useParams";

const InputField = ({
  containerClassName,
  label,
  id,
  className,
  ...otherProps
}: {
  containerClassName?: string;
  label: string;
  id: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
} & React.InputHTMLAttributes<HTMLInputElement>) => (
  <label htmlFor={id} className={classNames(
    "block text-sm/6 font-medium text-white pt-2 w-full",
    containerClassName
  )}>
    {label}
    <input
      id={id}
      type="text"
      name={id}
      autoComplete="given-name"
      className={classNames(
        otherProps.type !== "color" && "pl-3",
        otherProps.type !== "color" && otherProps.type !== "number" && "pr-3",
        "block w-full rounded-md h-10",
        "bg-white/15 text-base text-white",
        "outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500",
        "focus:outline-2 focus:-outline-offset-2 focus:outline-secondary sm:text-sm/6",
        className
      )}
      {...otherProps}
    />
  </label>
);

export default function Home() {
  const { params, setParams, getPathWithParams } = useParams();
  
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <Link
          href={getPathWithParams("/run")}
          className="mb-8 w-full rounded-lg bg-secondary px-8 py-4 text-center font-medium text-white hover:bg-blue-600"
        >
          Run Timer
        </Link>

        <pre>
          {JSON.stringify(params, null, 2)}
        </pre>

        <form className="w-full">
          <div className="space-y-12">
            <h2 className="text-base/7 font-semibold text-white">Profile</h2>
            <div className="flex flex-wrap border-b border-white/10 pb-12 -mx-3">
              <InputField
                label="Title"
                id="title"
                containerClassName="px-3"
                defaultValue={params.title}
                onChange={(e) => setParams({'title': e.target.value})}
              />
              <InputField
                label="Minutes"
                id="minutes"
                type="number"
                containerClassName="md:w-1/2 px-3"
                defaultValue={params.m || 1}
                onChange={(e) => setParams({'m': e.target.value})}
              />
              <InputField
                label="Seconds"
                id="seconds"
                type="number"
                containerClassName="md:w-1/2 px-3"
                defaultValue={params.s || 0}
                onChange={(e) => setParams({'s': e.target.value})}
              />
              <InputField
                label="Background Color"
                id="bg"
                type="color"
                containerClassName="md:w-1/3 px-3"
                defaultValue={params.bg}
                onChange={(e) => setParams({'bg': e.target.value})}
              />
              <InputField
                label="Foreground Color"
                id="fg"
                type="color"
                containerClassName="md:w-1/3 px-3"
                defaultValue={params.fg}
                onChange={(e) => setParams({'fg': e.target.value})}
              />
              <InputField
                label="Primary Color"
                id="p"
                type="color"
                containerClassName="md:w-1/3 px-3"
                defaultValue={params.p}
                onChange={(e) => setParams({'p': e.target.value})}
              />
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-x-6">
            <button type="button" className="text-sm/6 font-semibold text-white">
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-secondary px-3 py-2 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
            >
              Save
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

