import TimerPageRoute from "@/features/TimerPage/Route"

type LocalizedTimerPageProps = {
  params: Promise<{ locale: string }>
}

export default async function LocalizedTimerPage({
  params,
}: LocalizedTimerPageProps) {
  const { locale } = await params

  return <TimerPageRoute requestedLocale={locale} />
}
