import TimerPageRoute from "@/app/LocalizedTimerPageRoute"

type LocalizedTimerPageProps = {
  params: Promise<{ locale: string }>
}

export default async function LocalizedTimerPage({
  params,
}: LocalizedTimerPageProps) {
  const { locale } = await params

  return <TimerPageRoute requestedLocale={locale} />
}
