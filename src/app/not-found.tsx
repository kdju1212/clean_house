import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-4xl">🔍</p>
      <h1 className="mt-4 text-lg font-bold">페이지를 찾을 수 없어요</h1>
      <p className="mt-2 text-sm text-neutral-500">
        주소가 잘못되었거나 삭제된 페이지예요.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
      >
        홈으로
      </Link>
    </main>
  );
}
