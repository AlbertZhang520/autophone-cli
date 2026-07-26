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


export const MUSIC_STREAM = { name: "music", androidStreamId: 3, androidStreamName: "STREAM_MUSIC" } as const;
export const ALARM_STREAM = { name: "alarm", androidStreamId: 4, androidStreamName: "STREAM_ALARM" } as const;

export function meminfoFixture(): string {
  return `Applications Memory Usage (in Kilobytes):
Uptime: 118431797 Realtime: 365426184

** MEMINFO in pid 1234 [com.example.app] **
                   Pss  Private  Private  SwapPss      Rss     Heap     Heap     Heap
                 Total    Dirty    Clean    Dirty    Total     Size    Alloc     Free
                ------   ------   ------   ------   ------   ------   ------   ------
  Native Heap     5329     5136      192     5156     6396    29120    18315     6317
  Dalvik Heap     7005     6704      284     2239     8364    12849     4657     8192
      Unknown     3606     2072     1528     1498     4212
        TOTAL    63795    16112    18216    10643   173308    41969    22972    14509

 App Summary
                       Pss(KB)                        Rss(KB)
                        ------                         ------
           Java Heap:     7336                          23400
         Native Heap:     5136                           6396
                Code:    15316                         134152
               Stack:      340                            572
            Graphics:        0                              0
       Private Other:     6200
              System:    29467
             Unknown:                                    8788

           TOTAL PSS:    63795            TOTAL RSS:   173308       TOTAL SWAP PSS:    10643

 Objects
               Views:       22         ViewRootImpl:        0
`;
}

export function gfxinfoFixture(): string {
  return `Applications Graphics Acceleration Info:
Uptime: 121087432 Realtime: 368081818

** Graphics info for pid 1234 [com.example.app] **

Stats since: 91522723936145ns
Total frames rendered: 6266
Janky frames: 489 (7.80%)
Janky frames (legacy): 2300 (36.71%)
50th percentile: 9ms
90th percentile: 24ms
95th percentile: 28ms
99th percentile: 32ms
Number Missed Vsync: 4
Number High input latency: 10359
Number Slow UI thread: 456
Number Slow bitmap uploads: 29
Number Slow issue draw commands: 66
Number Frame deadline missed: 489
Number Frame deadline missed (legacy): 517
HISTOGRAM: 5ms=978 6ms=458 7ms=696
50th gpu percentile: 4ms
90th gpu percentile: 7ms
95th gpu percentile: 8ms
99th gpu percentile: 11ms
GPU HISTOGRAM: 1ms=365 2ms=935

Pipeline=Skia (OpenGL)
Memory policy:
  Max surface area: 3308640
`;
}

export function appActivitiesFixture(): string {
  return `1 activities found:
  Activity #0:
    priority=0 preferredOrder=0 match=0x108000 specificIndex=-1 isDefault=true
    com.example.app/.MainActivity
`;
}

export function appActivitiesMultiFixture(): string {
  return `2 activities found:
  Activity #0:
    priority=0 preferredOrder=0 match=0x108000 specificIndex=-1 isDefault=false
    org.koin.sample.sandbox/.main.MainActivity
  Activity #1:
    priority=0 preferredOrder=0 match=0x108000 specificIndex=-1 isDefault=false
    org.koin.sample.sandbox/leakcanary.internal.activity.LeakLauncherActivity
`;
}

export function packageInfoFixture(): string {
  return `Activity Resolver Table:
  Full MIME Types:

Packages:
  Package [com.example.app] (abc):
    appId=10134
    pkg=Package{abc com.example.app}
    codePath=/data/app/~~hash/com.example.app-base
    resourcePath=/data/app/~~hash/com.example.app-base
    legacyNativeLibraryDir=/data/app/~~hash/com.example.app-base/lib/arm64
    primaryCpuAbi=arm64-v8a
    secondaryCpuAbi=null
    cpuAbiOverride=null
    versionCode=42 minSdk=23 targetSdk=35
    versionName=1.2.3
    splits=[base config.arm64_v8a]
    flags=[ HAS_CODE ALLOW_CLEAR_USER_DATA ]
    privateFlags=[ PRIVATE_FLAG_ACTIVITIES_RESIZE_MODE_RESIZEABLE PRIVATE_FLAG_HAS_DOMAIN_URLS ]
    timeStamp=2026-06-29 12:00:00
    lastUpdateTime=2026-06-29 12:30:00
    installerPackageName=com.android.vending
    installerPackageUid=10031
    initiatingPackageName=com.android.vending
    originatingPackageName=null
    packageSource=0
    installPermissionsFixed=true
    pkgFlags=[ HAS_CODE ALLOW_CLEAR_USER_DATA ]
    privatePkgFlags=[ PRIVATE_FLAG_ACTIVITIES_RESIZE_MODE_RESIZEABLE PRIVATE_FLAG_HAS_DOMAIN_URLS ]
    apexModuleName=null
    declared permissions:
      com.example.app.permission.PRIVATE: prot=signature
    requested permissions:
      android.permission.CAMERA
    install permissions:
      android.permission.CAMERA: granted=false
    User 0: ceDataInode=123 installed=true hidden=false
      runtime permissions:
        android.permission.CAMERA: granted=true
    PackageSignatures{abc version:2}

Queries:
  system apps query block
`;
}

export function packageInfoWithHiddenDuplicateFixture(): string {
  return `${packageInfoFixture()}
Hidden system packages:
  Package [com.example.app] (hidden):
    appId=10134
    codePath=/system/app/Example
    versionCode=1 minSdk=21 targetSdk=28
`;
}

export async function createFakeAdb(source: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "autophone-fake-adb-"));
  const path = join(dir, "adb");
  await writeFile(path, source);
  await chmod(path, 0o755);
  return path;
}

export function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}
