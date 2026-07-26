import {
  AutophoneError,
  DeviceAccessibilityGetRequestSchema,
  DeviceAnimationsGetRequestSchema,
  DeviceAnimationsSetRequestSchema,
  DeviceBatteryGetRequestSchema,
  DeviceBrightnessGetRequestSchema,
  DeviceCurrentUserRequestSchema,
  DeviceDetailsRequestSchema,
  DeviceEnsureReadyRequestSchema,
  DeviceImeGetRequestSchema,
  DeviceListRequestSchema,
  DeviceLocaleGetRequestSchema,
  DeviceNetworkGetRequestSchema,
  DeviceNotificationsRequestSchema,
  DeviceOrientationRequestSchema,
  DeviceOrientationSetRequestSchema,
  DeviceRingerGetRequestSchema,
  DeviceScreenGetRequestSchema,
  DeviceStatusBarIconsRequestSchema,
  DeviceStatusBarRequestSchema,
  DeviceStorageGetRequestSchema,
  DeviceTimeGetRequestSchema,
  DeviceUsersRequestSchema,
  DeviceVolumeGetRequestSchema,
  createSuccessResponse,
  type DeviceAnimationScaleValue,
  type DeviceDetailsRequest,
  type DeviceDetailsResult,
  type DeviceListRequest,
  type DeviceListResult,
  type DeviceVolumeStream
} from "../../contracts/index.js";
import {
  controlStatusBar,
  currentDeviceUser,
  deviceDetails,
  deviceOrientation,
  ensureDeviceReady,
  getDeviceAccessibility,
  getDeviceAnimations,
  getDeviceBattery,
  getDeviceBrightness,
  getDeviceIme,
  getDeviceLocale,
  getDeviceNetwork,
  getDeviceNotifications,
  getDeviceRinger,
  getDeviceScreen,
  getDeviceStorage,
  getDeviceTime,
  getDeviceVolume,
  listDeviceUsers,
  listDevices,
  setDeviceAnimations,
  setDeviceOrientation,
  statusBarIcons
} from "../../core/index.js";
import { registerCliCommand, type CliCommandDescriptor } from "../command-descriptor.js";
import type { CliRuntimeContext } from "../command-context.js";import { registerDeviceImeMutationCommands } from "./device-ime.js";
import { writeJson } from "../json-writer.js";
import {
  parseDeviceAnimationScaleOption,
  parseDeviceVolumeStream,
  parseNonNegativeInt,
  parseOrientationSetMode,
  parsePositiveInt,
  parseRotationDegreesOption
} from "../options.js";

export const deviceListDescriptor: CliCommandDescriptor<DeviceListRequest, DeviceListResult> = {
  name: "device.list",
  argvPath: ["device", "list"],
  description: "list all adb-connected devices without selecting a target",
  requestSchema: DeviceListRequestSchema,
  buildRequest: (globalOptions) => ({
    timeout_ms: globalOptions.timeout
  }),
  run: listDevices,
  buildSuccessMetadata: (_result, request, globalOptions) => ({
    warnings: globalOptions.serial !== undefined ? ["device list ignores --serial and returns all adb devices"] : [],
    trace: {
      timeout_ms: request.timeout_ms,
      serial_filter: globalOptions.serial === undefined ? "absent" : "ignored"
    }
  })
};

export const deviceInfoDescriptor: CliCommandDescriptor<DeviceDetailsRequest, DeviceDetailsResult> = {
  name: "device.info",
  argvPath: ["device", "info"],
  description: "read target Android device environment facts",
  requestSchema: DeviceDetailsRequestSchema,
  buildRequest: (globalOptions) => ({
    timeout_ms: globalOptions.timeout,
    device_serial: globalOptions.serial
  }),
  run: deviceDetails,
  buildSuccessMetadata: (result, request) => ({
    device: { serial: result.device_serial },
    trace: {
      timeout_ms: request.timeout_ms,
      sources: ["getprop", "wm size", "wm density", "dumpsys battery"]
    }
  })
};

export const deviceCommandDescriptors = [deviceListDescriptor, deviceInfoDescriptor] as const;

export function registerDeviceCommands(context: CliRuntimeContext): void {
  const { argv, program, io, requestId, startedAt, driverFactory, runDescriptor } = context;
  let commandName = "unknown";
  const setCurrentCommandName = (name: string): string => {
    context.setCommandName(name);
    return name;
  };

  const device = program.command("device").description("inspect adb device connections");

  registerCliCommand(device, "device", deviceListDescriptor, runDescriptor);
  registerCliCommand(device, "device", deviceInfoDescriptor, runDescriptor);

  const deviceScreenCommand = device.command("screen").description("read display power and keyguard state");

  deviceScreenCommand
    .command("get")
    .description("probe display power and keyguard state without waking the device")
    .action(async () => {
      commandName = setCurrentCommandName("device.screen_get");
      const globalOptions = program.opts<{ adb?: string; serial?: string; timeout: number }>();
      const request = DeviceScreenGetRequestSchema.parse({
        timeout_ms: globalOptions.timeout,
        device_serial: globalOptions.serial
      });
      const driver = driverFactory({ adbPath: globalOptions.adb });
      const result = await getDeviceScreen(driver, request);
      writeJson(
        io,
        createSuccessResponse({
          command: commandName,
          requestId,
          startedAt,
          result,
          device: { serial: result.device_serial },
          trace: {
            timeout_ms: request.timeout_ms,
            sources: ["dumpsys power", "dumpsys window"]
          }
        })
      );
    });

  const deviceNetworkCommand = device.command("network").description("read Android connectivity state");

  deviceNetworkCommand
    .command("get")
    .description("probe Android connectivity state without exposing network identifiers")
    .action(async () => {
      commandName = setCurrentCommandName("device.network_get");
      const globalOptions = program.opts<{ adb?: string; serial?: string; timeout: number }>();
      const request = DeviceNetworkGetRequestSchema.parse({
        timeout_ms: globalOptions.timeout,
        device_serial: globalOptions.serial
      });
      const driver = driverFactory({ adbPath: globalOptions.adb });
      const result = await getDeviceNetwork(driver, request);
      writeJson(
        io,
        createSuccessResponse({
          command: commandName,
          requestId,
          startedAt,
          result,
          device: { serial: result.device_serial },
          warnings: [
            "device network get reports Android connectivity state only; it does not prove any remote host is reachable"
          ],
          trace: {
            timeout_ms: request.timeout_ms,
            sources: [
              "settings get global airplane_mode_on",
              "settings get global wifi_on",
              "settings get global mobile_data",
              "dumpsys connectivity"
            ]
          }
        })
      );
    });

  device
    .command("storage")
    .description("read Android filesystem storage capacity")
    .action(async () => {
      commandName = setCurrentCommandName("device.storage");
      const globalOptions = program.opts<{ adb?: string; serial?: string; timeout: number }>();
      const request = DeviceStorageGetRequestSchema.parse({
        timeout_ms: globalOptions.timeout,
        device_serial: globalOptions.serial
      });
      const driver = driverFactory({ adbPath: globalOptions.adb });
      const result = await getDeviceStorage(driver, request);
      writeJson(
        io,
        createSuccessResponse({
          command: commandName,
          requestId,
          startedAt,
          result,
          device: { serial: result.device_serial },
          warnings: [
            "device storage reports a point-in-time filesystem capacity snapshot; it does not prove app quota or write permission",
            "storage roles may refer to the same underlying volume; do not sum entries as total device capacity"
          ],
          trace: {
            timeout_ms: request.timeout_ms,
            method: "statfs_paths",
            ok_count: result.ok_count,
            unavailable_count: result.unavailable_count
          }
        })
      );
    });

  const deviceBatteryCommand = device.command("battery").description("read Android battery service state");

  deviceBatteryCommand
    .command("get")
    .description("read Android battery telemetry snapshot")
    .action(async () => {
      commandName = setCurrentCommandName("device.battery_get");
      const globalOptions = program.opts<{ adb?: string; serial?: string; timeout: number }>();
      const request = DeviceBatteryGetRequestSchema.parse({
        timeout_ms: globalOptions.timeout,
        device_serial: globalOptions.serial
      });
      const driver = driverFactory({ adbPath: globalOptions.adb });
      const result = await getDeviceBattery(driver, request);
      writeJson(
        io,
        createSuccessResponse({
          command: commandName,
          requestId,
          startedAt,
          result,
          device: { serial: result.device_serial },
          warnings: [
            "device battery get reports a point-in-time BatteryService snapshot; it does not control charging or calibrate battery health"
          ],
          trace: {
            timeout_ms: request.timeout_ms,
            method: "dumpsys battery",
            level_percent: result.battery.level_percent,
            present: result.battery.present
          }
        })
      );
    });

  const deviceTimeCommand = device.command("time").description("read Android wall-clock and timezone state");

  deviceTimeCommand
    .command("get")
    .description("read Android time, timezone, and automatic time settings")
    .action(async () => {
      commandName = setCurrentCommandName("device.time_get");
      const globalOptions = program.opts<{ adb?: string; serial?: string; timeout: number }>();
      const request = DeviceTimeGetRequestSchema.parse({
        timeout_ms: globalOptions.timeout,
        device_serial: globalOptions.serial
      });
      const driver = driverFactory({ adbPath: globalOptions.adb });
      const result = await getDeviceTime(driver, request);
      writeJson(
        io,
        createSuccessResponse({
          command: commandName,
          requestId,
          startedAt,
          result,
          device: { serial: result.device_serial },
          warnings: [
            "device time get reports a point-in-time Android clock snapshot; it does not prove NTP sync, alarm delivery, or scheduler behavior"
          ],
          trace: {
            timeout_ms: request.timeout_ms,
            unix_epoch_seconds: result.time.unix_epoch_seconds,
            timezone_source: result.timezone.source,
            auto_time: result.settings.auto_time,
            auto_time_zone: result.settings.auto_time_zone
          }
        })
      );
    });

  const deviceLocaleCommand = device.command("locale").description("read Android locale settings");

  deviceLocaleCommand
    .command("get")
    .description("read Android system and product locale sources")
    .action(async () => {
      commandName = setCurrentCommandName("device.locale_get");
      const globalOptions = program.opts<{ adb?: string; serial?: string; timeout: number }>();
      const request = DeviceLocaleGetRequestSchema.parse({
        timeout_ms: globalOptions.timeout,
        device_serial: globalOptions.serial
      });
      const driver = driverFactory({ adbPath: globalOptions.adb });
      const result = await getDeviceLocale(driver, request);
      writeJson(
        io,
        createSuccessResponse({
          command: commandName,
          requestId,
          startedAt,
          result,
          device: { serial: result.device_serial },
          warnings: [
            "device locale get reports Android system and product locale sources only; it does not prove per-app language, rendered translation, or Locale.getDefault() inside an app"
          ],
          trace: {
            timeout_ms: request.timeout_ms,
            selected_source: result.selected_source,
            locales_count: result.locales_count,
            invalid_source_count: result.invalid_sources.length
          }
        })
      );
    });

  const deviceImeCommand = device.command("ime").description("read or switch Android input method state");registerDeviceImeMutationCommands(context, deviceImeCommand);

  deviceImeCommand
    .command("get")
    .description("probe soft keyboard and input method state without reading text")
    .action(async () => {
      commandName = setCurrentCommandName("device.ime_get");
      const globalOptions = program.opts<{ adb?: string; serial?: string; timeout: number }>();
      const request = DeviceImeGetRequestSchema.parse({
        timeout_ms: globalOptions.timeout,
        device_serial: globalOptions.serial
      });
      const driver = driverFactory({ adbPath: globalOptions.adb });
      const result = await getDeviceIme(driver, request);
      writeJson(
        io,
        createSuccessResponse({
          command: commandName,
          requestId,
          startedAt,
          result,
          device: { serial: result.device_serial },
          warnings: [
            "device ime get reports InputMethodManagerService state only; it does not prove keyboard geometry, focused-field text, or text entry readiness"
          ],
          trace: {
            timeout_ms: request.timeout_ms,
            sources: [
              "dumpsys input_method",
              "settings get secure default_input_method",
              "settings get secure enabled_input_methods"
            ]
          }
        })
      );
    });

  const deviceBrightnessCommand = device.command("brightness").description("read Android display brightness state");

  deviceBrightnessCommand
    .command("get")
    .description("probe display brightness settings without changing them")
    .action(async () => {
      commandName = setCurrentCommandName("device.brightness_get");
      const globalOptions = program.opts<{ adb?: string; serial?: string; timeout: number }>();
      const request = DeviceBrightnessGetRequestSchema.parse({
        timeout_ms: globalOptions.timeout,
        device_serial: globalOptions.serial
      });
      const driver = driverFactory({ adbPath: globalOptions.adb });
      const result = await getDeviceBrightness(driver, request);
      writeJson(
        io,
        createSuccessResponse({
          command: commandName,
          requestId,
          startedAt,
          result,
          device: { serial: result.device_serial },
          warnings: [
            "device brightness get reports Android brightness settings and display service state only; it does not prove visual luminance, screenshot exposure, or ambient light"
          ],
          trace: {
            timeout_ms: request.timeout_ms,
            sources: [
              "settings get system screen_brightness",
              "settings get system screen_brightness_mode",
              "settings get system screen_auto_brightness_adj",
              "settings get system screen_brightness_float",
              "dumpsys display"
            ]
          }
        })
      );
    });

  const deviceAnimationsCommand = device.command("animations").description("read or set Android animation scale settings");

  deviceAnimationsCommand
    .command("get")
    .description("read global Android window, transition, and animator animation scales")
    .action(async () => {
      commandName = setCurrentCommandName("device.animations_get");
      const globalOptions = program.opts<{ adb?: string; serial?: string; timeout: number }>();
      const request = DeviceAnimationsGetRequestSchema.parse({
        timeout_ms: globalOptions.timeout,
        device_serial: globalOptions.serial
      });
      const driver = driverFactory({ adbPath: globalOptions.adb });
      const result = await getDeviceAnimations(driver, request);
      writeJson(
        io,
        createSuccessResponse({
          command: commandName,
          requestId,
          startedAt,
          result,
          device: { serial: result.device_serial },
          warnings: [
            "device animations get reports global Android animation scale settings, not proof of actual app animation timing or rendered motion"
          ],
          trace: {
            timeout_ms: request.timeout_ms,
            sources: [
              "settings get global window_animation_scale",
              "settings get global transition_animation_scale",
              "settings get global animator_duration_scale"
            ]
          }
        })
      );
    });

  deviceAnimationsCommand
    .command("set")
    .description("set global Android window, transition, and animator animation scales")
    .requiredOption("--scale <scale>", "animation scale: 0, 0.5, or 1", parseDeviceAnimationScaleOption)
    .action(async (localOptions: { scale: DeviceAnimationScaleValue }) => {
      commandName = setCurrentCommandName("device.animations_set");
      const globalOptions = program.opts<{ adb?: string; serial?: string; timeout: number }>();
      if (globalOptions.serial === undefined) {
        throw new AutophoneError({
          code: "INVALID_REQUEST",
          message: "device animations set requires explicit --serial",
          retriable: false
        });
      }
      const request = DeviceAnimationsSetRequestSchema.parse({
        scale: localOptions.scale,
        timeout_ms: globalOptions.timeout,
        device_serial: globalOptions.serial
      });
      const driver = driverFactory({ adbPath: globalOptions.adb });
      const result = await setDeviceAnimations(driver, request);
      writeJson(
        io,
        createSuccessResponse({
          command: commandName,
          requestId,
          startedAt,
          result,
          device: { serial: result.device_serial },
          warnings: [
            "device animations set mutates device-wide global animation scale settings and does not roll back automatically",
            "if one of the three settings writes fails, earlier settings may already have changed",
            "readback verification confirms stored settings values only; it does not prove actual app animation timing or rendered motion"
          ],
          trace: {
            timeout_ms: request.timeout_ms,
            method: "settings put global",
            scale: result.requested.scale,
            verify_policy: result.verify.policy
          }
        })
      );
    });

  const deviceAccessibilityCommand = device.command("accessibility").description("read Android accessibility settings");

  deviceAccessibilityCommand
    .command("get")
    .description("read secure Android accessibility and touch exploration settings")
    .action(async () => {
      commandName = setCurrentCommandName("device.accessibility_get");
      const globalOptions = program.opts<{ adb?: string; serial?: string; timeout: number }>();
      const request = DeviceAccessibilityGetRequestSchema.parse({
        timeout_ms: globalOptions.timeout,
        device_serial: globalOptions.serial
      });
      const driver = driverFactory({ adbPath: globalOptions.adb });
      const result = await getDeviceAccessibility(driver, request);
      writeJson(
        io,
        createSuccessResponse({
          command: commandName,
          requestId,
          startedAt,
          result,
          device: { serial: result.device_serial },
          warnings: [
            "device accessibility get reports stored secure accessibility settings, not proof of live accessibility service health or accessibility node state"
          ],
          trace: {
            timeout_ms: request.timeout_ms,
            sources: [
              "settings get secure accessibility_enabled",
              "settings get secure touch_exploration_enabled",
              "settings get secure enabled_accessibility_services"
            ]
          }
        })
      );
    });

  device
    .command("users")
    .description("list Android users known to the target device")
    .action(async () => {
      commandName = setCurrentCommandName("device.users");
      const globalOptions = program.opts<{ adb?: string; serial?: string; timeout: number }>();
      const request = DeviceUsersRequestSchema.parse({
        timeout_ms: globalOptions.timeout,
        device_serial: globalOptions.serial
      });
      const driver = driverFactory({ adbPath: globalOptions.adb });
      const result = await listDeviceUsers(driver, request);
      writeJson(
        io,
        createSuccessResponse({
          command: commandName,
          requestId,
          startedAt,
          result,
          device: { serial: result.device_serial },
          warnings: ["device users parses standard non-verbose pm list users output; it does not decode user flags"],
          trace: {
            timeout_ms: request.timeout_ms,
            package_manager: "pm",
            query: "list_users"
          }
        })
      );
    });

  device
    .command("current-user")
    .description("read the current foreground Android user id reported by Activity Manager")
    .action(async () => {
      commandName = setCurrentCommandName("device.current_user");
      const globalOptions = program.opts<{ adb?: string; serial?: string; timeout: number }>();
      const request = DeviceCurrentUserRequestSchema.parse({
        timeout_ms: globalOptions.timeout,
        device_serial: globalOptions.serial
      });
      const driver = driverFactory({ adbPath: globalOptions.adb });
      const result = await currentDeviceUser(driver, request);
      writeJson(
        io,
        createSuccessResponse({
          command: commandName,
          requestId,
          startedAt,
          result,
          device: { serial: result.device_serial },
          warnings: [
            "device current-user reports Activity Manager's current user id only; it does not infer profile visibility"
          ],
          trace: {
            timeout_ms: request.timeout_ms,
            source: "cmd activity get-current-user"
          }
        })
      );
    });

  const deviceOrientationCommand = device.command("orientation").description("inspect target display orientation");

  deviceOrientationCommand
    .command("get")
    .description("read target display orientation without dumping the UI hierarchy")
    .action(async () => {
      commandName = setCurrentCommandName("device.orientation_get");
      const globalOptions = program.opts<{ adb?: string; serial?: string; timeout: number }>();
      const request = DeviceOrientationRequestSchema.parse({
        timeout_ms: globalOptions.timeout,
        device_serial: globalOptions.serial
      });
      const driver = driverFactory({ adbPath: globalOptions.adb });
      const result = await deviceOrientation(driver, request);
      writeJson(
        io,
        createSuccessResponse({
          command: commandName,
          requestId,
          startedAt,
          result,
          device: { serial: result.device_serial },
          warnings:
            result.window_size === null
              ? ["device orientation fell back to rotation-only orientation inference because wm size output was unparseable"]
              : [],
          trace: {
            timeout_ms: request.timeout_ms,
            sources: ["wm size", "dumpsys window", "settings get system accelerometer_rotation"]
          }
        })
      );
    });

  deviceOrientationCommand
    .command("set")
    .description("set target device user-rotation policy")
    .requiredOption("--mode <mode>", "orientation policy mode: auto or lock")
    .option("--rotation <degrees>", "locked rotation degrees: 0, 90, 180, or 270")
    .action(async (localOptions) => {
      commandName = setCurrentCommandName("device.orientation_set");
      const globalOptions = program.opts<{ adb?: string; serial?: string; timeout: number }>();
      if (globalOptions.serial === undefined) {
        throw new AutophoneError({
          code: "INVALID_REQUEST",
          message: "device orientation set requires explicit --serial",
          retriable: false
        });
      }
      const request = DeviceOrientationSetRequestSchema.parse({
        mode: parseOrientationSetMode(localOptions.mode),
        rotation_degrees:
          localOptions.rotation === undefined ? undefined : parseRotationDegreesOption(localOptions.rotation),
        timeout_ms: globalOptions.timeout,
        device_serial: globalOptions.serial
      });
      const driver = driverFactory({ adbPath: globalOptions.adb });
      const result = await setDeviceOrientation(driver, request);
      writeJson(
        io,
        createSuccessResponse({
          command: commandName,
          requestId,
          startedAt,
          result,
          device: { serial: result.device_serial },
          warnings: [
            "device orientation set mutates device-wide user rotation policy and does not roll back automatically",
            "user rotation policy can be overridden by foreground app orientation preferences"
          ],
          trace: {
            timeout_ms: request.timeout_ms,
            method: "wm user-rotation",
            verify_policy: result.verify.policy
          }
        })
      );
    });

  const deviceStatusBarCommand = device.command("statusbar").description("control the target SystemUI status bar panel");

  deviceStatusBarCommand
    .command("icons")
    .description("list ordered SystemUI status bar icon slots")
    .action(async () => {
      commandName = setCurrentCommandName("device.statusbar_icons");
      const globalOptions = program.opts<{ adb?: string; serial?: string; timeout: number }>();
      const request = DeviceStatusBarIconsRequestSchema.parse({
        timeout_ms: globalOptions.timeout,
        device_serial: globalOptions.serial
      });
      const driver = driverFactory({ adbPath: globalOptions.adb });
      const result = await statusBarIcons(driver, request);
      writeJson(
        io,
        createSuccessResponse({
          command: commandName,
          requestId,
          startedAt,
          result,
          device: { serial: result.device_serial },
          warnings: ["statusbar icons are SystemUI icon slots, not proof that each icon is currently visible or active"],
          trace: { timeout_ms: request.timeout_ms, method: "cmd statusbar get-status-icons" }
        })
      );
    });

  deviceStatusBarCommand
    .command("expand-notifications")
    .description("open the notifications panel")
    .action(async () => {
      commandName = setCurrentCommandName("device.statusbar");
      const globalOptions = program.opts<{ adb?: string; serial?: string; timeout: number }>();
      const request = DeviceStatusBarRequestSchema.parse({
        action: "expand_notifications",
        timeout_ms: globalOptions.timeout,
        device_serial: globalOptions.serial
      });
      const driver = driverFactory({ adbPath: globalOptions.adb });
      const result = await controlStatusBar(driver, request);
      writeJson(
        io,
        createSuccessResponse({
          command: commandName,
          requestId,
          startedAt,
          result,
          device: { serial: result.device_serial },
          warnings: ["statusbar command success does not independently prove the requested panel is visible"],
          trace: { timeout_ms: request.timeout_ms, method: "cmd statusbar", action: result.action }
        })
      );
    });

  deviceStatusBarCommand
    .command("expand-settings")
    .description("open the notifications panel and expand quick settings if present")
    .action(async () => {
      commandName = setCurrentCommandName("device.statusbar");
      const globalOptions = program.opts<{ adb?: string; serial?: string; timeout: number }>();
      const request = DeviceStatusBarRequestSchema.parse({
        action: "expand_settings",
        timeout_ms: globalOptions.timeout,
        device_serial: globalOptions.serial
      });
      const driver = driverFactory({ adbPath: globalOptions.adb });
      const result = await controlStatusBar(driver, request);
      writeJson(
        io,
        createSuccessResponse({
          command: commandName,
          requestId,
          startedAt,
          result,
          device: { serial: result.device_serial },
          warnings: ["statusbar command success does not independently prove the requested panel is visible"],
          trace: { timeout_ms: request.timeout_ms, method: "cmd statusbar", action: result.action }
        })
      );
    });

  deviceStatusBarCommand
    .command("collapse")
    .description("collapse notifications and quick settings panels")
    .action(async () => {
      commandName = setCurrentCommandName("device.statusbar");
      const globalOptions = program.opts<{ adb?: string; serial?: string; timeout: number }>();
      const request = DeviceStatusBarRequestSchema.parse({
        action: "collapse",
        timeout_ms: globalOptions.timeout,
        device_serial: globalOptions.serial
      });
      const driver = driverFactory({ adbPath: globalOptions.adb });
      const result = await controlStatusBar(driver, request);
      writeJson(
        io,
        createSuccessResponse({
          command: commandName,
          requestId,
          startedAt,
          result,
          device: { serial: result.device_serial },
          warnings: ["statusbar command success does not independently prove the requested panel is collapsed"],
          trace: { timeout_ms: request.timeout_ms, method: "cmd statusbar", action: result.action }
        })
      );
    });

  const deviceVolumeCommand = device.command("volume").description("read Android AudioManager stream volume state");

  deviceVolumeCommand
    .command("get")
    .description("read one AudioManager stream volume index")
    .option(
      "--stream <stream>",
      "stream: music, ring, alarm, notification, system, or voice-call",
      parseDeviceVolumeStream,
      "music"
    )
    .action(async (localOptions: { stream: DeviceVolumeStream }) => {
      commandName = setCurrentCommandName("device.volume_get");
      const globalOptions = program.opts<{ adb?: string; serial?: string; timeout: number }>();
      const request = DeviceVolumeGetRequestSchema.parse({
        stream: localOptions.stream,
        timeout_ms: globalOptions.timeout,
        device_serial: globalOptions.serial
      });
      const driver = driverFactory({ adbPath: globalOptions.adb });
      const result = await getDeviceVolume(driver, request);
      writeJson(
        io,
        createSuccessResponse({
          command: commandName,
          requestId,
          startedAt,
          result,
          device: { serial: result.device_serial },
          warnings: [
            "device volume get reports an AudioManager stream index, not perceived loudness, mute/DND state, audio route, or playback state",
            "ring and notification streams may be aliased by Android/OEM policy"
          ],
          trace: {
            timeout_ms: request.timeout_ms,
            method: "cmd media_session volume --get",
            stream: result.stream.name
          }
        })
      );
    });

  const deviceRingerCommand = device.command("ringer").description("read Android AudioService ringer and zen state");

  deviceRingerCommand
    .command("get")
    .description("read ringer mode, zen mode, and ringer-muted stream masks")
    .action(async () => {
      commandName = setCurrentCommandName("device.ringer_get");
      const globalOptions = program.opts<{ adb?: string; serial?: string; timeout: number }>();
      const request = DeviceRingerGetRequestSchema.parse({
        timeout_ms: globalOptions.timeout,
        device_serial: globalOptions.serial
      });
      const driver = driverFactory({ adbPath: globalOptions.adb });
      const result = await getDeviceRinger(driver, request);
      writeJson(
        io,
        createSuccessResponse({
          command: commandName,
          requestId,
          startedAt,
          result,
          device: { serial: result.device_serial },
          warnings: [
            "device ringer get reports AudioService ringer and zen state, not proof of actual audible output, notification delivery, audio route, playback state, or app behavior"
          ],
          trace: {
            timeout_ms: request.timeout_ms,
            method: "dumpsys audio"
          }
        })
      );
    });

  const deviceNotificationsCommand = device.command("notifications").description("read bounded Android notification state");

  deviceNotificationsCommand
    .command("get")
    .description("read posted notifications as a sensitive bounded snapshot")
    .option("--max-notifications <count>", "maximum notifications to return, 1-50", parsePositiveInt)
    .option("--max-field-chars <count>", "maximum characters per returned notification string field, 1-1024", parsePositiveInt)
    .option("--max-total-chars <count>", "maximum total returned notification content characters, 1-20000", parsePositiveInt)
    .action(async (localOptions) => {
      commandName = setCurrentCommandName("device.notifications_get");
      const globalOptions = program.opts<{ adb?: string; serial?: string; timeout: number }>();
      const request = DeviceNotificationsRequestSchema.parse({
        max_notifications: localOptions.maxNotifications,
        max_field_chars: localOptions.maxFieldChars,
        max_total_chars: localOptions.maxTotalChars,
        timeout_ms: globalOptions.timeout,
        device_serial: globalOptions.serial
      });
      const driver = driverFactory({ adbPath: globalOptions.adb });
      const result = await getDeviceNotifications(driver, request);
      writeJson(
        io,
        createSuccessResponse({
          command: commandName,
          requestId,
          startedAt,
          result,
          device: { serial: result.device_serial },
          warnings: [
            "device notifications get returns bounded but unredacted notification content; treat result fields as sensitive",
            "notification absence is only a point-in-time dumpsys observation, not proof that a notification was never posted",
            "dumpsys notification formats vary by Android/OEM build; unparseable dumps fail closed"
          ],
          trace: {
            timeout_ms: request.timeout_ms,
            method: "dumpsys notification --noredact",
            max_notifications: request.max_notifications,
            max_field_chars: request.max_field_chars,
            max_total_chars: request.max_total_chars,
            returned: result.counts.returned,
            total_seen: result.counts.total_seen,
            sensitive: true
          }
        })
      );
    });

  device
    .command("ensure-ready")
    .description("wake the target device and report whether keyguard blocks automation")
    .option("--no-dismiss-keyguard", "do not run wm dismiss-keyguard before verification")
    .action(async (localOptions) => {
      commandName = setCurrentCommandName("device.ensure_ready");
      const globalOptions = program.opts<{ adb?: string; serial?: string; timeout: number }>();
      const request = DeviceEnsureReadyRequestSchema.parse({
        dismiss_keyguard: localOptions.dismissKeyguard,
        timeout_ms: globalOptions.timeout,
        device_serial: globalOptions.serial
      });
      const driver = driverFactory({ adbPath: globalOptions.adb });
      const result = await ensureDeviceReady(driver, request);
      writeJson(
        io,
        createSuccessResponse({
          command: commandName,
          requestId,
          startedAt,
          result,
          device: { serial: result.device_serial },
          trace: {
            timeout_ms: request.timeout_ms,
            sources: ["dumpsys power", "dumpsys window", "input keyevent", "wm dismiss-keyguard"],
            dismiss_keyguard_requested: request.dismiss_keyguard
          }
        })
      );
    });


}
