import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { chmod } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AutophoneError } from "../../contracts/index.js";
import {
  AdbDriver,
  parseAdbDevices,
  parseAdbDevicesLong,
  parseAdbInstallOutput,
  parseAdbUninstallOutput,
  parseAmForceStopOutput,
  parseAmStartOutput,
  parseBatteryDetails,
  parseBrightnessFloatSetting,
  parseBrightnessIntSetting,
  parseBrightnessModeSetting,
  parseCurrentUserOutput,
  parseDeviceReadyState,
  parseConnectivityActiveNetwork,
  parseDumpsysInputMethodState,
  parseDumpsysDisplayBrightness,
  parseEnabledInputMethodSetting,
  parseFocus,
  parseGetpropOutput,
  parseLogcatLines,
  parseMonkeyLaunchOutput,
  parseAutoRotate,
  parseDumpsysAudioRingerState,
  parseMediaSessionVolumeGetOutput,
  orientationFromRotationDegrees,
  parseOrientation,
  parseRotationDegrees,
  parseStatusBarIconsOutput,
  parseSettingsBoolean,
  parseInputMethodSetting,
  parseUserRotationPolicy,
  parsePmClearOutput,
  parseDumpsysPackagePermission,
  parsePmPathOutput,
  parsePmPermissionOutput,
  parsePmListPackagesOutput,
  parsePmListUsersOutput,
  parsePidofOutput,
  quoteForDeviceShell,
  redactUrlFromText,
  parseWindowDensityDetails,
  parseWindowSizeDetails,
  parseWindowSize
} from "./adb-driver.js";
import { AdbTransport } from "./transport.js";
import { buildAdbFileCopyArgs, parseAdbFileCopyFailure } from "./file-copy.js";
import { buildAdbFileHashArgs, parseAdbFileHashOutput } from "./file-hash.js";
import { buildAdbFileListArgs, parseAdbFileListOutput } from "./file-list.js";
import { buildAdbFileMkdirArgs, parseAdbFileMkdirFailure } from "./file-mkdir.js";
import { buildAdbFileMoveArgs, parseAdbFileMoveFailure } from "./file-move.js";
import { buildAdbFileRmArgs, parseAdbFileRmFailure } from "./file-rm.js";
import { buildAdbFileStatArgs, parseAdbFileStatOutput } from "./file-stat.js";
import { buildAdbDeviceLocaleSourceArgs, parseDeviceLocaleSourceOutput } from "./device-locale.js";
import { buildAdbDeviceBatteryArgs, parseDeviceBatteryOutput } from "./device-battery.js";
import {
  buildAdbDeviceTimeSourceArgs,
  parseDeviceTimeBooleanOutput,
  parseDeviceTimeDateOutput,
  parseDeviceTimeZoneOutput
} from "./device-time.js";
import { buildAdbDeviceStorageArgs, parseDeviceStorageOutput } from "./device-storage.js";
import {
  buildAdbDeviceAccessibilitySettingArgs,
  parseAccessibilityBooleanSetting,
  parseEnabledAccessibilityServicesSetting
} from "./device-accessibility.js";
import {
  buildAdbDeviceAnimationScaleArgs,
  buildAdbDeviceAnimationScalePutArgs,
  formatDeviceAnimationScaleValue,
  parseDeviceAnimationScaleSetting
} from "./device-animations.js";
import { buildAdbDeviceNotificationsArgs, parseDumpsysNotificationOutput } from "./device-notifications.js";
import { buildAdbAppMemoryArgs, parseAppMemoryOutput } from "./device-memory.js";
import { buildAdbAppGraphicsArgs, parseAppGraphicsOutput } from "./device-graphics.js";
import { buildAdbAppPackageInfoArgs, parseAppPackageInfoOutput } from "./app-package-info.js";
import { buildAdbAppLinksArgs, parseAppLinksOutput } from "./app-links.js";
import { buildAdbAppOpsGetArgs, parseAppOpsGetOutput } from "./app-ops.js";
import { buildAdbAppActivitiesArgs, parseAppActivitiesOutput } from "./app-activities.js";
import { buildAdbAppResolveUrlArgs, parseAppResolveUrlOutput } from "./app-resolve-url.js";
import { buildAdbScreenrecordArgs, parseAdbScreenrecordFailure } from "./device-screenrecord.js";

import {
  ALARM_STREAM,
  MUSIC_STREAM,
  appActivitiesFixture,
  appActivitiesMultiFixture,
  createFakeAdb,
  gfxinfoFixture,
  meminfoFixture,
  packageInfoFixture,
  packageInfoWithHiddenDuplicateFixture,
  shellQuote
} from "./adb-driver-test-utils.test-support.js";

describe("adb driver parsing file protocols", () => {
  it("builds file stat argv with device-shell quoting", () => {
    const remotePath = "/sdcard/Download/a b'$(echo bad);x.txt";

    expect(buildAdbFileStatArgs(remotePath)).toEqual([
      "shell",
      "stat",
      "-c",
      "'%F|%s|%Y'",
      "--",
      "'/sdcard/Download/a b'\\''$(echo bad);x.txt'"
    ]);
  });

  it("builds file hash argv with device-shell quoting", () => {
    const remotePath = "/sdcard/Download/a b'$(echo bad);x.txt";

    expect(buildAdbFileHashArgs(remotePath, "sha256")).toEqual([
      "shell",
      "sha256sum",
      "--",
      "'/sdcard/Download/a b'\\''$(echo bad);x.txt'"
    ]);
    expect(buildAdbFileHashArgs(remotePath, "md5")).toEqual([
      "shell",
      "md5sum",
      "--",
      "'/sdcard/Download/a b'\\''$(echo bad);x.txt'"
    ]);
  });

  it("builds device storage argv with fixed statfs probes", () => {
    expect(buildAdbDeviceStorageArgs()).toEqual([
      "shell",
      "stat",
      "-f",
      "-c",
      "'%n|%S|%b|%a|%f|%T'",
      "--",
      "'/data'",
      "'/sdcard'",
      "'/data/local/tmp'"
    ]);
  });

  it("builds device locale source argv", () => {
    expect(buildAdbDeviceLocaleSourceArgs("systemLocales")).toEqual([
      "shell",
      "settings",
      "get",
      "system",
      "system_locales"
    ]);
    expect(buildAdbDeviceLocaleSourceArgs("persistSysLocale")).toEqual([
      "shell",
      "getprop",
      "persist.sys.locale"
    ]);
    expect(buildAdbDeviceLocaleSourceArgs("roProductLocale")).toEqual(["shell", "getprop", "ro.product.locale"]);
    expect(buildAdbDeviceLocaleSourceArgs("roProductLocaleLanguage")).toEqual([
      "shell",
      "getprop",
      "ro.product.locale.language"
    ]);
    expect(buildAdbDeviceLocaleSourceArgs("roProductLocaleRegion")).toEqual([
      "shell",
      "getprop",
      "ro.product.locale.region"
    ]);
  });

  it("builds file rm argv with device-shell quoting", () => {
    const remotePath = "/sdcard/Download/a b'$(echo bad);x.txt";

    expect(buildAdbFileRmArgs(remotePath)).toEqual([
      "shell",
      "rm",
      "--",
      "'/sdcard/Download/a b'\\''$(echo bad);x.txt'"
    ]);
  });

  it("builds file mkdir argv with device-shell quoting", () => {
    const remotePath = "/sdcard/Download/a b'$(echo bad);x";

    expect(buildAdbFileMkdirArgs(remotePath)).toEqual([
      "shell",
      "mkdir",
      "-p",
      "--",
      "'/sdcard/Download/a b'\\''$(echo bad);x'"
    ]);
  });

  it("builds file move argv with device-shell quoting", () => {
    const sourcePath = "/sdcard/Download/a b'$(echo bad);source.txt";
    const destPath = "/sdcard/Download/a b'$(echo bad);dest.txt";

    expect(buildAdbFileMoveArgs(sourcePath, destPath)).toEqual([
      "shell",
      "mv",
      "--",
      "'/sdcard/Download/a b'\\''$(echo bad);source.txt'",
      "'/sdcard/Download/a b'\\''$(echo bad);dest.txt'"
    ]);
  });

  it("builds file copy argv with no-clobber and device-shell quoting", () => {
    const sourcePath = "/sdcard/Download/a b'$(echo bad);source.txt";
    const destPath = "/sdcard/Download/a b'$(echo bad);dest.txt";

    expect(buildAdbFileCopyArgs(sourcePath, destPath)).toEqual([
      "shell",
      "cp",
      "-n",
      "-T",
      "--",
      "'/sdcard/Download/a b'\\''$(echo bad);source.txt'",
      "'/sdcard/Download/a b'\\''$(echo bad);dest.txt'"
    ]);
  });

  it("builds file list argv with exec-out shell quoting", () => {
    const remotePath = "/sdcard/Download/a b'$(echo bad);x";
    const args = buildAdbFileListArgs(remotePath, 7);

    expect(args.slice(0, 3)).toEqual(["exec-out", "sh", "-c"]);
    expect(args[3]).toContain("find \"$dir\" -mindepth 1 -maxdepth 1 -print0 2>/dev/null");
    expect(args[3]).toContain("stat -c '%F|%s|%Y' -- \"$p\" 2>/dev/null");
    expect(args[3]).toContain("pipeline_status=${PIPESTATUS[*]}");
    expect(args[3]).toContain("find_status=${pipeline_status%% *}");
    expect(args[3]).toContain("printf 'F\\0find failed\\0'");
    expect(args[3]).toContain("[ \"$find_status\" != \"141\" ]");
    expect(args[3]).toContain("printf 'S\\0%s\\0' \"$status\"");
    expect(args[3]).toContain("dir='/sdcard/Download/a b'\\''$(echo bad);x'");
    expect(args[3]).toContain("max=7");
  });

  it("parses file list NUL protocol conservatively", () => {
    const output = Buffer.concat([
      Buffer.from("AUTOPHONE_LIST_V1\0"),
      Buffer.from("E\0/data/local/tmp/list/a b.txt\0regular file|3|1782751000\0"),
      Buffer.from("E\0/data/local/tmp/list/name\nnext\0symbolic link|43|1782751001\0"),
      Buffer.from("T\0S\0" + "0\0")
    ]);

    expect(parseAdbFileListOutput(output, "", 0, "/data/local/tmp/list")).toEqual({
      entries: [
        {
          name: "a b.txt",
          path: "/data/local/tmp/list/a b.txt",
          kind: "regular_file",
          bytes: 3,
          modifiedUnixMs: 1_782_751_000_000
        },
        {
          name: "name\nnext",
          path: "/data/local/tmp/list/name\nnext",
          kind: "symlink",
          bytes: 43,
          modifiedUnixMs: 1_782_751_001_000
        }
      ],
      truncated: true
    });
    expect(parseAdbFileListOutput(Buffer.from("AUTOPHONE_LIST_V1\0S\0" + "0\0"), "", 0, "/data/local/tmp/list")).toEqual({
      entries: [],
      truncated: false
    });
    expect(parseAdbFileListOutput(Buffer.from("AUTOPHONE_LIST_V1\0E\0/data/local/tmp/list/a.txt\0regular file|1|2\0T\0F\0find failed\0S\0" + "141\0"), "", 141, "/data/local/tmp/list")).toEqual({
      entries: [
        {
          name: "a.txt",
          path: "/data/local/tmp/list/a.txt",
          kind: "regular_file",
          bytes: 1,
          modifiedUnixMs: 2_000
        }
      ],
      truncated: true
    });
    expect(parseAdbFileListOutput(Buffer.from("AUTOPHONE_LIST_V1\0E\0/system\0directory|123|1782751002\0S\0" + "0\0"), "", 0, "/")).toEqual({
      entries: [
        {
          name: "system",
          path: "/system",
          kind: "directory",
          bytes: 123,
          modifiedUnixMs: 1_782_751_002_000
        }
      ],
      truncated: false
    });
  });

  it("rejects malformed file list output without exposing child names", () => {
    const childPath = "/data/local/tmp/list/private-child.txt";
    expect(parseAdbFileListOutput(Buffer.from("AUTOPHONE_LIST_V1\0"), "", 0, "/data/local/tmp/list")).toEqual({
      failure: "directory list command did not report completion"
    });
    expect(parseAdbFileListOutput(Buffer.from("AUTOPHONE_LIST_V1\0E\0/data/local/tmp/list/file\0"), "", 0, "/data/local/tmp/list")).toEqual({
      failure: "directory list command returned truncated entry record"
    });
    expect(parseAdbFileListOutput(Buffer.from("AUTOPHONE_LIST_V1\0E\0/data/local/tmp/other/file\0regular file|1|2\0S\0" + "0\0"), "", 0, "/data/local/tmp/list")).toEqual({
      failure: "directory list command returned a path outside the requested directory"
    });
    expect(parseAdbFileListOutput(Buffer.from("AUTOPHONE_LIST_V1\0F\0stat failed\0S\0" + "70\0"), "", 70, "/data/local/tmp/list")).toEqual({
      failure: "stat failed"
    });
    expect(parseAdbFileListOutput(Buffer.from("AUTOPHONE_LIST_V1\0E\0/data/local/tmp/list/file\0regular file|bad|2\0S\0" + "0\0"), "", 0, "/data/local/tmp/list")).toEqual({
      failure: "stat command returned malformed numeric fields"
    });
    expect(parseAdbFileListOutput(Buffer.concat([Buffer.from("AUTOPHONE_LIST_V1\0E\0"), Buffer.from([0xff]), Buffer.from("\0regular file|1|2\0S\0" + "0\0")]), "", 0, "/data/local/tmp/list")).toEqual({
      failure: "directory list command returned a non-UTF-8 path"
    });
    expect(parseAdbFileListOutput(Buffer.from(`AUTOPHONE_LIST_V1\0E\0${childPath}\0regular file|1|2\0S\0` + "0\0"), "find: Permission denied\n", 0, "/data/local/tmp/list")).toEqual({
      failure: "directory list command wrote stderr"
    });
  });

  it("parses file rm failures conservatively", () => {
    expect(parseAdbFileRmFailure("", "", 0)).toBeUndefined();
    expect(parseAdbFileRmFailure("", "rm: /sdcard/nope: No such file or directory\n", 1)).toBe(
      "rm: /sdcard/nope: No such file or directory"
    );
    expect(parseAdbFileRmFailure("removed\n", "", 0)).toBe("removed");
    expect(parseAdbFileRmFailure("", "warning\n", 0)).toBe("warning");
  });

  it("parses file mkdir failures conservatively", () => {
    expect(parseAdbFileMkdirFailure("", "", 0)).toBeUndefined();
    expect(parseAdbFileMkdirFailure("", "mkdir: /sdcard/nope: Permission denied\n", 1)).toBe(
      "mkdir: /sdcard/nope: Permission denied"
    );
    expect(parseAdbFileMkdirFailure("created\n", "", 0)).toBe("created");
    expect(parseAdbFileMkdirFailure("", "warning\n", 0)).toBe("warning");
  });

  it("parses file move failures conservatively", () => {
    expect(parseAdbFileMoveFailure("", "", 0)).toBeUndefined();
    expect(parseAdbFileMoveFailure("", "mv: /sdcard/nope: Permission denied\n", 1)).toBe(
      "mv: /sdcard/nope: Permission denied"
    );
    expect(parseAdbFileMoveFailure("moved\n", "", 0)).toBe("moved");
    expect(parseAdbFileMoveFailure("", "warning\n", 0)).toBe("warning");
  });

  it("parses file copy failures conservatively", () => {
    expect(parseAdbFileCopyFailure("", "", 0)).toBeUndefined();
    expect(parseAdbFileCopyFailure("", "cp: /sdcard/nope: Permission denied\n", 1)).toBe(
      "cp: /sdcard/nope: Permission denied"
    );
    expect(parseAdbFileCopyFailure("copied\n", "", 0)).toBe("copied");
    expect(parseAdbFileCopyFailure("", "warning\n", 0)).toBe("warning");
  });

  it("parses file hash output conservatively", () => {
    expect(
      parseAdbFileHashOutput(
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  /sdcard/Download/a b.txt\n",
        "",
        0,
        "sha256"
      )
    ).toEqual({
      digest: "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    });
    expect(parseAdbFileHashOutput("d41d8cd98f00b204e9800998ecf8427e\n", "", 0, "md5")).toEqual({
      digest: "md5:d41d8cd98f00b204e9800998ecf8427e"
    });
    expect(parseAdbFileHashOutput("d41d8cd98f00b204e9800998ecf8427e  /sdcard/a.txt\nextra\n", "", 0, "md5")).toEqual({
      failure: "md5sum command returned unexpected output"
    });
    expect(parseAdbFileHashOutput("d41d8cd98f00b204e9800998ecf8427e  /sdcard/a.txt\n", "warning\n", 0, "md5")).toEqual({
      failure: "warning"
    });
    expect(parseAdbFileHashOutput("not-a-digest  /sdcard/a.txt\n", "", 0, "sha256")).toEqual({
      failure: "sha256sum command returned malformed digest"
    });
    expect(parseAdbFileHashOutput("", "sha256sum: /sdcard/missing: No such file or directory\n", 1, "sha256")).toEqual({
      failure: "sha256sum: /sdcard/missing: No such file or directory"
    });
    expect(parseAdbFileHashOutput("", "sha256sum: not found\n", 127, "sha256")).toEqual({
      failure: "sha256sum: not found"
    });
  });

  it("parses device storage statfs output by fixed path instead of stdout order", () => {
    expect(
      parseDeviceStorageOutput(
        [
          "/sdcard|4096|100|60|70|0x65735546",
          "/data/local/tmp|4096|100|60|70|f2fs",
          "/data|4096|100|60|70|f2fs"
        ].join("\n"),
        "",
        0
      )
    ).toEqual({
      entries: [
        {
          role: "data",
          path: "/data",
          ok: true,
          filesystemType: "f2fs",
          blockSizeBytes: 4096,
          totalBlocks: 100,
          availableBlocks: 60,
          freeBlocks: 70
        },
        {
          role: "shared",
          path: "/sdcard",
          ok: true,
          filesystemType: "0x65735546",
          blockSizeBytes: 4096,
          totalBlocks: 100,
          availableBlocks: 60,
          freeBlocks: 70
        },
        {
          role: "tmp",
          path: "/data/local/tmp",
          ok: true,
          filesystemType: "f2fs",
          blockSizeBytes: 4096,
          totalBlocks: 100,
          availableBlocks: 60,
          freeBlocks: 70
        }
      ],
      paths: ["/data", "/sdcard", "/data/local/tmp"]
    });
  });

  it("keeps fixed-path statfs stderr as per-entry storage unavailability", () => {
    expect(
      parseDeviceStorageOutput(
        ["/data|4096|100|60|70|f2fs", "/data/local/tmp|4096|100|60|70|f2fs"].join("\n"),
        "stat: '/sdcard': No such file or directory\n",
        1
      )
    ).toEqual({
      entries: [
        {
          role: "data",
          path: "/data",
          ok: true,
          filesystemType: "f2fs",
          blockSizeBytes: 4096,
          totalBlocks: 100,
          availableBlocks: 60,
          freeBlocks: 70
        },
        {
          role: "shared",
          path: "/sdcard",
          ok: false,
          error: {
            reason: "statfs_failed",
            message: "No such file or directory"
          }
        },
        {
          role: "tmp",
          path: "/data/local/tmp",
          ok: true,
          filesystemType: "f2fs",
          blockSizeBytes: 4096,
          totalBlocks: 100,
          availableBlocks: 60,
          freeBlocks: 70
        }
      ],
      paths: ["/data", "/sdcard", "/data/local/tmp"]
    });

    expect(
      parseDeviceStorageOutput(
        ["/sdcard|4096|100|60|70|0x65735546", "/data/local/tmp|4096|100|60|70|f2fs"].join("\n"),
        "stat: '/data': Permission denied\n",
        1
      )
    ).toEqual({
      entries: [
        {
          role: "data",
          path: "/data",
          ok: false,
          error: {
            reason: "statfs_failed",
            message: "Permission denied"
          }
        },
        {
          role: "shared",
          path: "/sdcard",
          ok: true,
          filesystemType: "0x65735546",
          blockSizeBytes: 4096,
          totalBlocks: 100,
          availableBlocks: 60,
          freeBlocks: 70
        },
        {
          role: "tmp",
          path: "/data/local/tmp",
          ok: true,
          filesystemType: "f2fs",
          blockSizeBytes: 4096,
          totalBlocks: 100,
          availableBlocks: 60,
          freeBlocks: 70
        }
      ],
      paths: ["/data", "/sdcard", "/data/local/tmp"]
    });
  });

  it("rejects malformed device storage statfs output conservatively", () => {
    for (const probe of [
      {
        stdout: "/data|4096|100|60|70|f2fs\n/data|4096|100|60|70|f2fs\n",
        stderr: "",
        failure: "statfs command returned duplicate storage path records"
      },
      {
        stdout: "/cache|4096|100|60|70|ext4\n",
        stderr: "",
        failure: "statfs command returned an unexpected storage path"
      },
      {
        stdout: "/data|4096|abc|60|70|f2fs\n",
        stderr: "",
        failure: "statfs command returned malformed numeric fields"
      },
      {
        stdout: "/data|4096|100|80|70|f2fs\n",
        stderr: "",
        failure: "statfs command returned inconsistent block counts"
      },
      {
        stdout: "/data|9007199254740991|2|1|1|f2fs\n",
        stderr: "",
        failure: "statfs command returned storage values outside safe integer range"
      },
      {
        stdout: "/data|4096|100|60|70|f2fs\n",
        stderr: "warning: noisy stat\n",
        failure: "statfs command wrote unexpected stderr"
      },
      {
        stdout: "",
        stderr:
          "stat: '/data': No such file or directory\nstat: '/sdcard': No such file or directory\nstat: '/data/local/tmp': No such file or directory\n",
        failure: "statfs command did not return any usable storage records"
      }
    ]) {
      expect(parseDeviceStorageOutput(probe.stdout, probe.stderr, 1)).toEqual({ failure: probe.failure });
    }
  });

  it("parses device locale source output conservatively", () => {
    expect(parseDeviceLocaleSourceOutput("zh-CN\r\n", "", 0, "settings_system_system_locales")).toEqual({
      ok: true,
      value: "zh-CN"
    });
    expect(parseDeviceLocaleSourceOutput("null\n", "", 0, "settings_system_system_locales")).toEqual({
      ok: true,
      value: null
    });
    expect(parseDeviceLocaleSourceOutput("\n", "", 0, "getprop_persist_sys_locale")).toEqual({
      ok: true,
      value: null
    });
    expect(parseDeviceLocaleSourceOutput("zh-CN\nen-US\n", "", 0, "settings_system_system_locales")).toEqual({
      ok: false,
      failure: "settings_system_system_locales returned multiple non-empty lines"
    });
    expect(parseDeviceLocaleSourceOutput("zh-CN\n", "warning\n", 0, "settings_system_system_locales")).toEqual({
      ok: false,
      failure: "settings_system_system_locales wrote unexpected stderr"
    });
    expect(parseDeviceLocaleSourceOutput("", "", 1, "getprop_ro_product_locale")).toEqual({
      ok: false,
      failure: "getprop_ro_product_locale exited nonzero"
    });
    expect(parseDeviceLocaleSourceOutput("x".repeat(513), "", 0, "getprop_ro_product_locale")).toEqual({
      ok: false,
      failure: "getprop_ro_product_locale returned too much data"
    });
    expect(parseDeviceLocaleSourceOutput("zh-CN\u0007\n", "", 0, "settings_system_system_locales")).toEqual({
      ok: false,
      failure: "settings_system_system_locales returned control characters"
    });
  });

  it("builds and parses dumpsys notification output without crossing record boundaries", () => {
    expect(buildAdbDeviceAccessibilitySettingArgs("accessibility_enabled")).toEqual([
      "shell",
      "settings",
      "get",
      "secure",
      "accessibility_enabled"
    ]);
    expect(buildAdbDeviceAnimationScaleArgs("window_animation_scale")).toEqual([
      "shell",
      "settings",
      "get",
      "global",
      "window_animation_scale"
    ]);
    expect(buildAdbDeviceAnimationScalePutArgs("transition_animation_scale", 0.5)).toEqual([
      "shell",
      "settings",
      "put",
      "global",
      "transition_animation_scale",
      "0.5"
    ]);
    expect(formatDeviceAnimationScaleValue(0)).toBe("0");
    expect(formatDeviceAnimationScaleValue(0.5)).toBe("0.5");
    expect(formatDeviceAnimationScaleValue(1)).toBe("1");
    expect(buildAdbDeviceNotificationsArgs()).toEqual(["shell", "dumpsys", "notification", "--noredact"]);
    const output = `Current Notification Manager state:
  Notification List:
    NotificationRecord(0x01: pkg=com.example.app user=UserHandle{0} id=42 tag=null importance=4 key=0|com.example.app|42|null|10001 bbbc=0: Notification(channel=messages shortcut=null contentView=null vibrate=null sound=null defaults=0 flags=AUTO_CANCEL|ONLY_ALERT_ONCE color=0x00000000 groupKey=conversation category=msg vis=PRIVATE))
      extras={
          android.title=String (Alice)
          android.text=String (Code 123456)
          android.subText=null
      }
    NotificationRecord(0x02: pkg=android user=UserHandle{-1} id=26 tag=null importance=4 key=-1|android|26|null|1000 bbbc=0: Notification(channel=DEVELOPER_IMPORTANT shortcut=null contentView=null vibrate=null sound=null defaults=0x0 flags=0x802 color=0x00000000 vis=PUBLIC))
      extras={
          android.title=SpannableString (USB debugging connected)
          android.text=String (Tap to disable USB debugging)
          android.bigText=String [length=28]
      }
`;

    expect(parseDumpsysNotificationOutput(output, "")).toEqual({
      ok: true,
      notifications: [
        {
          key: "0|com.example.app|42|null|10001",
          packageName: "com.example.app",
          userId: 0,
          notificationId: 42,
          tag: null,
          channelId: "messages",
          importance: 4,
          groupKey: "conversation",
          category: "msg",
          visibility: "private",
          flags: ["AUTO_CANCEL", "ONLY_ALERT_ONCE"],
          title: "Alice",
          text: "Code 123456",
          subText: null,
          bigText: null
        },
        {
          key: "-1|android|26|null|1000",
          packageName: "android",
          userId: -1,
          notificationId: 26,
          tag: null,
          channelId: "DEVELOPER_IMPORTANT",
          importance: 4,
          groupKey: null,
          category: null,
          visibility: "public",
          flags: ["0x802"],
          title: "USB debugging connected",
          text: "Tap to disable USB debugging",
          subText: null,
          bigText: null
        }
      ]
    });
  });

  it("parses empty notification lists and fails closed on malformed dumps", () => {
    expect(parseDumpsysNotificationOutput("Current Notification Manager state:\n  Notification List:\n", "")).toEqual({
      ok: true,
      notifications: []
    });
    expect(parseDumpsysNotificationOutput("Current Notification Manager state:\n", "")).toEqual({
      ok: false,
      failure: "notification manager dump markers missing"
    });
    expect(
      parseDumpsysNotificationOutput(
        "Current Notification Manager state:\n  Notification List:\n    NotificationRecord(0x01: user=UserHandle{0})\n",
        ""
      )
    ).toEqual({
      ok: false,
      failure: "notification record header was not parseable"
    });
    expect(
      parseDumpsysNotificationOutput(
        [
          "Current Notification Manager state:",
          "  Notification List:",
          "    NotificationRecord(0x01: pkg=com.example.app user=UserHandle{0} id=42 tag=null importance=4 key=0|com.example.app|42|null|10001 bbbc=0: Notification(channel=messages flags=AUTO_CANCEL vis=PRIVATE))",
          "      extras={",
          "          android.title=String (Alice)",
          "      }",
          "    NotificationRecord(0x02: user=UserHandle{0})"
        ].join("\n"),
        ""
      )
    ).toEqual({
      ok: false,
      failure: "notification record header was not parseable"
    });
  });

  it("parses file stat output conservatively", () => {
    expect(parseAdbFileStatOutput("regular file|12|1782751000\n", "", 0)).toEqual({
      exists: true,
      entry: {
        kind: "regular_file",
        bytes: 12,
        modifiedUnixMs: 1_782_751_000_000
      }
    });
    expect(parseAdbFileStatOutput("regular empty file|0|1782751000\n", "", 0)).toMatchObject({
      exists: true,
      entry: { kind: "regular_file", bytes: 0 }
    });
    expect(parseAdbFileStatOutput("directory|3452|1782751000\n", "", 0)).toMatchObject({
      exists: true,
      entry: { kind: "directory", bytes: 3452 }
    });
    expect(parseAdbFileStatOutput("symbolic link|43|1782751000\n", "", 0)).toMatchObject({
      exists: true,
      entry: { kind: "symlink", bytes: 43 }
    });
    expect(parseAdbFileStatOutput("character device|0|0\n", "", 0)).toMatchObject({
      exists: true,
      entry: { kind: "other", bytes: 0, modifiedUnixMs: 0 }
    });
    expect(parseAdbFileStatOutput("", "stat: '/sdcard/nope': No such file or directory\n", 1)).toEqual({
      exists: false,
      entry: null,
      missing: "stat reported no such file"
    });
    expect(parseAdbFileStatOutput("", "stat: '/sdcard/x': Permission denied\n", 1)).toEqual({
      failure: "stat: '/sdcard/x': Permission denied"
    });
    expect(parseAdbFileStatOutput("regular file\\t12\\t1782751000\n", "", 0)).toEqual({
      failure: "stat command returned malformed output"
    });
    expect(parseAdbFileStatOutput("regular file|twelve|1782751000\n", "", 0)).toEqual({
      failure: "stat command returned malformed numeric fields"
    });
  });
});
