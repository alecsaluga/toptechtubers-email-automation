import { LoginForm } from "@/components/LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-6">
          <div className="icon-tile bg-brand-600 text-white">
            <span className="text-sm font-bold">T</span>
          </div>
          <span className="font-semibold text-neutral-900">TTT Automation</span>
        </div>
        <LoginForm nextPath={params.next ?? "/"} />
      </div>
    </div>
  );
}
