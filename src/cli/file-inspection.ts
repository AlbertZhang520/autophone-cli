import { createHash } from "node:crypto";
import { constants as fsConstants, createReadStream } from "node:fs";
import { access, stat } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { AutophoneError, type FileMetadata } from "../contracts/index.js";

export type InspectedApk = {
  path: string;
  fileName: string;
  bytes: number;
  sha256: string;
};

export type InspectedTransferFile = {
  path: string;
  metadata: FileMetadata;
};

const MAX_FILE_TRANSFER_BYTES = 256 * 1024 * 1024;
const MAX_SCREENRECORD_BYTES = 256 * 1024 * 1024;

export async function inspectApkFile(inputPath: string): Promise<InspectedApk> {
  if (inputPath.trim().length === 0) {
    throw new AutophoneError({
      code: "INVALID_REQUEST",
      message: "APK path must not be blank",
      retriable: false
    });
  }
  const absolutePath = resolve(inputPath);
  const fileName = basename(absolutePath);
  if (!fileName.toLowerCase().endsWith(".apk")) {
    throw new AutophoneError({
      code: "INVALID_REQUEST",
      message: "app install requires a single .apk file",
      retriable: false
    });
  }

  let fileStat;
  try {
    fileStat = await stat(absolutePath);
    await access(absolutePath, fsConstants.R_OK);
  } catch {
    throw new AutophoneError({
      code: "INVALID_REQUEST",
      message: "APK file is not readable",
      retriable: false
    });
  }

  if (!fileStat.isFile()) {
    throw new AutophoneError({
      code: "INVALID_REQUEST",
      message: "APK path must refer to a regular file",
      retriable: false
    });
  }
  if (fileStat.size <= 0) {
    throw new AutophoneError({
      code: "INVALID_REQUEST",
      message: "APK file must not be empty",
      retriable: false
    });
  }

  return {
    path: absolutePath,
    fileName,
    bytes: fileStat.size,
    sha256: `sha256:${await hashFileSha256(absolutePath)}`
  };
}

export async function inspectLocalTransferFile(inputPath: string): Promise<InspectedTransferFile> {
  if (inputPath.trim().length === 0) {
    throw new AutophoneError({
      code: "INVALID_REQUEST",
      message: "local file path must not be blank",
      retriable: false
    });
  }
  const absolutePath = resolve(inputPath);
  const fileName = basename(absolutePath);
  let fileStat;
  try {
    fileStat = await stat(absolutePath);
    await access(absolutePath, fsConstants.R_OK);
  } catch {
    throw new AutophoneError({
      code: "INVALID_REQUEST",
      message: "local file is not readable",
      retriable: false
    });
  }

  if (!fileStat.isFile()) {
    throw new AutophoneError({
      code: "INVALID_REQUEST",
      message: "local path must refer to a regular file",
      retriable: false
    });
  }
  if (fileStat.size > MAX_FILE_TRANSFER_BYTES) {
    throw new AutophoneError({
      code: "INVALID_REQUEST",
      message: "local file exceeds the maximum supported transfer size",
      retriable: false,
      details: { max_bytes: MAX_FILE_TRANSFER_BYTES }
    });
  }

  return {
    path: absolutePath,
    metadata: {
      file_name: fileName,
      bytes: fileStat.size,
      sha256: `sha256:${await hashFileSha256(absolutePath)}`
    }
  };
}

export async function inspectPulledOutputFile(tempPath: string, outputPath: string): Promise<FileMetadata> {
  let fileStat;
  try {
    fileStat = await stat(tempPath);
  } catch {
    throw new AutophoneError({
      code: "FILE_PULL_FAILED",
      message: "adb pull did not produce a readable output file",
      retriable: false
    });
  }

  if (!fileStat.isFile()) {
    throw new AutophoneError({
      code: "FILE_PULL_FAILED",
      message: "adb pull produced a non-regular output path",
      retriable: false
    });
  }
  if (fileStat.size > MAX_FILE_TRANSFER_BYTES) {
    throw new AutophoneError({
      code: "FILE_PULL_FAILED",
      message: "pulled file exceeds the maximum supported transfer size",
      retriable: false,
      details: { max_bytes: MAX_FILE_TRANSFER_BYTES }
    });
  }

  return {
    file_name: basename(outputPath),
    bytes: fileStat.size,
    sha256: `sha256:${await hashFileSha256(tempPath)}`
  };
}

export async function inspectScreenrecordOutputFile(tempPath: string, outputPath: string): Promise<FileMetadata> {
  let fileStat;
  try {
    fileStat = await stat(tempPath);
  } catch {
    throw new AutophoneError({
      code: "SCREENRECORD_FAILED",
      message: "screenrecord did not produce a readable host MP4",
      retriable: false
    });
  }

  if (!fileStat.isFile()) {
    throw new AutophoneError({
      code: "SCREENRECORD_FAILED",
      message: "screenrecord produced a non-regular host output path",
      retriable: false
    });
  }
  if (fileStat.size <= 0) {
    throw new AutophoneError({
      code: "SCREENRECORD_FAILED",
      message: "screenrecord produced an empty host MP4",
      retriable: false
    });
  }
  if (fileStat.size > MAX_SCREENRECORD_BYTES) {
    throw new AutophoneError({
      code: "SCREENRECORD_FAILED",
      message: "screenrecord output exceeds the maximum supported size",
      retriable: false,
      details: { max_bytes: MAX_SCREENRECORD_BYTES }
    });
  }

  return {
    file_name: basename(outputPath),
    bytes: fileStat.size,
    sha256: `sha256:${await hashFileSha256(tempPath)}`
  };
}

function hashFileSha256(path: string): Promise<string> {
  return new Promise((resolveHash, rejectHash) => {
    const hash = createHash("sha256");
    const stream = createReadStream(path);
    stream.on("data", (chunk) => {
      hash.update(chunk);
    });
    stream.on("error", rejectHash);
    stream.on("end", () => {
      resolveHash(hash.digest("hex"));
    });
  });
}
