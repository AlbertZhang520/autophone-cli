import { z } from "zod";
import { AndroidUserIdSchema, NullableStringSchema, SizeSchema } from "./common.js";
import { InstalledPackageNameSchema } from "./app.js";

export const DeviceListRequestSchema = z.object({
  timeout_ms: z.number().int().positive().max(120_000).default(10_000)
});
export type DeviceListRequest = z.infer<typeof DeviceListRequestSchema>;

export const DeviceInfoResultSchema = z.object({
  serial: z.string().min(1),
  state: z.string().min(1),
  online: z.boolean(),
  details: z.record(z.string(), z.string())
});
export type DeviceInfoResult = z.infer<typeof DeviceInfoResultSchema>;

export const DeviceListResultSchema = z.object({
  devices: z.array(DeviceInfoResultSchema),
  count: z.number().int().nonnegative(),
  online_count: z.number().int().nonnegative(),
  unauthorized_count: z.number().int().nonnegative(),
  offline_count: z.number().int().nonnegative(),
  other_count: z.number().int().nonnegative(),
  state_counts: z.record(z.string(), z.number().int().nonnegative()),
  default_serial: z.string().min(1).nullable()
});
export type DeviceListResult = z.infer<typeof DeviceListResultSchema>;

export const DeviceUsersRequestSchema = z.object({
  timeout_ms: z.number().int().positive().max(120_000).default(10_000),
  device_serial: z.string().min(1).optional()
});
export type DeviceUsersRequest = z.infer<typeof DeviceUsersRequestSchema>;

export const DeviceCurrentUserRequestSchema = z.object({
  timeout_ms: z.number().int().positive().max(120_000).default(10_000),
  device_serial: z.string().min(1).optional()
});
export type DeviceCurrentUserRequest = z.infer<typeof DeviceCurrentUserRequestSchema>;

const OrientationSchema = z.enum(["portrait", "landscape", "unknown"]);
const RotationDegreesSchema = z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]).nullable();
const NonNullRotationDegreesSchema = z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]);
const DeviceOrientationSetModeSchema = z.enum(["auto", "lock"]);
const UserRotationPolicySchema = z.object({
  mode: z.enum(["free", "lock"]),
  rotation_degrees: RotationDegreesSchema
});

export const DeviceOrientationRequestSchema = z.object({
  timeout_ms: z.number().int().positive().max(120_000).default(10_000),
  device_serial: z.string().min(1).optional()
});
export type DeviceOrientationRequest = z.infer<typeof DeviceOrientationRequestSchema>;

export const DeviceOrientationSetRequestSchema = z
  .object({
    mode: DeviceOrientationSetModeSchema,
    rotation_degrees: NonNullRotationDegreesSchema.optional(),
    timeout_ms: z.number().int().positive().max(120_000).default(10_000),
    device_serial: z.string().min(1, "device orientation set requires explicit --serial")
  })
  .refine((value) => value.mode !== "lock" || value.rotation_degrees !== undefined, {
    message: "rotation_degrees is required when mode is lock",
    path: ["rotation_degrees"]
  })
  .refine((value) => value.mode !== "auto" || value.rotation_degrees === undefined, {
    message: "rotation_degrees must be omitted when mode is auto",
    path: ["rotation_degrees"]
  });
export type DeviceOrientationSetRequest = z.infer<typeof DeviceOrientationSetRequestSchema>;

const DeviceOrientationQuerySourceSchema = z.object({
  exit_code: z.number().int().nullable(),
  command_duration_ms: z.number().int().nonnegative()
});

export const DeviceOrientationResultSchema = z.object({
  device_serial: z.string().min(1),
  window_size: SizeSchema.nullable(),
  orientation: OrientationSchema,
  rotation_degrees: RotationDegreesSchema,
  auto_rotate: z.boolean().nullable(),
  query: z.object({
    window_size: DeviceOrientationQuerySourceSchema.extend({
      method: z.literal("wm_size")
    }),
    rotation: DeviceOrientationQuerySourceSchema.extend({
      method: z.literal("dumpsys_window")
    }),
    auto_rotate: DeviceOrientationQuerySourceSchema.extend({
      method: z.literal("settings_get_accelerometer_rotation")
    })
  }),
  verify: z.object({
    policy: z.literal("actual_display_rotation_parse"),
    ok: z.literal(true),
    attempts: z.literal(1),
    reason: z.string()
  }),
  semantics: z.literal("actual_display_rotation_without_ui_dump")
});
export type DeviceOrientationResult = z.infer<typeof DeviceOrientationResultSchema>;

export const DeviceOrientationSetResultSchema = z.object({
  device_serial: z.string().min(1),
  requested: z.object({
    mode: DeviceOrientationSetModeSchema,
    rotation_degrees: RotationDegreesSchema
  }),
  before: z.object({
    orientation: DeviceOrientationResultSchema,
    user_rotation: UserRotationPolicySchema
  }),
  set: z.object({
    method: z.literal("wm_user_rotation"),
    mode: z.enum(["free", "lock"]),
    rotation_degrees: RotationDegreesSchema,
    exit_code: z.number().int().nullable(),
    command_duration_ms: z.number().int().nonnegative()
  }),
  after: z.object({
    orientation: DeviceOrientationResultSchema,
    user_rotation: UserRotationPolicySchema
  }),
  verify: z.object({
    policy: z.literal("user_rotation_policy_applied"),
    ok: z.literal(true),
    attempts: z.number().int().positive(),
    reason: z.string()
  }),
  semantics: z.literal("device_wide_user_rotation_policy")
});
export type DeviceOrientationSetResult = z.infer<typeof DeviceOrientationSetResultSchema>;

export const DeviceCurrentUserResultSchema = z.object({
  device_serial: z.string().min(1),
  current_user_id: AndroidUserIdSchema,
  query: z.object({
    method: z.literal("cmd_activity_get_current_user"),
    exit_code: z.number().int().nullable(),
    command_duration_ms: z.number().int().nonnegative()
  }),
  verify: z.object({
    policy: z.literal("activity_manager_current_user"),
    ok: z.literal(true),
    attempts: z.literal(1),
    reason: z.string()
  }),
  semantics: z.literal("activity_manager_reported_current_user_id")
});
export type DeviceCurrentUserResult = z.infer<typeof DeviceCurrentUserResultSchema>;

export const DeviceUserInfoSchema = z.object({
  id: AndroidUserIdSchema,
  name: z.string().max(256),
  flags_hex: z.string().regex(/^[0-9a-f]+$/i, "invalid Android user flags"),
  running: z.boolean()
});
export type DeviceUserInfo = z.infer<typeof DeviceUserInfoSchema>;

export const DeviceUsersResultSchema = z.object({
  device_serial: z.string().min(1),
  users: z.array(DeviceUserInfoSchema),
  count: z.number().int().nonnegative(),
  running_user_ids: z.array(AndroidUserIdSchema),
  query: z.object({
    method: z.literal("pm_list_users"),
    exit_code: z.number().int().nullable(),
    command_duration_ms: z.number().int().nonnegative()
  }),
  verify: z.object({
    policy: z.literal("pm_list_users_parse"),
    ok: z.literal(true),
    attempts: z.literal(1),
    reason: z.string()
  }),
  semantics: z.literal("standard_pm_list_users_non_verbose")
});
export type DeviceUsersResult = z.infer<typeof DeviceUsersResultSchema>;

export const DeviceStatusBarActionSchema = z.enum(["expand_notifications", "expand_settings", "collapse"]);
export type DeviceStatusBarAction = z.infer<typeof DeviceStatusBarActionSchema>;

export const DeviceStatusBarCommandSchema = z.enum(["expand-notifications", "expand-settings", "collapse"]);
export type DeviceStatusBarCommand = z.infer<typeof DeviceStatusBarCommandSchema>;

export const DeviceStatusBarRequestSchema = z.object({
  action: DeviceStatusBarActionSchema,
  timeout_ms: z.number().int().positive().max(120_000).default(10_000),
  device_serial: z.string().min(1).optional()
});
export type DeviceStatusBarRequest = z.infer<typeof DeviceStatusBarRequestSchema>;

export const DeviceStatusBarResultSchema = z.object({
  device_serial: z.string().min(1),
  action: DeviceStatusBarActionSchema,
  statusbar: z.object({
    method: z.literal("cmd_statusbar"),
    command: DeviceStatusBarCommandSchema,
    exit_code: z.number().int().nullable(),
    command_duration_ms: z.number().int().nonnegative()
  }),
  verify: z.object({
    policy: z.literal("cmd_statusbar_clean_exit"),
    ok: z.literal(true),
    attempts: z.literal(1),
    reason: z.string()
  }),
  semantics: z.literal("systemui_statusbar_panel_command")
});
export type DeviceStatusBarResult = z.infer<typeof DeviceStatusBarResultSchema>;

const StatusBarIconSlotSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9_.-]+$/, "invalid status bar icon slot");

export const DeviceStatusBarIconsRequestSchema = z.object({
  timeout_ms: z.number().int().positive().max(120_000).default(10_000),
  device_serial: z.string().min(1).optional()
});
export type DeviceStatusBarIconsRequest = z.infer<typeof DeviceStatusBarIconsRequestSchema>;

export const DeviceStatusBarIconsResultSchema = z.object({
  device_serial: z.string().min(1),
  icons: z.array(StatusBarIconSlotSchema),
  count: z.number().int().nonnegative(),
  query: z.object({
    method: z.literal("cmd_statusbar_get_status_icons"),
    exit_code: z.number().int().nullable(),
    command_duration_ms: z.number().int().nonnegative()
  }),
  verify: z.object({
    policy: z.literal("cmd_statusbar_icons_parse"),
    ok: z.literal(true),
    attempts: z.literal(1),
    reason: z.string()
  }),
  semantics: z.literal("systemui_statusbar_icon_slots")
});
export type DeviceStatusBarIconsResult = z.infer<typeof DeviceStatusBarIconsResultSchema>;

export const DeviceVolumeStreamSchema = z.enum(["voice_call", "system", "ring", "music", "alarm", "notification"]);
export type DeviceVolumeStream = z.infer<typeof DeviceVolumeStreamSchema>;

export const DeviceVolumeGetRequestSchema = z.object({
  stream: DeviceVolumeStreamSchema.default("music"),
  timeout_ms: z.number().int().positive().max(120_000).default(10_000),
  device_serial: z.string().min(1).optional()
});
export type DeviceVolumeGetRequest = z.infer<typeof DeviceVolumeGetRequestSchema>;

const AndroidStreamNameSchema = z.enum([
  "STREAM_VOICE_CALL",
  "STREAM_SYSTEM",
  "STREAM_RING",
  "STREAM_MUSIC",
  "STREAM_ALARM",
  "STREAM_NOTIFICATION"
]);

export const DeviceVolumeGetResultSchema = z.object({
  device_serial: z.string().min(1),
  stream: z.object({
    name: DeviceVolumeStreamSchema,
    android_stream_id: z.number().int().nonnegative(),
    android_stream_name: AndroidStreamNameSchema
  }),
  volume: z.object({
    index: z.number().int().nonnegative(),
    min: z.number().int().nonnegative(),
    max: z.number().int().nonnegative()
  }),
  query: z.object({
    method: z.literal("cmd_media_session_volume_get"),
    exit_code: z.number().int().nullable(),
    command_duration_ms: z.number().int().nonnegative()
  }),
  verify: z.object({
    policy: z.literal("media_session_volume_parse"),
    ok: z.literal(true),
    attempts: z.literal(1),
    reason: z.string()
  }),
  semantics: z.literal("audio_manager_stream_volume_index")
});
export type DeviceVolumeGetResult = z.infer<typeof DeviceVolumeGetResultSchema>;

export const DeviceRingerGetRequestSchema = z.object({
  timeout_ms: z.number().int().positive().max(120_000).default(10_000),
  device_serial: z.string().min(1).optional()
});
export type DeviceRingerGetRequest = z.infer<typeof DeviceRingerGetRequestSchema>;

const RingerModeSchema = z.enum(["silent", "vibrate", "normal", "unknown"]);
const ZenModeSchema = z.enum(["off", "important_interruptions", "no_interruptions", "alarms", "unknown"]);
const AudioServiceRawTokenSchema = z.string().min(1).max(128).regex(/^[A-Z0-9_]+$/);
const AudioServiceStreamTokenSchema = z.string().min(1).max(128).regex(/^STREAM_[A-Z0-9_]+$/);
const AudioServiceResidualStreamTokenSchema = z.string().min(1).max(32).regex(/^[0-9]+$/);

const RingerModeValueSchema = z.object({
  mode: RingerModeSchema,
  raw: AudioServiceRawTokenSchema
});

const AudioServiceStreamMaskSchema = z.object({
  mask_hex: z.string().regex(/^0x[0-9a-f]+$/i),
  streams: z.array(AudioServiceStreamTokenSchema),
  residual_tokens: z.array(AudioServiceResidualStreamTokenSchema)
});

export const DeviceRingerGetResultSchema = z.object({
  device_serial: z.string().min(1),
  ringer: z.object({
    internal: RingerModeValueSchema,
    external: RingerModeValueSchema
  }),
  zen: z.object({
    mode: ZenModeSchema,
    raw: AudioServiceRawTokenSchema.nullable(),
    source: z.enum(["dumpsys_audio_ringer_section", "not_reported"])
  }),
  affected_streams: AudioServiceStreamMaskSchema,
  muted_streams: AudioServiceStreamMaskSchema,
  query: z.object({
    method: z.literal("dumpsys_audio"),
    exit_code: z.number().int().nullable(),
    command_duration_ms: z.number().int().nonnegative()
  }),
  verify: z.object({
    policy: z.literal("dumpsys_audio_ringer_state_parse"),
    ok: z.literal(true),
    attempts: z.literal(1),
    reason: z.string()
  }),
  semantics: z.literal("audio_service_ringer_zen_state_not_effective_audibility")
});
export type DeviceRingerGetResult = z.infer<typeof DeviceRingerGetResultSchema>;

export const DeviceNotificationsRequestSchema = z.object({
  max_notifications: z.number().int().positive().max(50).default(20),
  max_field_chars: z.number().int().positive().max(1024).default(256),
  max_total_chars: z.number().int().positive().max(20_000).default(4096),
  timeout_ms: z.number().int().positive().max(120_000).default(10_000),
  device_serial: z.string().min(1).optional()
});
export type DeviceNotificationsRequest = z.infer<typeof DeviceNotificationsRequestSchema>;

const NotificationTextFieldSchema = z.string().max(1024).nullable();
const NotificationBoundedStringSchema = z.string().min(1).max(1024).nullable();
const NotificationKeySchema = z.string().min(1).max(2048);
const NotificationFlagSchema = z.string().min(1).max(128).regex(/^([A-Za-z0-9_]+|0x[0-9a-fA-F]+)$/);
const NotificationUserIdSchema = z.number().int().min(-1).max(2_147_483_647);

export const DeviceNotificationRecordSchema = z.object({
  key: NotificationKeySchema,
  package_name: InstalledPackageNameSchema,
  user_id: NotificationUserIdSchema.nullable(),
  notification_id: z.number().int().nullable(),
  tag: NotificationBoundedStringSchema,
  channel_id: NotificationBoundedStringSchema,
  importance: z.number().int().nullable(),
  group_key: NotificationBoundedStringSchema,
  category: NotificationBoundedStringSchema,
  visibility: z.enum(["public", "private", "secret", "unknown"]),
  flags: z.array(NotificationFlagSchema),
  title: NotificationTextFieldSchema,
  text: NotificationTextFieldSchema,
  sub_text: NotificationTextFieldSchema,
  big_text: NotificationTextFieldSchema,
  truncated: z.boolean()
});
export type DeviceNotificationRecord = z.infer<typeof DeviceNotificationRecordSchema>;

export const DeviceNotificationsResultSchema = z.object({
  device_serial: z.string().min(1),
  requested: z.object({
    max_notifications: z.number().int().positive().max(50),
    max_field_chars: z.number().int().positive().max(1024),
    max_total_chars: z.number().int().positive().max(20_000)
  }),
  notifications: z.array(DeviceNotificationRecordSchema),
  counts: z.object({
    total_seen: z.number().int().nonnegative(),
    returned: z.number().int().nonnegative(),
    dropped_by_limit: z.number().int().nonnegative()
  }),
  truncated: z.object({
    notifications: z.boolean(),
    chars: z.boolean(),
    fields: z.boolean()
  }),
  sensitive: z.literal(true),
  query: z.object({
    method: z.literal("dumpsys_notification_noredact"),
    exit_code: z.number().int().nullable(),
    command_duration_ms: z.number().int().nonnegative()
  }),
  verify: z.object({
    policy: z.literal("notification_dump_parse"),
    ok: z.literal(true),
    attempts: z.literal(1),
    reason: z.string()
  }),
  semantics: z.literal("read_only_notification_snapshot_sensitive_bounded")
});
export type DeviceNotificationsResult = z.infer<typeof DeviceNotificationsResultSchema>;

export const DeviceDetailsRequestSchema = z.object({
  timeout_ms: z.number().int().positive().max(120_000).default(10_000),
  device_serial: z.string().min(1).optional()
});
export type DeviceDetailsRequest = z.infer<typeof DeviceDetailsRequestSchema>;

export const BatteryStatusSchema = z.enum(["unknown", "charging", "discharging", "not_charging", "full"]);
export type BatteryStatus = z.infer<typeof BatteryStatusSchema>;

export const BatteryPluggedSchema = z.enum(["ac", "usb", "wireless", "dock", "none"]);
export type BatteryPlugged = z.infer<typeof BatteryPluggedSchema>;

export const BatteryHealthSchema = z.enum([
  "unknown",
  "good",
  "overheat",
  "dead",
  "over_voltage",
  "unspecified_failure",
  "cold"
]);
export type BatteryHealth = z.infer<typeof BatteryHealthSchema>;

export const DeviceDetailsResultSchema = z.object({
  device_serial: z.string().min(1),
  android: z.object({
    release: NullableStringSchema,
    sdk: z.number().int().nonnegative().nullable(),
    codename: NullableStringSchema
  }),
  hardware: z.object({
    manufacturer: NullableStringSchema,
    brand: NullableStringSchema,
    model: NullableStringSchema,
    product: NullableStringSchema,
    device: NullableStringSchema,
    supported_abis: z.array(z.string().min(1))
  }),
  display: z.object({
    physical_size: SizeSchema.nullable(),
    override_size: SizeSchema.nullable(),
    physical_density: z.number().int().positive().nullable(),
    override_density: z.number().int().positive().nullable()
  }),
  battery: z.object({
    level_percent: z.number().min(0).max(100).nullable(),
    scale: z.number().int().positive().nullable(),
    status: BatteryStatusSchema.nullable(),
    plugged: BatteryPluggedSchema.nullable(),
    temperature_celsius: z.number().nullable()
  }),
  properties: z.record(z.string(), z.string())
});
export type DeviceDetailsResult = z.infer<typeof DeviceDetailsResultSchema>;

export const DeviceBatteryGetRequestSchema = z.object({
  timeout_ms: z.number().int().positive().max(120_000).default(10_000),
  device_serial: z.string().min(1).optional()
});
export type DeviceBatteryGetRequest = z.infer<typeof DeviceBatteryGetRequestSchema>;

export const DeviceBatterySnapshotSchema = z.object({
  level_percent: z.number().min(0).max(100).nullable(),
  scale: z.number().int().positive().nullable(),
  status: BatteryStatusSchema.nullable(),
  plugged: BatteryPluggedSchema.nullable(),
  temperature_celsius: z.number().nullable(),
  health: BatteryHealthSchema.nullable(),
  present: z.boolean().nullable(),
  voltage_mv: z.number().int().nonnegative().nullable(),
  technology: NullableStringSchema,
  charge_counter_uah: z.number().int().nonnegative().nullable()
});
export type DeviceBatterySnapshot = z.infer<typeof DeviceBatterySnapshotSchema>;

export const DeviceBatteryGetResultSchema = z.object({
  device_serial: z.string().min(1),
  battery: DeviceBatterySnapshotSchema,
  query: z.object({
    method: z.literal("dumpsys_battery"),
    exit_code: z.number().int().nullable(),
    command_duration_ms: z.number().int().nonnegative()
  }),
  verify: z.object({
    policy: z.literal("dumpsys_battery_parse"),
    ok: z.literal(true),
    attempts: z.literal(1),
    reason: z.string()
  }),
  semantics: z.literal("read_only_battery_snapshot_not_charge_control_or_health_calibration")
});
export type DeviceBatteryGetResult = z.infer<typeof DeviceBatteryGetResultSchema>;

export const DeviceTimeGetRequestSchema = z.object({
  timeout_ms: z.number().int().positive().max(120_000).default(10_000),
  device_serial: z.string().min(1).optional()
});
export type DeviceTimeGetRequest = z.infer<typeof DeviceTimeGetRequestSchema>;

export const DeviceTimeZoneSourceSchema = z.enum(["settings_global_time_zone", "persist_sys_timezone"]);
export type DeviceTimeZoneSource = z.infer<typeof DeviceTimeZoneSourceSchema>;

export const DeviceTimeSourceMethodSchema = z.enum([
  "date_unix_epoch_offset",
  "settings_global_auto_time",
  "settings_global_auto_time_zone",
  "settings_global_time_zone",
  "getprop_persist_sys_timezone"
]);
export type DeviceTimeSourceMethod = z.infer<typeof DeviceTimeSourceMethodSchema>;

export const DeviceTimeGetResultSchema = z
  .object({
    device_serial: z.string().min(1),
    time: z.object({
      unix_epoch_seconds: z.number().int().nonnegative(),
      timezone_offset: z.string().regex(/^[+-]\d{2}:\d{2}$/),
      timezone_offset_minutes: z.number().int().min(-1439).max(1439)
    }),
    settings: z.object({
      auto_time: z.boolean().nullable(),
      auto_time_zone: z.boolean().nullable()
    }),
    timezone: z.object({
      id: z.string().min(1).max(128).nullable(),
      source: DeviceTimeZoneSourceSchema.nullable(),
      sources: z.object({
        settings_global_time_zone: NullableStringSchema,
        persist_sys_timezone: NullableStringSchema
      })
    }),
    query: z.object({
      sources: z.array(
        z.object({
          method: DeviceTimeSourceMethodSchema,
          exit_code: z.number().int().nullable(),
          command_duration_ms: z.number().int().nonnegative()
        })
      )
    }),
    verify: z.object({
      policy: z.literal("device_time_sources_parse"),
      ok: z.literal(true),
      attempts: z.literal(1),
      reason: z.string()
    }),
    semantics: z.literal("read_only_device_time_snapshot_not_ntp_or_scheduler_guarantee")
  })
  .superRefine((value, ctx) => {
    if ((value.timezone.id === null) !== (value.timezone.source === null)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["timezone"],
        message: "timezone id and source must both be null or both be populated"
      });
    }
    if (
      value.timezone.source !== null &&
      value.timezone.id !== value.timezone.sources[value.timezone.source]
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["timezone", "source"],
        message: "timezone source must refer to the source value selected as timezone id"
      });
    }
  });
export type DeviceTimeGetResult = z.infer<typeof DeviceTimeGetResultSchema>;

export const DeviceReadyStateSchema = z.object({
  device_serial: z.string().min(1),
  awake: z.boolean().nullable(),
  interactive: z.boolean().nullable(),
  wakefulness: z.string().min(1).nullable(),
  display_power_state: z.string().min(1).nullable(),
  keyguard_showing: z.boolean().nullable(),
  keyguard_secure: z.boolean().nullable()
});
export type DeviceReadyState = z.infer<typeof DeviceReadyStateSchema>;

export const DeviceScreenGetRequestSchema = z.object({
  timeout_ms: z.number().int().positive().max(120_000).default(10_000),
  device_serial: z.string().min(1).optional()
});
export type DeviceScreenGetRequest = z.infer<typeof DeviceScreenGetRequestSchema>;

export const DeviceScreenDisplayPowerSchema = z.enum(["on", "off", "doze", "unknown"]);
export type DeviceScreenDisplayPower = z.infer<typeof DeviceScreenDisplayPowerSchema>;

export const DeviceScreenGetResultSchema = z.object({
  device_serial: z.string().min(1),
  state: DeviceReadyStateSchema,
  screen: z.object({
    display_power: DeviceScreenDisplayPowerSchema,
    screen_unlocked: z.boolean()
  }),
  keyguard: z.object({
    showing: z.boolean().nullable(),
    secure: z.boolean().nullable()
  }),
  query: z.object({
    sources: z.array(
      z.object({
        method: z.enum(["dumpsys_power", "dumpsys_window"]),
        exit_code: z.number().int().nullable(),
        command_duration_ms: z.number().int().nonnegative()
      })
    )
  }),
  verify: z.object({
    policy: z.literal("screen_keyguard_state_parse"),
    ok: z.literal(true),
    attempts: z.literal(1),
    reason: z.string()
  }),
  semantics: z.literal("read_only_screen_keyguard_probe_not_readiness_mutation")
});
export type DeviceScreenGetResult = z.infer<typeof DeviceScreenGetResultSchema>;

export const DeviceNetworkGetRequestSchema = z.object({
  timeout_ms: z.number().int().positive().max(120_000).default(10_000),
  device_serial: z.string().min(1).optional()
});
export type DeviceNetworkGetRequest = z.infer<typeof DeviceNetworkGetRequestSchema>;

export const DeviceNetworkTransportSchema = z.enum(["wifi", "cellular", "ethernet", "vpn", "bluetooth", "other"]);
export type DeviceNetworkTransport = z.infer<typeof DeviceNetworkTransportSchema>;

export const DeviceNetworkGetResultSchema = z.object({
  device_serial: z.string().min(1),
  settings: z.object({
    airplane_mode_on: z.boolean().nullable(),
    wifi_on: z.boolean().nullable(),
    mobile_data_on: z.boolean().nullable()
  }),
  active: z.object({
    network_id: z.number().int().nonnegative().nullable(),
    transports: z.array(DeviceNetworkTransportSchema),
    primary_transport: DeviceNetworkTransportSchema.nullable(),
    internet_capable: z.boolean(),
    validated: z.boolean(),
    online: z.boolean()
  }),
  query: z.object({
    sources: z.array(
      z.object({
        method: z.enum([
          "settings_global_airplane_mode_on",
          "settings_global_wifi_on",
          "settings_global_mobile_data",
          "dumpsys_connectivity"
        ]),
        exit_code: z.number().int().nullable(),
        command_duration_ms: z.number().int().nonnegative()
      })
    )
  }),
  verify: z.object({
    policy: z.literal("settings_and_connectivity_service_parse"),
    ok: z.literal(true),
    attempts: z.literal(1),
    reason: z.string()
  }),
  semantics: z.literal("read_only_connectivity_state_not_remote_reachability")
});
export type DeviceNetworkGetResult = z.infer<typeof DeviceNetworkGetResultSchema>;

export const DeviceStorageGetRequestSchema = z.object({
  timeout_ms: z.number().int().positive().max(120_000).default(10_000),
  device_serial: z.string().min(1).optional()
});
export type DeviceStorageGetRequest = z.infer<typeof DeviceStorageGetRequestSchema>;

const DeviceStorageRoleSchema = z.enum(["data", "shared", "tmp"]);
const DeviceStoragePathSchema = z.enum(["/data", "/sdcard", "/data/local/tmp"]);
const DeviceStorageEntryBaseSchema = z.object({
  role: DeviceStorageRoleSchema,
  path: DeviceStoragePathSchema
});
const StorageBlockCountSchema = z.number().int().nonnegative();
const StorageByteCountSchema = z.number().int().nonnegative();

const DeviceStorageOkEntrySchema = DeviceStorageEntryBaseSchema.extend({
  ok: z.literal(true),
  filesystem_type: z.string().min(1),
  block_size_bytes: z.number().int().positive(),
  total_blocks: StorageBlockCountSchema,
  available_blocks: StorageBlockCountSchema,
  free_blocks: StorageBlockCountSchema,
  total_bytes: StorageByteCountSchema,
  available_bytes: StorageByteCountSchema,
  free_bytes: StorageByteCountSchema,
  used_bytes: StorageByteCountSchema
}).refine((entry) => entry.total_blocks >= entry.free_blocks && entry.free_blocks >= entry.available_blocks, {
  message: "storage block counts must satisfy total >= free >= available",
  path: ["available_blocks"]
}).refine(
  (entry) =>
    entry.total_bytes === entry.total_blocks * entry.block_size_bytes &&
    entry.available_bytes === entry.available_blocks * entry.block_size_bytes &&
    entry.free_bytes === entry.free_blocks * entry.block_size_bytes &&
    entry.used_bytes === (entry.total_blocks - entry.free_blocks) * entry.block_size_bytes,
  {
    message: "storage byte counts must derive from statfs blocks and block size",
    path: ["total_bytes"]
  }
);

const DeviceStorageUnavailableEntrySchema = DeviceStorageEntryBaseSchema.extend({
  ok: z.literal(false),
  error: z.object({
    reason: z.enum(["statfs_failed", "not_reported"]),
    message: z.string().min(1).max(512)
  })
});

export const DeviceStorageGetResultSchema = z
  .object({
    device_serial: z.string().min(1),
    entries: z.array(z.discriminatedUnion("ok", [DeviceStorageOkEntrySchema, DeviceStorageUnavailableEntrySchema])),
    entry_count: z.number().int().nonnegative(),
    ok_count: z.number().int().nonnegative(),
    unavailable_count: z.number().int().nonnegative(),
    query: z.object({
      method: z.literal("statfs_paths"),
      paths: z.array(DeviceStoragePathSchema),
      exit_code: z.number().int().nullable(),
      command_duration_ms: z.number().int().nonnegative()
    }),
    verify: z.object({
      policy: z.literal("statfs_storage_parse"),
      ok: z.literal(true),
      attempts: z.literal(1),
      reason: z.string()
    }),
    semantics: z.literal("read_only_storage_capacity_snapshot_not_quota_or_write_permission")
  })
  .refine((value) => value.entry_count === value.entries.length, {
    message: "entry_count must match entries length",
    path: ["entry_count"]
  })
  .refine((value) => value.ok_count === value.entries.filter((entry) => entry.ok).length, {
    message: "ok_count must match ok entries",
    path: ["ok_count"]
  })
  .refine((value) => value.unavailable_count === value.entries.filter((entry) => !entry.ok).length, {
    message: "unavailable_count must match unavailable entries",
    path: ["unavailable_count"]
  })
  .refine((value) => deviceStorageEntriesHaveExpectedRoles(value.entries), {
    message: "storage entries must include data, shared, and tmp roles exactly once with matching paths",
    path: ["entries"]
  })
  .refine((value) => value.query.paths.join("\0") === "/data\0/sdcard\0/data/local/tmp", {
    message: "storage query paths must match the fixed storage probe paths",
    path: ["query", "paths"]
  });
export type DeviceStorageGetResult = z.infer<typeof DeviceStorageGetResultSchema>;

export const DeviceLocaleGetRequestSchema = z.object({
  timeout_ms: z.number().int().positive().max(120_000).default(10_000),
  device_serial: z.string().min(1).optional()
});
export type DeviceLocaleGetRequest = z.infer<typeof DeviceLocaleGetRequestSchema>;

const DeviceLocaleSourceSchema = z.enum([
  "system_locales",
  "persist_sys_locale",
  "ro_product_locale",
  "ro_product_locale_language_region"
]);
const DeviceLocaleRawSourceSchema = z.string().min(1).max(512).nullable();
const DeviceLocaleEntrySchema = z.object({
  tag: z.string().min(1).max(128),
  base_name: z.string().min(1).max(128),
  language: z.string().min(1).max(16),
  script: z.string().min(1).max(16).nullable(),
  region: z.string().min(1).max(16).nullable()
});
const DeviceLocaleInvalidSourceSchema = z.object({
  source: DeviceLocaleSourceSchema,
  index: z.number().int().nonnegative().nullable(),
  value: z.string().min(1).max(128),
  reason: z.string().min(1).max(256)
});

export const DeviceLocaleGetResultSchema = z
  .object({
    device_serial: z.string().min(1),
    locales: z.array(DeviceLocaleEntrySchema),
    locales_count: z.number().int().nonnegative(),
    primary_locale: DeviceLocaleEntrySchema.nullable(),
    selected_source: DeviceLocaleSourceSchema.nullable(),
    sources: z.object({
      system_locales: DeviceLocaleRawSourceSchema,
      persist_sys_locale: DeviceLocaleRawSourceSchema,
      ro_product_locale: DeviceLocaleRawSourceSchema,
      ro_product_locale_language: DeviceLocaleRawSourceSchema,
      ro_product_locale_region: DeviceLocaleRawSourceSchema
    }),
    invalid_sources: z.array(DeviceLocaleInvalidSourceSchema),
    query: z.object({
      sources: z.array(
        z.object({
          method: z.enum([
            "settings_system_system_locales",
            "getprop_persist_sys_locale",
            "getprop_ro_product_locale",
            "getprop_ro_product_locale_language",
            "getprop_ro_product_locale_region"
          ]),
          exit_code: z.number().int().nullable(),
          command_duration_ms: z.number().int().nonnegative()
        })
      )
    }),
    verify: z.object({
      policy: z.literal("locale_sources_parse"),
      ok: z.literal(true),
      attempts: z.literal(1),
      reason: z.string()
    }),
    semantics: z.literal("read_only_locale_state_not_app_language_or_translation")
  })
  .refine((value) => value.locales_count === value.locales.length, {
    message: "locales_count must match locales length",
    path: ["locales_count"]
  })
  .refine((value) => deviceLocalePrimaryMatchesFirstLocale(value.primary_locale, value.locales), {
    message: "primary_locale must equal the first locale or null when no locale parsed",
    path: ["primary_locale"]
  })
  .refine((value) => (value.locales.length === 0) === (value.selected_source === null), {
    message: "selected_source must be null only when no locale parsed",
    path: ["selected_source"]
  });
export type DeviceLocaleGetResult = z.infer<typeof DeviceLocaleGetResultSchema>;

export const InputMethodIdSchema = z
  .string()
  .min(1)
  .max(256)
  .regex(
    /^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z0-9_]+)+(\/[A-Za-z0-9_.$]+)?$/,
    "invalid Android input method id"
  );

export const DeviceImeGetRequestSchema = z.object({
  timeout_ms: z.number().int().positive().max(120_000).default(10_000),
  device_serial: z.string().min(1).optional()
});
export type DeviceImeGetRequest = z.infer<typeof DeviceImeGetRequestSchema>;

export const DeviceImeGetResultSchema = z.object({
  device_serial: z.string().min(1),
  keyboard: z.object({
    shown: z.boolean().nullable(),
    show_requested: z.boolean().nullable(),
    fullscreen_mode: z.boolean().nullable()
  }),
  service: z.object({
    system_ready: z.boolean().nullable(),
    interactive: z.boolean().nullable()
  }),
  ime: z.object({
    current_id: InputMethodIdSchema.nullable(),
    default_id: InputMethodIdSchema.nullable(),
    enabled_ids: z.array(InputMethodIdSchema),
    enabled_count: z.number().int().nonnegative()
  }),
  query: z.object({
    sources: z.array(
      z.object({
        method: z.enum([
          "dumpsys_input_method",
          "settings_secure_default_input_method",
          "settings_secure_enabled_input_methods"
        ]),
        exit_code: z.number().int().nullable(),
        command_duration_ms: z.number().int().nonnegative()
      })
    )
  }),
  verify: z.object({
    policy: z.literal("input_method_service_parse"),
    ok: z.literal(true),
    attempts: z.literal(1),
    reason: z.string()
  }),
  semantics: z.literal("read_only_ime_state_not_keyboard_geometry")
});
export type DeviceImeGetResult = z.infer<typeof DeviceImeGetResultSchema>;

export const DeviceBrightnessGetRequestSchema = z.object({
  timeout_ms: z.number().int().positive().max(120_000).default(10_000),
  device_serial: z.string().min(1).optional()
});
export type DeviceBrightnessGetRequest = z.infer<typeof DeviceBrightnessGetRequestSchema>;

export const DeviceBrightnessModeSchema = z.enum(["manual", "automatic", "unknown"]);
export type DeviceBrightnessMode = z.infer<typeof DeviceBrightnessModeSchema>;

const NormalizedBrightnessSchema = z.number().min(0).max(1).nullable();

export const DeviceBrightnessGetResultSchema = z.object({
  device_serial: z.string().min(1),
  settings: z.object({
    screen_brightness: z.object({
      raw: z.number().int().min(0).max(255).nullable(),
      max: z.literal(255),
      normalized: NormalizedBrightnessSchema
    }),
    mode: z.object({
      raw: z.number().int().nullable(),
      value: DeviceBrightnessModeSchema
    }),
    auto_brightness_adjustment: z.number().min(-1).max(1).nullable(),
    screen_brightness_float: NormalizedBrightnessSchema
  }),
  display: z.object({
    brightness: NormalizedBrightnessSchema,
    sdr_brightness: NormalizedBrightnessSchema,
    cached_brightness: NormalizedBrightnessSchema,
    cached_adjusted_brightness: NormalizedBrightnessSchema,
    min: NormalizedBrightnessSchema,
    max: NormalizedBrightnessSchema
  }),
  query: z.object({
    sources: z.array(
      z.object({
        method: z.enum([
          "settings_system_screen_brightness",
          "settings_system_screen_brightness_mode",
          "settings_system_screen_auto_brightness_adj",
          "settings_system_screen_brightness_float",
          "dumpsys_display"
        ]),
        exit_code: z.number().int().nullable(),
        command_duration_ms: z.number().int().nonnegative()
      })
    )
  }),
  verify: z.object({
    policy: z.literal("display_brightness_state_parse"),
    ok: z.literal(true),
    attempts: z.literal(1),
    reason: z.string()
  }),
  semantics: z.literal("read_only_display_brightness_state_not_visual_luminance")
});
export type DeviceBrightnessGetResult = z.infer<typeof DeviceBrightnessGetResultSchema>;

export const DeviceAnimationsGetRequestSchema = z.object({
  timeout_ms: z.number().int().positive().max(120_000).default(10_000),
  device_serial: z.string().min(1).optional()
});
export type DeviceAnimationsGetRequest = z.infer<typeof DeviceAnimationsGetRequestSchema>;

export const DeviceAnimationScaleValueSchema = z.union([z.literal(0), z.literal(0.5), z.literal(1)]);
export type DeviceAnimationScaleValue = z.infer<typeof DeviceAnimationScaleValueSchema>;

const DeviceAnimationScaleSettingSchema = z.object({
  raw: z.string().min(1).nullable(),
  value: z.number().min(0).nullable()
});

const DeviceAnimationSettingsSchema = z.object({
  window_animation_scale: DeviceAnimationScaleSettingSchema,
  transition_animation_scale: DeviceAnimationScaleSettingSchema,
  animator_duration_scale: DeviceAnimationScaleSettingSchema
});

const DeviceAnimationsSnapshotSchema = z.object({
  settings: DeviceAnimationSettingsSchema,
  animations_disabled: z.boolean()
});

export const DeviceAnimationsGetResultSchema = z.object({
  device_serial: z.string().min(1),
  settings: DeviceAnimationSettingsSchema,
  animations_disabled: z.boolean(),
  query: z.object({
    sources: z.array(
      z.object({
        method: z.enum([
          "settings_global_window_animation_scale",
          "settings_global_transition_animation_scale",
          "settings_global_animator_duration_scale"
        ]),
        exit_code: z.number().int().nullable(),
        command_duration_ms: z.number().int().nonnegative()
      })
    )
  }),
  verify: z.object({
    policy: z.literal("animation_scale_settings_parse"),
    ok: z.literal(true),
    attempts: z.literal(1),
    reason: z.string()
  }),
  semantics: z.literal("read_only_animation_scale_settings_not_runtime_animation_state")
});
export type DeviceAnimationsGetResult = z.infer<typeof DeviceAnimationsGetResultSchema>;

export const DeviceAnimationsSetRequestSchema = z.object({
  scale: DeviceAnimationScaleValueSchema,
  timeout_ms: z.number().int().positive().max(120_000).default(10_000),
  device_serial: z.string().min(1, "device animations set requires explicit --serial")
});
export type DeviceAnimationsSetRequest = z.infer<typeof DeviceAnimationsSetRequestSchema>;

export const DeviceAnimationsSetResultSchema = z.object({
  device_serial: z.string().min(1),
  requested: z.object({
    scale: DeviceAnimationScaleValueSchema
  }),
  before: DeviceAnimationsSnapshotSchema,
  set: z.object({
    sources: z.array(
      z.object({
        method: z.enum([
          "settings_put_global_window_animation_scale",
          "settings_put_global_transition_animation_scale",
          "settings_put_global_animator_duration_scale"
        ]),
        scale: DeviceAnimationScaleValueSchema,
        exit_code: z.number().int().nullable(),
        command_duration_ms: z.number().int().nonnegative()
      })
    )
  }),
  after: DeviceAnimationsSnapshotSchema,
  changed: z.boolean(),
  verify: z.object({
    policy: z.literal("global_animation_scales_readback"),
    ok: z.literal(true),
    attempts: z.number().int().positive(),
    reason: z.string()
  }),
  semantics: z.literal("device_wide_global_animation_scale_settings_not_runtime_animation_state")
});
export type DeviceAnimationsSetResult = z.infer<typeof DeviceAnimationsSetResultSchema>;

export const DeviceAccessibilityGetRequestSchema = z.object({
  timeout_ms: z.number().int().positive().max(120_000).default(10_000),
  device_serial: z.string().min(1).optional()
});
export type DeviceAccessibilityGetRequest = z.infer<typeof DeviceAccessibilityGetRequestSchema>;

const DeviceAccessibilityBooleanSettingSchema = z.object({
  raw: z.enum(["0", "1"]).nullable(),
  value: z.boolean().nullable()
});

const AccessibilityServiceComponentSchema = z
  .string()
  .min(1)
  .max(256)
  .regex(
    /^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z0-9_]+)*\/(\.[A-Za-z_$][A-Za-z0-9_.$]*|[A-Za-z_$][A-Za-z0-9_.$]*)$/,
    "invalid Android accessibility service component"
  );

export const DeviceAccessibilityGetResultSchema = z.object({
  device_serial: z.string().min(1),
  settings: z.object({
    accessibility_enabled: DeviceAccessibilityBooleanSettingSchema,
    touch_exploration_enabled: DeviceAccessibilityBooleanSettingSchema,
    enabled_accessibility_services: z.object({
      raw: z.string().max(4096).nullable(),
      services: z.array(AccessibilityServiceComponentSchema).max(128),
      count: z.number().int().nonnegative().max(128)
    })
  }),
  query: z.object({
    sources: z.array(
      z.object({
        method: z.enum([
          "settings_secure_accessibility_enabled",
          "settings_secure_touch_exploration_enabled",
          "settings_secure_enabled_accessibility_services"
        ]),
        exit_code: z.number().int().nullable(),
        command_duration_ms: z.number().int().nonnegative()
      })
    )
  }),
  verify: z.object({
    policy: z.literal("accessibility_secure_settings_parse"),
    ok: z.literal(true),
    attempts: z.literal(1),
    reason: z.string()
  }),
  semantics: z.literal("read_only_secure_accessibility_settings_not_runtime_accessibility_node_state")
});
export type DeviceAccessibilityGetResult = z.infer<typeof DeviceAccessibilityGetResultSchema>;

export const DeviceEnsureReadyRequestSchema = z.object({
  dismiss_keyguard: z.boolean().default(true),
  timeout_ms: z.number().int().positive().max(120_000).default(10_000),
  device_serial: z.string().min(1).optional()
});
export type DeviceEnsureReadyRequest = z.infer<typeof DeviceEnsureReadyRequestSchema>;

export const DeviceEnsureReadyResultSchema = z.object({
  device_serial: z.string().min(1),
  before: DeviceReadyStateSchema,
  after: DeviceReadyStateSchema,
  wake: z.object({
    attempted: z.boolean(),
    keycode: z.literal("KEYCODE_WAKEUP"),
    command_duration_ms: z.number().int().nonnegative().nullable()
  }),
  dismiss_keyguard: z.object({
    attempted: z.boolean(),
    method: z.literal("wm_dismiss_keyguard"),
    exit_code: z.number().int().nullable(),
    command_duration_ms: z.number().int().nonnegative().nullable()
  }),
  verify: z.object({
    ok: z.boolean(),
    attempts: z.number().int().nonnegative(),
    reason: z.string()
  })
});
export type DeviceEnsureReadyResult = z.infer<typeof DeviceEnsureReadyResultSchema>;

function deviceStorageEntriesHaveExpectedRoles(
  entries: Array<z.infer<typeof DeviceStorageOkEntrySchema> | z.infer<typeof DeviceStorageUnavailableEntrySchema>>
): boolean {
  const expected = new Map([
    ["data", "/data"],
    ["shared", "/sdcard"],
    ["tmp", "/data/local/tmp"]
  ]);
  if (entries.length !== expected.size) {
    return false;
  }
  const seen = new Set<string>();
  for (const entry of entries) {
    if (seen.has(entry.role) || expected.get(entry.role) !== entry.path) {
      return false;
    }
    seen.add(entry.role);
  }
  return seen.size === expected.size;
}

function deviceLocalePrimaryMatchesFirstLocale(
  primaryLocale: z.infer<typeof DeviceLocaleEntrySchema> | null,
  locales: Array<z.infer<typeof DeviceLocaleEntrySchema>>
): boolean {
  if (locales.length === 0) {
    return primaryLocale === null;
  }
  const first = locales[0];
  return (
    first !== undefined &&
    primaryLocale !== null &&
    primaryLocale.tag === first.tag &&
    primaryLocale.base_name === first.base_name &&
    primaryLocale.language === first.language &&
    primaryLocale.script === first.script &&
    primaryLocale.region === first.region
  );
}
