export default function Mailto({
  className,
  email,
  subject = "",
  body = "",
  getBody,
  children,
}: {
  className?: string
  email: string
  subject?: string
  body?: string
  getBody?: () => string
  children: React.ReactNode
}) {
  const handleClick = () => {
    const nextBody = getBody ? getBody() : body
    let params = subject || nextBody ? "?" : ""

    if (subject) {
      params += `subject=${encodeURIComponent(subject)}`
    }

    if (nextBody) {
      params += `${subject ? "&" : ""}body=${encodeURIComponent(nextBody)}`
    }

    window.location.href = `mailto:${email}${params}`
  }

  return (
    <button className={className} onClick={handleClick} type="button">
      {children}
    </button>
  )
}
