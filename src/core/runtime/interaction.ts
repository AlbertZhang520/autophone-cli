import {
  AutophoneError,
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
  type WaitAppRequest,
  type WaitAppResult,
  type WaitUiRequest,
  type WaitUiResult
} from "../../contracts/index.js";
import { codepointLength } from "./text-encoding.js";
import type { AndroidDriver } from "./types.js";
import { APP_LAUNCH_VERIFY_INTERVAL_MS, APP_STOP_VERIFY_INTERVAL_MS, APP_VERIFY_MAX_ATTEMPTS, APP_VERIFY_SETTLE_MS, DEVICE_READY_VERIFY_INTERVAL_MS, KEYCODES, LOG_DUMP_BUFFERS, LOG_DUMP_MAX_LINE_CHARS, LOG_DUMP_MAX_PID_COUNT, LOG_DUMP_MAX_TOTAL_CHARS, ORIENTATION_SET_VERIFY_MAX_ATTEMPTS, ORIENTATION_SET_VERIFY_SETTLE_MS, SCROLL_VERIFY_SETTLE_MS, VERIFY_MAX_ATTEMPTS, VERIFY_SETTLE_MS, assertDragDistance, boundNotifications, capLogLines, createLogCapState, describeDeviceReadyReason, describeHttpUrl, getChangedFields, isDeviceAwake, isDeviceReady, isScreenUnlocked, normalizeActivityName, normalizeDisplayPower, planScrollGestureForScope, readPngDimensions, remainingDeviceReadyTimeoutMs, remainingWaitMs, isWaitBudgetPollTimeout, resolveDragEndpoint, resolveSingleUiActionTarget, sleep, sleepUntilNextAttempt, verifyDoubleTap, verifyDrag, verifyLongPress, verifyTap } from "./shared.js";
import { findCandidates } from "../selector.js";
import type { ScrollWithinResolution } from "./shared.js";
export { textInput } from "./text-input.js";

export async function keyPress(driver: AndroidDriver, request: KeyPressRequest): Promise<KeyPressResult> {
  const keycode = KEYCODES[request.key];

  if (request.verify === "none") {
    await driver.keyEvent(keycode, {
      deviceSerial: request.device_serial,
      timeoutMs: request.timeout_ms
    });
    return {
      key: request.key,
      keycode,
      before: null,
      after: null,
      verify: {
        policy: "none",
        ok: true,
        attempts: 0,
        reason: "verification explicitly disabled",
        changed_fields: []
      }
    };
  }

  const before = await driver.observe({
    deviceSerial: request.device_serial,
    timeoutMs: request.timeout_ms
  });
  await driver.keyEvent(keycode, {
    deviceSerial: request.device_serial,
    timeoutMs: request.timeout_ms
  });

  let after = before;
  for (let attempt = 1; attempt <= VERIFY_MAX_ATTEMPTS; attempt += 1) {
    if (attempt > 1) {
      await sleep(VERIFY_SETTLE_MS);
    }
    after = await driver.observe({
      deviceSerial: request.device_serial,
      timeoutMs: request.timeout_ms
    });
    const changedFields = getChangedFields(before, after);
    if (changedFields.length > 0) {
      return {
        key: request.key,
        keycode,
        before,
        after,
        verify: {
          policy: "screen_changed",
          ok: true,
          attempts: attempt,
          reason: "snapshot hash, package, or activity changed",
          changed_fields: changedFields
        }
      };
    }
  }

  throw new AutophoneError({
    code: "VERIFY_FAILED",
    message: "key press completed but screen_changed verification did not observe a changed snapshot",
    retriable: false,
    details: {
      key: request.key,
      keycode,
      attempts: VERIFY_MAX_ATTEMPTS,
      before_snapshot_id: before.snapshot_id,
      after_snapshot_id: after.snapshot_id,
      ui_hash: before.ui_hash
    }
  });
}

export async function textClear(driver: AndroidDriver, request: TextClearRequest): Promise<TextClearResult> {
  if (request.verify === "none") {
    await driver.clearText(request.max_chars, {
      deviceSerial: request.device_serial,
      timeoutMs: request.timeout_ms
    });
    return {
      strategy: "move_end_then_backspace",
      max_chars: request.max_chars,
      key_events: {
        move_end: 1,
        delete: request.max_chars,
        total: request.max_chars + 1
      },
      verify: {
        policy: "none",
        ok: true,
        attempts: 0,
        reason: "verification disabled; clear is best-effort and does not prove field emptiness",
        changed_fields: []
      }
    };
  }

  const before = await driver.observe({
    deviceSerial: request.device_serial,
    timeoutMs: request.timeout_ms
  });
  await driver.clearText(request.max_chars, {
    deviceSerial: request.device_serial,
    timeoutMs: request.timeout_ms
  });

  if (request.verify === "field_text") {
    return clearFieldTextVerify(driver, request, before);
  }

  let after = before;
  for (let attempt = 1; attempt <= VERIFY_MAX_ATTEMPTS; attempt += 1) {
    if (attempt > 1) {
      await sleep(VERIFY_SETTLE_MS);
    }
    after = await driver.observe({
      deviceSerial: request.device_serial,
      timeoutMs: request.timeout_ms
    });
    const changedFields = getChangedFields(before, after);
    if (changedFields.length > 0) {
      return {
        strategy: "move_end_then_backspace",
        max_chars: request.max_chars,
        key_events: {
          move_end: 1,
          delete: request.max_chars,
          total: request.max_chars + 1
        },
        verify: {
          policy: "screen_changed",
          ok: true,
          attempts: attempt,
          reason: "snapshot hash, package, or activity changed; field emptiness is not confirmed",
          changed_fields: changedFields
        }
      };
    }
  }

  throw new AutophoneError({
    code: "VERIFY_FAILED",
    message: "text clear completed but screen_changed verification did not observe a changed snapshot",
    retriable: false,
    details: {
      policy: request.verify,
      strategy: "move_end_then_backspace",
      max_chars: request.max_chars,
      key_events: {
        move_end: 1,
        delete: request.max_chars,
        total: request.max_chars + 1
      },
      attempts: VERIFY_MAX_ATTEMPTS,
      before_snapshot_id: before.snapshot_id,
      after_snapshot_id: after.snapshot_id,
      ui_hash: before.ui_hash
    }
  });
}

// clear 的空值证明：只有聚焦字段可访问文本为空才算证实；
// 非空不抛错而是返回 ok:false 的结构化 unverified——非空文本可能是应用 hint 或语义
// 前缀，也可能是残留输入，仅凭可访问文本无法区分，误报失败与假成功同样有害。
async function clearFieldTextVerify(
  driver: AndroidDriver,
  request: TextClearRequest,
  before: Snapshot
): Promise<TextClearResult> {
  const baseline = before.elements.find((element) => element.focused === true)?.text ?? null;
  let finalText: string | null = null;
  let attempts = 0;
  for (let attempt = 1; attempt <= VERIFY_MAX_ATTEMPTS; attempt += 1) {
    attempts = attempt;
    if (attempt > 1) {
      await sleep(VERIFY_SETTLE_MS);
    }
    const after = await driver.observe({ deviceSerial: request.device_serial, timeoutMs: request.timeout_ms });
    finalText = after.elements.find((element) => element.focused === true)?.text ?? null;
    if (finalText === "") {
      return clearResult(request, true, attempt, "focused field accessibility text is empty after clear");
    }
  }
  // 全局不变量：failed verification is command failure。空值证明失败必须抛错，
  // 不能以 verify.ok:false 混在成功信封里让 agent 误继续（codex review P1）。
  // 细节标注 possible_app_hint_text：非空文本可能是应用 hint，字段未必真有残留。
  throw new AutophoneError({
    code: "VERIFY_FAILED",
    message: "text clear field_text verification could not prove the focused field is empty",
    retriable: false,
    details: {
      policy: "field_text",
      attempts,
      focused_element_observed: finalText !== null,
      baseline_codepoint_length: baseline === null ? null : codepointLength(baseline),
      final_codepoint_length: finalText === null ? null : codepointLength(finalText),
      possible_app_hint_text: true,
      strategy: "move_end_then_backspace",
      max_chars: request.max_chars
    }
  });
}

function clearResult(request: TextClearRequest, ok: true, attempts: number, reason: string): TextClearResult {
  return {
    strategy: "move_end_then_backspace",
    max_chars: request.max_chars,
    key_events: { move_end: 1, delete: request.max_chars, total: request.max_chars + 1 },
    verify: { policy: request.verify, ok, attempts, reason, changed_fields: [] }
  };
}

function resolveScrollWithin(snapshot: Snapshot, selector: ScrollRequest["within"]): ScrollWithinResolution | null {
  if (selector === undefined) {
    return null;
  }
  const candidates = findCandidates(snapshot, selector);
  if (candidates.length === 0) {
    throw new AutophoneError({
      code: "TARGET_NOT_FOUND",
      message: "scroll within selector matched no usable UI nodes",
      retriable: true,
      details: { selector }
    });
  }
  if (candidates.length > 1) {
    throw new AutophoneError({
      code: "AMBIGUOUS_TARGET",
      message: "scroll within selector matched multiple usable UI nodes",
      retriable: false,
      details: { selector, candidates }
    });
  }
  const [candidate] = candidates;
  if (candidate === undefined) {
    throw new AutophoneError({
      code: "INTERNAL",
      message: "scroll within candidate disappeared after candidate length check",
      retriable: false
    });
  }
  return { selector, candidate };
}

export async function scroll(driver: AndroidDriver, request: ScrollRequest): Promise<ScrollResult> {
  const before = await driver.observe({
    deviceSerial: request.device_serial,
    timeoutMs: request.timeout_ms
  });
  const within = resolveScrollWithin(before, request.within);
  const gesture = planScrollGestureForScope(before, request.direction, request.amount, within);

  await driver.swipe(gesture.start, gesture.end, request.duration_ms, {
    deviceSerial: request.device_serial,
    timeoutMs: request.timeout_ms
  });

  if (request.verify === "none") {
    return {
      direction: request.direction,
      amount: request.amount,
      finger_direction: gesture.fingerDirection,
      start: gesture.start,
      end: gesture.end,
      scope: gesture.scope,
      within,
      duration_ms: request.duration_ms,
      before,
      after: null,
      verify: {
        policy: "none",
        ok: true,
        reason: "verification disabled; scroll may be a no-op at a content boundary",
        attempts: 0,
        changed_fields: []
      }
    };
  }

  let after = before;
  for (let attempt = 1; attempt <= VERIFY_MAX_ATTEMPTS; attempt += 1) {
    await sleep(SCROLL_VERIFY_SETTLE_MS);
    after = await driver.observe({
      deviceSerial: request.device_serial,
      timeoutMs: request.timeout_ms
    });
    const changedFields = getChangedFields(before, after);
    if (changedFields.length > 0) {
      return {
        direction: request.direction,
        amount: request.amount,
        finger_direction: gesture.fingerDirection,
        start: gesture.start,
        end: gesture.end,
        scope: gesture.scope,
        within,
        duration_ms: request.duration_ms,
        before,
        after,
        verify: {
          policy: "screen_changed",
          ok: true,
          reason: "snapshot hash, package, or activity changed",
          attempts: attempt,
          changed_fields: changedFields
        }
      };
    }
  }

  throw new AutophoneError({
    code: "VERIFY_FAILED",
    message: "scroll completed but screen_changed verification did not observe a changed snapshot",
    retriable: false,
    details: {
      policy: request.verify,
      direction: request.direction,
      amount: request.amount,
      finger_direction: gesture.fingerDirection,
      scope: gesture.scope,
      within: within === null ? null : within.candidate,
      attempts: VERIFY_MAX_ATTEMPTS,
      before_snapshot_id: before.snapshot_id,
      after_snapshot_id: after.snapshot_id,
      ui_hash: before.ui_hash
    }
  });
}

export async function scrollUntil(driver: AndroidDriver, request: ScrollUntilRequest): Promise<ScrollUntilResult> {
  let current = await driver.observe({
    deviceSerial: request.device_serial,
    timeoutMs: request.timeout_ms
  });
  let within = resolveScrollWithin(current, request.within);
  let candidates = findCandidates(current, request.selector);
  if (candidates.length > 0) {
    return buildScrollUntilResult(request, current, candidates, 0, "found_initial", null);
  }

  let lastScroll: ScrollUntilResult["last_scroll"] = null;
  for (let scrolls = 1; scrolls <= request.max_scrolls; scrolls += 1) {
    const before = current;
    within = resolveScrollWithin(before, request.within);
    const gesture = planScrollGestureForScope(before, request.direction, request.amount, within);
    await driver.swipe(gesture.start, gesture.end, request.duration_ms, {
      deviceSerial: request.device_serial,
      timeoutMs: request.timeout_ms
    });
    await sleep(SCROLL_VERIFY_SETTLE_MS);
    current = await driver.observe({
      deviceSerial: request.device_serial,
      timeoutMs: request.timeout_ms
    });
    const changedFields = getChangedFields(before, current);
    lastScroll = {
      finger_direction: gesture.fingerDirection,
      start: gesture.start,
      end: gesture.end,
      scope: gesture.scope,
      within_candidate: within === null ? null : within.candidate,
      changed_fields: changedFields
    };
    candidates = findCandidates(current, request.selector);
    if (candidates.length > 0) {
      return buildScrollUntilResult(request, current, candidates, scrolls, "found_after_scroll", lastScroll);
    }
    if (changedFields.length === 0) {
      return buildScrollUntilResult(request, current, candidates, scrolls, "end_reached", lastScroll);
    }
  }

  return buildScrollUntilResult(request, current, candidates, request.max_scrolls, "budget_exhausted", lastScroll);
}

function buildScrollUntilResult(
  request: ScrollUntilRequest,
  snapshot: Snapshot,
  candidates: ScrollUntilResult["candidates"],
  scrolls: number,
  reason: ScrollUntilReason,
  lastScroll: ScrollUntilResult["last_scroll"]
): ScrollUntilResult {
  return {
    selector: request.selector,
    direction: request.direction,
    amount: request.amount,
    scope: request.within === undefined ? "window" : "element",
    within: request.within ?? null,
    max_scrolls: request.max_scrolls,
    duration_ms: request.duration_ms,
    scrolls,
    found: candidates.length > 0,
    reason,
    snapshot_id: snapshot.snapshot_id,
    device_serial: snapshot.device_serial,
    ui_hash: snapshot.ui_hash,
    count: candidates.length,
    total_elements: snapshot.elements.length,
    usable_only: true,
    candidates,
    last_scroll: lastScroll
  };
}


export async function tap(driver: AndroidDriver, request: TapRequest): Promise<TapResult> {
  const target = await resolveSingleUiActionTarget(driver, request, "tap");

  await driver.tap(target.point, {
    deviceSerial: request.device_serial,
    timeoutMs: request.timeout_ms
  });

  return verifyTap(driver, request, target.before, target.candidate, target.point);
}

export async function doubleTap(driver: AndroidDriver, request: DoubleTapRequest): Promise<DoubleTapResult> {
  const target = await resolveSingleUiActionTarget(driver, request, "double tap");

  await driver.doubleTap(target.point, request.interval_ms, {
    deviceSerial: request.device_serial,
    timeoutMs: request.timeout_ms
  });

  return verifyDoubleTap(driver, request, target.before, target.candidate, target.point);
}

export async function longPress(driver: AndroidDriver, request: LongPressRequest): Promise<LongPressResult> {
  const target = await resolveSingleUiActionTarget(driver, request, "long press");

  await driver.swipe(target.point, target.point, request.duration_ms, {
    deviceSerial: request.device_serial,
    timeoutMs: request.timeout_ms
  });

  return verifyLongPress(driver, request, target.before, target.candidate, target.point);
}

export async function drag(driver: AndroidDriver, request: DragRequest): Promise<DragResult> {
  const before = await driver.observe({
    deviceSerial: request.device_serial,
    timeoutMs: request.timeout_ms
  });
  const from = resolveDragEndpoint(before, request.from_selector, request.from_candidate_index, "source");
  const to = resolveDragEndpoint(before, request.to_selector, request.to_candidate_index, "destination");
  assertDragDistance(from.point, to.point);

  await driver.drag(from.point, to.point, request.duration_ms, request.gesture, {
    deviceSerial: request.device_serial,
    timeoutMs: request.timeout_ms
  });

  return verifyDrag(driver, request, before, from.candidate, to.candidate, from.point, to.point);
}
