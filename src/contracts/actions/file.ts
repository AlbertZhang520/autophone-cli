import { z } from "zod";
import { Md5DigestSchema, Sha256DigestSchema } from "./common.js";

const LocalFilePathSchema = z
  .string()
  .min(1)
  .refine((value) => value.trim().length > 0, { message: "local path must not be blank" });

export const DeviceFilePathSchema = z
  .string()
  .min(1)
  .max(4096)
  .refine((value) => value.startsWith("/"), { message: "device path must be absolute" })
  .refine((value) => !/[\0\r\n]/.test(value), { message: "device path must not contain NUL or line breaks" });
export type DeviceFilePath = z.infer<typeof DeviceFilePathSchema>;

export const FileTransferCompressionSchema = z.enum([
  "adb_default",
  "any",
  "none",
  "brotli",
  "lz4",
  "zstd",
  "disabled"
]);
export type FileTransferCompression = z.infer<typeof FileTransferCompressionSchema>;

export const FileMetadataSchema = z.object({
  file_name: z.string().min(1),
  bytes: z.number().int().nonnegative(),
  sha256: Sha256DigestSchema
});
export type FileMetadata = z.infer<typeof FileMetadataSchema>;

export const FileEntryKindSchema = z.enum(["regular_file", "directory", "symlink", "other"]);
export type FileEntryKind = z.infer<typeof FileEntryKindSchema>;

export const FileHashAlgorithmSchema = z.enum(["sha256", "md5"]);
export type FileHashAlgorithm = z.infer<typeof FileHashAlgorithmSchema>;

const ListableDeviceDirectoryPathSchema = DeviceFilePathSchema.refine((value) => value === "/" || !value.endsWith("/"), {
  message: "directory path must not end with a slash except for root"
}).refine((value) => !value.split("/").some((segment) => segment === "." || segment === ".."), {
  message: "directory path must not contain . or .. path segments"
});

const ListedDeviceFilePathSchema = z
  .string()
  .min(1)
  .max(4096)
  .refine((value) => value.startsWith("/"), { message: "listed device path must be absolute" })
  .refine((value) => !/[\0]/.test(value), { message: "listed device path must not contain NUL" });

const ListedDeviceFileNameSchema = z
  .string()
  .min(1)
  .max(4096)
  .refine((value) => !/[\0/]/.test(value), { message: "listed device file name must not contain NUL or slash" });

function constrainedDevicePathSchema(messages: {
  root: string;
  trailingSlash: string;
  dotSegments: string;
}) {
  return DeviceFilePathSchema.refine((value) => value !== "/", {
    message: messages.root
  })
    .refine((value) => !value.endsWith("/"), {
      message: messages.trailingSlash
    })
    .refine((value) => !value.split("/").some((segment) => segment === "." || segment === ".."), {
      message: messages.dotSegments
    });
}

const DestructiveDeviceFilePathSchema = constrainedDevicePathSchema({
  root: "refusing to remove device root",
  trailingSlash: "remote path must identify one non-directory path without a trailing slash",
  dotSegments: "remote path must not contain . or .. path segments"
});

const CreatableDeviceDirectoryPathSchema = constrainedDevicePathSchema({
  root: "refusing to create device root",
  trailingSlash: "directory path must not end with a slash",
  dotSegments: "directory path must not contain . or .. path segments"
});

const MovableDeviceFilePathSchema = constrainedDevicePathSchema({
  root: "refusing to move device root",
  trailingSlash: "move paths must identify one non-directory path without a trailing slash",
  dotSegments: "move paths must not contain . or .. path segments"
});

const CopyableDeviceFilePathSchema = constrainedDevicePathSchema({
  root: "refusing to copy device root",
  trailingSlash: "copy paths must identify one non-directory path without a trailing slash",
  dotSegments: "copy paths must not contain . or .. path segments"
});

const FileEntrySnapshotSchema = z
  .object({
    exists: z.boolean(),
    entry: z
      .object({
        kind: FileEntryKindSchema,
        bytes: z.number().int().nonnegative(),
        modified_unix_ms: z.number().int().nonnegative()
      })
      .nullable()
  })
  .refine((value) => (value.exists ? value.entry !== null : value.entry === null), {
    message: "entry must be present only when the file exists",
    path: ["entry"]
  });

const FileListEntrySchema = z.object({
  name: ListedDeviceFileNameSchema,
  path: ListedDeviceFilePathSchema,
  kind: FileEntryKindSchema,
  bytes: z.number().int().nonnegative(),
  modified_unix_ms: z.number().int().nonnegative()
});

const DeviceStatQuerySchema = z.object({
  method: z.literal("device_stat"),
  exit_code: z.number().int().nullable(),
  command_duration_ms: z.number().int().nonnegative()
});

const FileMkdirOperationSchema = z.discriminatedUnion("method", [
  z.object({
    method: z.literal("device_mkdir"),
    exit_code: z.number().int().nullable(),
    command_duration_ms: z.number().int().nonnegative()
  }),
  z.object({
    method: z.literal("skipped_directory_exists"),
    exit_code: z.null(),
    command_duration_ms: z.literal(0)
  })
]);

export const FileMkdirRequestSchema = z.object({
  remote_path: CreatableDeviceDirectoryPathSchema,
  timeout_ms: z.number().int().positive().max(120_000).default(10_000),
  device_serial: z.string().min(1, "files mkdir requires explicit --serial")
});
export type FileMkdirRequest = z.infer<typeof FileMkdirRequestSchema>;

export const FileMkdirResultSchema = z
  .object({
    device_serial: z.string().min(1),
    requested: z.object({
      remote_path: CreatableDeviceDirectoryPathSchema
    }),
    before: FileEntrySnapshotSchema,
    mkdir: FileMkdirOperationSchema,
    after: FileEntrySnapshotSchema,
    created: z.boolean(),
    verify: z.object({
      policy: z.literal("directory_exists_after_mkdir"),
      ok: z.literal(true),
      attempts: z.union([z.literal(1), z.literal(2)]),
      reason: z.string()
    }),
    semantics: z.literal("idempotent_directory_create_with_parents")
  })
  .refine(
    (value) => {
      if (isDirectorySnapshot(value.before)) {
        return (
          value.mkdir.method === "skipped_directory_exists" &&
          !value.created &&
          value.verify.attempts === 1 &&
          fileEntrySnapshotsEqual(value.before, value.after)
        );
      }
      if (!value.before.exists) {
        return (
          value.mkdir.method === "device_mkdir" &&
          value.created &&
          value.verify.attempts === 2 &&
          isDirectorySnapshot(value.after)
        );
      }
      return false;
    },
    {
      message: "mkdir result must match before/mkdir/created/after/attempts semantics",
      path: ["mkdir"]
    }
  );
export type FileMkdirResult = z.infer<typeof FileMkdirResultSchema>;

const FileMoveOperationSchema = z.object({
  method: z.literal("device_mv"),
  exit_code: z.number().int().nullable(),
  command_duration_ms: z.number().int().nonnegative()
});

export const FileMoveRequestSchema = z
  .object({
    source_path: MovableDeviceFilePathSchema,
    dest_path: MovableDeviceFilePathSchema,
    confirm_source: MovableDeviceFilePathSchema,
    timeout_ms: z.number().int().positive().max(120_000).default(10_000),
    device_serial: z.string().min(1, "files move requires explicit --serial")
  })
  .refine((value) => value.source_path === value.confirm_source, {
    message: "confirm_source must exactly match source_path",
    path: ["confirm_source"]
  })
  .refine((value) => value.source_path !== value.dest_path, {
    message: "source_path and dest_path must be different",
    path: ["dest_path"]
  });
export type FileMoveRequest = z.infer<typeof FileMoveRequestSchema>;

export const FileMoveResultSchema = z
  .object({
    device_serial: z.string().min(1),
    requested: z.object({
      source_path: MovableDeviceFilePathSchema,
      dest_path: MovableDeviceFilePathSchema
    }),
    before_source: FileEntrySnapshotSchema,
    before_dest: FileEntrySnapshotSchema,
    move: FileMoveOperationSchema,
    after_source: FileEntrySnapshotSchema,
    after_dest: FileEntrySnapshotSchema,
    moved: z.literal(true),
    verify: z.object({
      policy: z.literal("source_absent_dest_present_after_move"),
      ok: z.literal(true),
      attempts: z.literal(4),
      reason: z.string()
    }),
    semantics: z.literal("single_non_directory_path_non_clobber_move")
  })
  .refine(
    (value) =>
      value.before_source.exists &&
      (value.before_source.entry?.kind === "regular_file" || value.before_source.entry?.kind === "symlink") &&
      !value.before_dest.exists &&
      !value.after_source.exists &&
      value.after_dest.exists &&
      value.after_dest.entry?.kind === value.before_source.entry.kind &&
      value.after_dest.entry.bytes === value.before_source.entry.bytes,
    {
      message: "move result must match source/destination non-clobber move semantics",
      path: ["move"]
    }
  );
export type FileMoveResult = z.infer<typeof FileMoveResultSchema>;

const FileCopyOperationSchema = z.object({
  method: z.literal("device_cp_no_clobber"),
  exit_code: z.number().int().nullable(),
  command_duration_ms: z.number().int().nonnegative()
});

export const FileCopyRequestSchema = z
  .object({
    source_path: CopyableDeviceFilePathSchema,
    dest_path: CopyableDeviceFilePathSchema,
    timeout_ms: z.number().int().positive().max(600_000).default(120_000),
    device_serial: z.string().min(1, "files copy requires explicit --serial")
  })
  .refine((value) => value.source_path !== value.dest_path, {
    message: "source_path and dest_path must be different",
    path: ["dest_path"]
  });
export type FileCopyRequest = z.infer<typeof FileCopyRequestSchema>;

export const FileCopyResultSchema = z
  .object({
    device_serial: z.string().min(1),
    requested: z.object({
      source_path: CopyableDeviceFilePathSchema,
      dest_path: CopyableDeviceFilePathSchema
    }),
    before_source: FileEntrySnapshotSchema,
    before_dest: FileEntrySnapshotSchema,
    copy: FileCopyOperationSchema,
    after_source: FileEntrySnapshotSchema,
    after_dest: FileEntrySnapshotSchema,
    copied: z.literal(true),
    verify: z.object({
      policy: z.literal("source_preserved_dest_present_after_copy"),
      ok: z.literal(true),
      attempts: z.literal(4),
      reason: z.string()
    }),
    semantics: z.literal("single_regular_file_non_clobber_copy")
  })
  .refine(
    (value) =>
      value.before_source.exists &&
      value.before_source.entry?.kind === "regular_file" &&
      !value.before_dest.exists &&
      value.after_source.exists &&
      value.after_source.entry?.kind === "regular_file" &&
      value.after_source.entry.bytes === value.before_source.entry.bytes &&
      value.after_dest.exists &&
      value.after_dest.entry?.kind === "regular_file" &&
      value.after_dest.entry.bytes === value.before_source.entry.bytes,
    {
      message: "copy result must match source/destination non-clobber copy semantics",
      path: ["copy"]
    }
  );
export type FileCopyResult = z.infer<typeof FileCopyResultSchema>;

export const FilePushRequestSchema = z.object({
  local_path: LocalFilePathSchema,
  local_file: FileMetadataSchema,
  remote_path: DeviceFilePathSchema,
  compression: FileTransferCompressionSchema.default("adb_default"),
  timeout_ms: z.number().int().positive().max(600_000).default(120_000),
  device_serial: z.string().min(1, "files push requires explicit --serial")
});
export type FilePushRequest = z.infer<typeof FilePushRequestSchema>;

export const FilePushResultSchema = z.object({
  device_serial: z.string().min(1),
  requested: z.object({
    local: FileMetadataSchema,
    remote_path: DeviceFilePathSchema,
    compression: FileTransferCompressionSchema
  }),
  transfer: z.object({
    method: z.literal("adb_push"),
    exit_code: z.number().int().nullable(),
    command_duration_ms: z.number().int().nonnegative()
  }),
  verify: z.object({
    policy: z.literal("adb_exit_success"),
    ok: z.literal(true),
    attempts: z.literal(1),
    reason: z.string()
  })
});
export type FilePushResult = z.infer<typeof FilePushResultSchema>;

export const FilePullRequestSchema = z.object({
  remote_path: DeviceFilePathSchema,
  output_path: LocalFilePathSchema,
  overwrite: z.boolean().default(false),
  compression: FileTransferCompressionSchema.default("adb_default"),
  timeout_ms: z.number().int().positive().max(600_000).default(120_000),
  device_serial: z.string().min(1, "files pull requires explicit --serial")
});
export type FilePullRequest = z.infer<typeof FilePullRequestSchema>;

export const FilePullResultSchema = z.object({
  device_serial: z.string().min(1),
  requested: z.object({
    remote_path: DeviceFilePathSchema,
    compression: FileTransferCompressionSchema
  }),
  output: FileMetadataSchema.extend({
    overwritten: z.boolean()
  }),
  transfer: z.object({
    method: z.literal("adb_pull"),
    exit_code: z.number().int().nullable(),
    command_duration_ms: z.number().int().nonnegative()
  }),
  verify: z.object({
    policy: z.literal("adb_exit_success"),
    ok: z.literal(true),
    attempts: z.literal(1),
    reason: z.string()
  })
});
export type FilePullResult = z.infer<typeof FilePullResultSchema>;

export const FileStatRequestSchema = z.object({
  remote_path: DeviceFilePathSchema,
  timeout_ms: z.number().int().positive().max(120_000).default(10_000),
  device_serial: z.string().min(1).optional()
});
export type FileStatRequest = z.infer<typeof FileStatRequestSchema>;

export const FileStatResultSchema = z
  .object({
    device_serial: z.string().min(1),
    requested: z.object({
      remote_path: DeviceFilePathSchema
    }),
    exists: z.boolean(),
    entry: z
      .object({
        kind: FileEntryKindSchema,
        bytes: z.number().int().nonnegative(),
        modified_unix_ms: z.number().int().nonnegative()
      })
      .nullable(),
    query: DeviceStatQuerySchema,
    verify: z.object({
      policy: z.literal("stat_parse"),
      ok: z.literal(true),
      attempts: z.literal(1),
      reason: z.string()
    }),
    semantics: z.literal("read_only_single_path_stat_not_directory_listing")
  })
  .refine((value) => (value.exists ? value.entry !== null : value.entry === null), {
    message: "entry must be present only when the file exists",
    path: ["entry"]
  });
export type FileStatResult = z.infer<typeof FileStatResultSchema>;

const FileHashOperationSchema = z.discriminatedUnion("algorithm", [
  z.object({
    algorithm: z.literal("sha256"),
    method: z.literal("device_sha256sum"),
    digest: Sha256DigestSchema,
    exit_code: z.number().int().nullable(),
    command_duration_ms: z.number().int().nonnegative()
  }),
  z.object({
    algorithm: z.literal("md5"),
    method: z.literal("device_md5sum"),
    digest: Md5DigestSchema,
    exit_code: z.number().int().nullable(),
    command_duration_ms: z.number().int().nonnegative()
  })
]);

export const FileHashRequestSchema = z.object({
  remote_path: DeviceFilePathSchema,
  algorithm: FileHashAlgorithmSchema.default("sha256"),
  timeout_ms: z.number().int().positive().max(120_000).default(10_000),
  device_serial: z.string().min(1).optional()
});
export type FileHashRequest = z.infer<typeof FileHashRequestSchema>;

export const FileHashResultSchema = z
  .object({
    device_serial: z.string().min(1),
    requested: z.object({
      remote_path: DeviceFilePathSchema,
      algorithm: FileHashAlgorithmSchema
    }),
    target: FileEntrySnapshotSchema.extend({
      query: DeviceStatQuerySchema
    }),
    hash: FileHashOperationSchema.nullable(),
    hashed: z.boolean(),
    verify: z.object({
      policy: z.literal("regular_file_stat_then_digest_parse"),
      ok: z.literal(true),
      attempts: z.union([z.literal(1), z.literal(2)]),
      reason: z.string()
    }),
    semantics: z.literal("read_only_single_regular_file_content_digest_not_atomic")
  })
  .refine(
    (value) => {
      const regularFile = value.target.exists && value.target.entry?.kind === "regular_file";
      return regularFile
        ? value.hashed && value.hash !== null && value.verify.attempts === 2
        : !value.hashed && value.hash === null && value.verify.attempts === 1;
    },
    {
      message: "hash result must match regular-file target and digest semantics",
      path: ["hash"]
    }
  )
  .refine((value) => value.hash === null || value.hash.algorithm === value.requested.algorithm, {
    message: "hash algorithm must match the requested algorithm",
    path: ["hash", "algorithm"]
  });
export type FileHashResult = z.infer<typeof FileHashResultSchema>;

export const FileRmRequestSchema = z
  .object({
    remote_path: DestructiveDeviceFilePathSchema,
    confirm_remote: DeviceFilePathSchema,
    missing_ok: z.boolean().default(false),
    timeout_ms: z.number().int().positive().max(120_000).default(10_000),
    device_serial: z.string().min(1, "files rm requires explicit --serial")
  })
  .refine((value) => value.confirm_remote === value.remote_path, {
    message: "confirm_remote must exactly match remote_path",
    path: ["confirm_remote"]
  });
export type FileRmRequest = z.infer<typeof FileRmRequestSchema>;

export const FileRmResultSchema = z
  .object({
    device_serial: z.string().min(1),
    requested: z.object({
      remote_path: DestructiveDeviceFilePathSchema,
      missing_ok: z.boolean()
    }),
    before: FileEntrySnapshotSchema,
    remove: z.discriminatedUnion("method", [
      z.object({
        method: z.literal("device_rm"),
        exit_code: z.number().int().nullable(),
        command_duration_ms: z.number().int().nonnegative()
      }),
      z.object({
        method: z.literal("skipped_missing_ok"),
        exit_code: z.null(),
        command_duration_ms: z.literal(0)
      })
    ]),
    removed: z.boolean(),
    after_exists: z.literal(false),
    verify: z.object({
      policy: z.literal("stat_absent_after_rm"),
      ok: z.literal(true),
      attempts: z.union([z.literal(1), z.literal(2)]),
      reason: z.string()
    }),
    semantics: z.literal("single_path_non_recursive_remove")
  })
  .refine(
    (value) =>
      value.before.exists
        ? value.remove.method === "device_rm" && value.removed && value.verify.attempts === 2
        : value.remove.method === "skipped_missing_ok" && !value.removed && value.verify.attempts === 1,
    {
      message: "remove result must match before/removed/attempts semantics",
      path: ["remove"]
    }
  );
export type FileRmResult = z.infer<typeof FileRmResultSchema>;

export const FileListRequestSchema = z.object({
  remote_path: ListableDeviceDirectoryPathSchema,
  max_entries: z.number().int().positive().max(500).default(100),
  timeout_ms: z.number().int().positive().max(120_000).default(10_000),
  device_serial: z.string().min(1).optional()
});
export type FileListRequest = z.infer<typeof FileListRequestSchema>;

export const FileListResultSchema = z
  .object({
    device_serial: z.string().min(1),
    requested: z.object({
      remote_path: ListableDeviceDirectoryPathSchema,
      max_entries: z.number().int().positive().max(500)
    }),
    target: FileEntrySnapshotSchema.extend({
      query: DeviceStatQuerySchema
    }),
    list: z
      .object({
        method: z.literal("device_find_stat"),
        exit_code: z.number().int().nullable(),
        command_duration_ms: z.number().int().nonnegative(),
        entries: z.array(FileListEntrySchema),
        count: z.number().int().nonnegative(),
        truncated: z.boolean()
      })
      .nullable(),
    verify: z.object({
      policy: z.literal("bounded_single_directory_listing"),
      ok: z.literal(true),
      attempts: z.union([z.literal(1), z.literal(2)]),
      reason: z.string()
    }),
    semantics: z.literal("read_only_single_directory_listing_not_recursive")
  })
  .refine((value) => value.list === null || value.list.count === value.list.entries.length, {
    message: "list count must match entries length",
    path: ["list", "count"]
  })
  .refine(
    (value) => {
      const isDirectory = value.target.exists && value.target.entry?.kind === "directory";
      return isDirectory ? value.list !== null && value.verify.attempts === 2 : value.list === null && value.verify.attempts === 1;
    },
    {
      message: "list must be present only when target is an existing directory",
      path: ["list"]
    }
  );
export type FileListResult = z.infer<typeof FileListResultSchema>;

function isDirectorySnapshot(value: z.infer<typeof FileEntrySnapshotSchema>): boolean {
  return value.exists && value.entry?.kind === "directory";
}

function fileEntrySnapshotsEqual(
  left: z.infer<typeof FileEntrySnapshotSchema>,
  right: z.infer<typeof FileEntrySnapshotSchema>
): boolean {
  return (
    left.exists === right.exists &&
    left.entry?.kind === right.entry?.kind &&
    left.entry?.bytes === right.entry?.bytes &&
    left.entry?.modified_unix_ms === right.entry?.modified_unix_ms
  );
}

