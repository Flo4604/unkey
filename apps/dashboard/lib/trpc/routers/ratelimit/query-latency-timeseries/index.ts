import { ratelimitOverviewQueryTimeseriesPayload } from "@/app/(app)/ratelimits/[namespaceId]/_overview/components/charts/bar-chart/query-timeseries.schema";
import { clickhouse } from "@/lib/clickhouse";
import { db } from "@/lib/db";
import { ratelimit, requireUser, requireWorkspace, t, withRatelimit } from "@/lib/trpc/trpc";
import { TRPCError } from "@trpc/server";
import { transformRatelimitFilters } from "./utils";

//TODO: Refactor this endpoint once we move to AWS
export const queryRatelimitLatencyTimeseries = t.procedure
  .use(requireUser)
  .use(requireWorkspace)
  .use(withRatelimit(ratelimit.read))
  .input(ratelimitOverviewQueryTimeseriesPayload)
  .query(async ({ ctx, input }) => {
    const ratelimitNamespaces = await db.query.ratelimitNamespaces
      .findMany({
        where: (table, { and, eq, isNull }) =>
          and(
            eq(table.workspaceId, ctx.workspace.id),
            and(eq(table.id, input.namespaceId), isNull(table.deletedAtM)),
          ),
      })
      .catch((_err) => {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            "Failed to retrieve ratelimit timeseries analytics due to a workspace error. If this issue persists, please contact support@unkey.dev with the time this occurred.",
        });
      });

    if (!ratelimitNamespaces) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Ratelimit namespaces not found, please contact support using support@unkey.dev.",
      });
    }

    if (ratelimitNamespaces.length === 0) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Namespace not found",
      });
    }

    // Transform input filters and determine granularity
    const { params: transformedInputs, granularity } = transformRatelimitFilters(input);

    // Query clickhouse using our new ratelimit timeseries functions
    const result = await clickhouse.ratelimits.timeseries.latency[granularity]({
      ...transformedInputs,
      workspaceId: ctx.workspace.id,
      namespaceId: ratelimitNamespaces[0].id,
    });

    if (result.err) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          "Failed to retrieve ratelimit timeseries analytics due to an error. If this issue persists, please contact support@unkey.dev with the time this occurred.",
      });
    }

    return { timeseries: result.val, granularity };
  });
