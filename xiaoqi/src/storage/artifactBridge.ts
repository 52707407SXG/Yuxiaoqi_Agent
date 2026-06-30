export type TemporaryArtifact = {
  artifactTempPath: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  durationMs?: number;
  width?: number;
  height?: number;
  previewKind: "image" | "video" | "audio" | "document" | "unknown";
  safeTitle: string;
  sourceInvocationId: string;
};

export type ArtifactRegistrationRequest = TemporaryArtifact & {
  projectId: string;
  userId: string;
  companyId: string;
  storagePolicy: "backend-registers-file_assets";
};

export function toArtifactRegistrationRequest(args: {
  artifact: TemporaryArtifact;
  projectId: string;
  userId: string;
  companyId: string;
}): ArtifactRegistrationRequest {
  return {
    ...args.artifact,
    projectId: args.projectId,
    userId: args.userId,
    companyId: args.companyId,
    storagePolicy: "backend-registers-file_assets",
  };
}
