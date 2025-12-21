import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <Link href="/run" className="mb-8 w-full rounded-lg bg-blue-500 px-8 py-4 text-center font-medium text-white hover:bg-blue-600">
          Go to Run Timer
        </Link>
      </main>
    </div>
  );
}
