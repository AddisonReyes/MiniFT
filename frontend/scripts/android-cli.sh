#!/bin/sh

set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$ROOT_DIR"

if [ -f ./.env ]; then
  set -a
  . ./.env
  set +a
fi

SDK_ROOT="${ANDROID_SDK_ROOT:-$HOME/Android/Sdk}"
ADB_BIN="${ANDROID_ADB_BIN:-$SDK_ROOT/platform-tools/adb}"
APP_ID="${ANDROID_APP_ID:-app.minift.net}"
LAUNCH_ACTIVITY="${ANDROID_LAUNCH_ACTIVITY:-$APP_ID/$APP_ID.MainActivity}"
APK_PATH="${ANDROID_APK_PATH:-$ROOT_DIR/android/app/build/outputs/apk/debug/app-debug.apk}"
BOOT_TIMEOUT_SECONDS="${ANDROID_BOOT_TIMEOUT_SECONDS:-240}"
ADB_VENDOR_KEYS="${ADB_VENDOR_KEYS:-$HOME/.android/adbkey}"
GRADLE_USER_HOME="${ANDROID_GRADLE_USER_HOME:-/tmp/minift-gradle}"
REVERSE_PORTS="${ANDROID_REVERSE_PORTS:-8000}"

export ADB_VENDOR_KEYS
export PATH="$SDK_ROOT/platform-tools:$PATH"

resolve_java_home() {
  if [ -n "${ANDROID_JAVA_HOME:-}" ] && [ -x "${ANDROID_JAVA_HOME}/bin/javac" ]; then
    printf "%s\n" "$ANDROID_JAVA_HOME"
    return 0
  fi

  if [ -n "${JAVA_HOME:-}" ] && [ -x "${JAVA_HOME}/bin/javac" ]; then
    printf "%s\n" "$JAVA_HOME"
    return 0
  fi

  if [ -x "/snap/android-studio/current/jbr/bin/javac" ]; then
    printf "%s\n" "/snap/android-studio/current/jbr"
    return 0
  fi

  echo "No Java 21 runtime found for Android builds. Set ANDROID_JAVA_HOME in frontend/.env." >&2
  exit 1
}

start_adb() {
  "$ADB_BIN" kill-server >/dev/null 2>&1 || true
  "$ADB_BIN" start-server >/dev/null
}

configure_reverse_ports() {
  device="$1"

  if [ -z "$REVERSE_PORTS" ]; then
    return 0
  fi

  OLD_IFS=$IFS
  IFS=','

  for port in $REVERSE_PORTS; do
    normalized_port=$(printf "%s" "$port" | tr -d '[:space:]')
    if [ -z "$normalized_port" ]; then
      continue
    fi

    "$ADB_BIN" -s "$device" reverse "tcp:${normalized_port}" "tcp:${normalized_port}" >/dev/null
  done

  IFS=$OLD_IFS
}

device_snapshot() {
  "$ADB_BIN" devices | awk 'NR > 1 && NF >= 2 { print $1 " " $2 }'
}

resolve_device() {
  if [ -n "${ANDROID_DEVICE_ID:-}" ]; then
    printf "%s\n" "$ANDROID_DEVICE_ID"
    return 0
  fi

  device=$(device_snapshot | awk '$2 == "device" { print $1; exit }')
  if [ -n "$device" ]; then
    printf "%s\n" "$device"
    return 0
  fi

  unauthorized=$(device_snapshot | awk '$2 == "unauthorized" { print $1; exit }')
  if [ -n "$unauthorized" ]; then
    echo "Android device $unauthorized is unauthorized. Unlock the emulator and accept the USB debugging prompt." >&2
    exit 1
  fi

  offline=$(device_snapshot | awk '$2 == "offline" { print $1; exit }')
  if [ -n "$offline" ]; then
    echo "Android device $offline is offline. Wait a moment and retry." >&2
    exit 1
  fi

  echo "No Android device detected. Start the emulator first with npm run android:emulator." >&2
  exit 1
}

wait_for_device() {
  start_adb

  elapsed=0
  while [ "$elapsed" -lt "$BOOT_TIMEOUT_SECONDS" ]; do
    device=$(device_snapshot | awk '$2 == "device" { print $1; exit }')
    if [ -n "$device" ]; then
      boot_completed=$("$ADB_BIN" -s "$device" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')
      if [ "$boot_completed" = "1" ]; then
        configure_reverse_ports "$device"
        printf "%s\n" "$device"
        return 0
      fi
    fi

    unauthorized=$(device_snapshot | awk '$2 == "unauthorized" { print $1; exit }')
    if [ -n "$unauthorized" ]; then
      echo "Waiting for USB debugging approval on $unauthorized..." >&2
    fi

    sleep 2
    elapsed=$((elapsed + 2))
  done

  echo "Timed out waiting for an Android device to finish booting." >&2
  exit 1
}

build_debug() {
  JAVA_HOME_RESOLVED=$(resolve_java_home)

  npm run build
  npx cap sync android

  (
    cd android
    JAVA_HOME="$JAVA_HOME_RESOLVED" GRADLE_USER_HOME="$GRADLE_USER_HOME" ./gradlew assembleDebug --no-daemon
  )
}

install_debug() {
  device=$(wait_for_device)

  if [ ! -f "$APK_PATH" ]; then
    echo "Debug APK not found at $APK_PATH. Run npm run android:build-debug first." >&2
    exit 1
  fi

  "$ADB_BIN" -s "$device" install -r "$APK_PATH"
}

launch_app() {
  device=$(wait_for_device)
  "$ADB_BIN" -s "$device" shell am start -W -n "$LAUNCH_ACTIVITY"
}

show_devices() {
  start_adb
  "$ADB_BIN" devices -l
}

show_logcat() {
  device=$(wait_for_device)
  "$ADB_BIN" -s "$device" logcat
}

configure_local_backend() {
  device=$(wait_for_device)
  configure_reverse_ports "$device"
  echo "Local backend ports available on emulator $device: $REVERSE_PORTS"
}

run_all() {
  build_debug
  install_debug
  launch_app
}

COMMAND="${1:-run}"

case "$COMMAND" in
  devices)
    show_devices
    ;;
  wait-device)
    wait_for_device
    ;;
  build-debug)
    build_debug
    ;;
  install-debug)
    install_debug
    ;;
  launch)
    launch_app
    ;;
  run)
    run_all
    ;;
  logcat)
    show_logcat
    ;;
  reverse)
    configure_local_backend
    ;;
  *)
    echo "Unknown command: $COMMAND" >&2
    exit 1
    ;;
esac
