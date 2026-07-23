import { type RawEvidence } from "../schemas";
import { type ExtractorId } from "../classify-files";
import { extractPackageJson, extractRequirementsTxt, extractPyproject, extractGoMod } from "./manifests";
import { extractDockerfile, extractCompose } from "./container";
import { extractGithubActions } from "./github-actions";
import { extractConfigEnv } from "./config-env";
import { extractJsTsSource } from "./js-ts-source";
import { extractPythonSource } from "./python-source";
import { extractTerraform } from "./terraform";
import { extractKubernetes } from "./kubernetes";

/**
 * Runs the appropriate deterministic extractor for a supported file.
 */
export function extractEvidence(
  filePath: string,
  extractorId: ExtractorId,
  text: string
): RawEvidence[] {
  switch (extractorId) {
    case "package-json":
      return extractPackageJson(filePath, text);
    case "requirements-txt":
      return extractRequirementsTxt(filePath, text);
    case "pyproject-toml":
      return extractPyproject(filePath, text);
    case "go-mod":
      return extractGoMod(filePath, text);
    case "dockerfile":
      return extractDockerfile(filePath, text);
    case "compose":
      return extractCompose(filePath, text);
    case "github-actions":
      return extractGithubActions(filePath, text);
    case "config-env":
      return extractConfigEnv(filePath, text);
    case "js-ts-source":
      return extractJsTsSource(filePath, text);
    case "python-source":
      return extractPythonSource(filePath, text);
    case "terraform":
      return extractTerraform(filePath, text);
    case "kubernetes":
      return extractKubernetes(filePath, text);
    default:
      return [];
  }
}
