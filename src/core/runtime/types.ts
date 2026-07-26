import {
  type AppActivitiesRequest,
  type AppActivitiesResult,
  type AppClearDataRequest,
  type AppClearDataResult,
  type AppInstallRequest,
  type AppInstallResult,
  type AppInspectRequest,
  type AppInspectResult,
  type AppListRequest,
  type AppListResult,
  type AppListScope,
  type AppListState,
  type AppLinksRequest,
  type AppLinksResult,
  type AppOpsGetRequest,
  type AppOpsGetResult,
  type AppGraphicsRequest,
  type AppGraphicsResult,
  type AppLaunchRequest,
  type AppLaunchResult,
  type AppMemoryRequest,
  type AppMemoryResult,
  type AppCurrentRequest,
  type AppCurrentResult,
  type AppOpenUrlRequest,
  type AppOpenUrlResult,
  type AppResolveUrlRequest,
  type AppResolveUrlResult,
  type AppPackageInfoRequest,
  type AppPackageInfoResult,
  type AppPermissionOperation,
  type AppPermissionInspectRequest,
  type AppPermissionInspectResult,
  type AppPermissionRequest,
  type AppPermissionResult,
  type AppPidsRequest,
  type AppPidsResult,
  type AppStopRequest,
  type AppStopResult,
  type AppStartRequest,
  type AppStartResult,
  type AppUninstallRequest,
  type AppUninstallResult,
  type DeviceBatteryGetRequest,
  type DeviceBatteryGetResult,
  type DeviceTimeGetRequest,
  type DeviceTimeGetResult,
  type DeviceDetailsRequest,
  type DeviceDetailsResult,
  type DeviceCurrentUserRequest,
  type DeviceCurrentUserResult,
  type DeviceAccessibilityGetRequest,
  type DeviceAccessibilityGetResult,
  type DeviceAnimationScaleValue,
  type DeviceAnimationsGetRequest,
  type DeviceAnimationsGetResult,
  type DeviceAnimationsSetRequest,
  type DeviceAnimationsSetResult,
  type DeviceBrightnessGetRequest,
  type DeviceBrightnessGetResult,
  type DeviceEnsureReadyRequest,
  type DeviceEnsureReadyResult,
  type DeviceImeGetRequest,
  type DeviceImeGetResult,
  type DeviceLocaleGetRequest,
  type DeviceLocaleGetResult,
  type DeviceListRequest,
  type DeviceListResult,
  type DeviceNetworkGetRequest,
  type DeviceNetworkGetResult,
  type DeviceNotificationRecord,
  type DeviceNotificationsRequest,
  type DeviceNotificationsResult,
  type DeviceOrientationRequest,
  type DeviceOrientationResult,
  type DeviceOrientationSetRequest,
  type DeviceOrientationSetResult,
  type DeviceRingerGetRequest,
  type DeviceRingerGetResult,
  type DeviceReadyState,
  type DeviceScreenDisplayPower,
  type DeviceScreenGetRequest,
  type DeviceScreenGetResult,
  type DeviceStorageGetRequest,
  type DeviceStorageGetResult,
  type DeviceStatusBarCommand,
  type DeviceStatusBarIconsRequest,
  type DeviceStatusBarIconsResult,
  type DeviceStatusBarRequest,
  type DeviceStatusBarResult,
  type DeviceUsersRequest,
  type DeviceUsersResult,
  type DeviceVolumeGetRequest,
  type DeviceVolumeGetResult,
  type DeviceVolumeStream,
  type DoubleTapRequest,
  type DoubleTapResult,
  type DragGesture,
  type DragRequest,
  type DragResult,
  type FileEntryKind,
  type FileHashAlgorithm,
  type FileTransferCompression,
  type FindRequest,
  type FindResult,
  type KeyName,
  type KeyPressRequest,
  type KeyPressResult,
  type LongPressRequest,
  type LongPressResult,
  type LogsDumpRequest,
  type LogsDumpResult,
  type ObserveResult,
  type Bounds,
  type Point,
  type ScrollAmount,
  type ScrollDirection,
  type ScrollRequest,
  type ScrollResult,
  type ScrollUntilReason,
  type ScrollUntilRequest,
  type ScrollUntilResult,
  type ScreenshotRequest,
  type ScreenshotResult,
  type ScreenrecordRequest,
  type ScreenrecordResult,
  type Snapshot,
  type TapRequest,
  type TapResult,
  type TextClearRequest,
  type TextClearResult,
  type TextInputRequest,
  type TextInputResult,
  type WaitAppRequest,
  type WaitAppResult,
  type WaitUiRequest,
  type WaitUiResult
} from "../../contracts/index.js";

const LOG_DUMP_BUFFERS = ["main", "system", "crash"] as const;

export type ObserveOptions = {
  deviceSerial?: string | undefined;
  timeoutMs: number;
};

export type DriverTapOptions = {
  deviceSerial?: string | undefined;
  timeoutMs: number;
};

export type DriverDoubleTapOptions = {
  deviceSerial?: string | undefined;
  timeoutMs: number;
};

export type DriverKeyOptions = {
  deviceSerial?: string | undefined;
  timeoutMs: number;
};

export type DriverTextInputOptions = {
  deviceSerial?: string | undefined;
  timeoutMs: number;
};

export type DriverTextClearOptions = {
  deviceSerial?: string | undefined;
  timeoutMs: number;
};

export type DriverSwipeOptions = {
  deviceSerial?: string | undefined;
  timeoutMs: number;
};

export type DriverDragOptions = {
  deviceSerial?: string | undefined;
  timeoutMs: number;
};

export type DriverScreenshotOptions = {
  deviceSerial?: string | undefined;
  timeoutMs: number;
};

export type DriverScreenshotResult = {
  serial: string;
  png: Buffer;
  durationMs: number;
};

export type DriverScreenrecordRequest = {
  deviceSerial: string;
  remotePath: string;
  durationSeconds: ScreenrecordRequest["duration_seconds"];
  bitRateBps?: number | undefined;
  size?: string | undefined;
  bugreport: boolean;
  timeoutMs: number;
};

export type DriverScreenrecordResult = DriverCommandResult & {
  serial: string;
  remotePath: string;
};

export type DriverCommandResult = {
  exitCode: number | null;
  durationMs: number;
};

export type DriverFileTransferRequest = {
  deviceSerial: string;
  localPath: string;
  remotePath: string;
  compression: FileTransferCompression;
  timeoutMs: number;
};

export type DriverFileTransferResult = DriverCommandResult & {
  serial: string;
};

export type DriverFileStatRequest = {
  deviceSerial?: string | undefined;
  remotePath: string;
  timeoutMs: number;
};

export type DriverFileStatResult = DriverCommandResult & {
  serial: string;
  exists: boolean;
  entry: {
    kind: FileEntryKind;
    bytes: number;
    modifiedUnixMs: number;
  } | null;
};

export type DriverFileHashRequest = {
  deviceSerial?: string | undefined;
  remotePath: string;
  algorithm: FileHashAlgorithm;
  timeoutMs: number;
};

export type DriverFileHashResult = DriverCommandResult & {
  serial: string;
  algorithm: FileHashAlgorithm;
  digest: string;
};

export type DriverFileRemoveRequest = {
  deviceSerial: string;
  remotePath: string;
  timeoutMs: number;
};

export type DriverFileRemoveResult = DriverCommandResult & {
  serial: string;
};

export type DriverFileMkdirRequest = {
  deviceSerial: string;
  remotePath: string;
  timeoutMs: number;
};

export type DriverFileMkdirResult = DriverCommandResult & {
  serial: string;
};

export type DriverFileMoveRequest = {
  deviceSerial: string;
  sourcePath: string;
  destPath: string;
  timeoutMs: number;
};

export type DriverFileMoveResult = DriverCommandResult & {
  serial: string;
};

export type DriverFileCopyRequest = {
  deviceSerial: string;
  sourcePath: string;
  destPath: string;
  timeoutMs: number;
};

export type DriverFileCopyResult = DriverCommandResult & {
  serial: string;
};

export type DriverFileListRequest = {
  deviceSerial: string;
  remotePath: string;
  maxEntries: number;
  timeoutMs: number;
};

export type DriverFileListEntry = {
  name: string;
  path: string;
  kind: FileEntryKind;
  bytes: number;
  modifiedUnixMs: number;
};

export type DriverFileListResult = DriverCommandResult & {
  serial: string;
  entries: DriverFileListEntry[];
  truncated: boolean;
};

export type DriverDismissKeyguardResult = DriverCommandResult;

export type DriverStatusBarResult = DriverCommandResult & {
  serial: string;
  command: DeviceStatusBarCommand;
};

export type DriverStatusBarIconsResult = DriverCommandResult & {
  serial: string;
  icons: string[];
};

export type DriverVolumeStreamInfo = {
  name: DeviceVolumeStream;
  androidStreamId: number;
  androidStreamName: DeviceVolumeGetResult["stream"]["android_stream_name"];
};

export type DriverVolumeGetRequest = DeviceDetailsOptions & {
  stream: DriverVolumeStreamInfo;
};

export type DriverVolumeGetResult = DriverCommandResult & {
  serial: string;
  stream: DriverVolumeStreamInfo;
  volume: DeviceVolumeGetResult["volume"];
};

export type DriverRingerGetResult = DriverCommandResult & {
  serial: string;
  ringer: DeviceRingerGetResult["ringer"];
  zen: DeviceRingerGetResult["zen"];
  affectedStreams: DeviceRingerGetResult["affected_streams"];
  mutedStreams: DeviceRingerGetResult["muted_streams"];
};

export type DriverNotificationRecord = Omit<DeviceNotificationRecord, "truncated">;

export type DriverDeviceNotificationsResult = DriverCommandResult & {
  serial: string;
  notifications: DriverNotificationRecord[];
};

export const DEVICE_VOLUME_STREAMS = {
  voice_call: {
    name: "voice_call",
    androidStreamId: 0,
    androidStreamName: "STREAM_VOICE_CALL"
  },
  system: {
    name: "system",
    androidStreamId: 1,
    androidStreamName: "STREAM_SYSTEM"
  },
  ring: {
    name: "ring",
    androidStreamId: 2,
    androidStreamName: "STREAM_RING"
  },
  music: {
    name: "music",
    androidStreamId: 3,
    androidStreamName: "STREAM_MUSIC"
  },
  alarm: {
    name: "alarm",
    androidStreamId: 4,
    androidStreamName: "STREAM_ALARM"
  },
  notification: {
    name: "notification",
    androidStreamId: 5,
    androidStreamName: "STREAM_NOTIFICATION"
  }
} satisfies Record<DeviceVolumeStream, DriverVolumeStreamInfo>;

export type DriverAppStartRequest = {
  packageName: string;
  activity: string;
  component: string;
  deviceSerial?: string | undefined;
  timeoutMs: number;
};

export type DriverAppStartResult = {
  status?: string | undefined;
  activity?: string | undefined;
  exitCode: number | null;
  durationMs: number;
};

export type DriverAppLaunchRequest = {
  packageName: string;
  deviceSerial?: string | undefined;
  timeoutMs: number;
};

export type DriverAppLaunchResult = {
  exitCode: number | null;
  durationMs: number;
};

export type DriverAppClearDataRequest = {
  packageName: string;
  deviceSerial: string;
  timeoutMs: number;
};

export type DriverAppClearDataResult = {
  exitCode: number | null;
  durationMs: number;
};

export type DriverAppInstallRequest = {
  apkPath: string;
  replace: boolean;
  grantRuntimePermissions: boolean;
  allowTest: boolean;
  allowDowngrade: boolean;
  deviceSerial: string;
  timeoutMs: number;
};

export type DriverAppInstallResult = {
  exitCode: number | null;
  durationMs: number;
};

export type DriverAppInspectRequest = {
  packageName: string;
  userId?: number | undefined;
  deviceSerial?: string | undefined;
  timeoutMs: number;
};

export type DriverAppInspectResult = {
  serial: string;
  installed: boolean;
  paths: string[];
  exitCode: number | null;
  durationMs: number;
};

export type DriverAppPermissionRequest = {
  packageName: string;
  permissionName: string;
  operation: AppPermissionOperation;
  userId?: number | undefined;
  deviceSerial: string;
  timeoutMs: number;
};

export type DriverAppPermissionResult = {
  exitCode: number | null;
  durationMs: number;
};

export type DriverPermissionDumpEntry = {
  present: boolean;
  granted: boolean | null;
  flags: string[];
};

export type DriverAppPermissionInspectRequest = {
  packageName: string;
  permissionName: string;
  userId?: number | undefined;
  deviceSerial?: string | undefined;
  timeoutMs: number;
};

export type DriverAppPermissionInspectResult = {
  serial: string;
  packageFound: boolean;
  targetSdk: number | null;
  manifestRequested: boolean;
  availableUserIds: number[];
  install: DriverPermissionDumpEntry;
  runtime: DriverPermissionDumpEntry & {
    selectedUserId: number;
    userPresent: boolean;
  };
  state: AppPermissionInspectResult["permission"]["state"];
  granted: boolean | null;
  source: AppPermissionInspectResult["permission"]["source"];
  exitCode: number | null;
  durationMs: number;
};

export type DriverAppUninstallRequest = {
  packageName: string;
  userId?: number | undefined;
  deviceSerial: string;
  timeoutMs: number;
};

export type DriverAppUninstallResult = {
  exitCode: number | null;
  durationMs: number;
};

export type DriverOpenUrlRequest = {
  url: string;
  deviceSerial?: string | undefined;
  timeoutMs: number;
};

export type DriverOpenUrlResult = {
  status?: string | undefined;
  activity?: string | undefined;
  exitCode: number | null;
  durationMs: number;
};

export type DriverResolveUrlRequest = {
  url: string;
  deviceSerial?: string | undefined;
  timeoutMs: number;
};

export type DriverResolveUrlResult = {
  serial: string;
  resolution: AppResolveUrlResult["resolution"];
  metadata: AppResolveUrlResult["metadata"];
  exitCode: number | null;
  durationMs: number;
};

export type DriverAppStopRequest = {
  packageName: string;
  deviceSerial?: string | undefined;
  timeoutMs: number;
};

export type DriverAppStopResult = {
  exitCode: number | null;
  durationMs: number;
};

export type DriverAppListRequest = {
  scope: AppListScope;
  state: AppListState;
  includeUninstalled: boolean;
  filter?: string | undefined;
  deviceSerial?: string | undefined;
  timeoutMs: number;
};

export type DriverAppListResult = {
  serial: string;
  packages: string[];
};

export type DriverPackagePidsRequest = {
  packageName: string;
  deviceSerial?: string | undefined;
  timeoutMs: number;
};

export type DriverPackagePidsResult = {
  serial: string;
  pids: number[];
  durationMs: number;
};

export type DriverPackagePidSnapshotRequest = DriverPackagePidsRequest;

export type DriverPackagePidSnapshotResult = {
  serial: string;
  pids: number[];
  exitCode: number | null;
  durationMs: number;
};

export type DriverAppMemoryRequest = {
  packageName: string;
  deviceSerial?: string | undefined;
  timeoutMs: number;
};

export type DriverAppMemoryResult = {
  serial: string;
  running: boolean;
  processes: AppMemoryResult["processes"];
  memory: AppMemoryResult["memory"];
  exitCode: number | null;
  durationMs: number;
};

export type DriverAppPackageInfoRequest = {
  packageName: string;
  deviceSerial?: string | undefined;
  timeoutMs: number;
};

export type DriverAppPackageInfoResult = {
  serial: string;
  installed: boolean;
  packageInfo: AppPackageInfoResult["package"];
  exitCode: number | null;
  durationMs: number;
};

export type DriverAppLinksRequest = {
  packageName: string;
  deviceSerial?: string | undefined;
  timeoutMs: number;
};

export type DriverAppLinksResult = {
  serial: string;
  packageFound: boolean;
  domains: AppLinksResult["domains"];
  exitCode: number | null;
  durationMs: number;
};

export type DriverAppOpsGetRequest = {
  packageName: string;
  opName: string;
  userId?: number | undefined;
  deviceSerial?: string | undefined;
  timeoutMs: number;
};

export type DriverAppOpsGetResult = {
  serial: string;
  lookup: AppOpsGetResult["lookup"];
  defaultMode: AppOpsGetResult["default_mode"];
  entries: AppOpsGetResult["entries"];
  exitCode: number | null;
  durationMs: number;
};

export type DriverAppActivitiesRequest = {
  packageName: string;
  intent: AppActivitiesRequest["intent"];
  deviceSerial?: string | undefined;
  timeoutMs: number;
};

export type DriverAppActivitiesResult = {
  serial: string;
  activities: AppActivitiesResult["activities"];
  exitCode: number | null;
  durationMs: number;
};

export type DriverAppGraphicsRequest = {
  packageName: string;
  deviceSerial?: string | undefined;
  timeoutMs: number;
};

export type DriverAppGraphicsResult = {
  serial: string;
  running: boolean;
  processes: AppGraphicsResult["processes"];
  graphics: AppGraphicsResult["graphics"];
  exitCode: number | null;
  durationMs: number;
};

export type DriverLogcatDumpRequest = {
  deviceSerial: string;
  pid: number;
  lines: number;
  buffers: readonly (typeof LOG_DUMP_BUFFERS)[number][];
  timeoutMs: number;
};

export type DriverLogcatDumpResult = {
  pid: number;
  lines: string[];
  exitCode: number | null;
  durationMs: number;
};

export type DriverDevice = {
  serial: string;
  state: string;
  details: Record<string, string>;
};

export type DeviceListOptions = {
  timeoutMs: number;
};

export type DeviceDetailsOptions = {
  deviceSerial?: string | undefined;
  timeoutMs: number;
};

export type DriverDeviceUser = {
  id: number;
  name: string;
  flagsHex: string;
  running: boolean;
};

export type DriverDeviceUsersResult = {
  serial: string;
  users: DriverDeviceUser[];
  exitCode: number | null;
  durationMs: number;
};

export type DriverDeviceCurrentUserResult = {
  serial: string;
  currentUserId: number;
  exitCode: number | null;
  durationMs: number;
};

export type DriverDeviceScreenResult = {
  serial: string;
  state: DeviceReadyState;
  queries: {
    power: DriverCommandResult;
    window: DriverCommandResult;
  };
};

export type DriverDeviceNetworkResult = {
  serial: string;
  settings: DeviceNetworkGetResult["settings"];
  active: DeviceNetworkGetResult["active"];
  queries: {
    airplaneMode: DriverCommandResult;
    wifi: DriverCommandResult;
    mobileData: DriverCommandResult;
    connectivity: DriverCommandResult;
  };
};

export type DriverDeviceStorageRole = "data" | "shared" | "tmp";
export type DriverDeviceStoragePath = "/data" | "/sdcard" | "/data/local/tmp";
export type DriverDeviceStorageEntry =
  | {
      role: DriverDeviceStorageRole;
      path: DriverDeviceStoragePath;
      ok: true;
      filesystemType: string;
      blockSizeBytes: number;
      totalBlocks: number;
      availableBlocks: number;
      freeBlocks: number;
    }
  | {
      role: DriverDeviceStorageRole;
      path: DriverDeviceStoragePath;
      ok: false;
      error: {
        reason: "statfs_failed" | "not_reported";
        message: string;
      };
    };

export type DriverDeviceStorageResult = DriverCommandResult & {
  serial: string;
  entries: DriverDeviceStorageEntry[];
  paths: DriverDeviceStoragePath[];
};

export type DriverDeviceBatteryResult = DriverCommandResult & {
  serial: string;
  battery: DeviceBatteryGetResult["battery"];
};

export type DriverDeviceTimeResult = {
  serial: string;
  time: DeviceTimeGetResult["time"];
  settings: DeviceTimeGetResult["settings"];
  timezoneSources: DeviceTimeGetResult["timezone"]["sources"];
  queries: {
    date: DriverCommandResult;
    autoTime: DriverCommandResult;
    autoTimeZone: DriverCommandResult;
    settingsTimeZone: DriverCommandResult;
    persistSysTimeZone: DriverCommandResult;
  };
};

export type DriverDeviceLocaleResult = {
  serial: string;
  sources: DeviceLocaleGetResult["sources"];
  queries: {
    systemLocales: DriverCommandResult;
    persistSysLocale: DriverCommandResult;
    roProductLocale: DriverCommandResult;
    roProductLocaleLanguage: DriverCommandResult;
    roProductLocaleRegion: DriverCommandResult;
  };
};

export type DriverDeviceImeResult = {
  serial: string;
  keyboard: DeviceImeGetResult["keyboard"];
  service: DeviceImeGetResult["service"];
  ime: DeviceImeGetResult["ime"];
  queries: {
    inputMethod: DriverCommandResult;
    defaultInputMethod: DriverCommandResult;
    enabledInputMethods: DriverCommandResult;
  };
};

export type DriverDeviceBrightnessResult = {
  serial: string;
  settings: DeviceBrightnessGetResult["settings"];
  display: DeviceBrightnessGetResult["display"];
  queries: {
    brightness: DriverCommandResult;
    mode: DriverCommandResult;
    autoAdjustment: DriverCommandResult;
    brightnessFloat: DriverCommandResult;
    display: DriverCommandResult;
  };
};

export type DriverDeviceAnimationsResult = {
  serial: string;
  settings: DeviceAnimationsGetResult["settings"];
  queries: {
    window: DriverCommandResult;
    transition: DriverCommandResult;
    animator: DriverCommandResult;
  };
};

export type DriverDeviceAnimationsSetRequest = {
  scale: DeviceAnimationScaleValue;
  deviceSerial: string;
  timeoutMs: number;
};

export type DriverDeviceAnimationsSetResult = {
  serial: string;
  scale: DeviceAnimationScaleValue;
  commands: {
    window: DriverCommandResult;
    transition: DriverCommandResult;
    animator: DriverCommandResult;
  };
};

export type DriverDeviceAccessibilityResult = {
  serial: string;
  settings: DeviceAccessibilityGetResult["settings"];
  queries: {
    accessibilityEnabled: DriverCommandResult;
    touchExplorationEnabled: DriverCommandResult;
    enabledAccessibilityServices: DriverCommandResult;
  };
};

export type DriverDeviceOrientationResult = {
  serial: string;
  windowSize: DeviceOrientationResult["window_size"];
  orientation: DeviceOrientationResult["orientation"];
  rotationDegrees: DeviceOrientationResult["rotation_degrees"];
  autoRotate: DeviceOrientationResult["auto_rotate"];
  queries: {
    windowSize: DriverCommandResult;
    rotation: DriverCommandResult;
    autoRotate: DriverCommandResult;
  };
};

export type DriverUserRotationPolicy = {
  mode: "free" | "lock";
  rotationDegrees: DeviceOrientationSetResult["after"]["user_rotation"]["rotation_degrees"];
  exitCode: number | null;
  durationMs: number;
};

export type DriverSetUserRotationRequest = {
  mode: "free" | "lock";
  rotationDegrees?: NonNullable<DeviceOrientationSetResult["set"]["rotation_degrees"]> | undefined;
  deviceSerial: string;
  timeoutMs: number;
};

export type AndroidDriver = {
  listDevices(options: DeviceListOptions): Promise<DriverDevice[]>;
  listUsers(options: DeviceDetailsOptions): Promise<DriverDeviceUsersResult>;
  getCurrentUser(options: DeviceDetailsOptions): Promise<DriverDeviceCurrentUserResult>;
  getOrientation(options: DeviceDetailsOptions): Promise<DriverDeviceOrientationResult>;
  getUserRotationPolicy(options: DeviceDetailsOptions): Promise<DriverUserRotationPolicy>;
  setUserRotation(request: DriverSetUserRotationRequest): Promise<DriverCommandResult>;
  getDeviceDetails(options: DeviceDetailsOptions): Promise<DeviceDetailsResult>;
  getDeviceScreenState(options: DeviceDetailsOptions): Promise<DriverDeviceScreenResult>;
  getDeviceNetworkState(options: DeviceDetailsOptions): Promise<DriverDeviceNetworkResult>;
  getDeviceStorageState(options: DeviceDetailsOptions): Promise<DriverDeviceStorageResult>;
  getDeviceBatteryState(options: DeviceDetailsOptions): Promise<DriverDeviceBatteryResult>;
  getDeviceTimeState(options: DeviceDetailsOptions): Promise<DriverDeviceTimeResult>;
  getDeviceLocaleState(options: DeviceDetailsOptions): Promise<DriverDeviceLocaleResult>;
  getDeviceImeState(options: DeviceDetailsOptions): Promise<DriverDeviceImeResult>;
  getDeviceBrightnessState(options: DeviceDetailsOptions): Promise<DriverDeviceBrightnessResult>;
  getDeviceAnimationsState(options: DeviceDetailsOptions): Promise<DriverDeviceAnimationsResult>;
  setDeviceAnimationScales(request: DriverDeviceAnimationsSetRequest): Promise<DriverDeviceAnimationsSetResult>;
  getDeviceAccessibilityState(options: DeviceDetailsOptions): Promise<DriverDeviceAccessibilityResult>;
  getDeviceReadyState(options: DeviceDetailsOptions): Promise<DeviceReadyState>;
  wakeDevice(options: DeviceDetailsOptions): Promise<DriverCommandResult>;
  dismissKeyguard(options: DeviceDetailsOptions): Promise<DriverDismissKeyguardResult>;
  controlStatusBar(command: DeviceStatusBarCommand, options: DeviceDetailsOptions): Promise<DriverStatusBarResult>;
  getStatusBarIcons(options: DeviceDetailsOptions): Promise<DriverStatusBarIconsResult>;
  getVolume(request: DriverVolumeGetRequest): Promise<DriverVolumeGetResult>;
  getRinger(options: DeviceDetailsOptions): Promise<DriverRingerGetResult>;
  getNotifications(options: DeviceDetailsOptions): Promise<DriverDeviceNotificationsResult>;
  observe(options: ObserveOptions): Promise<Snapshot>;
  tap(point: Point, options: DriverTapOptions): Promise<void>;
  doubleTap(point: Point, intervalMs: number, options: DriverDoubleTapOptions): Promise<void>;
  keyEvent(keyCode: string, options: DriverKeyOptions): Promise<void>;
  textInput(encodedText: string, options: DriverTextInputOptions): Promise<void>;
  clearText(maxChars: number, options: DriverTextClearOptions): Promise<void>;
  swipe(start: Point, end: Point, durationMs: number, options: DriverSwipeOptions): Promise<void>;
  drag(start: Point, end: Point, durationMs: number, gesture: DragGesture, options: DriverDragOptions): Promise<void>;
  screenshot(options: DriverScreenshotOptions): Promise<DriverScreenshotResult>;
  recordScreen(request: DriverScreenrecordRequest): Promise<DriverScreenrecordResult>;
  pushFile(request: DriverFileTransferRequest): Promise<DriverFileTransferResult>;
  pullFile(request: DriverFileTransferRequest): Promise<DriverFileTransferResult>;
  statFile(request: DriverFileStatRequest): Promise<DriverFileStatResult>;
  hashFile(request: DriverFileHashRequest): Promise<DriverFileHashResult>;
  removeFile(request: DriverFileRemoveRequest): Promise<DriverFileRemoveResult>;
  makeDirectory(request: DriverFileMkdirRequest): Promise<DriverFileMkdirResult>;
  moveFile(request: DriverFileMoveRequest): Promise<DriverFileMoveResult>;
  copyFile(request: DriverFileCopyRequest): Promise<DriverFileCopyResult>;
  listDirectory(request: DriverFileListRequest): Promise<DriverFileListResult>;
  currentApp(options: ObserveOptions): Promise<AppCurrentResult>;
  listPackages(request: DriverAppListRequest): Promise<DriverAppListResult>;
  getAppActivities(request: DriverAppActivitiesRequest): Promise<DriverAppActivitiesResult>;
  getAppPackageInfo(request: DriverAppPackageInfoRequest): Promise<DriverAppPackageInfoResult>;
  getAppLinks(request: DriverAppLinksRequest): Promise<DriverAppLinksResult>;
  getAppOps(request: DriverAppOpsGetRequest): Promise<DriverAppOpsGetResult>;
  getPackagePids(request: DriverPackagePidsRequest): Promise<DriverPackagePidsResult>;
  getPackagePidSnapshot(request: DriverPackagePidSnapshotRequest): Promise<DriverPackagePidSnapshotResult>;
  getAppMemorySnapshot(request: DriverAppMemoryRequest): Promise<DriverAppMemoryResult>;
  getAppGraphicsSnapshot(request: DriverAppGraphicsRequest): Promise<DriverAppGraphicsResult>;
  dumpLogcat(request: DriverLogcatDumpRequest): Promise<DriverLogcatDumpResult>;
  clearPackageData(request: DriverAppClearDataRequest): Promise<DriverAppClearDataResult>;
  installApk(request: DriverAppInstallRequest): Promise<DriverAppInstallResult>;
  inspectPackage(request: DriverAppInspectRequest): Promise<DriverAppInspectResult>;
  setAppPermission(request: DriverAppPermissionRequest): Promise<DriverAppPermissionResult>;
  inspectAppPermission(request: DriverAppPermissionInspectRequest): Promise<DriverAppPermissionInspectResult>;
  uninstallPackage(request: DriverAppUninstallRequest): Promise<DriverAppUninstallResult>;
  startActivity(request: DriverAppStartRequest): Promise<DriverAppStartResult>;
  launchPackage(request: DriverAppLaunchRequest): Promise<DriverAppLaunchResult>;
  openUrl(request: DriverOpenUrlRequest): Promise<DriverOpenUrlResult>;
  resolveUrl(request: DriverResolveUrlRequest): Promise<DriverResolveUrlResult>;
  stopPackage(request: DriverAppStopRequest): Promise<DriverAppStopResult>;
};

export type ScreenshotCapture = Omit<ScreenshotResult, "overwritten"> & {
  png: Buffer;
};

export type ScreenrecordCapture = Omit<
  ScreenrecordResult,
  "output_path" | "file_name" | "bytes" | "sha256" | "overwritten"
>;
