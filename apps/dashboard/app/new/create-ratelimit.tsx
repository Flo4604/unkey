import { getCurrentUser } from "@/lib/auth";
import { router } from "@/lib/trpc/routers";
import { createCallerFactory } from "@trpc/server";
import type { Workspace } from "@unkey/db";
import { Button, Code, CopyButton } from "@unkey/ui";
import { GlobeLock } from "lucide-react";
import Link from "next/link";

type Props = {
  workspace: Workspace;
};

export const CreateRatelimit: React.FC<Props> = async (props) => {
  const user = await getCurrentUser();

  // make typescript happy
  if (!user || !user.orgId || !user.role) {
    return null;
  }

  const trpc = createCallerFactory()(router)({
    // biome-ignore lint/suspicious/noExplicitAny: tRPC context req object is not used in server-side calls, empty object is acceptable
    req: {} as any,
    user: {
      id: user.id,
    },
    workspace: props.workspace,
    tenant: {
      id: user.orgId,
      role: user.role,
    },
    audit: {
      location: "",
      userAgent: "",
    },
  });

  const rootKey = await trpc.rootKey.create({
    name: "onboarding",
    permissions: ["ratelimit.*.create_namespace", "ratelimit.*.limit"],
  });

  const snippet = `curl -XPOST 'https://api.unkey.dev/v1/ratelimits.limit' \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer ${rootKey.key}' \\
  -d '{
      "namespace": "hello-ratelimit",
      "identifier": "${user?.email ?? "hello"}",
      "limit": 10,
      "duration": 10000
  }'`;
  function AsideContent() {
    return (
      <div className="space-y-2">
        <div className="inline-flex items-center justify-center p-4 border rounded-full bg-primary/5">
          <GlobeLock className="w-6 h-6 text-primary" />
        </div>
        <h4 className="text-lg font-medium">What is Unkey ratelimiting?</h4>
        <p className="text-sm text-content-subtle">
          Global low latency ratelimiting for your application.
        </p>
        <ol className="ml-2 space-y-1 text-sm list-disc list-outside text-content-subtle">
          <li>Low latency</li>
          <li>Globally consistent</li>
          <li>Powerful analytics</li>
        </ol>
      </div>
    );
  }
  return (
    <div className="flex items-start justify-between gap-16">
      <main className="max-sm:w-full md:w-3/4">
        <aside className="mb-4 md:hidden">
          <AsideContent />
        </aside>

        <div>
          <p className="text-sm">
            Try this curl command and limit your first request, you can use a different namespace or
            identifier if you want.
          </p>
          <p className="text-sm">
            The following request will limit the user to 10 requests per 10 seconds.
          </p>

          <Code
            className="flex items-start justify-between gap-8 p-4 mt-4 text-xs text-left"
            copyButton={<CopyButton value={snippet} variant="ghost" />}
          >
            {snippet}
          </Code>
        </div>

        <Link href="/ratelimits" className="block mt-8" prefetch>
          <Button className="w-full">I have tried it out and want to see analytics</Button>
        </Link>
      </main>
      <aside className="flex-col items-start justify-center w-1/4 space-y-16 md:flex max-md:hidden ">
        <AsideContent />
      </aside>
    </div>
  );
};
