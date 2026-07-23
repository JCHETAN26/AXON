import { NextResponse } from "next/server";
import { resolveBetaRoute } from "@/lib/server/route-auth";
import { getCurrentUser } from "@/lib/server/current-user";
import { getProjectRepository } from "@/lib/projects/get-repository";
import { transformAwsToGcp } from "@axon/repo-intel";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const ctx = await resolveBetaRoute(getCurrentUser);
  if (ctx instanceof Response) return ctx;

  const { projectId } = await params;
  if (!projectId) return new NextResponse("Bad Request", { status: 400 });

  const projectRepo = getProjectRepository();
  const projectData = await projectRepo.getProject(projectId);

  if (!projectData) {
    return new NextResponse("Project not found", { status: 404 });
  }

  const result = transformAwsToGcp(projectData.document);
  return NextResponse.json(result);
}
