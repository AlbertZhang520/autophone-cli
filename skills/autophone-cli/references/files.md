<!-- GENERATED FILE - do not edit. Source: docs/skill-src/files.md. Regenerate with: pnpm skill:gen -->

# autophone-cli — Device Files & Transfer

Use commands from the project root after `pnpm build`, or from package installation once published.

Agent command paths return one JSON envelope on stdout. Human help paths such as `--help`, `<command> --help`, and `help <command>` write help text to stderr, leave stdout empty, and exit 0. Human version paths using global `--version` or `-V` write the runtime version to stderr, leave stdout empty, and exit 0.

## When to Use

- Use `files stat` for one read-only device path metadata probe; it is not a directory listing and does not follow symlinks.
- Use `files hash` for one read-only regular-file content digest probe after choosing a path; it returns `hash:null` for missing or non-regular targets and does not follow symlinks.
- Use `files list` for one bounded, read-only, non-recursive direct-child directory listing; use `--max-entries` when large directories are possible.
- Use `files copy` only for one regular-file copy, always with explicit `--serial`; it refuses symlinks, directories, and existing destinations, and may leave a partial destination on copy failure.
- Use `files move` only for one explicitly confirmed regular file or symlink move, always with explicit `--serial` and exact `--confirm-source`; it refuses existing destinations and is not atomic.
- Use `files rm` only to clean up one explicitly confirmed non-directory device path, always with explicit `--serial` and exact `--confirm-remote`; do not use it for recursive directory cleanup.
- Use `files push` or `files pull` only for explicit regular-file transfer tasks, always with explicit `--serial`, and treat `adb_exit_success` as adb command completion rather than remote content verification.

## Constraints

- `files stat` is read-only, reports one device path as existing or missing, does not list directory contents, and does not follow symbolic links.
- `files stat` reports OS stat size; for directories, symlinks, and special files, `bytes` is device metadata size rather than content bytes.
- `files hash` is read-only, stats one device path first, computes `sha256` or `md5` only for existing regular files, returns `hash:null` for missing directories/symlinks/special files, and does not follow symlinks.
- `files hash` is a non-atomic stat-hash observation; `md5` is for compatibility, not security, and missing hash applets or malformed digest output are `FILE_HASH_FAILED`.
- `files list` is read-only, returns direct children only, includes hidden entries, reports missing or non-directory targets with `list:null`, and bounds results with `max_entries` plus a truncation flag. Its target stat and listing are not atomic; concurrent filesystem changes can produce `FILE_LIST_FAILED` or per-probe metadata.
- `files rm` is destructive; it requires explicit `--serial`, exact `--confirm-remote`, rejects directories, rejects trailing-slash or dot-segment paths, removes regular files or symlinks only, and verifies absence with a non-atomic stat-rm-stat sequence.
- file transfer commands require explicit `--serial`, operate on one regular file up to 256 MiB, allow zero-byte files, and redact local/remote/temp paths from failures.
- `files push` mutates device storage and may leave a partial remote file if interrupted; `files pull` writes through a same-directory temp path and refuses to overwrite unless `--overwrite` is passed.
- file transfer success means adb exited 0; `adb_exit_success` does not independently hash, stat, or compare remote file contents. Use `files hash` as a separate read-only digest observation when remote content evidence is needed.

## files stat

```bash
node dist/cli/main.js files stat --remote /sdcard/Download/report.txt
node dist/cli/main.js --serial emulator-5554 files stat --remote /sdcard/Download/report.txt
```

Rules:

- read-only single-path metadata command
- respects global `--serial`; without it, normal single-online-device resolution applies
- `--remote` is required, must be an absolute Android device path, and may contain spaces or shell metacharacters
- remote paths must not contain NUL, carriage return, or line feed characters
- uses Android device shell `stat -c "%F|%s|%Y"` with shell-quoted path input
- does not follow symbolic links; symlinks report as `kind: "symlink"` with the link's stat metadata
- does not list directory contents
- missing paths return a successful result with `exists:false` and `entry:null`
- permission errors, stat usage errors, malformed output, and target-device failures are command failures
- `entry.kind` is `regular_file`, `directory`, `symlink`, or `other`; unknown device stat file-type strings map to `other`
- `entry.bytes` is the OS-reported stat size; for directories, symlinks, and special files this is metadata size rather than content bytes
- `entry.modified_unix_ms` is derived from stat `%Y` seconds multiplied by 1000, so sub-second precision is not represented
- failure traces redact the remote path; success JSON includes the validated requested remote path

`files stat` returns:

- `device_serial`
- `requested.remote_path`
- `exists`
- `entry.kind`
- `entry.bytes`
- `entry.modified_unix_ms`
- `query.method: "device_stat"`
- `query.exit_code`
- `query.command_duration_ms`
- `verify.policy: "stat_parse"`
- `verify.ok: true`
- `verify.attempts: 1`
- `verify.reason`
- `semantics: "read_only_single_path_stat_not_directory_listing"`

Use this command before or after file transfer when the workflow needs to know whether one device path exists and what kind of path it is. Use `files list` when the workflow needs a bounded direct-child directory listing.

## files hash

```bash
node dist/cli/main.js files hash --remote /sdcard/Download/report.txt
node dist/cli/main.js files hash --remote /sdcard/Download/report.txt --algorithm md5
node dist/cli/main.js --serial emulator-5554 files hash --remote /sdcard/Download/report.txt
```

Rules:

- read-only single-path regular-file content digest command
- respects global `--serial`; without it, normal single-online-device resolution applies
- `--remote` is required, must be an absolute Android device path, and may contain spaces or shell metacharacters
- remote paths must not contain NUL, carriage return, or line feed characters
- `--algorithm` defaults to `sha256`; `md5` is available for compatibility only and must not be treated as a security digest
- uses Android device shell `stat -c "%F|%s|%Y"` first, then `sha256sum -- <path>` or `md5sum -- <path>` only when the target stat reports `kind: "regular_file"`
- does not follow symbolic links; symlinks return `hash:null` with `target.entry.kind: "symlink"`
- missing paths, directories, symlinks, and special files are successful read-only observations with `hash:null` and `hashed:false`
- malformed digest output, missing hash applets, stderr output, nonzero hash exit codes, stat failures other than a missing path, and target-device failures are command failures
- the stat-hash sequence is not atomic; a file can change after stat and before or during hashing
- timeout applies independently to the stat adb call and the hash adb call
- failure traces redact the remote path; success JSON includes the validated requested remote path and the digest only when one was computed

`files hash` returns:

- `device_serial`
- `requested.remote_path`
- `requested.algorithm`
- `target.exists`
- `target.entry.kind`
- `target.entry.bytes`
- `target.entry.modified_unix_ms`
- `target.query.method: "device_stat"`
- `target.query.exit_code`
- `target.query.command_duration_ms`
- `hash.algorithm`
- `hash.method: "device_sha256sum"` or `"device_md5sum"`
- `hash.digest`
- `hash.exit_code`
- `hash.command_duration_ms`
- `hashed`
- `verify.policy: "regular_file_stat_then_digest_parse"`
- `verify.ok: true`
- `verify.attempts`
- `verify.reason`
- `semantics: "read_only_single_regular_file_content_digest_not_atomic"`

Use this command after `files push`, before `files pull`, or around `files copy` / `files move` when a workflow needs remote content evidence. It is not a transfer command and it does not make a non-atomic file workflow atomic.

## files list

```bash
node dist/cli/main.js files list --remote /sdcard/Download
node dist/cli/main.js --serial emulator-5554 files list --remote /sdcard/Download
node dist/cli/main.js --serial emulator-5554 files list --remote /sdcard/Download --max-entries 25
```

Rules:

- read-only bounded single-directory listing command
- respects global `--serial`; without it, normal single-online-device resolution applies
- `--remote` is required, must be an absolute Android device path, and may contain spaces or shell metacharacters
- `--remote /` is allowed; other directory paths must not end with `/`
- remote paths must not contain NUL, carriage return, line feed, `.` segments, or `..` segments
- `--max-entries` defaults to `100` and may be `1..500`
- uses Android `exec-out sh -c` with a NUL-delimited protocol, `find -print0`, and per-entry `stat -c "%F|%s|%Y"`
- lists direct children only; it is not recursive
- includes hidden entries when the directory can be read
- does not follow symbolic links; symlinks report as `kind: "symlink"` with link metadata on supported Android toybox `stat`
- missing paths and non-directory paths return successful observations with `list:null`
- target stat and directory listing are not atomic; concurrent filesystem changes can produce `FILE_LIST_FAILED` or metadata from the time each probe ran
- permission errors, malformed protocol output, non-UTF-8 child paths, and target-device failures are command failures
- success JSON includes listed child names and device paths; failure traces redact the requested remote path and never include raw listing stdout

`files list` returns:

- `device_serial`
- `requested.remote_path`
- `requested.max_entries`
- `target.exists`
- `target.entry.kind`
- `target.entry.bytes`
- `target.entry.modified_unix_ms`
- `target.query.method: "device_stat"`
- `target.query.exit_code`
- `target.query.command_duration_ms`
- `list.method: "device_find_stat"`
- `list.exit_code`
- `list.command_duration_ms`
- `list.entries[].name`
- `list.entries[].path`
- `list.entries[].kind`
- `list.entries[].bytes`
- `list.entries[].modified_unix_ms`
- `list.count`
- `list.truncated`
- `verify.policy: "bounded_single_directory_listing"`
- `verify.ok: true`
- `verify.attempts`
- `verify.reason`
- `semantics: "read_only_single_directory_listing_not_recursive"`

Use this command when an agent needs to inspect a known directory before choosing one file to pull, stat, or remove. Treat `list.truncated:true` as evidence to narrow the target directory or rerun with a more specific path; it is not a complete directory inventory.

## files mkdir

```bash
node dist/cli/main.js --serial emulator-5554 files mkdir --remote /sdcard/Download/autophone-work
```

Rules:

- mutating single-directory command for one explicitly selected target device
- requires explicit global `--serial`; auto-selecting a single online device is intentionally not allowed
- `--remote` is required, must be an absolute Android device path, and may contain spaces or shell metacharacters
- `--remote /` is refused; directory paths must not end with `/`
- remote paths must not contain NUL, carriage return, line feed, `.` segments, or `..` segments
- leading-dot directory names such as `/sdcard/.config` are allowed; only literal `.` and `..` path segments are rejected
- uses Android device shell `mkdir -p -- <path>` with shell-quoted path input
- idempotently treats an existing directory as success with `created:false` and `mkdir.method: "skipped_directory_exists"`
- refuses existing non-directory targets, including symbolic links; it does not follow symlinks to decide whether they point at directories
- for missing targets, success means pre-mkdir stat reported absence, `mkdir -p` exited 0, and post-mkdir stat found the target path is a directory
- `created` is based on the pre-mkdir stat and is not an atomic proof that this invocation alone created the target
- parent directories may be created by `mkdir -p`, but only the requested target path is independently verified
- the stat-mkdir-stat sequence is not atomic; concurrent filesystem changes can still race the command
- failure traces redact `--remote` and adb argv path tokens

`files mkdir` returns:

- `device_serial`
- `requested.remote_path`
- `before.exists`
- `before.entry.kind`
- `before.entry.bytes`
- `before.entry.modified_unix_ms`
- `mkdir.method: "device_mkdir"` or `"skipped_directory_exists"`
- `mkdir.exit_code`
- `mkdir.command_duration_ms`
- `after.exists`
- `after.entry.kind`
- `after.entry.bytes`
- `after.entry.modified_unix_ms`
- `created`
- `verify.policy: "directory_exists_after_mkdir"`
- `verify.ok: true`
- `verify.attempts`
- `verify.reason`
- `semantics: "idempotent_directory_create_with_parents"`

Use this command to prepare a known directory before `files push`, screenshots, logs, or other workflows that need a staging location. Do not use it as a generic shell escape for moving, copying, chmod, or recursive cleanup.

## files copy

```bash
node dist/cli/main.js --serial emulator-5554 files copy --source /sdcard/Download/source.txt --dest /sdcard/Download/dest.txt
node dist/cli/main.js --serial emulator-5554 files copy --source /sdcard/Download/source.txt --dest /sdcard/Download/dest.txt --copy-timeout 180000
```

Rules:

- mutating single-file command for one explicitly selected target device; the source path is expected to remain in place on success
- requires explicit global `--serial`; auto-selecting a single online device is intentionally not allowed
- `--source` and `--dest` are required, must be absolute Android device paths, and may contain spaces or shell metacharacters
- source and destination paths must differ
- source and destination paths must not contain NUL, carriage return, line feed, trailing slash, `.` segments, or `..` segments
- source must be a regular file; directories, symbolic links, and special files are refused before adb `cp`
- destination must be missing before copy; overwrite/clobber behavior is intentionally out of scope
- uses Android device shell `cp -n -T -- <source> <dest>` with shell-quoted path input
- `-n` is a device-side no-clobber guard, but toybox `cp -n` exits 0 when it skips an existing destination; the pre/post stat checks still define success
- success means source pre-stat found one regular file, destination pre-stat reported absence, `cp -n -T` exited 0, source post-stat still found a regular file with the same byte metadata, and destination post-stat found a regular file with source-matching byte metadata
- destination byte metadata matching is a sanity check, not a content-integrity proof; mtime is intentionally not compared
- the stat-stat-cp-stat-stat sequence is not atomic; concurrent filesystem changes can still race the command
- copy failures can leave a partial destination; `files copy` reports best-effort destination state in `FILE_COPY_FAILED` details when available but does not automatically clean it up
- `--copy-timeout` defaults to `120000`; an explicit global `--timeout` is used only when `--copy-timeout` is absent
- failure traces redact `--source`, `--dest`, and adb argv path tokens

`files copy` returns:

- `device_serial`
- `requested.source_path`
- `requested.dest_path`
- `before_source.exists`
- `before_source.entry.kind`
- `before_source.entry.bytes`
- `before_source.entry.modified_unix_ms`
- `before_dest.exists`
- `before_dest.entry.kind`
- `before_dest.entry.bytes`
- `before_dest.entry.modified_unix_ms`
- `copy.method: "device_cp_no_clobber"`
- `copy.exit_code`
- `copy.command_duration_ms`
- `after_source.exists`
- `after_source.entry.kind`
- `after_source.entry.bytes`
- `after_source.entry.modified_unix_ms`
- `after_dest.exists`
- `after_dest.entry.kind`
- `after_dest.entry.bytes`
- `after_dest.entry.modified_unix_ms`
- `copied: true`
- `verify.policy: "source_preserved_dest_present_after_copy"`
- `verify.ok: true`
- `verify.attempts: 4`
- `verify.reason`
- `semantics: "single_regular_file_non_clobber_copy"`

Use this command only after choosing one known regular file to duplicate on the same device. Do not use it for symlink copying, directory copies, overwrites, bulk operations, or content-integrity verification.

## files move

```bash
node dist/cli/main.js --serial emulator-5554 files move --source /sdcard/Download/source.txt --dest /sdcard/Download/dest.txt --confirm-source /sdcard/Download/source.txt
```

Rules:

- destructive single-path command for one explicitly selected target device; the source path is expected to disappear on success
- requires explicit global `--serial`; auto-selecting a single online device is intentionally not allowed
- `--source` and `--dest` are required, must be absolute Android device paths, and may contain spaces or shell metacharacters
- `--confirm-source` is required and must exactly match `--source` after request validation; there is no path normalization
- source and destination paths must differ
- source and destination paths must not contain NUL, carriage return, line feed, trailing slash, `.` segments, or `..` segments
- refuses directories before adb `mv`; recursive directory moves are intentionally out of scope
- moves regular files and symbolic links; moving a symlink moves the link itself, not the target
- refuses existing destination paths before adb `mv`; overwrite/clobber behavior is intentionally out of scope
- uses Android device shell `mv -- <source> <dest>` with shell-quoted path input; it does not rely on `mv -n`
- success means source pre-stat found one regular file or symlink, destination pre-stat reported absence, `mv` exited 0, source post-stat reported absence, and destination post-stat matched the source kind and byte metadata
- destination byte metadata matching is a sanity check, not a content-integrity proof; mtime is intentionally not compared
- the stat-stat-mv-stat-stat sequence is not atomic; concurrent filesystem changes can still race the command
- cross-filesystem `mv` may be implemented by Android as copy plus unlink, so callers must not assume atomic rename semantics
- failure traces redact `--source`, `--dest`, `--confirm-source`, and adb argv path tokens

`files move` returns:

- `device_serial`
- `requested.source_path`
- `requested.dest_path`
- `before_source.exists`
- `before_source.entry.kind`
- `before_source.entry.bytes`
- `before_source.entry.modified_unix_ms`
- `before_dest.exists`
- `before_dest.entry.kind`
- `before_dest.entry.bytes`
- `before_dest.entry.modified_unix_ms`
- `move.method: "device_mv"`
- `move.exit_code`
- `move.command_duration_ms`
- `after_source.exists: false`
- `after_source.entry: null`
- `after_dest.exists`
- `after_dest.entry.kind`
- `after_dest.entry.bytes`
- `after_dest.entry.modified_unix_ms`
- `moved: true`
- `verify.policy: "source_absent_dest_present_after_move"`
- `verify.ok: true`
- `verify.attempts: 4`
- `verify.reason`
- `semantics: "single_non_directory_path_non_clobber_move"`

Use this command only after choosing one known file or symlink to relocate. Do not use it for directory moves, overwrites, bulk cleanup, or content-integrity verification.

## files rm

```bash
node dist/cli/main.js --serial emulator-5554 files rm --remote /sdcard/Download/payload.txt --confirm-remote /sdcard/Download/payload.txt
node dist/cli/main.js --serial emulator-5554 files rm --remote /sdcard/Download/payload.txt --confirm-remote /sdcard/Download/payload.txt --missing-ok
node dist/cli/main.js --serial emulator-5554 files rm --remote /sdcard/Download/payload.txt --confirm-remote /sdcard/Download/payload.txt --rm-timeout 9000
```

Rules:

- destructive single-path command for one explicitly selected target device
- requires explicit global `--serial`; auto-selecting a single online device is intentionally not allowed
- `--remote` is required, must be an absolute Android device path, and may contain spaces or shell metacharacters
- `--confirm-remote` is required and must exactly match `--remote` after request validation; there is no path normalization
- remote paths must not contain NUL, carriage return, line feed, trailing slash, `.` segments, or `..` segments
- refuses directories before adb `rm`; recursive directory deletion is intentionally out of scope
- removes regular files and symbolic links; removing a symlink removes the link itself, not the target
- uses Android device shell `rm -- <path>` with shell-quoted path input; it does not use `-f` or `-r`
- without `--missing-ok`, a path already missing before removal is `FILE_RM_FAILED`
- with `--missing-ok`, a path already missing before removal returns success with `removed:false` and `remove.method: "skipped_missing_ok"`
- success for an existing path means pre-delete stat found one non-directory path, `rm` exited 0, and post-delete stat reported absence
- the stat-rm-stat sequence is not atomic; concurrent filesystem changes can still race the command
- failure traces redact `--remote`, `--confirm-remote`, and adb argv path tokens

`files rm` returns:

- `device_serial`
- `requested.remote_path`
- `requested.missing_ok`
- `before.exists`
- `before.entry.kind`
- `before.entry.bytes`
- `before.entry.modified_unix_ms`
- `remove.method: "device_rm"` or `"skipped_missing_ok"`
- `remove.exit_code`
- `remove.command_duration_ms`
- `removed`
- `after_exists: false`
- `verify.policy: "stat_absent_after_rm"`
- `verify.ok: true`
- `verify.attempts`
- `verify.reason`
- `semantics: "single_path_non_recursive_remove"`

Use this command to clean up a known file or symlink created by a workflow, such as a temporary payload pushed to `/data/local/tmp` or `/sdcard/Download`. Do not use it for directory cleanup; first redesign the workflow to target known single files.

## files push

```bash
node dist/cli/main.js --serial emulator-5554 files push --local ./payload.txt --remote /sdcard/Download/payload.txt
node dist/cli/main.js --serial emulator-5554 files push --local ./payload.txt --remote /sdcard/Download/payload.txt --compression zstd
node dist/cli/main.js --serial emulator-5554 files push --local ./payload.txt --remote /sdcard/Download/payload.txt --no-compression
node dist/cli/main.js --serial emulator-5554 files push --local ./payload.txt --remote /sdcard/Download/payload.txt --push-timeout 180000
```

Rules:

- mutating file transfer command for one explicitly selected target device
- requires explicit global `--serial`; auto-selecting a single online device is intentionally not allowed
- `--local` is required and must point to one readable local regular file
- zero-byte files are allowed
- local files larger than 256 MiB are rejected before adb execution
- `--remote` is required, must be an absolute Android device path, and may contain spaces
- remote paths must not contain NUL, carriage return, or line feed characters
- default compression leaves adb's own default behavior untouched
- `--compression` accepts `any`, `none`, `brotli`, `lz4`, or `zstd` and maps to adb `-z <algorithm>`
- `--no-compression` maps to adb `-Z`
- `--compression` and `--no-compression` are mutually exclusive
- `--push-timeout` defaults to `120000`; an explicit global `--timeout` is used only when `--push-timeout` is absent
- stdout JSON returns local file metadata but does not echo the host absolute local path
- failure traces redact local paths, remote paths, and adb argv path tokens
- interrupted or timed-out pushes may leave a partial remote file; there is no rollback guarantee
- success means adb push exited 0; `adb_exit_success` does not independently hash, stat, or compare the remote file

`files push` returns:

- `device_serial`
- `requested.local.file_name`
- `requested.local.bytes`
- `requested.local.sha256`
- `requested.remote_path`
- `requested.compression`
- `transfer.method: "adb_push"`
- `transfer.exit_code`
- `transfer.command_duration_ms`
- `verify.policy: "adb_exit_success"`
- `verify.ok: true`
- `verify.attempts: 1`
- `verify.reason`

Use this command when a workflow needs to place one known local file onto a selected device. Use a follow-up app or shell-visible observation only when the workflow needs evidence that the app consumed the file.

## files pull

```bash
node dist/cli/main.js --serial emulator-5554 files pull --remote /sdcard/Download/report.txt --output ./report.txt
node dist/cli/main.js --serial emulator-5554 files pull --remote /sdcard/Download/report.txt --output ./report.txt --overwrite
node dist/cli/main.js --serial emulator-5554 files pull --remote /sdcard/Download/report.txt --output ./report.txt --compression zstd
node dist/cli/main.js --serial emulator-5554 files pull --remote /sdcard/Download/report.txt --output ./report.txt --pull-timeout 180000
```

Rules:

- file transfer command for one explicitly selected target device
- requires explicit global `--serial`; auto-selecting a single online device is intentionally not allowed
- `--remote` is required, must be an absolute Android device path, and may contain spaces
- remote paths must not contain NUL, carriage return, or line feed characters
- `--output` is required and is resolved to a host absolute path
- refuses to overwrite existing output unless `--overwrite` is passed
- writes through a same-directory temporary path, then links or renames into the requested output path
- cleans up the temporary path on failure, including the case where adb pulled a directory into the temp path
- after adb exits, the temporary result must be one regular file and no larger than 256 MiB
- zero-byte pulled files are allowed
- default compression leaves adb's own default behavior untouched
- `--compression` accepts `any`, `none`, `brotli`, `lz4`, or `zstd` and maps to adb `-z <algorithm>`
- `--no-compression` maps to adb `-Z`
- `--compression` and `--no-compression` are mutually exclusive
- `--pull-timeout` defaults to `120000`; an explicit global `--timeout` is used only when `--pull-timeout` is absent
- success JSON reports local output metadata but does not include the local output path
- failure traces redact local output paths, remote paths, temp paths, and adb argv path tokens
- success means adb pull exited 0; `adb_exit_success` does not independently hash, stat, or compare the remote file

`files pull` returns:

- `device_serial`
- `requested.remote_path`
- `requested.compression`
- `output.file_name`
- `output.bytes`
- `output.sha256`
- `output.overwritten`
- `transfer.method: "adb_pull"`
- `transfer.exit_code`
- `transfer.command_duration_ms`
- `verify.policy: "adb_exit_success"`
- `verify.ok: true`
- `verify.attempts: 1`
- `verify.reason`

Use this command when a workflow needs to collect one device file as a local artifact. It is not a directory sync command; use `files list` and `files stat` first when the workflow needs to choose a file from a directory.
