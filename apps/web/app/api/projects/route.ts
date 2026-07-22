import { z } from "zod";

import { getCurrentUser } from "@/lib/server/current-user";
import { PAYLOAD_LIMITS, guardMutation, privateJson } from "@/lib/server/request-guard";
import { resolveBetaRoute } from "@/lib/server/route-auth";

const CreateProjectSchema = z.object({
  name: z.string().min(1).max(PAYLOAD_LIMITS.projectName),
  description: z.string().max(PAYLOAD_LIMITS.projectDescription).optional(),
  template: z.enum(["blank", "sample"]),
});

export async function GET(): Promise<Response> {
  const ctx = await resolveBetaRoute(getCurrentUser);
  if (ctx instanceof Response) return ctx;
  return privateJson({ projects: await ctx.projects.listProjects() });
}

export async function POST(request: Request): Promise<Response> {
  const guard = await guardMutation(request, { methods: ["POST"] });
  if ("response" in guard) return guard.response;

  const ctx = await resolveBetaRoute(getCurrentUser);
  if (ctx instanceof Response) return ctx;

  const parsed = CreateProjectSchema.safeParse(guard.body);
  if (!parsed.success) {
    return privateJson(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }

  const created = await ctx.projects.createProject({
    name: parsed.data.name,
    template: parsed.data.template,
    ...(parsed.data.description !== undefined && { description: parsed.data.description }),
  });
  return privateJson(created, { status: 201 });
}
