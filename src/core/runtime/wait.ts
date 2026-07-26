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
  type TextInputRequest,
  type TextInputResult,
  type WaitAppRequest,
  type WaitAppResult,
  type WaitUiRequest,
  type WaitUiResult
} from "../../contracts/index.js";
import type { AndroidDriver } from "./types.js";
import { APP_LAUNCH_VERIFY_INTERVAL_MS, APP_STOP_VERIFY_INTERVAL_MS, APP_VERIFY_MAX_ATTEMPTS, APP_VERIFY_SETTLE_MS, DEVICE_READY_VERIFY_INTERVAL_MS, KEYCODES, LOG_DUMP_BUFFERS, LOG_DUMP_MAX_LINE_CHARS, LOG_DUMP_MAX_PID_COUNT, LOG_DUMP_MAX_TOTAL_CHARS, ORIENTATION_SET_VERIFY_MAX_ATTEMPTS, ORIENTATION_SET_VERIFY_SETTLE_MS, SCROLL_VERIFY_SETTLE_MS, TEXT_INPUT_CHARSET, VERIFY_MAX_ATTEMPTS, encodeTextForAdbInput, VERIFY_SETTLE_MS, assertDragDistance, boundNotifications, capLogLines, createLogCapState, describeDeviceReadyReason, describeHttpUrl, getChangedFields, isDeviceAwake, isDeviceReady, isScreenUnlocked, normalizeActivityName, normalizeDisplayPower, planScrollGestureForScope, readPngDimensions, remainingDeviceReadyTimeoutMs, remainingWaitMs, isWaitBudgetPollTimeout, resolveDragEndpoint, resolveSingleUiActionTarget, sleep, sleepUntilNextAttempt, verifyDoubleTap, verifyDrag, verifyLongPress, verifyTap } from "./shared.js";
import { findCandidates, findMatchingNodes, selectorDiagnostics } from "../selector.js";

export async function waitForUi(driver: AndroidDriver, request: WaitUiRequest): Promise<WaitUiResult> {
  const startedAt = Date.now();
  let attempts = 0;
  let lastSnapshot: Snapshot | undefined;

  while (remainingWaitMs(startedAt, request.wait_timeout_ms) > 0) {
    attempts += 1;
    const remainingBeforePoll = remainingWaitMs(startedAt, request.wait_timeout_ms);
    const pollTimeoutMs = Math.min(request.poll_timeout_ms, remainingBeforePoll);
    let snapshot: Snapshot;
    try {
      snapshot = await driver.observe({ deviceSerial: request.device_serial, timeoutMs: pollTimeoutMs });
    } catch (error) {
      if (isWaitBudgetPollTimeout(error, startedAt, request.wait_timeout_ms, remainingBeforePoll, pollTimeoutMs)) {
        break;
      }
      throw error;
    }
    lastSnapshot = snapshot;
    const candidates = findCandidates(snapshot, request.selector);
    const matchedNodes = findMatchingNodes(snapshot, request.selector);
    const conditionMet = request.condition === "present" ? candidates.length > 0 : matchedNodes.length === 0;
    if (conditionMet) {
      return {
        condition: { type: "ui", selector: request.selector, mode: request.condition },
        present: matchedNodes.length > 0,
        matched_nodes: matchedNodes.length,
        attempts,
        elapsed_ms: Date.now() - startedAt,
        snapshot_id: snapshot.snapshot_id,
        device_serial: snapshot.device_serial,
        selector_diagnostics: selectorDiagnostics(request.selector, candidates.length),
        count: candidates.length,
        total_elements: snapshot.elements.length,
        usable_only: true,
        candidates
      };
    }
    await sleepUntilNextAttempt(startedAt, request.wait_timeout_ms, request.interval_ms);
  }

  throw new AutophoneError({
    code: "WAIT_TIMEOUT",
    message:
      request.condition === "present"
        ? "UI wait timed out before selector matched usable candidates"
        : "UI wait timed out before selector became absent",
    retriable: true,
    details: {
      condition: "ui",
      mode: request.condition,
      selector: request.selector,
      attempts,
      elapsed_ms: Date.now() - startedAt,
      last_snapshot_id: lastSnapshot?.snapshot_id,
      selector_fingerprint: selectorDiagnostics(request.selector, 0).fingerprint,
      last_candidate_count: lastSnapshot ? findCandidates(lastSnapshot, request.selector).length : null
    }
  });
}

export async function waitForApp(driver: AndroidDriver, request: WaitAppRequest): Promise<WaitAppResult> {
  const startedAt = Date.now();
  let attempts = 0;
  let lastCurrent: AppCurrentResult | undefined;
  let deviceSerial = request.device_serial;
  const normalizedActivity =
    request.activity === undefined ? undefined : normalizeActivityName(request.package_name, request.activity);

  while (remainingWaitMs(startedAt, request.wait_timeout_ms) > 0) {
    attempts += 1;
    const remainingBeforePoll = remainingWaitMs(startedAt, request.wait_timeout_ms);
    const pollTimeoutMs = Math.min(request.poll_timeout_ms, remainingBeforePoll);
    let current: AppCurrentResult;
    try {
      current = await driver.currentApp({
        deviceSerial,
        timeoutMs: pollTimeoutMs
      });
    } catch (error) {
      if (isWaitBudgetPollTimeout(error, startedAt, request.wait_timeout_ms, remainingBeforePoll, pollTimeoutMs)) {
        break;
      }
      throw error;
    }
    deviceSerial = current.device_serial;
    lastCurrent = current;
    const packageMatches = current.package === request.package_name;
    const activityMatches = normalizedActivity === undefined || current.activity === normalizedActivity;
    if (packageMatches && activityMatches) {
      const condition =
        normalizedActivity === undefined
          ? { type: "app" as const, package_name: request.package_name }
          : { type: "app" as const, package_name: request.package_name, activity: normalizedActivity };
      return {
        condition,
        attempts,
        elapsed_ms: Date.now() - startedAt,
        current
      };
    }
    await sleepUntilNextAttempt(startedAt, request.wait_timeout_ms, request.interval_ms);
  }

  throw new AutophoneError({
    code: "WAIT_TIMEOUT",
    message: "app wait timed out before foreground app matched",
    retriable: true,
    details: {
      condition: "app",
      package_name: request.package_name,
      activity: normalizedActivity,
      attempts,
      elapsed_ms: Date.now() - startedAt,
      current: lastCurrent
    }
  });
}
