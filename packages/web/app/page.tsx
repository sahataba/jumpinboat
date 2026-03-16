import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Jumpinboat Web</h1>
        <p className="text-gray-600">
          Next.js 16 + React 19 + Tailwind 4 starter.
        </p>
        <Link href="/api/health" className="text-blue-600 underline">
          API health (once API is wired via proxy)
        </Link>
      </div>
    </main>
  );
}

