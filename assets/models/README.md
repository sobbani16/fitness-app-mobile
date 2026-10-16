# Pose model

`pose_landmarker_lite.task` is the actual MediaPipe Pose Landmarker lite float16 model downloaded from Google's model distribution:
https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task

SHA-256: `59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a`

The native plugin copies this into each native project during Expo prebuild. Requires a newly compiled native app; Expo Go/OTA-only updates cannot provide this module. Review upstream model licensing and attribution before distribution. Camera and physical-device accuracy acceptance remains outstanding.
