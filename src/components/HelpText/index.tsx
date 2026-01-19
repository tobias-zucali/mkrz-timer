import classNames from "classnames"
import { HTMLAttributes } from "react"

export default function HelpText({
  className,
  ...otherProps
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={classNames("w-full", className)} {...otherProps}>
      <h2 className="text-lg font-bold">Keyboard Shortcuts</h2>
      <table className="table-auto border-collapse border border-foreground w-full mt-4">
        <thead>
          <tr className="bg-foreground/20">
            <th className="border border-foreground px-4 py-2 text-left">
              Key
            </th>
            <th className="border border-foreground px-4 py-2 text-left">
              Action
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-foreground px-4 py-2">
              <em className="font-bold">R</em> /{" "}
              <em className="font-bold">Escape</em>
            </td>
            <td className="border border-foreground px-4 py-2">
              Reset the timer
            </td>
          </tr>
          <tr>
            <td className="border border-foreground px-4 py-2">
              <em className="font-bold">P</em>
            </td>
            <td className="border border-foreground px-4 py-2">
              Start/Pause the timer
            </td>
          </tr>
          <tr>
            <td className="border border-foreground px-4 py-2">
              <em className="font-bold">Enter</em> /{" "}
              <em className="font-bold">Space</em>
            </td>
            <td className="border border-foreground px-4 py-2">
              Start/Pause the timer and reset on timeout
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
