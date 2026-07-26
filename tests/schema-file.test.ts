import { describe, expect, it } from "vitest";
import {
  appActivityRecord,
  appGraphicsSummary,
  appMemorySnapshot,
  appPackageInfoRecord,
  createAjv,
  emptyAppGraphicsSummary,
  emptyAppMemorySnapshot,
  join,
  readFile
} from "./schema-test-utils.js";
import {
  AppActivitiesRequestSchema,
  AppActivitiesResultSchema,
  AppClearDataRequestSchema,
  AppClearDataResultSchema,
  AppCurrentResultSchema,
  AppGraphicsRequestSchema,
  AppGraphicsResultSchema,
  AppInstallRequestSchema,
  AppInstallResultSchema,
  AppInspectRequestSchema,
  AppInspectResultSchema,
  AppLaunchResultSchema,
  AppListResultSchema,
  AppLinksRequestSchema,
  AppLinksResultSchema,
  AppOpsGetRequestSchema,
  AppOpsGetResultSchema,
  AppOpenUrlRequestSchema,
  AppOpenUrlResultSchema,
  AppResolveUrlRequestSchema,
  AppResolveUrlResultSchema,
  AppPackageInfoRequestSchema,
  AppPackageInfoResultSchema,
  AppPermissionInspectRequestSchema,
  AppPermissionInspectResultSchema,
  AppPermissionRequestSchema,
  AppPermissionResultSchema,
  AppMemoryRequestSchema,
  AppMemoryResultSchema,
  AppPidsRequestSchema,
  AppPidsResultSchema,
  AppStopResultSchema,
  AppStartResultSchema,
  AppUninstallRequestSchema,
  AppUninstallResultSchema,
  DeviceBatteryGetRequestSchema,
  DeviceBatteryGetResultSchema,
  DeviceTimeGetRequestSchema,
  DeviceTimeGetResultSchema,
  DeviceCurrentUserRequestSchema,
  DeviceCurrentUserResultSchema,
  DeviceAccessibilityGetRequestSchema,
  DeviceAccessibilityGetResultSchema,
  DeviceAnimationsGetRequestSchema,
  DeviceAnimationsGetResultSchema,
  DeviceAnimationsSetRequestSchema,
  DeviceAnimationsSetResultSchema,
  DeviceBrightnessGetRequestSchema,
  DeviceBrightnessGetResultSchema,
  DeviceDetailsResultSchema,
  DeviceEnsureReadyRequestSchema,
  DeviceEnsureReadyResultSchema,
  DeviceImeGetRequestSchema,
  DeviceImeGetResultSchema,
  DeviceLocaleGetRequestSchema,
  DeviceLocaleGetResultSchema,
  DeviceListResultSchema,
  DeviceNetworkGetRequestSchema,
  DeviceNetworkGetResultSchema,
  DeviceStorageGetRequestSchema,
  DeviceStorageGetResultSchema,
  DeviceNotificationsRequestSchema,
  DeviceNotificationsResultSchema,
  DeviceOrientationRequestSchema,
  DeviceOrientationSetRequestSchema,
  DeviceOrientationSetResultSchema,
  DeviceOrientationResultSchema,
  DeviceRingerGetRequestSchema,
  DeviceRingerGetResultSchema,
  DeviceScreenGetRequestSchema,
  DeviceScreenGetResultSchema,
  DeviceStatusBarIconsRequestSchema,
  DeviceStatusBarIconsResultSchema,
  DeviceStatusBarRequestSchema,
  DeviceStatusBarResultSchema,
  DeviceUsersRequestSchema,
  DeviceUsersResultSchema,
  DeviceVolumeGetRequestSchema,
  DeviceVolumeGetResultSchema,
  DoubleTapRequestSchema,
  DoubleTapResultSchema,
  DragRequestSchema,
  DragResultSchema,
  FileCopyRequestSchema,
  FileCopyResultSchema,
  FileHashRequestSchema,
  FileHashResultSchema,
  FileListRequestSchema,
  FileListResultSchema,
  FileMkdirRequestSchema,
  FileMkdirResultSchema,
  FileMoveRequestSchema,
  FileMoveResultSchema,
  FilePullRequestSchema,
  FilePullResultSchema,
  FilePushRequestSchema,
  FilePushResultSchema,
  FileRmRequestSchema,
  FileRmResultSchema,
  FileStatRequestSchema,
  FileStatResultSchema,
  FindResultSchema,
  KeyPressRequestSchema,
  KeyPressResultSchema,
  LongPressRequestSchema,
  LongPressResultSchema,
  LogsDumpRequestSchema,
  LogsDumpResultSchema,
  ObserveResultSchema,
  ResponseEnvelopeSchema,
  ScreenrecordRequestSchema,
  ScreenrecordResultSchema,
  ScreenshotResultSchema,
  ScrollRequestSchema,
  ScrollResultSchema,
  ScrollUntilRequestSchema,
  ScrollUntilResultSchema,
  TapRequestSchema,
  TextClearRequestSchema,
  TextClearResultSchema,
  TextInputRequestSchema,
  TextInputResultSchema,
  WaitAppResultSchema,
  WaitUiRequestSchema,
  WaitUiResultSchema
} from "../src/contracts/index.js";

describe("generated JSON schemas: file contracts and golden responses", () => {
  it("enforces file transfer request and result semantics", () => {
    const file = {
      file_name: "empty.txt",
      bytes: 0,
      sha256: "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    };
    expect(
      FilePushRequestSchema.parse({
        local_path: "/tmp/empty.txt",
        local_file: file,
        remote_path: "/sdcard/Download/empty.txt",
        device_serial: "emulator-5554"
      })
    ).toEqual({
      local_path: "/tmp/empty.txt",
      local_file: file,
      remote_path: "/sdcard/Download/empty.txt",
      compression: "adb_default",
      timeout_ms: 120_000,
      device_serial: "emulator-5554"
    });
    expect(
      FilePushResultSchema.parse({
        device_serial: "emulator-5554",
        requested: {
          local: file,
          remote_path: "/sdcard/Download/empty.txt",
          compression: "disabled"
        },
        transfer: {
          method: "adb_push",
          exit_code: 0,
          command_duration_ms: 5
        },
        verify: {
          policy: "adb_exit_success",
          ok: true,
          attempts: 1,
          reason: "adb push exited 0"
        }
      })
    ).toMatchObject({
      device_serial: "emulator-5554",
      requested: { compression: "disabled" },
      verify: { policy: "adb_exit_success", ok: true }
    });
    expect(
      FilePullRequestSchema.parse({
        remote_path: "/sdcard/Download/empty.txt",
        output_path: "/tmp/empty.txt",
        device_serial: "emulator-5554"
      })
    ).toEqual({
      remote_path: "/sdcard/Download/empty.txt",
      output_path: "/tmp/empty.txt",
      overwrite: false,
      compression: "adb_default",
      timeout_ms: 120_000,
      device_serial: "emulator-5554"
    });
    expect(
      FilePullResultSchema.parse({
        device_serial: "emulator-5554",
        requested: {
          remote_path: "/sdcard/Download/empty.txt",
          compression: "adb_default"
        },
        output: {
          ...file,
          overwritten: false
        },
        transfer: {
          method: "adb_pull",
          exit_code: 0,
          command_duration_ms: 6
        },
        verify: {
          policy: "adb_exit_success",
          ok: true,
          attempts: 1,
          reason: "adb pull exited 0"
        }
      })
    ).toMatchObject({
      output: { bytes: 0, overwritten: false },
      verify: { policy: "adb_exit_success", ok: true }
    });
    for (const request of [
      {
        local_path: "/tmp/empty.txt",
        local_file: file,
        remote_path: "relative/path.txt",
        device_serial: "emulator-5554"
      },
      {
        local_path: "/tmp/empty.txt",
        local_file: file,
        remote_path: "/sdcard/Download/bad\npath.txt",
        device_serial: "emulator-5554"
      },
      {
        local_path: "/tmp/empty.txt",
        local_file: file,
        remote_path: "/sdcard/Download/empty.txt"
      },
      {
        remote_path: "/sdcard/Download/empty.txt",
        output_path: "/tmp/empty.txt",
        compression: "gzip",
        device_serial: "emulator-5554"
      }
    ]) {
      expect(() => FilePushRequestSchema.parse(request)).toThrow();
    }
    expect(
      FileStatRequestSchema.parse({
        remote_path: "/sdcard/Download/empty.txt"
      })
    ).toEqual({
      remote_path: "/sdcard/Download/empty.txt",
      timeout_ms: 10_000
    });
    expect(
      FileStatResultSchema.parse({
        device_serial: "emulator-5554",
        requested: {
          remote_path: "/sdcard/Download/empty.txt"
        },
        exists: true,
        entry: {
          kind: "regular_file",
          bytes: 0,
          modified_unix_ms: 1_782_751_000_000
        },
        query: {
          method: "device_stat",
          exit_code: 0,
          command_duration_ms: 4
        },
        verify: {
          policy: "stat_parse",
          ok: true,
          attempts: 1,
          reason: "stat output parsed"
        },
        semantics: "read_only_single_path_stat_not_directory_listing"
      })
    ).toMatchObject({
      exists: true,
      entry: { kind: "regular_file", bytes: 0 },
      verify: { policy: "stat_parse", ok: true }
    });
    expect(
      FileStatResultSchema.parse({
        device_serial: "emulator-5554",
        requested: {
          remote_path: "/sdcard/Download/missing.txt"
        },
        exists: false,
        entry: null,
        query: {
          method: "device_stat",
          exit_code: 1,
          command_duration_ms: 4
        },
        verify: {
          policy: "stat_parse",
          ok: true,
          attempts: 1,
          reason: "stat reported missing"
        },
        semantics: "read_only_single_path_stat_not_directory_listing"
      })
    ).toMatchObject({
      exists: false,
      entry: null
    });
    expect(() =>
      FileStatRequestSchema.parse({
        remote_path: "relative/path.txt"
      })
    ).toThrow();
    expect(() =>
      FileStatResultSchema.parse({
        device_serial: "emulator-5554",
        requested: { remote_path: "/sdcard/Download/empty.txt" },
        exists: false,
        entry: { kind: "regular_file", bytes: 0, modified_unix_ms: 1 },
        query: { method: "device_stat", exit_code: 0, command_duration_ms: 1 },
        verify: { policy: "stat_parse", ok: true, attempts: 1, reason: "bad" },
        semantics: "read_only_single_path_stat_not_directory_listing"
      })
    ).toThrow();
    expect(
      FileHashRequestSchema.parse({
        remote_path: "/sdcard/Download/empty.txt"
      })
    ).toEqual({
      remote_path: "/sdcard/Download/empty.txt",
      algorithm: "sha256",
      timeout_ms: 10_000
    });
    expect(
      FileHashRequestSchema.parse({
        remote_path: "/sdcard/Download/empty.txt",
        algorithm: "md5",
        device_serial: "emulator-5554"
      })
    ).toEqual({
      remote_path: "/sdcard/Download/empty.txt",
      algorithm: "md5",
      timeout_ms: 10_000,
      device_serial: "emulator-5554"
    });
    expect(
      FileHashResultSchema.parse({
        device_serial: "emulator-5554",
        requested: {
          remote_path: "/sdcard/Download/empty.txt",
          algorithm: "sha256"
        },
        target: {
          exists: true,
          entry: {
            kind: "regular_file",
            bytes: 0,
            modified_unix_ms: 1_782_751_000_000
          },
          query: {
            method: "device_stat",
            exit_code: 0,
            command_duration_ms: 4
          }
        },
        hash: {
          algorithm: "sha256",
          method: "device_sha256sum",
          digest: "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
          exit_code: 0,
          command_duration_ms: 9
        },
        hashed: true,
        verify: {
          policy: "regular_file_stat_then_digest_parse",
          ok: true,
          attempts: 2,
          reason: "regular file hashed"
        },
        semantics: "read_only_single_regular_file_content_digest_not_atomic"
      })
    ).toMatchObject({
      hashed: true,
      hash: {
        algorithm: "sha256",
        digest: "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
      }
    });
    expect(
      FileHashResultSchema.parse({
        device_serial: "emulator-5554",
        requested: {
          remote_path: "/sdcard/Download/empty.txt",
          algorithm: "md5"
        },
        target: {
          exists: true,
          entry: {
            kind: "regular_file",
            bytes: 0,
            modified_unix_ms: 1_782_751_000_000
          },
          query: {
            method: "device_stat",
            exit_code: 0,
            command_duration_ms: 4
          }
        },
        hash: {
          algorithm: "md5",
          method: "device_md5sum",
          digest: "md5:d41d8cd98f00b204e9800998ecf8427e",
          exit_code: 0,
          command_duration_ms: 9
        },
        hashed: true,
        verify: {
          policy: "regular_file_stat_then_digest_parse",
          ok: true,
          attempts: 2,
          reason: "regular file hashed"
        },
        semantics: "read_only_single_regular_file_content_digest_not_atomic"
      })
    ).toMatchObject({
      hashed: true,
      hash: {
        algorithm: "md5",
        digest: "md5:d41d8cd98f00b204e9800998ecf8427e"
      }
    });
    expect(
      FileHashResultSchema.parse({
        device_serial: "emulator-5554",
        requested: {
          remote_path: "/sdcard/Download/missing.txt",
          algorithm: "sha256"
        },
        target: {
          exists: false,
          entry: null,
          query: {
            method: "device_stat",
            exit_code: 1,
            command_duration_ms: 4
          }
        },
        hash: null,
        hashed: false,
        verify: {
          policy: "regular_file_stat_then_digest_parse",
          ok: true,
          attempts: 1,
          reason: "target missing"
        },
        semantics: "read_only_single_regular_file_content_digest_not_atomic"
      })
    ).toMatchObject({
      hashed: false,
      hash: null
    });
    for (const request of [
      { remote_path: "relative/path.txt" },
      { remote_path: "/sdcard/Download/empty.txt", algorithm: "sha1" },
      { remote_path: "/sdcard/Download/empty.txt", timeout_ms: 120_001 }
    ]) {
      expect(() => FileHashRequestSchema.parse(request)).toThrow();
    }
    for (const result of [
      {
        device_serial: "emulator-5554",
        requested: { remote_path: "/sdcard/Download/empty.txt", algorithm: "sha256" },
        target: {
          exists: true,
          entry: { kind: "regular_file", bytes: 0, modified_unix_ms: 1 },
          query: { method: "device_stat", exit_code: 0, command_duration_ms: 1 }
        },
        hash: {
          algorithm: "md5",
          method: "device_md5sum",
          digest: "md5:d41d8cd98f00b204e9800998ecf8427e",
          exit_code: 0,
          command_duration_ms: 1
        },
        hashed: true,
        verify: { policy: "regular_file_stat_then_digest_parse", ok: true, attempts: 2, reason: "bad" },
        semantics: "read_only_single_regular_file_content_digest_not_atomic"
      },
      {
        device_serial: "emulator-5554",
        requested: { remote_path: "/sdcard/Download/dir", algorithm: "sha256" },
        target: {
          exists: true,
          entry: { kind: "directory", bytes: 1, modified_unix_ms: 1 },
          query: { method: "device_stat", exit_code: 0, command_duration_ms: 1 }
        },
        hash: {
          algorithm: "sha256",
          method: "device_sha256sum",
          digest: "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
          exit_code: 0,
          command_duration_ms: 1
        },
        hashed: true,
        verify: { policy: "regular_file_stat_then_digest_parse", ok: true, attempts: 2, reason: "bad" },
        semantics: "read_only_single_regular_file_content_digest_not_atomic"
      }
    ]) {
      expect(() => FileHashResultSchema.parse(result)).toThrow();
    }
    expect(
      FileRmRequestSchema.parse({
        remote_path: "/sdcard/Download/empty.txt",
        confirm_remote: "/sdcard/Download/empty.txt",
        device_serial: "emulator-5554"
      })
    ).toEqual({
      remote_path: "/sdcard/Download/empty.txt",
      confirm_remote: "/sdcard/Download/empty.txt",
      missing_ok: false,
      timeout_ms: 10_000,
      device_serial: "emulator-5554"
    });
    expect(
      FileRmResultSchema.parse({
        device_serial: "emulator-5554",
        requested: {
          remote_path: "/sdcard/Download/empty.txt",
          missing_ok: false
        },
        before: {
          exists: true,
          entry: {
            kind: "regular_file",
            bytes: 0,
            modified_unix_ms: 1_782_751_000_000
          }
        },
        remove: {
          method: "device_rm",
          exit_code: 0,
          command_duration_ms: 3
        },
        removed: true,
        after_exists: false,
        verify: {
          policy: "stat_absent_after_rm",
          ok: true,
          attempts: 2,
          reason: "removed and verified absent"
        },
        semantics: "single_path_non_recursive_remove"
      })
    ).toMatchObject({
      removed: true,
      remove: { method: "device_rm" },
      verify: { policy: "stat_absent_after_rm", attempts: 2 }
    });
    expect(
      FileRmResultSchema.parse({
        device_serial: "emulator-5554",
        requested: {
          remote_path: "/sdcard/Download/missing.txt",
          missing_ok: true
        },
        before: {
          exists: false,
          entry: null
        },
        remove: {
          method: "skipped_missing_ok",
          exit_code: null,
          command_duration_ms: 0
        },
        removed: false,
        after_exists: false,
        verify: {
          policy: "stat_absent_after_rm",
          ok: true,
          attempts: 1,
          reason: "already absent"
        },
        semantics: "single_path_non_recursive_remove"
      })
    ).toMatchObject({
      removed: false,
      remove: { method: "skipped_missing_ok" },
      verify: { attempts: 1 }
    });
    for (const request of [
      {
        remote_path: "/sdcard/Download/empty.txt",
        confirm_remote: "/sdcard/Download/other.txt",
        device_serial: "emulator-5554"
      },
      {
        remote_path: "/sdcard/Download/empty.txt",
        confirm_remote: "/sdcard/Download/empty.txt"
      },
      {
        remote_path: "/sdcard/Download/dir/",
        confirm_remote: "/sdcard/Download/dir/",
        device_serial: "emulator-5554"
      },
      {
        remote_path: "relative/path.txt",
        confirm_remote: "relative/path.txt",
        device_serial: "emulator-5554"
      },
      {
        remote_path: "/",
        confirm_remote: "/",
        device_serial: "emulator-5554"
      },
      {
        remote_path: "/sdcard/./Download/empty.txt",
        confirm_remote: "/sdcard/./Download/empty.txt",
        device_serial: "emulator-5554"
      },
      {
        remote_path: "/sdcard/../Download/empty.txt",
        confirm_remote: "/sdcard/../Download/empty.txt",
        device_serial: "emulator-5554"
      }
    ]) {
      expect(() => FileRmRequestSchema.parse(request)).toThrow();
    }
    expect(() =>
      FileRmResultSchema.parse({
        device_serial: "emulator-5554",
        requested: { remote_path: "/sdcard/Download/empty.txt", missing_ok: false },
        before: { exists: true, entry: { kind: "regular_file", bytes: 0, modified_unix_ms: 1 } },
        remove: { method: "skipped_missing_ok", exit_code: null, command_duration_ms: 0 },
        removed: false,
        after_exists: false,
        verify: { policy: "stat_absent_after_rm", ok: true, attempts: 1, reason: "bad" },
        semantics: "single_path_non_recursive_remove"
      })
    ).toThrow();
    expect(
      FileMkdirRequestSchema.parse({
        remote_path: "/sdcard/Download/new-dir",
        device_serial: "emulator-5554"
      })
    ).toEqual({
      remote_path: "/sdcard/Download/new-dir",
      timeout_ms: 10_000,
      device_serial: "emulator-5554"
    });
    expect(
      FileMkdirResultSchema.parse({
        device_serial: "emulator-5554",
        requested: {
          remote_path: "/sdcard/Download/new-dir"
        },
        before: {
          exists: false,
          entry: null
        },
        mkdir: {
          method: "device_mkdir",
          exit_code: 0,
          command_duration_ms: 3
        },
        after: {
          exists: true,
          entry: {
            kind: "directory",
            bytes: 3452,
            modified_unix_ms: 1_782_751_000_000
          }
        },
        created: true,
        verify: {
          policy: "directory_exists_after_mkdir",
          ok: true,
          attempts: 2,
          reason: "created"
        },
        semantics: "idempotent_directory_create_with_parents"
      })
    ).toMatchObject({
      created: true,
      mkdir: { method: "device_mkdir" },
      verify: { attempts: 2 }
    });
    expect(
      FileMkdirResultSchema.parse({
        device_serial: "emulator-5554",
        requested: {
          remote_path: "/sdcard/Download/existing"
        },
        before: {
          exists: true,
          entry: {
            kind: "directory",
            bytes: 3452,
            modified_unix_ms: 1_782_751_000_000
          }
        },
        mkdir: {
          method: "skipped_directory_exists",
          exit_code: null,
          command_duration_ms: 0
        },
        after: {
          exists: true,
          entry: {
            kind: "directory",
            bytes: 3452,
            modified_unix_ms: 1_782_751_000_000
          }
        },
        created: false,
        verify: {
          policy: "directory_exists_after_mkdir",
          ok: true,
          attempts: 1,
          reason: "already existed"
        },
        semantics: "idempotent_directory_create_with_parents"
      })
    ).toMatchObject({
      created: false,
      mkdir: { method: "skipped_directory_exists" },
      verify: { attempts: 1 }
    });
    for (const request of [
      { remote_path: "/", device_serial: "emulator-5554" },
      { remote_path: "/sdcard/Download/new-dir/", device_serial: "emulator-5554" },
      { remote_path: "/sdcard/./Download/new-dir", device_serial: "emulator-5554" },
      { remote_path: "/sdcard/../Download/new-dir", device_serial: "emulator-5554" },
      { remote_path: "relative/new-dir", device_serial: "emulator-5554" },
      { remote_path: "/sdcard/Download/new-dir" }
    ]) {
      expect(() => FileMkdirRequestSchema.parse(request)).toThrow();
    }
    expect(
      FileMkdirRequestSchema.parse({
        remote_path: "/sdcard/.config",
        device_serial: "emulator-5554"
      }).remote_path
    ).toBe("/sdcard/.config");
    for (const result of [
      {
        device_serial: "emulator-5554",
        requested: { remote_path: "/sdcard/Download/new-dir" },
        before: { exists: false, entry: null },
        mkdir: { method: "skipped_directory_exists", exit_code: null, command_duration_ms: 0 },
        after: { exists: true, entry: { kind: "directory", bytes: 1, modified_unix_ms: 1 } },
        created: true,
        verify: { policy: "directory_exists_after_mkdir", ok: true, attempts: 1, reason: "bad" },
        semantics: "idempotent_directory_create_with_parents"
      },
      {
        device_serial: "emulator-5554",
        requested: { remote_path: "/sdcard/Download/existing" },
        before: { exists: true, entry: { kind: "directory", bytes: 1, modified_unix_ms: 1 } },
        mkdir: { method: "device_mkdir", exit_code: 0, command_duration_ms: 1 },
        after: { exists: true, entry: { kind: "directory", bytes: 1, modified_unix_ms: 1 } },
        created: true,
        verify: { policy: "directory_exists_after_mkdir", ok: true, attempts: 2, reason: "bad" },
        semantics: "idempotent_directory_create_with_parents"
      }
    ]) {
      expect(() => FileMkdirResultSchema.parse(result)).toThrow();
    }
    expect(
      FileCopyRequestSchema.parse({
        source_path: "/sdcard/Download/source.txt",
        dest_path: "/sdcard/Download/dest.txt",
        device_serial: "emulator-5554"
      })
    ).toEqual({
      source_path: "/sdcard/Download/source.txt",
      dest_path: "/sdcard/Download/dest.txt",
      timeout_ms: 120_000,
      device_serial: "emulator-5554"
    });
    expect(
      FileCopyResultSchema.parse({
        device_serial: "emulator-5554",
        requested: {
          source_path: "/sdcard/Download/source.txt",
          dest_path: "/sdcard/Download/dest.txt"
        },
        before_source: {
          exists: true,
          entry: { kind: "regular_file", bytes: 12, modified_unix_ms: 1_782_751_000_000 }
        },
        before_dest: {
          exists: false,
          entry: null
        },
        copy: {
          method: "device_cp_no_clobber",
          exit_code: 0,
          command_duration_ms: 3
        },
        after_source: {
          exists: true,
          entry: { kind: "regular_file", bytes: 12, modified_unix_ms: 1_782_751_000_000 }
        },
        after_dest: {
          exists: true,
          entry: { kind: "regular_file", bytes: 12, modified_unix_ms: 1_782_751_001_000 }
        },
        copied: true,
        verify: {
          policy: "source_preserved_dest_present_after_copy",
          ok: true,
          attempts: 4,
          reason: "copied"
        },
        semantics: "single_regular_file_non_clobber_copy"
      })
    ).toMatchObject({
      copied: true,
      copy: { method: "device_cp_no_clobber" },
      verify: { attempts: 4 }
    });
    for (const request of [
      {
        source_path: "/sdcard/Download/source.txt",
        dest_path: "/sdcard/Download/source.txt",
        device_serial: "emulator-5554"
      },
      {
        source_path: "/",
        dest_path: "/sdcard/Download/dest.txt",
        device_serial: "emulator-5554"
      },
      {
        source_path: "/sdcard/Download/source.txt",
        dest_path: "/sdcard/Download/dest.txt/",
        device_serial: "emulator-5554"
      },
      {
        source_path: "/sdcard/./Download/source.txt",
        dest_path: "/sdcard/Download/dest.txt",
        device_serial: "emulator-5554"
      },
      {
        source_path: "relative/source.txt",
        dest_path: "/sdcard/Download/dest.txt",
        device_serial: "emulator-5554"
      },
      {
        source_path: "/sdcard/Download/source.txt",
        dest_path: "/sdcard/Download/dest.txt"
      }
    ]) {
      expect(() => FileCopyRequestSchema.parse(request)).toThrow();
    }
    for (const result of [
      {
        device_serial: "emulator-5554",
        requested: { source_path: "/sdcard/source.txt", dest_path: "/sdcard/dest.txt" },
        before_source: { exists: false, entry: null },
        before_dest: { exists: false, entry: null },
        copy: { method: "device_cp_no_clobber", exit_code: 0, command_duration_ms: 1 },
        after_source: { exists: true, entry: { kind: "regular_file", bytes: 12, modified_unix_ms: 1 } },
        after_dest: { exists: true, entry: { kind: "regular_file", bytes: 12, modified_unix_ms: 1 } },
        copied: true,
        verify: { policy: "source_preserved_dest_present_after_copy", ok: true, attempts: 4, reason: "bad" },
        semantics: "single_regular_file_non_clobber_copy"
      },
      {
        device_serial: "emulator-5554",
        requested: { source_path: "/sdcard/source.txt", dest_path: "/sdcard/dest.txt" },
        before_source: { exists: true, entry: { kind: "symlink", bytes: 1, modified_unix_ms: 1 } },
        before_dest: { exists: false, entry: null },
        copy: { method: "device_cp_no_clobber", exit_code: 0, command_duration_ms: 1 },
        after_source: { exists: true, entry: { kind: "symlink", bytes: 1, modified_unix_ms: 1 } },
        after_dest: { exists: true, entry: { kind: "regular_file", bytes: 12, modified_unix_ms: 1 } },
        copied: true,
        verify: { policy: "source_preserved_dest_present_after_copy", ok: true, attempts: 4, reason: "bad" },
        semantics: "single_regular_file_non_clobber_copy"
      },
      {
        device_serial: "emulator-5554",
        requested: { source_path: "/sdcard/source.txt", dest_path: "/sdcard/dest.txt" },
        before_source: { exists: true, entry: { kind: "regular_file", bytes: 12, modified_unix_ms: 1 } },
        before_dest: { exists: false, entry: null },
        copy: { method: "device_cp_no_clobber", exit_code: 0, command_duration_ms: 1 },
        after_source: { exists: true, entry: { kind: "regular_file", bytes: 12, modified_unix_ms: 1 } },
        after_dest: { exists: true, entry: { kind: "regular_file", bytes: 13, modified_unix_ms: 1 } },
        copied: true,
        verify: { policy: "source_preserved_dest_present_after_copy", ok: true, attempts: 4, reason: "bad" },
        semantics: "single_regular_file_non_clobber_copy"
      }
    ]) {
      expect(() => FileCopyResultSchema.parse(result)).toThrow();
    }
    expect(
      FileMoveRequestSchema.parse({
        source_path: "/sdcard/Download/source.txt",
        dest_path: "/sdcard/Download/dest.txt",
        confirm_source: "/sdcard/Download/source.txt",
        device_serial: "emulator-5554"
      })
    ).toEqual({
      source_path: "/sdcard/Download/source.txt",
      dest_path: "/sdcard/Download/dest.txt",
      confirm_source: "/sdcard/Download/source.txt",
      timeout_ms: 10_000,
      device_serial: "emulator-5554"
    });
    expect(
      FileMoveResultSchema.parse({
        device_serial: "emulator-5554",
        requested: {
          source_path: "/sdcard/Download/source.txt",
          dest_path: "/sdcard/Download/dest.txt"
        },
        before_source: {
          exists: true,
          entry: { kind: "regular_file", bytes: 12, modified_unix_ms: 1_782_751_000_000 }
        },
        before_dest: {
          exists: false,
          entry: null
        },
        move: {
          method: "device_mv",
          exit_code: 0,
          command_duration_ms: 3
        },
        after_source: {
          exists: false,
          entry: null
        },
        after_dest: {
          exists: true,
          entry: { kind: "regular_file", bytes: 12, modified_unix_ms: 1_782_751_001_000 }
        },
        moved: true,
        verify: {
          policy: "source_absent_dest_present_after_move",
          ok: true,
          attempts: 4,
          reason: "moved"
        },
        semantics: "single_non_directory_path_non_clobber_move"
      })
    ).toMatchObject({
      moved: true,
      move: { method: "device_mv" },
      verify: { attempts: 4 }
    });
    for (const request of [
      {
        source_path: "/sdcard/Download/source.txt",
        dest_path: "/sdcard/Download/dest.txt",
        confirm_source: "/sdcard/Download/other.txt",
        device_serial: "emulator-5554"
      },
      {
        source_path: "/sdcard/Download/source.txt",
        dest_path: "/sdcard/Download/source.txt",
        confirm_source: "/sdcard/Download/source.txt",
        device_serial: "emulator-5554"
      },
      {
        source_path: "/",
        dest_path: "/sdcard/Download/dest.txt",
        confirm_source: "/",
        device_serial: "emulator-5554"
      },
      {
        source_path: "/sdcard/Download/source.txt",
        dest_path: "/sdcard/Download/dest.txt/",
        confirm_source: "/sdcard/Download/source.txt",
        device_serial: "emulator-5554"
      },
      {
        source_path: "/sdcard/./Download/source.txt",
        dest_path: "/sdcard/Download/dest.txt",
        confirm_source: "/sdcard/./Download/source.txt",
        device_serial: "emulator-5554"
      },
      {
        source_path: "relative/source.txt",
        dest_path: "/sdcard/Download/dest.txt",
        confirm_source: "relative/source.txt",
        device_serial: "emulator-5554"
      },
      {
        source_path: "/sdcard/Download/source.txt",
        dest_path: "/sdcard/Download/dest.txt",
        confirm_source: "/sdcard/Download/source.txt"
      }
    ]) {
      expect(() => FileMoveRequestSchema.parse(request)).toThrow();
    }
    for (const result of [
      {
        device_serial: "emulator-5554",
        requested: { source_path: "/sdcard/source.txt", dest_path: "/sdcard/dest.txt" },
        before_source: { exists: false, entry: null },
        before_dest: { exists: false, entry: null },
        move: { method: "device_mv", exit_code: 0, command_duration_ms: 1 },
        after_source: { exists: false, entry: null },
        after_dest: { exists: true, entry: { kind: "regular_file", bytes: 12, modified_unix_ms: 1 } },
        moved: true,
        verify: { policy: "source_absent_dest_present_after_move", ok: true, attempts: 4, reason: "bad" },
        semantics: "single_non_directory_path_non_clobber_move"
      },
      {
        device_serial: "emulator-5554",
        requested: { source_path: "/sdcard/source.txt", dest_path: "/sdcard/dest.txt" },
        before_source: { exists: true, entry: { kind: "directory", bytes: 1, modified_unix_ms: 1 } },
        before_dest: { exists: false, entry: null },
        move: { method: "device_mv", exit_code: 0, command_duration_ms: 1 },
        after_source: { exists: false, entry: null },
        after_dest: { exists: true, entry: { kind: "directory", bytes: 1, modified_unix_ms: 1 } },
        moved: true,
        verify: { policy: "source_absent_dest_present_after_move", ok: true, attempts: 4, reason: "bad" },
        semantics: "single_non_directory_path_non_clobber_move"
      },
      {
        device_serial: "emulator-5554",
        requested: { source_path: "/sdcard/source.txt", dest_path: "/sdcard/dest.txt" },
        before_source: { exists: true, entry: { kind: "regular_file", bytes: 12, modified_unix_ms: 1 } },
        before_dest: { exists: false, entry: null },
        move: { method: "device_mv", exit_code: 0, command_duration_ms: 1 },
        after_source: { exists: true, entry: { kind: "regular_file", bytes: 12, modified_unix_ms: 1 } },
        after_dest: { exists: true, entry: { kind: "regular_file", bytes: 12, modified_unix_ms: 1 } },
        moved: true,
        verify: { policy: "source_absent_dest_present_after_move", ok: true, attempts: 4, reason: "bad" },
        semantics: "single_non_directory_path_non_clobber_move"
      },
      {
        device_serial: "emulator-5554",
        requested: { source_path: "/sdcard/source.txt", dest_path: "/sdcard/dest.txt" },
        before_source: { exists: true, entry: { kind: "regular_file", bytes: 12, modified_unix_ms: 1 } },
        before_dest: { exists: false, entry: null },
        move: { method: "device_mv", exit_code: 0, command_duration_ms: 1 },
        after_source: { exists: false, entry: null },
        after_dest: { exists: true, entry: { kind: "regular_file", bytes: 13, modified_unix_ms: 1 } },
        moved: true,
        verify: { policy: "source_absent_dest_present_after_move", ok: true, attempts: 4, reason: "bad" },
        semantics: "single_non_directory_path_non_clobber_move"
      }
    ]) {
      expect(() => FileMoveResultSchema.parse(result)).toThrow();
    }
    expect(
      FileListRequestSchema.parse({
        remote_path: "/"
      })
    ).toEqual({
      remote_path: "/",
      max_entries: 100,
      timeout_ms: 10_000
    });
    expect(
      FileListRequestSchema.parse({
        remote_path: "/sdcard/Download",
        max_entries: 2,
        device_serial: "emulator-5554"
      })
    ).toEqual({
      remote_path: "/sdcard/Download",
      max_entries: 2,
      timeout_ms: 10_000,
      device_serial: "emulator-5554"
    });
    expect(
      FileListResultSchema.parse({
        device_serial: "emulator-5554",
        requested: {
          remote_path: "/sdcard/Download",
          max_entries: 100
        },
        target: {
          exists: true,
          entry: {
            kind: "directory",
            bytes: 3452,
            modified_unix_ms: 1_782_751_000_000
          },
          query: {
            method: "device_stat",
            exit_code: 0,
            command_duration_ms: 2
          }
        },
        list: {
          method: "device_find_stat",
          exit_code: 0,
          command_duration_ms: 4,
          entries: [
            {
              name: "report\nfinal.txt",
              path: "/sdcard/Download/report\nfinal.txt",
              kind: "regular_file",
              bytes: 12,
              modified_unix_ms: 1_782_751_000_000
            }
          ],
          count: 1,
          truncated: false
        },
        verify: {
          policy: "bounded_single_directory_listing",
          ok: true,
          attempts: 2,
          reason: "listed"
        },
        semantics: "read_only_single_directory_listing_not_recursive"
      })
    ).toMatchObject({
      list: {
        count: 1,
        entries: [{ name: "report\nfinal.txt" }]
      },
      verify: { attempts: 2 }
    });
    expect(
      FileListResultSchema.parse({
        device_serial: "emulator-5554",
        requested: {
          remote_path: "/sdcard/Download/missing",
          max_entries: 100
        },
        target: {
          exists: false,
          entry: null,
          query: {
            method: "device_stat",
            exit_code: 1,
            command_duration_ms: 2
          }
        },
        list: null,
        verify: {
          policy: "bounded_single_directory_listing",
          ok: true,
          attempts: 1,
          reason: "missing"
        },
        semantics: "read_only_single_directory_listing_not_recursive"
      })
    ).toMatchObject({
      target: { exists: false },
      list: null
    });
    for (const request of [
      { remote_path: "relative/path" },
      { remote_path: "/sdcard/Download/" },
      { remote_path: "/sdcard/./Download" },
      { remote_path: "/sdcard/../Download" },
      { remote_path: "/sdcard/Download", max_entries: 0 },
      { remote_path: "/sdcard/Download", max_entries: 501 }
    ]) {
      expect(() => FileListRequestSchema.parse(request)).toThrow();
    }
    expect(() =>
      FileListResultSchema.parse({
        device_serial: "emulator-5554",
        requested: { remote_path: "/sdcard/Download", max_entries: 100 },
        target: {
          exists: true,
          entry: { kind: "directory", bytes: 1, modified_unix_ms: 1 },
          query: { method: "device_stat", exit_code: 0, command_duration_ms: 1 }
        },
        list: {
          method: "device_find_stat",
          exit_code: 0,
          command_duration_ms: 1,
          entries: [],
          count: 1,
          truncated: false
        },
        verify: { policy: "bounded_single_directory_listing", ok: true, attempts: 2, reason: "bad" },
        semantics: "read_only_single_directory_listing_not_recursive"
      })
    ).toThrow();
    expect(() =>
      FileListResultSchema.parse({
        device_serial: "emulator-5554",
        requested: { remote_path: "/sdcard/Download/file.txt", max_entries: 100 },
        target: {
          exists: true,
          entry: { kind: "regular_file", bytes: 1, modified_unix_ms: 1 },
          query: { method: "device_stat", exit_code: 0, command_duration_ms: 1 }
        },
        list: {
          method: "device_find_stat",
          exit_code: 0,
          command_duration_ms: 1,
          entries: [],
          count: 0,
          truncated: false
        },
        verify: { policy: "bounded_single_directory_listing", ok: true, attempts: 2, reason: "bad" },
        semantics: "read_only_single_directory_listing_not_recursive"
      })
    ).toThrow();
  });

  it("validates a golden files hash response", async () => {
    const schema = JSON.parse(await readFile(join(process.cwd(), "schemas/files-hash-response.schema.json"), "utf8"));
    const ajv = await createAjv();
    const validate = ajv.compile(schema);
    const envelope = ResponseEnvelopeSchema(FileHashResultSchema).parse({
      schema_version: "0.1",
      runtime_version: "0.3.0",
      request_id: "req-files-hash",
      ok: true,
      command: "files.hash",
      device: { serial: "emulator-5554" },
      duration_ms: 10,
      result: {
        device_serial: "emulator-5554",
        requested: {
          remote_path: "/sdcard/Download/empty.txt",
          algorithm: "sha256"
        },
        target: {
          exists: true,
          entry: {
            kind: "regular_file",
            bytes: 0,
            modified_unix_ms: 1_782_751_000_000
          },
          query: {
            method: "device_stat",
            exit_code: 0,
            command_duration_ms: 4
          }
        },
        hash: {
          algorithm: "sha256",
          method: "device_sha256sum",
          digest: "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
          exit_code: 0,
          command_duration_ms: 6
        },
        hashed: true,
        verify: {
          policy: "regular_file_stat_then_digest_parse",
          ok: true,
          attempts: 2,
          reason: "pre-hash stat found a regular file and digest output parsed"
        },
        semantics: "read_only_single_regular_file_content_digest_not_atomic"
      },
      error: null,
      warnings: [],
      trace: {}
    });

    expect(validate(envelope)).toBe(true);
  });
});
