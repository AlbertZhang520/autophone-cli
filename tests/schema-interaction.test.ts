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

describe("generated JSON schemas: interaction contracts and golden responses", () => {
  it("enforces candidate_index request semantics for indexed actions", () => {
    expect(
      TapRequestSchema.parse({
        selector: { text: "OK" },
        candidate_index: 0
      })
    ).toMatchObject({
      candidate_index: 0,
      verify: "screen_changed"
    });
    expect(() =>
      TapRequestSchema.parse({
        selector: { text: "OK" },
        candidate_index: -1
      })
    ).toThrow();
    expect(() =>
      TapRequestSchema.parse({
        candidate_index: 0
      })
    ).toThrow();
    expect(() =>
      TapRequestSchema.parse({
        raw_point: [10, 20],
        candidate_index: 0,
        allow_unsafe_raw_point: true
      })
    ).toThrow();
    expect(
      DoubleTapRequestSchema.parse({
        selector: { text: "OK" },
        candidate_index: 0
      })
    ).toMatchObject({
      candidate_index: 0,
      interval_ms: 80,
      verify: "screen_changed"
    });
    expect(() =>
      DoubleTapRequestSchema.parse({
        raw_point: [10, 20],
        candidate_index: 0,
        allow_unsafe_raw_point: true
      })
    ).toThrow();
    expect(() =>
      DoubleTapRequestSchema.parse({
        selector: { text: "OK" },
        interval_ms: 39
      })
    ).toThrow();
    expect(() =>
      DoubleTapRequestSchema.parse({
        selector: { text: "OK" },
        interval_ms: 300,
        timeout_ms: 1200
      })
    ).toThrow();
    expect(() =>
      LongPressRequestSchema.parse({
        raw_point: [10, 20],
        candidate_index: 0,
        allow_unsafe_raw_point: true,
        duration_ms: 800,
        timeout_ms: 2000
      })
    ).toThrow();
    expect(() =>
      LongPressRequestSchema.parse({
        candidate_index: 0,
        duration_ms: 800,
        timeout_ms: 2000
      })
    ).toThrow();
  });

  it("enforces long-press duration and timeout margins in the Zod request contract", () => {
    expect(() =>
      LongPressRequestSchema.parse({
        selector: { text: "Item" },
        duration_ms: 499,
        timeout_ms: 2000
      })
    ).toThrow();
    expect(() =>
      LongPressRequestSchema.parse({
        selector: { text: "Item" },
        duration_ms: 500,
        timeout_ms: 1499
      })
    ).toThrow();
    expect(
      LongPressRequestSchema.parse({
        selector: { text: "Item" },
        duration_ms: 500,
        timeout_ms: 1500
      })
    ).toMatchObject({
      duration_ms: 500,
      timeout_ms: 1500,
      verify: "screen_changed"
    });
  });

  it("enforces drag defaults and timeout margins in the Zod request contract", () => {
    expect(
      DragRequestSchema.parse({
        from_selector: { text: "Item" },
        to_selector: { text: "Target" }
      })
    ).toMatchObject({
      from_selector: { text: "Item" },
      to_selector: { text: "Target" },
      gesture: "draganddrop",
      duration_ms: 1000,
      verify: "none",
      timeout_ms: 10_000
    });
    expect(
      DragRequestSchema.parse({
        from_selector: { text: "Item" },
        to_selector: { text: "Target" },
        gesture: "swipe",
        from_candidate_index: 1,
        to_candidate_index: 2,
        duration_ms: 500,
        timeout_ms: 1500
      })
    ).toMatchObject({
      gesture: "swipe",
      from_candidate_index: 1,
      to_candidate_index: 2
    });
    for (const request of [
      { from_selector: { text: "Item" } },
      { from_selector: { text: "Item" }, to_selector: { text: "Target" }, gesture: "pinch" },
      { from_selector: { text: "Item" }, to_selector: { text: "Target" }, duration_ms: 99 },
      { from_selector: { text: "Item" }, to_selector: { text: "Target" }, duration_ms: 1000, timeout_ms: 1999 }
    ]) {
      expect(() => DragRequestSchema.parse(request)).toThrow();
    }
  });

  it("enforces printable ASCII text input request semantics", () => {
    expect(TextInputRequestSchema.parse({ text: "p@ss:w0rd! a+b/c?d#e -ok" })).toMatchObject({
      text: "p@ss:w0rd! a+b/c?d#e -ok",
      verify: "none",
      timeout_ms: 10_000
    });
    expect(TextInputRequestSchema.parse({ text: '$"`&|;<>*[]{}~' })).toMatchObject({
      text: '$"`&|;<>*[]{}~'
    });
    for (const request of [
      { text: "" },
      { text: "   " },
      { text: "100% ready" },
      { text: "C:\\temp" },
      { text: "café" },
      { text: "line\nbreak" },
      { text: "tab\tchar" }
    ]) {
      expect(() => TextInputRequestSchema.parse(request)).toThrow();
    }
  });

  it("enforces text clear defaults and bounded delete counts in the Zod request contract", () => {
    expect(TextClearRequestSchema.parse({})).toMatchObject({
      max_chars: 64,
      verify: "none",
      timeout_ms: 10_000
    });
    expect(
      TextClearRequestSchema.parse({
        max_chars: 512,
        verify: "screen_changed",
        device_serial: "emulator-5554"
      })
    ).toMatchObject({
      max_chars: 512,
      verify: "screen_changed",
      device_serial: "emulator-5554"
    });
    for (const request of [{ max_chars: 0 }, { max_chars: 513 }, { verify: "field_empty" }, { timeout_ms: 0 }]) {
      expect(() => TextClearRequestSchema.parse(request)).toThrow();
    }
  });

  it("accepts extended safe key names and keeps unsafe keys rejected", () => {
    for (const key of ["APP_SWITCH", "MOVE_HOME", "MOVE_END"] as const) {
      expect(KeyPressRequestSchema.parse({ key })).toMatchObject({
        key,
        verify: "none",
        timeout_ms: 10_000
      });
    }
    expect(() => KeyPressRequestSchema.parse({ key: "POWER" })).toThrow();
  });

  it("enforces scroll-until defaults and bounded scroll counts in the Zod request contract", () => {
    expect(
      ScrollRequestSchema.parse({
        direction: "down",
        within: { resource_id: "id/list" }
      })
    ).toMatchObject({
      direction: "down",
      amount: "medium",
      within: { resource_id: "id/list" },
      duration_ms: 300,
      verify: "none",
      timeout_ms: 10_000
    });
    expect(() => ScrollRequestSchema.parse({ direction: "down", within: {} })).toThrow();
    expect(
      ScrollUntilRequestSchema.parse({
        selector: { text: "Target" },
        direction: "down",
        within: { class_name: "android.widget.ScrollView" }
      })
    ).toMatchObject({
      selector: { text: "Target" },
      direction: "down",
      within: { class_name: "android.widget.ScrollView" },
      amount: "medium",
      max_scrolls: 10,
      duration_ms: 300,
      timeout_ms: 10_000
    });
    expect(
      ScrollUntilRequestSchema.parse({
        selector: { content_desc: "Target" },
        direction: "up",
        amount: "large",
        max_scrolls: 25,
        duration_ms: 500,
        timeout_ms: 1500
      })
    ).toMatchObject({
      direction: "up",
      amount: "large",
      max_scrolls: 25
    });
    for (const request of [
      { direction: "down" },
      { selector: { text: "Target" } },
      { selector: { text: "Target" }, direction: "diagonal" },
      { selector: { text: "Target" }, direction: "down", within: {} },
      { selector: { text: "Target" }, direction: "down", max_scrolls: 0 },
      { selector: { text: "Target" }, direction: "down", max_scrolls: 26 },
      { selector: { text: "Target" }, direction: "down", duration_ms: 300, timeout_ms: 300 }
    ]) {
      expect(() => ScrollUntilRequestSchema.parse(request)).toThrow();
    }
  });

  it("defaults wait ui to present and accepts absent conditions", () => {
    expect(
      WaitUiRequestSchema.parse({
        selector: { text: "Ready" }
      })
    ).toMatchObject({
      selector: { text: "Ready" },
      condition: "present",
      wait_timeout_ms: 10_000,
      interval_ms: 500,
      poll_timeout_ms: 10_000
    });
    expect(
      WaitUiRequestSchema.parse({
        selector: { resource_id: "id/loading" },
        condition: "absent",
        wait_timeout_ms: 1000,
        interval_ms: 100,
        poll_timeout_ms: 500
      })
    ).toEqual({
      selector: { resource_id: "id/loading" },
      condition: "absent",
      wait_timeout_ms: 1000,
      interval_ms: 100,
      poll_timeout_ms: 500
    });
    for (const request of [
      { selector: { text: "Ready" }, condition: "gone" },
      { condition: "absent" },
      { selector: { text: "Ready" }, condition: "absent", interval_ms: 1000, wait_timeout_ms: 500 }
    ]) {
      expect(() => WaitUiRequestSchema.parse(request)).toThrow();
    }
  });

  it("validate a golden observe response", async () => {
    const schema = JSON.parse(await readFile(join(process.cwd(), "schemas/observe-response.schema.json"), "utf8"));
    const ajv = await createAjv();
    const validate = ajv.compile(schema);
    const envelope = ResponseEnvelopeSchema(ObserveResultSchema).parse({
      schema_version: "0.1",
      runtime_version: "0.3.0",
      request_id: "req-1",
      ok: true,
      command: "observe",
      device: { serial: "emulator-5554" },
      duration_ms: 1,
      result: {
        snapshot: {
          snapshot_id: "snap_1",
          created_at: "2026-06-28T00:00:00.000Z",
          device_serial: "emulator-5554",
          package: "com.example",
          activity: "com.example.MainActivity",
          window_size: [100, 200],
          orientation: "portrait",
          rotation_degrees: 0,
          auto_rotate: false,
          ui_hash: "sha256:abc",
          elements: []
        }
      },
      error: null,
      warnings: [],
      trace: {}
    });

    expect(validate(envelope)).toBe(true);
  });

  it("validates a golden find response", async () => {
    const schema = JSON.parse(await readFile(join(process.cwd(), "schemas/find-response.schema.json"), "utf8"));
    const ajv = await createAjv();
    const validate = ajv.compile(schema);
    const envelope = ResponseEnvelopeSchema(FindResultSchema).parse({
      schema_version: "0.1",
      runtime_version: "0.3.0",
      request_id: "req-find",
      ok: true,
      command: "ui.find",
      device: { serial: "emulator-5554" },
      duration_ms: 1,
      result: {
        snapshot_id: "snap_1",
        device_serial: "emulator-5554",
        selector: { text: "Login" },
        count: 1,
        total_elements: 1,
        usable_only: true,
        candidates: [
          {
            source_index: 0,
            candidate_index: 0,
            text: "Login",
            resource_id: "com.example:id/login",
            content_desc: "",
            class_name: "android.widget.Button",
            package_name: "com.example",
            bounds: [10, 10, 20, 20],
            center: [15, 15],
            enabled: true,
            clickable: true,
            focused: false
          }
        ]
      },
      error: null,
      warnings: [],
      trace: {}
    });

    expect(validate(envelope)).toBe(true);
  });

  it("validates a golden key press response", async () => {
    const schema = JSON.parse(await readFile(join(process.cwd(), "schemas/key-press-response.schema.json"), "utf8"));
    const ajv = await createAjv();
    const validate = ajv.compile(schema);
    const envelope = ResponseEnvelopeSchema(KeyPressResultSchema).parse({
      schema_version: "0.1",
      runtime_version: "0.3.0",
      request_id: "req-key",
      ok: true,
      command: "key.press",
      duration_ms: 1,
      result: {
        key: "MOVE_HOME",
        keycode: "KEYCODE_MOVE_HOME",
        before: null,
        after: null,
        verify: {
          policy: "none",
          ok: true,
          attempts: 0,
          reason: "verification explicitly disabled",
          changed_fields: []
        }
      },
      error: null,
      warnings: ["key press verification was explicitly disabled"],
      trace: {}
    });

    expect(validate(envelope)).toBe(true);
  });

  it("keeps generated key press request and response enums in sync", async () => {
    const requestSchema = JSON.parse(await readFile(join(process.cwd(), "schemas/key-press-request.schema.json"), "utf8"));
    const responseSchema = JSON.parse(await readFile(join(process.cwd(), "schemas/key-press-response.schema.json"), "utf8"));
    const expectedKeys = expect.arrayContaining(["APP_SWITCH", "MOVE_HOME", "MOVE_END"]);

    expect(requestSchema.properties.key.enum).toEqual(expectedKeys);
    expect(responseSchema.properties.result.anyOf[0].properties.key.enum).toEqual(expectedKeys);
  });

  it("validates a golden wait ui response", async () => {
    const schema = JSON.parse(await readFile(join(process.cwd(), "schemas/wait-ui-response.schema.json"), "utf8"));
    const ajv = await createAjv();
    const validate = ajv.compile(schema);
    const envelope = ResponseEnvelopeSchema(WaitUiResultSchema).parse({
      schema_version: "0.1",
      runtime_version: "0.3.0",
      request_id: "req-wait-ui",
      ok: true,
      command: "wait.ui",
      device: { serial: "emulator-5554" },
      duration_ms: 10,
      result: {
        condition: { type: "ui", selector: { text: "Ready" }, mode: "present" },
        present: true,
        matched_nodes: 1,
        attempts: 2,
        elapsed_ms: 50,
        snapshot_id: "snap_ready",
        device_serial: "emulator-5554",
        count: 1,
        total_elements: 1,
        usable_only: true,
        candidates: [
          {
            source_index: 0,
            candidate_index: 0,
            text: "Ready",
            resource_id: "com.example:id/ready",
            content_desc: "",
            class_name: "android.widget.TextView",
            package_name: "com.example",
            bounds: [10, 10, 20, 20],
            center: [15, 15],
            enabled: true,
            clickable: false,
            focused: false
          }
        ]
      },
      error: null,
      warnings: [],
      trace: {}
    });

    expect(validate(envelope)).toBe(true);
  });

  it("validates a golden wait app response", async () => {
    const schema = JSON.parse(await readFile(join(process.cwd(), "schemas/wait-app-response.schema.json"), "utf8"));
    const ajv = await createAjv();
    const validate = ajv.compile(schema);
    const envelope = ResponseEnvelopeSchema(WaitAppResultSchema).parse({
      schema_version: "0.1",
      runtime_version: "0.3.0",
      request_id: "req-wait-app",
      ok: true,
      command: "wait.app",
      device: { serial: "emulator-5554" },
      duration_ms: 10,
      result: {
        condition: { type: "app", package_name: "com.example" },
        attempts: 2,
        elapsed_ms: 50,
        current: {
          device_serial: "emulator-5554",
          package: "com.example",
          activity: "com.example.MainActivity",
          focused: true
        }
      },
      error: null,
      warnings: [],
      trace: {}
    });

    expect(validate(envelope)).toBe(true);
  });

  it("validates a golden screenshot response", async () => {
    const schema = JSON.parse(await readFile(join(process.cwd(), "schemas/screenshot-response.schema.json"), "utf8"));
    const ajv = await createAjv();
    const validate = ajv.compile(schema);
    const envelope = ResponseEnvelopeSchema(ScreenshotResultSchema).parse({
      schema_version: "0.1",
      runtime_version: "0.3.0",
      request_id: "req-screenshot",
      ok: true,
      command: "screenshot",
      device: { serial: "emulator-5554" },
      duration_ms: 10,
      result: {
        device_serial: "emulator-5554",
        output_path: "/tmp/screen.png",
        mime_type: "image/png",
        width_px: 2,
        height_px: 3,
        bytes: 33,
        sha256: "sha256:b63355f9a1f6274e48ef9c27ab6d683c460bf87cb4eefe3139711bcbea77c75c",
        capture_duration_ms: 7,
        overwritten: false
      },
      error: null,
      warnings: [],
      trace: {}
    });

    expect(validate(envelope)).toBe(true);
  });

  it("enforces screenrecord bounded video evidence semantics", () => {
    expect(
      ScreenrecordRequestSchema.parse({
        output_path: "/tmp/video.mp4",
        duration_seconds: 5,
        bit_rate_bps: 4_000_000,
        size: "1280x720",
        bugreport: true,
        record_timeout_ms: 16_000,
        device_serial: "emulator-5554"
      })
    ).toMatchObject({
      overwrite: false,
      duration_seconds: 5,
      bit_rate_bps: 4_000_000,
      size: "1280x720",
      bugreport: true,
      pull_timeout_ms: 120_000,
      cleanup_timeout_ms: 10_000,
      device_serial: "emulator-5554"
    });

    const result = ScreenrecordResultSchema.parse({
      device_serial: "emulator-5554",
      output_path: "/tmp/video.mp4",
      mime_type: "video/mp4",
      file_name: "video.mp4",
      bytes: 12,
      sha256: "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      overwritten: false,
      requested: {
        duration_seconds: 5,
        bit_rate_bps: null,
        size: null,
        bugreport: false,
        display: "default"
      },
      recording: { method: "screenrecord", exit_code: 0, command_duration_ms: 5010 },
      transfer: { method: "adb_pull", exit_code: 0, command_duration_ms: 100 },
      cleanup: { method: "device_rm", attempted: true, ok: false, exit_code: null, command_duration_ms: null, error_code: "FILE_RM_FAILED", reason: "rm failed" },
      verify: {
        policy: "screenrecord_exit_pull_host_file",
        ok: true,
        attempts: 3,
        reason: "screenrecord exited 0, adb pull exited 0, and the host MP4 output was verified non-empty"
      },
      semantics: "bounded_default_display_video_evidence_no_audio_or_frame_completeness_guarantee"
    });
    expect(result.cleanup.ok).toBe(false);

    for (const request of [
      { output_path: "/tmp/video.mp4", duration_seconds: 0, record_timeout_ms: 16_000, device_serial: "emulator-5554" },
      { output_path: "/tmp/video.mp4", duration_seconds: 31, record_timeout_ms: 40_000, device_serial: "emulator-5554" },
      { output_path: "/tmp/video.mp4", duration_seconds: 5, record_timeout_ms: 5000, device_serial: "emulator-5554" },
      { output_path: "/tmp/video.mp4", duration_seconds: 5, record_timeout_ms: 16_000, size: "0x720", device_serial: "emulator-5554" },
      { output_path: "/tmp/video.mp4", duration_seconds: 5, record_timeout_ms: 16_000, bit_rate_bps: 0, device_serial: "emulator-5554" },
      { output_path: "/tmp/video.mp4", duration_seconds: 5, record_timeout_ms: 16_000 }
    ]) {
      expect(() => ScreenrecordRequestSchema.parse(request)).toThrow();
    }

    expect(() =>
      ScreenrecordResultSchema.parse({
        ...result,
        bytes: 0
      })
    ).toThrow();
  });

  it("validates a golden screenrecord response", async () => {
    const schema = JSON.parse(await readFile(join(process.cwd(), "schemas/screenrecord-response.schema.json"), "utf8"));
    const ajv = await createAjv();
    const validate = ajv.compile(schema);
    const envelope = ResponseEnvelopeSchema(ScreenrecordResultSchema).parse({
      schema_version: "0.1",
      runtime_version: "0.3.0",
      request_id: "req-screenrecord",
      ok: true,
      command: "screenrecord",
      device: { serial: "emulator-5554" },
      duration_ms: 7000,
      result: {
        device_serial: "emulator-5554",
        output_path: "/tmp/video.mp4",
        mime_type: "video/mp4",
        file_name: "video.mp4",
        bytes: 12,
        sha256: "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        overwritten: false,
        requested: {
          duration_seconds: 5,
          bit_rate_bps: 4_000_000,
          size: "1280x720",
          bugreport: true,
          display: "default"
        },
        recording: { method: "screenrecord", exit_code: 0, command_duration_ms: 5010 },
        transfer: { method: "adb_pull", exit_code: 0, command_duration_ms: 100 },
        cleanup: { method: "device_rm", attempted: true, ok: true, exit_code: 0, command_duration_ms: 10 },
        verify: {
          policy: "screenrecord_exit_pull_host_file",
          ok: true,
          attempts: 3,
          reason: "screenrecord exited 0, adb pull exited 0, and the host MP4 output was verified non-empty"
        },
        semantics: "bounded_default_display_video_evidence_no_audio_or_frame_completeness_guarantee"
      },
      error: null,
      warnings: [
        "screenrecord captures potentially sensitive on-screen content and records no audio",
        "screenrecord writes a temporary MP4 to device storage and removes it best-effort"
      ],
      trace: {
        duration_seconds: 5,
        record_timeout_ms: 20_000,
        pull_timeout_ms: 120_000,
        cleanup_timeout_ms: 10_000,
        output_bytes: 12,
        cleanup_ok: true
      }
    });

    expect(validate(envelope)).toBe(true);
  });

  it("validates a golden scroll response", async () => {
    const schema = JSON.parse(await readFile(join(process.cwd(), "schemas/scroll-response.schema.json"), "utf8"));
    const ajv = await createAjv();
    const validate = ajv.compile(schema);
    const envelope = ResponseEnvelopeSchema(ScrollResultSchema).parse({
      schema_version: "0.1",
      runtime_version: "0.3.0",
      request_id: "req-scroll",
      ok: true,
      command: "ui.scroll",
      device: { serial: "emulator-5554" },
      duration_ms: 10,
      result: {
        direction: "down",
        amount: "medium",
        finger_direction: "up",
        start: [50, 135],
        end: [50, 65],
        scope: "window",
        within: null,
        duration_ms: 300,
        before: {
          snapshot_id: "snap_before",
          created_at: "2026-06-28T00:00:00.000Z",
          device_serial: "emulator-5554",
          package: "com.example",
          activity: "com.example.MainActivity",
          window_size: [100, 200],
          orientation: "portrait",
          rotation_degrees: 0,
          auto_rotate: false,
          ui_hash: "sha256:before",
          elements: []
        },
        after: null,
        verify: {
          policy: "none",
          ok: true,
          attempts: 0,
          reason: "verification disabled; scroll may be a no-op at a content boundary",
          changed_fields: []
        }
      },
      error: null,
      warnings: ["scroll verification is disabled; use --verify screen_changed only when movement is expected"],
      trace: { coordinate_source: "window_size_derived" }
    });

    expect(validate(envelope)).toBe(true);
  });

  it("validates a golden scroll-until response", async () => {
    const schema = JSON.parse(await readFile(join(process.cwd(), "schemas/scroll-until-response.schema.json"), "utf8"));
    const ajv = await createAjv();
    const validate = ajv.compile(schema);
    const envelope = ResponseEnvelopeSchema(ScrollUntilResultSchema).parse({
      schema_version: "0.1",
      runtime_version: "0.3.0",
      request_id: "req-scroll-until",
      ok: true,
      command: "ui.scroll_until",
      device: { serial: "emulator-5554" },
      duration_ms: 10,
      result: {
        selector: { text: "Target" },
        direction: "down",
        amount: "medium",
        scope: "window",
        within: null,
        max_scrolls: 10,
        duration_ms: 300,
        scrolls: 1,
        found: false,
        reason: "end_reached",
        snapshot_id: "snap_after",
        device_serial: "emulator-5554",
        ui_hash: "sha256:after",
        count: 0,
        total_elements: 3,
        usable_only: true,
        candidates: [],
        last_scroll: {
          finger_direction: "up",
          start: [50, 135],
          end: [50, 65],
          scope: "window",
          within_candidate: null,
          changed_fields: []
        }
      },
      error: null,
      warnings: ["selector not found: end_reached"],
      trace: { coordinate_source: "window_size_derived", reason: "end_reached" }
    });

    expect(validate(envelope)).toBe(true);
  });

  it("validates a golden drag response", async () => {
    const schema = JSON.parse(await readFile(join(process.cwd(), "schemas/drag-response.schema.json"), "utf8"));
    const ajv = await createAjv();
    const validate = ajv.compile(schema);
    const before = {
      snapshot_id: "snap_before",
      created_at: "2026-06-28T00:00:00.000Z",
      device_serial: "emulator-5554",
      package: "com.example",
      activity: "com.example.MainActivity",
      window_size: [100, 200],
      orientation: "portrait",
      rotation_degrees: 0,
      auto_rotate: false,
      ui_hash: "sha256:before",
      elements: []
    };
    const envelope = ResponseEnvelopeSchema(DragResultSchema).parse({
      schema_version: "0.1",
      runtime_version: "0.3.0",
      request_id: "req-drag",
      ok: true,
      command: "ui.drag",
      device: { serial: "emulator-5554" },
      duration_ms: 10,
      result: {
        from_candidate: {
          source_index: 0,
          candidate_index: 0,
          text: "Item",
          resource_id: "id/source",
          content_desc: "",
          class_name: "android.widget.TextView",
          package_name: "com.example",
          bounds: [10, 10, 40, 40],
          center: [25, 25],
          enabled: true,
          clickable: true,
          focused: false
        },
        to_candidate: {
          source_index: 1,
          candidate_index: 0,
          text: "Target",
          resource_id: "id/target",
          content_desc: "",
          class_name: "android.widget.TextView",
          package_name: "com.example",
          bounds: [10, 80, 40, 110],
          center: [25, 95],
          enabled: true,
          clickable: true,
          focused: false
        },
        start: [25, 25],
        end: [25, 95],
        gesture: "draganddrop",
        duration_ms: 1000,
        before,
        after: null,
        verify: {
          policy: "none",
          ok: true,
          attempts: 0,
          reason: "verification explicitly disabled",
          changed_fields: []
        }
      },
      error: null,
      warnings: ["drag verification is disabled; use --verify screen_changed only when a visible change is expected"],
      trace: { coordinate_source: "tree_bounds", gesture: "draganddrop" }
    });

    expect(validate(envelope)).toBe(true);
  });

  it("validates a golden double-tap response", async () => {
    const schema = JSON.parse(await readFile(join(process.cwd(), "schemas/double-tap-response.schema.json"), "utf8"));
    const ajv = await createAjv();
    const validate = ajv.compile(schema);
    const before = {
      snapshot_id: "snap_before",
      created_at: "2026-06-28T00:00:00.000Z",
      device_serial: "emulator-5554",
      package: "com.example",
      activity: "com.example.MainActivity",
      window_size: [100, 200],
      orientation: "portrait",
      rotation_degrees: 0,
      auto_rotate: false,
      ui_hash: "sha256:before",
      elements: []
    };
    const envelope = ResponseEnvelopeSchema(DoubleTapResultSchema).parse({
      schema_version: "0.1",
      runtime_version: "0.3.0",
      request_id: "req-double-tap",
      ok: true,
      command: "ui.double_tap",
      device: { serial: "emulator-5554" },
      duration_ms: 10,
      result: {
        candidate: {
          source_index: 0,
          candidate_index: 0,
          text: "Photo",
          resource_id: "com.example:id/photo",
          content_desc: "",
          class_name: "android.widget.ImageView",
          package_name: "com.example",
          bounds: [10, 10, 60, 60],
          center: [35, 35],
          enabled: true,
          clickable: true,
          focused: false
        },
        point: [35, 35],
        interval_ms: 80,
        before,
        after: {
          ...before,
          snapshot_id: "snap_after",
          ui_hash: "sha256:after"
        },
        verify: {
          policy: "screen_changed",
          ok: true,
          attempts: 1,
          reason: "snapshot hash, package, or activity changed",
          changed_fields: ["ui_hash"]
        }
      },
      error: null,
      warnings: ["screen_changed verification does not prove semantic double-tap success"],
      trace: { coordinate_source: "tree_bounds", interval_ms: 80 }
    });

    expect(validate(envelope)).toBe(true);
  });

  it("validates a golden long-press response", async () => {
    const schema = JSON.parse(await readFile(join(process.cwd(), "schemas/long-press-response.schema.json"), "utf8"));
    const ajv = await createAjv();
    const validate = ajv.compile(schema);
    const before = {
      snapshot_id: "snap_before",
      created_at: "2026-06-28T00:00:00.000Z",
      device_serial: "emulator-5554",
      package: "com.example",
      activity: "com.example.MainActivity",
      window_size: [100, 200],
      orientation: "portrait",
      rotation_degrees: 0,
      auto_rotate: false,
      ui_hash: "sha256:before",
      elements: []
    };
    const envelope = ResponseEnvelopeSchema(LongPressResultSchema).parse({
      schema_version: "0.1",
      runtime_version: "0.3.0",
      request_id: "req-long-press",
      ok: true,
      command: "ui.long_press",
      device: { serial: "emulator-5554" },
      duration_ms: 10,
      result: {
        candidate: {
          source_index: 0,
          candidate_index: 0,
          text: "Item",
          resource_id: "com.example:id/item",
          content_desc: "",
          class_name: "android.widget.TextView",
          package_name: "com.example",
          bounds: [10, 10, 20, 20],
          center: [15, 15],
          enabled: true,
          clickable: true,
          focused: false
        },
        point: [15, 15],
        duration_ms: 800,
        before,
        after: {
          ...before,
          snapshot_id: "snap_after",
          ui_hash: "sha256:after"
        },
        verify: {
          policy: "screen_changed",
          ok: true,
          attempts: 1,
          reason: "snapshot hash, package, or activity changed",
          changed_fields: ["ui_hash"]
        }
      },
      error: null,
      warnings: [],
      trace: {
        coordinate_source: "tree_bounds",
        gesture: "input_swipe_same_point"
      }
    });

    expect(validate(envelope)).toBe(true);
  });

  it("validates a golden text input response", async () => {
    const schema = JSON.parse(await readFile(join(process.cwd(), "schemas/text-input-response.schema.json"), "utf8"));
    const ajv = await createAjv();
    const validate = ajv.compile(schema);
    const envelope = ResponseEnvelopeSchema(TextInputResultSchema).parse({
      schema_version: "0.1",
      runtime_version: "0.3.0",
      request_id: "req-text",
      ok: true,
      command: "text.input",
      duration_ms: 10,
      result: {
        charset: "adb_shell_printable_ascii", via: "input_text",
        text_length: 11, encoded_length: 12, codepoint_length: 11,
        verify: {
          policy: "none",
          ok: true,
          attempts: 0,
          reason: "verification disabled",
          changed_fields: []
        }
      },
      error: null,
      warnings: [],
      trace: { text_length: 11 }
    });

    expect(validate(envelope)).toBe(true);
  });

  it("validates a golden text clear response", async () => {
    const schema = JSON.parse(await readFile(join(process.cwd(), "schemas/text-clear-response.schema.json"), "utf8"));
    const ajv = await createAjv();
    const validate = ajv.compile(schema);
    const envelope = ResponseEnvelopeSchema(TextClearResultSchema).parse({
      schema_version: "0.1",
      runtime_version: "0.3.0",
      request_id: "req-text-clear",
      ok: true,
      command: "text.clear",
      duration_ms: 10,
      result: {
        strategy: "move_end_then_backspace",
        max_chars: 64,
        key_events: {
          move_end: 1,
          delete: 64,
          total: 65
        },
        verify: {
          policy: "none",
          ok: true,
          attempts: 0,
          reason: "verification disabled; clear is best-effort and does not prove field emptiness",
          changed_fields: []
        }
      },
      error: null,
      warnings: ["text clear is best-effort; field emptiness is not confirmed"],
      trace: { max_chars: 64 }
    });

    expect(validate(envelope)).toBe(true);
  });
});
