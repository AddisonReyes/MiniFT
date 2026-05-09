#!/bin/sh

set -eu

if [ -f ./.env ]; then
  set -a
  . ./.env
  set +a
fi

AVD_NAME="${ANDROID_EMULATOR_NAME:-Small_Phone}"
AVD_CONFIG="$HOME/.android/avd/${AVD_NAME}.avd/config.ini"

if [ ! -f "$AVD_CONFIG" ]; then
  echo "AVD config not found: $AVD_CONFIG" >&2
  exit 1
fi

TMP_FILE="$(mktemp)"
cp "$AVD_CONFIG" "${AVD_CONFIG}.bak"

awk '
BEGIN {
  wanted["fastboot.forceColdBoot"] = "yes"
  wanted["fastboot.forceFastBoot"] = "no"
  wanted["hw.gpu.enabled"] = "yes"
  wanted["hw.gpu.mode"] = "swiftshader_indirect"
  wanted["hw.ramSize"] = "2048"
  wanted["showDeviceFrame"] = "no"
  wanted["vm.heapSize"] = "512"
}
{
  split($0, parts, "=")
  key = parts[1]

  if (key in wanted) {
    print key "=" wanted[key]
    seen[key] = 1
    next
  }

  print
}
END {
  for (key in wanted) {
    if (!(key in seen)) {
      print key "=" wanted[key]
    }
  }
}
' "$AVD_CONFIG" > "$TMP_FILE"

mv "$TMP_FILE" "$AVD_CONFIG"

echo "Updated $AVD_CONFIG"
