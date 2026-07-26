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
import type { AndroidDriver, DriverNotificationRecord } from "./types.js";
import { findCandidates } from "../selector.js";

export const VERIFY_MAX_ATTEMPTS = 3;
export const VERIFY_SETTLE_MS = 250;
export const SCROLL_VERIFY_SETTLE_MS = 400;
export const APP_VERIFY_MAX_ATTEMPTS = 5;
export const APP_VERIFY_SETTLE_MS = 500;
export const APP_LAUNCH_VERIFY_INTERVAL_MS = 500;
export const APP_STOP_VERIFY_INTERVAL_MS = 500;
export const DEVICE_READY_VERIFY_INTERVAL_MS = 300;
export const ORIENTATION_SET_VERIFY_MAX_ATTEMPTS = 3;
export const ORIENTATION_SET_VERIFY_SETTLE_MS = 150;
export const MIN_DRAG_DISTANCE_PX = 8;
export const LOG_DUMP_MAX_PID_COUNT = 16;
export const LOG_DUMP_MAX_LINE_CHARS = 2000;
export const LOG_DUMP_MAX_TOTAL_CHARS = 200_000;
export const LOG_DUMP_BUFFERS = ["main", "system", "crash"] as const;
export const MIN_SCROLL_WINDOW_SIZE = 80;
export const TEXT_INPUT_CHARSET = "adb_shell_printable_ascii" as const;
export const ADB_INPUT_TEXT_UNESCAPED_PATTERN = /^[A-Za-z0-9.,_@-]$/;
export const HORIZONTAL_EDGE_INSET_PX = 16;
export const VERTICAL_EDGE_INSET_PX = 24;
export const HORIZONTAL_EDGE_INSET_RATIO = 0.15;
export const VERTICAL_EDGE_INSET_RATIO = 0.18;
export const SCROLL_AMOUNT_FRACTIONS = {
  small: 0.35,
  medium: 0.55,
  large: 0.75
} satisfies Record<ScrollAmount, number>;

export const KEYCODES = {
  BACK: "KEYCODE_BACK",
  HOME: "KEYCODE_HOME",
  ENTER: "KEYCODE_ENTER",
  TAB: "KEYCODE_TAB",
  ESCAPE: "KEYCODE_ESCAPE",
  DEL: "KEYCODE_DEL",
  DPAD_UP: "KEYCODE_DPAD_UP",
  DPAD_DOWN: "KEYCODE_DPAD_DOWN",
  DPAD_LEFT: "KEYCODE_DPAD_LEFT",
  DPAD_RIGHT: "KEYCODE_DPAD_RIGHT",
  DPAD_CENTER: "KEYCODE_DPAD_CENTER",
  APP_SWITCH: "KEYCODE_APP_SWITCH",
  MOVE_HOME: "KEYCODE_MOVE_HOME",
  MOVE_END: "KEYCODE_MOVE_END",
  MENU: "KEYCODE_MENU",
  SEARCH: "KEYCODE_SEARCH"
} satisfies Record<KeyName, string>;

export const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
export const PNG_IHDR_TOTAL_LENGTH = PNG_SIGNATURE.byteLength + 25;

export type UiActionTargetRequest = {
  selector?: TapRequest["selector"] | undefined;
  raw_point?: Point | undefined;
  candidate_index?: number | undefined;
  allow_unsafe_raw_point: boolean;
  device_serial?: string | undefined;
  timeout_ms: number;
};

export type ResolvedUiActionTarget = {
  before: Snapshot;
  candidate: TapResult["candidate"];
  point: Point;
};

export async function resolveSingleUiActionTarget(
  driver: AndroidDriver,
  request: UiActionTargetRequest,
  actionName: "tap" | "double tap" | "long press"
): Promise<ResolvedUiActionTarget> {
  if (request.raw_point !== undefined && request.candidate_index !== undefined) {
    throw new AutophoneError({
      code: "INVALID_REQUEST",
      message: "candidate_index cannot be combined with raw coordinates",
      retriable: false,
      details: {
        raw_point: request.raw_point,
        candidate_index: request.candidate_index
      }
    });
  }

  if (request.raw_point !== undefined && !request.allow_unsafe_raw_point) {
    throw new AutophoneError({
      code: "UNSAFE_OPERATION",
      message: "raw coordinates require allow_unsafe_raw_point",
      retriable: false,
      details: { raw_point: request.raw_point }
    });
  }

  if (request.raw_point === undefined && request.selector === undefined) {
    throw new AutophoneError({
      code: "INVALID_REQUEST",
      message: `${actionName} requires a selector or an unsafe raw point`,
      retriable: false
    });
  }

  const before = await driver.observe({
    deviceSerial: request.device_serial,
    timeoutMs: request.timeout_ms
  });

  if (request.raw_point !== undefined) {
    return {
      before,
      candidate: null,
      point: request.raw_point
    };
  }

  const selector = request.selector;
  if (selector === undefined) {
    throw new AutophoneError({
      code: "INVALID_REQUEST",
      message: `${actionName} requires a selector or an unsafe raw point`,
      retriable: false
    });
  }

  const candidates = findCandidates(before, selector);
  if (request.candidate_index !== undefined) {
    const candidate = candidates.find((item) => item.candidate_index === request.candidate_index);
    if (candidate === undefined) {
      throw new AutophoneError({
        code: "TARGET_NOT_FOUND",
        message: "selector matched no usable UI node with the requested candidate_index",
        retriable: true,
        details: {
          selector: request.selector,
          candidate_index: request.candidate_index,
          candidates
        }
      });
    }

    return {
      before,
      candidate,
      point: candidate.center
    };
  }

  if (candidates.length === 0) {
    throw new AutophoneError({
      code: "TARGET_NOT_FOUND",
      message: "selector matched no usable UI nodes",
      retriable: true,
      details: { selector: request.selector }
    });
  }

  if (candidates.length > 1) {
    throw new AutophoneError({
      code: "AMBIGUOUS_TARGET",
      message: "selector matched multiple usable UI nodes",
      retriable: false,
      details: { selector: request.selector, candidates }
    });
  }

  const [candidate] = candidates;
  if (candidate === undefined) {
    throw new AutophoneError({
      code: "INTERNAL",
      message: "candidate disappeared after candidate length check",
      retriable: false
    });
  }

  return {
    before,
    candidate,
    point: candidate.center
  };
}

export type DragEndpointRole = "source" | "destination";

export function resolveDragEndpoint(
  snapshot: Snapshot,
  selector: DragRequest["from_selector"],
  candidateIndex: number | undefined,
  role: DragEndpointRole
): { candidate: NonNullable<DragResult["from_candidate"]>; point: Point } {
  const candidates = findCandidates(snapshot, selector);
  if (candidateIndex !== undefined) {
    const candidate = candidates.find((item) => item.candidate_index === candidateIndex);
    if (candidate === undefined) {
      throw new AutophoneError({
        code: "TARGET_NOT_FOUND",
        message: `drag ${role} selector matched no usable UI node with the requested candidate_index`,
        retriable: true,
        details: {
          selector,
          candidate_index: candidateIndex,
          candidates
        }
      });
    }

    return {
      candidate,
      point: candidate.center
    };
  }

  if (candidates.length === 0) {
    throw new AutophoneError({
      code: "TARGET_NOT_FOUND",
      message: `drag ${role} selector matched no usable UI nodes`,
      retriable: true,
      details: { selector }
    });
  }

  if (candidates.length > 1) {
    throw new AutophoneError({
      code: "AMBIGUOUS_TARGET",
      message: `drag ${role} selector matched multiple usable UI nodes`,
      retriable: false,
      details: { selector, candidates }
    });
  }

  const [candidate] = candidates;
  if (candidate === undefined) {
    throw new AutophoneError({
      code: "INTERNAL",
      message: "drag candidate disappeared after candidate length check",
      retriable: false
    });
  }

  return {
    candidate,
    point: candidate.center
  };
}

export function assertDragDistance(start: Point, end: Point): void {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  if (dx * dx + dy * dy >= MIN_DRAG_DISTANCE_PX * MIN_DRAG_DISTANCE_PX) {
    return;
  }
  throw new AutophoneError({
    code: "INVALID_REQUEST",
    message: "drag start and end points are too close",
    retriable: false,
    details: {
      start,
      end,
      min_distance_px: MIN_DRAG_DISTANCE_PX
    }
  });
}

export async function verifyTap(
  driver: AndroidDriver,
  request: TapRequest,
  before: Snapshot,
  candidate: TapResult["candidate"],
  point: Point
): Promise<TapResult> {
  if (request.verify === "none") {
    return {
      candidate,
      point,
      before,
      after: null,
      verify: {
        policy: "none",
        ok: true,
        reason: "verification explicitly disabled",
        attempts: 0,
        changed_fields: []
      }
    };
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
        candidate,
        point,
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
    message: "tap completed but screen_changed verification did not observe a changed snapshot",
    retriable: false,
    details: {
      policy: request.verify,
      attempts: VERIFY_MAX_ATTEMPTS,
      before_snapshot_id: before.snapshot_id,
      after_snapshot_id: after.snapshot_id,
      ui_hash: before.ui_hash
    }
  });
}

export async function verifyDoubleTap(
  driver: AndroidDriver,
  request: DoubleTapRequest,
  before: Snapshot,
  candidate: DoubleTapResult["candidate"],
  point: Point
): Promise<DoubleTapResult> {
  if (request.verify === "none") {
    return {
      candidate,
      point,
      interval_ms: request.interval_ms,
      before,
      after: null,
      verify: {
        policy: "none",
        ok: true,
        reason: "verification explicitly disabled",
        attempts: 0,
        changed_fields: []
      }
    };
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
        candidate,
        point,
        interval_ms: request.interval_ms,
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
    message: "double tap completed but screen_changed verification did not observe a changed snapshot",
    retriable: false,
    details: {
      policy: request.verify,
      interval_ms: request.interval_ms,
      attempts: VERIFY_MAX_ATTEMPTS,
      before_snapshot_id: before.snapshot_id,
      after_snapshot_id: after.snapshot_id,
      ui_hash: before.ui_hash
    }
  });
}

export async function verifyDrag(
  driver: AndroidDriver,
  request: DragRequest,
  before: Snapshot,
  fromCandidate: DragResult["from_candidate"],
  toCandidate: DragResult["to_candidate"],
  start: Point,
  end: Point
): Promise<DragResult> {
  if (request.verify === "none") {
    return {
      from_candidate: fromCandidate,
      to_candidate: toCandidate,
      start,
      end,
      gesture: request.gesture,
      duration_ms: request.duration_ms,
      before,
      after: null,
      verify: {
        policy: "none",
        ok: true,
        reason: "verification explicitly disabled",
        attempts: 0,
        changed_fields: []
      }
    };
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
        from_candidate: fromCandidate,
        to_candidate: toCandidate,
        start,
        end,
        gesture: request.gesture,
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
    message: "drag completed but screen_changed verification did not observe a changed snapshot",
    retriable: false,
    details: {
      policy: request.verify,
      gesture: request.gesture,
      duration_ms: request.duration_ms,
      attempts: VERIFY_MAX_ATTEMPTS,
      before_snapshot_id: before.snapshot_id,
      after_snapshot_id: after.snapshot_id,
      ui_hash: before.ui_hash,
      start,
      end
    }
  });
}

export async function verifyLongPress(
  driver: AndroidDriver,
  request: LongPressRequest,
  before: Snapshot,
  candidate: LongPressResult["candidate"],
  point: Point
): Promise<LongPressResult> {
  if (request.verify === "none") {
    return {
      candidate,
      point,
      duration_ms: request.duration_ms,
      before,
      after: null,
      verify: {
        policy: "none",
        ok: true,
        reason: "verification explicitly disabled",
        attempts: 0,
        changed_fields: []
      }
    };
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
        candidate,
        point,
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
    message: "long press completed but screen_changed verification did not observe a changed snapshot",
    retriable: false,
    details: {
      policy: request.verify,
      duration_ms: request.duration_ms,
      attempts: VERIFY_MAX_ATTEMPTS,
      before_snapshot_id: before.snapshot_id,
      after_snapshot_id: after.snapshot_id,
      ui_hash: before.ui_hash
    }
  });
}

export function getChangedFields(before: Snapshot, after: Snapshot): Array<"ui_hash" | "package" | "activity"> {
  const fields: Array<"ui_hash" | "package" | "activity"> = [];
  if (after.ui_hash !== before.ui_hash) {
    fields.push("ui_hash");
  }
  if (after.package !== before.package) {
    fields.push("package");
  }
  if (after.activity !== before.activity) {
    fields.push("activity");
  }
  return fields;
}

export type PlannedScrollGesture = {
  direction: ScrollDirection;
  amount: ScrollAmount;
  scope: "window" | "element";
  fingerDirection: ScrollDirection;
  start: Point;
  end: Point;
};

export type ScrollWithinResolution = NonNullable<ScrollResult["within"]>;

export type ScrollGestureRegion = {
  kind: "window" | "element";
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
  snapshotId: string;
  windowSize?: [number, number] | null | undefined;
  orientation?: Snapshot["orientation"] | undefined;
  bounds?: Bounds | undefined;
  clippedBounds?: Bounds | undefined;
};

export function planScrollGesture(
  snapshot: Pick<Snapshot, "window_size" | "orientation" | "snapshot_id">,
  direction: ScrollDirection,
  amount: ScrollAmount
): PlannedScrollGesture {
  const windowSize = normalizeWindowSize(snapshot);
  if (windowSize === null) {
    throw new AutophoneError({
      code: "WINDOW_SIZE_UNAVAILABLE",
      message: "scroll requires a usable observed window size",
      retriable: true,
      details: {
        snapshot_id: snapshot.snapshot_id,
        window_size: snapshot.window_size,
        orientation: snapshot.orientation
      }
    });
  }

  const [width, height] = windowSize;
  return planScrollGestureInRegion(
    {
      kind: "window",
      left: 0,
      top: 0,
      right: width - 1,
      bottom: height - 1,
      width,
      height,
      snapshotId: snapshot.snapshot_id,
      windowSize: snapshot.window_size,
      orientation: snapshot.orientation
    },
    direction,
    amount
  );
}

export function planScrollGestureForScope(
  snapshot: Pick<Snapshot, "window_size" | "orientation" | "snapshot_id">,
  direction: ScrollDirection,
  amount: ScrollAmount,
  within: ScrollWithinResolution | null
): PlannedScrollGesture {
  if (within === null) {
    return planScrollGesture(snapshot, direction, amount);
  }
  return planScrollGestureInRegion(regionFromBounds(snapshot, within.candidate.bounds), direction, amount);
}

export function regionFromBounds(
  snapshot: Pick<Snapshot, "window_size" | "orientation" | "snapshot_id">,
  bounds: Bounds | null
): ScrollGestureRegion {
  if (bounds === null) {
    throw new AutophoneError({
      code: "SCROLL_REGION_TOO_SMALL",
      message: "scroll within selector resolved to a UI node without usable bounds",
      retriable: true,
      details: {
        snapshot_id: snapshot.snapshot_id,
        bounds
      }
    });
  }
  const windowSize = normalizeWindowSize(snapshot);
  if (windowSize === null) {
    throw new AutophoneError({
      code: "WINDOW_SIZE_UNAVAILABLE",
      message: "scroll within requires a usable observed window size",
      retriable: true,
      details: {
        snapshot_id: snapshot.snapshot_id,
        window_size: snapshot.window_size,
        orientation: snapshot.orientation
      }
    });
  }
  const [left, top, rightExclusive, bottomExclusive] = bounds;
  const [windowWidth, windowHeight] = windowSize;
  const clippedLeft = Math.max(0, left);
  const clippedTop = Math.max(0, top);
  const clippedRightExclusive = Math.min(windowWidth, rightExclusive);
  const clippedBottomExclusive = Math.min(windowHeight, bottomExclusive);
  const width = clippedRightExclusive - clippedLeft;
  const height = clippedBottomExclusive - clippedTop;
  return {
    kind: "element",
    left: clippedLeft,
    top: clippedTop,
    right: clippedRightExclusive - 1,
    bottom: clippedBottomExclusive - 1,
    width,
    height,
    snapshotId: snapshot.snapshot_id,
    windowSize: snapshot.window_size,
    orientation: snapshot.orientation,
    bounds,
    clippedBounds: [clippedLeft, clippedTop, clippedRightExclusive, clippedBottomExclusive]
  };
}

export function planScrollGestureInRegion(
  region: ScrollGestureRegion,
  direction: ScrollDirection,
  amount: ScrollAmount
): PlannedScrollGesture {
  if (region.kind === "element" && (region.width < MIN_SCROLL_WINDOW_SIZE || region.height < MIN_SCROLL_WINDOW_SIZE)) {
    throw new AutophoneError({
      code: "SCROLL_REGION_TOO_SMALL",
      message: "scroll within selector bounds are too small for a safe scroll gesture",
      retriable: true,
      details: {
          snapshot_id: region.snapshotId,
          bounds: region.bounds,
          clipped_bounds: region.clippedBounds,
          effective_region_size: [region.width, region.height],
          min_region_size: [MIN_SCROLL_WINDOW_SIZE, MIN_SCROLL_WINDOW_SIZE]
      }
    });
  }

  const horizontalInset = Math.max(HORIZONTAL_EDGE_INSET_PX, Math.round(region.width * HORIZONTAL_EDGE_INSET_RATIO));
  const verticalInset = Math.max(VERTICAL_EDGE_INSET_PX, Math.round(region.height * VERTICAL_EDGE_INSET_RATIO));
  const left = region.left + horizontalInset;
  const right = region.right - horizontalInset;
  const top = region.top + verticalInset;
  const bottom = region.bottom - verticalInset;

  if (right <= left || bottom <= top) {
    if (region.kind === "element") {
      throw new AutophoneError({
        code: "SCROLL_REGION_TOO_SMALL",
        message: "scroll within selector bounds are too small for a safe scroll gesture",
        retriable: true,
        details: {
          snapshot_id: region.snapshotId,
          bounds: region.bounds,
          clipped_bounds: region.clippedBounds,
          effective_region_size: [region.width, region.height],
          min_region_size: [MIN_SCROLL_WINDOW_SIZE, MIN_SCROLL_WINDOW_SIZE],
          safe_insets: {
            left: horizontalInset,
            right: horizontalInset,
            top: verticalInset,
            bottom: verticalInset
          }
        }
      });
    }
    throw new AutophoneError({
      code: "WINDOW_SIZE_UNAVAILABLE",
      message: "observed window size is too small for a safe scroll gesture",
      retriable: true,
      details: {
        snapshot_id: region.snapshotId,
        window_size: region.windowSize,
        effective_window_size: [region.width, region.height],
        min_window_size: [MIN_SCROLL_WINDOW_SIZE, MIN_SCROLL_WINDOW_SIZE],
        safe_insets: {
          left: horizontalInset,
          right: horizontalInset,
          top: verticalInset,
          bottom: verticalInset
        }
      }
    });
  }

  const centerX = Math.round((left + right) / 2);
  const centerY = Math.round((top + bottom) / 2);
  const verticalDistance = Math.max(1, Math.round((bottom - top) * SCROLL_AMOUNT_FRACTIONS[amount]));
  const horizontalDistance = Math.max(1, Math.round((right - left) * SCROLL_AMOUNT_FRACTIONS[amount]));
  const [lowY, highY] = centeredSegment(top, bottom, verticalDistance);
  const [lowX, highX] = centeredSegment(left, right, horizontalDistance);

  if (direction === "down") {
    return {
      direction,
      amount,
      scope: region.kind,
      fingerDirection: "up",
      start: [centerX, highY],
      end: [centerX, lowY]
    };
  }
  if (direction === "up") {
    return {
      direction,
      amount,
      scope: region.kind,
      fingerDirection: "down",
      start: [centerX, lowY],
      end: [centerX, highY]
    };
  }
  if (direction === "right") {
    return {
      direction,
      amount,
      scope: region.kind,
      fingerDirection: "left",
      start: [highX, centerY],
      end: [lowX, centerY]
    };
  }
  return {
    direction,
    amount,
    scope: region.kind,
    fingerDirection: "right",
    start: [lowX, centerY],
    end: [highX, centerY]
  };
}

export function normalizeWindowSize(snapshot: Pick<Snapshot, "window_size" | "orientation">): [number, number] | null {
  if (snapshot.window_size === null) {
    return null;
  }
  const [rawWidth, rawHeight] = snapshot.window_size;
  const shouldSwap =
    (snapshot.orientation === "landscape" && rawHeight > rawWidth) ||
    (snapshot.orientation === "portrait" && rawWidth > rawHeight);
  const width = shouldSwap ? rawHeight : rawWidth;
  const height = shouldSwap ? rawWidth : rawHeight;

  if (width < MIN_SCROLL_WINDOW_SIZE || height < MIN_SCROLL_WINDOW_SIZE) {
    return null;
  }
  return [width, height];
}

export function centeredSegment(min: number, max: number, distance: number): [number, number] {
  const boundedDistance = Math.min(distance, max - min);
  const center = Math.round((min + max) / 2);
  let low = center - Math.floor(boundedDistance / 2);
  let high = low + boundedDistance;

  if (low < min) {
    high += min - low;
    low = min;
  }
  if (high > max) {
    low -= high - max;
    high = max;
  }

  return [low, high];
}

export function isDeviceAwake(state: DeviceReadyState): boolean {
  return state.awake === true || state.interactive === true;
}

export function isScreenUnlocked(state: DeviceReadyState): boolean {
  return isDeviceAwake(state) && state.keyguard_showing === false;
}

export function normalizeDisplayPower(state: DeviceReadyState): DeviceScreenDisplayPower {
  switch (state.display_power_state) {
    case "ON":
      return "on";
    case "OFF":
      return "off";
    case "DOZE":
    case "DOZE_SUSPEND":
      return "doze";
    default:
      break;
  }
  switch (state.wakefulness) {
    case "Awake":
    case "Dreaming":
      return "on";
    case "Asleep":
      return "off";
    case "Dozing":
      return "doze";
    default:
      break;
  }
  if (state.interactive === true) {
    return "on";
  }
  return "unknown";
}

export function isDeviceReady(state: DeviceReadyState): boolean {
  return isDeviceAwake(state) && state.keyguard_showing !== true;
}

export function describeDeviceReadyReason(state: DeviceReadyState): string {
  if (state.awake === true) {
    return "device is awake and keyguard is not showing";
  }
  return "device is interactive and keyguard is not showing";
}

export function remainingDeviceReadyTimeoutMs(
  startedAt: number,
  timeoutMs: number,
  details: Record<string, unknown>
): number {
  const remaining = remainingWaitMs(startedAt, timeoutMs);
  if (remaining <= 0) {
    throw new AutophoneError({
      code: "DEVICE_NOT_READY",
      message: "device readiness budget expired before the next adb command could start",
      retriable: true,
      details
    });
  }
  return remaining;
}

export function encodeTextForAdbInput(text: string): string {
  let encoded = "";
  for (const char of text) {
    if (char === " ") {
      encoded += "%s";
    } else if (ADB_INPUT_TEXT_UNESCAPED_PATTERN.test(char)) {
      encoded += char;
    } else {
      encoded += `\\${char}`;
    }
  }
  return encoded;
}

export function describeHttpUrl(url: string): AppOpenUrlResult["requested"] {
  const parsed = new URL(url);
  return {
    scheme: parsed.protocol === "https:" ? "https" : "http",
    hostname: parsed.hostname,
    port: parsed.port.length === 0 ? null : parsed.port,
    path_present: parsed.pathname !== "/",
    query_present: parsed.search.length > 0,
    fragment_present: parsed.hash.length > 0,
    url_length: url.length
  };
}

export type LogCapState = {
  totalChars: number;
  exhausted: boolean;
};

export type LogCapResult = {
  lines: string[];
  truncated: {
    lines: boolean;
    chars: boolean;
    line_chars: boolean;
  };
};

export function createLogCapState(): LogCapState {
  return {
    totalChars: 0,
    exhausted: false
  };
}

export function capLogLines(lines: readonly string[], state: LogCapState): LogCapResult {
  const capped: string[] = [];
  const truncated = {
    lines: false,
    chars: false,
    line_chars: false
  };

  for (const rawLine of lines) {
    if (state.exhausted) {
      truncated.lines = true;
      truncated.chars = true;
      break;
    }

    let line = rawLine;
    if (line.length > LOG_DUMP_MAX_LINE_CHARS) {
      line = line.slice(0, LOG_DUMP_MAX_LINE_CHARS);
      truncated.line_chars = true;
    }

    const remainingChars = LOG_DUMP_MAX_TOTAL_CHARS - state.totalChars;
    if (remainingChars <= 0) {
      state.exhausted = true;
      truncated.lines = true;
      truncated.chars = true;
      break;
    }

    if (line.length > remainingChars) {
      capped.push(line.slice(0, remainingChars));
      state.totalChars += remainingChars;
      state.exhausted = true;
      truncated.lines = true;
      truncated.chars = true;
      break;
    }

    capped.push(line);
    state.totalChars += line.length;
  }

  if (capped.length < lines.length) {
    truncated.lines = true;
  }

  return { lines: capped, truncated };
}

export type NotificationBoundState = {
  totalChars: number;
  charsExhausted: boolean;
  fieldTruncated: boolean;
};

export function boundNotifications(
  notifications: readonly DriverNotificationRecord[],
  request: Pick<DeviceNotificationsRequest, "max_notifications" | "max_field_chars" | "max_total_chars">
): {
  notifications: DeviceNotificationRecord[];
  truncated: DeviceNotificationsResult["truncated"];
} {
  const state: NotificationBoundState = {
    totalChars: 0,
    charsExhausted: false,
    fieldTruncated: false
  };
  const bounded: DeviceNotificationRecord[] = [];
  const candidates = notifications.slice(0, request.max_notifications);
  for (const notification of candidates) {
    if (state.charsExhausted) {
      break;
    }
    const capped = boundNotification(notification, request, state);
    if (capped !== null) {
      bounded.push(capped);
    }
  }

  return {
    notifications: bounded,
    truncated: {
      notifications: bounded.length < notifications.length,
      chars: state.charsExhausted,
      fields: state.fieldTruncated
    }
  };
}

export function boundNotification(
  notification: DriverNotificationRecord,
  request: Pick<DeviceNotificationsRequest, "max_field_chars" | "max_total_chars">,
  state: NotificationBoundState
): DeviceNotificationRecord | null {
  let truncated = false;
  const capText = (value: string | null): string | null => {
    const capped = boundNotificationString(value, request, state);
    truncated = truncated || capped.truncated;
    return capped.value;
  };
  const capMetadata = (value: string | null): string | null => {
    const capped = boundNotificationMetadataString(value, request.max_field_chars);
    truncated = truncated || capped.truncated;
    return capped.value;
  };
  const cappedKey = boundNotificationMetadataString(notification.key, request.max_field_chars);
  truncated = truncated || cappedKey.truncated;

  const bounded: DeviceNotificationRecord = {
    ...notification,
    key: cappedKey.value ?? notification.key.slice(0, request.max_field_chars),
    tag: capMetadata(notification.tag),
    channel_id: capMetadata(notification.channel_id),
    group_key: capMetadata(notification.group_key),
    category: capMetadata(notification.category),
    title: capText(notification.title),
    text: capText(notification.text),
    sub_text: capText(notification.sub_text),
    big_text: capText(notification.big_text),
    truncated
  };
  if (state.charsExhausted && bounded.title === null && bounded.text === null && bounded.sub_text === null && bounded.big_text === null) {
    return null;
  }
  return bounded;
}

export function boundNotificationMetadataString(value: string | null, maxFieldChars: number): { value: string | null; truncated: boolean } {
  if (value === null || value.length <= maxFieldChars) {
    return { value, truncated: false };
  }
  return { value: value.slice(0, maxFieldChars), truncated: true };
}

export function boundNotificationString(
  value: string | null,
  request: Pick<DeviceNotificationsRequest, "max_field_chars" | "max_total_chars">,
  state: NotificationBoundState
): { value: string | null; truncated: boolean } {
  if (value === null) {
    return { value: null, truncated: false };
  }
  if (state.charsExhausted) {
    return { value: null, truncated: true };
  }

  let next = value;
  let truncated = false;
  if (next.length > request.max_field_chars) {
    next = next.slice(0, request.max_field_chars);
    truncated = true;
    state.fieldTruncated = true;
  }

  const remaining = request.max_total_chars - state.totalChars;
  if (remaining <= 0) {
    state.charsExhausted = true;
    return { value: null, truncated: true };
  }
  if (next.length > remaining) {
    next = next.slice(0, remaining);
    state.totalChars += remaining;
    state.charsExhausted = true;
    return { value: next, truncated: true };
  }

  state.totalChars += next.length;
  return { value: next, truncated };
}

export function readPngDimensions(buffer: Buffer): { width: number; height: number } {
  if (buffer.byteLength < PNG_SIGNATURE.byteLength || !buffer.subarray(0, PNG_SIGNATURE.byteLength).equals(PNG_SIGNATURE)) {
    throw new AutophoneError({
      code: "SCREENSHOT_INVALID",
      message: "screencap did not return a valid PNG",
      retriable: true,
      details: {
        bytes: buffer.byteLength,
        expected_magic: PNG_SIGNATURE.toString("hex"),
        actual_magic: buffer.subarray(0, PNG_SIGNATURE.byteLength).toString("hex")
      }
    });
  }
  if (buffer.byteLength < PNG_IHDR_TOTAL_LENGTH) {
    throw new AutophoneError({
      code: "SCREENSHOT_INVALID",
      message: "screencap PNG is missing a complete IHDR chunk",
      retriable: true,
      details: {
        bytes: buffer.byteLength,
        required_bytes: PNG_IHDR_TOTAL_LENGTH
      }
    });
  }
  const ihdrLength = buffer.readUInt32BE(PNG_SIGNATURE.byteLength);
  const chunkType = buffer.subarray(PNG_SIGNATURE.byteLength + 4, PNG_SIGNATURE.byteLength + 8).toString("ascii");
  if (ihdrLength !== 13 || chunkType !== "IHDR") {
    throw new AutophoneError({
      code: "SCREENSHOT_INVALID",
      message: "screencap PNG is missing a valid IHDR chunk",
      retriable: true,
      details: {
        bytes: buffer.byteLength,
        ihdr_length: ihdrLength,
        chunk_type: chunkType
      }
    });
  }
  const width = buffer.readUInt32BE(PNG_SIGNATURE.byteLength + 8);
  const height = buffer.readUInt32BE(PNG_SIGNATURE.byteLength + 12);
  if (width <= 0 || height <= 0) {
    throw new AutophoneError({
      code: "SCREENSHOT_INVALID",
      message: "screencap PNG IHDR dimensions must be positive",
      retriable: true,
      details: {
        width_px: width,
        height_px: height
      }
    });
  }
  return { width, height };
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function remainingWaitMs(startedAt: number, waitTimeoutMs: number): number {
  return Math.max(0, waitTimeoutMs - (Date.now() - startedAt));
}

export function isWaitBudgetPollTimeout(
  error: unknown,
  startedAt: number,
  waitTimeoutMs: number,
  remainingBeforePoll: number,
  pollTimeoutMs: number
): boolean {
  if (!(error instanceof AutophoneError)) {
    return false;
  }
  const isTimeout =
    error.code === "DUMP_TIMEOUT" ||
    error.code === "ACTION_TIMEOUT" ||
    (error.code === "ADB_ERROR" && error.message === "adb command timed out");
  if (!isTimeout) {
    return false;
  }
  if (pollTimeoutMs !== remainingBeforePoll) {
    return false;
  }
  return remainingWaitMs(startedAt, waitTimeoutMs) <= 0;
}

export async function sleepUntilNextAttempt(startedAt: number, waitTimeoutMs: number, intervalMs: number): Promise<void> {
  const remaining = remainingWaitMs(startedAt, waitTimeoutMs);
  if (remaining <= 0) {
    return;
  }
  await sleep(Math.min(intervalMs, remaining));
}

export function normalizeActivityName(packageName: string, activity: string): string {
  if (activity.startsWith(".")) {
    return `${packageName}${activity}`;
  }
  return activity.includes(".") ? activity : `${packageName}.${activity}`;
}
