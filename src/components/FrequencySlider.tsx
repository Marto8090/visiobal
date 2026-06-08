import { useCallback, useMemo, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  PanResponder,
  PanResponderGestureState,
  StyleSheet,
  View,
} from 'react-native';

type FrequencySliderProps = {
  disabled?: boolean;
  maximumValue: number;
  minimumValue: number;
  onSlidingComplete?: (value: number) => void;
  onValueChange?: (value: number) => void;
  step?: number;
  value: number;
};

const THUMB_SIZE = 24;
const TAP_MOVE_THRESHOLD = 5;
const HORIZONTAL_DRAG_THRESHOLD = 3;
const VERTICAL_IGNORE_THRESHOLD = 8;

function clamp(value: number, minimumValue: number, maximumValue: number) {
  return Math.min(Math.max(value, minimumValue), maximumValue);
}

function snapToStep(value: number, minimumValue: number, step: number) {
  return minimumValue + Math.round((value - minimumValue) / step) * step;
}

function roundSliderValue(value: number, step: number) {
  if (step >= 1) {
    return Math.round(value);
  }

  return Number.parseFloat(value.toFixed(2));
}

export function FrequencySlider({
  disabled = false,
  maximumValue,
  minimumValue,
  onSlidingComplete,
  onValueChange,
  step = 1,
  value,
}: FrequencySliderProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const [dragRatio, setDragRatio] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragActive = useRef(false);
  const gestureIgnored = useRef(false);
  const gestureStartX = useRef(0);
  const lastPositionX = useRef(0);
  const lastEmittedValue = useRef<number | null>(null);
  const boundedValue = clamp(value, minimumValue, maximumValue);
  const valueRange = Math.max(maximumValue - minimumValue, step);
  const configRef = useRef({
    disabled,
    maximumValue,
    minimumValue,
    step,
    trackWidth,
    valueRange,
  });
  const onSlidingCompleteRef = useRef(onSlidingComplete);
  const onValueChangeRef = useRef(onValueChange);
  const ratio = clamp((boundedValue - minimumValue) / valueRange, 0, 1);
  const visualRatio = isDragging ? dragRatio : ratio;
  const thumbLeft = trackWidth
    ? clamp(visualRatio * trackWidth - THUMB_SIZE / 2, 0, Math.max(trackWidth - THUMB_SIZE, 0))
    : 0;

  configRef.current = {
    disabled,
    maximumValue,
    minimumValue,
    step,
    trackWidth,
    valueRange,
  };
  onSlidingCompleteRef.current = onSlidingComplete;
  onValueChangeRef.current = onValueChange;

  const updateValueFromPosition = useCallback((positionX: number, complete: boolean) => {
    const config = configRef.current;

    if (!config.trackWidth || config.disabled) {
      return;
    }

    const boundedPosition = clamp(positionX, 0, config.trackWidth);
    lastPositionX.current = boundedPosition;
    setDragRatio(boundedPosition / config.trackWidth);

    const rawValue = config.minimumValue + (boundedPosition / config.trackWidth) * config.valueRange;
    const steppedValue = clamp(
      snapToStep(rawValue, config.minimumValue, config.step),
      config.minimumValue,
      config.maximumValue
    );
    const nextValue = roundSliderValue(steppedValue, config.step);

    if (nextValue !== lastEmittedValue.current) {
      lastEmittedValue.current = nextValue;
      onValueChangeRef.current?.(nextValue);
    }

    if (complete) {
      onSlidingCompleteRef.current?.(nextValue);
    }
  }, []);

  const resetGesture = useCallback(() => {
    dragActive.current = false;
    gestureIgnored.current = false;
    setIsDragging(false);
  }, []);

  const updateValueFromGesture = useCallback((gestureState: PanResponderGestureState, complete: boolean) => {
    updateValueFromPosition(gestureStartX.current + gestureState.dx, complete);
  }, [updateValueFromPosition]);

  const handleGestureMove = useCallback((gestureState: PanResponderGestureState) => {
    if (gestureIgnored.current) {
      return;
    }

    const absDx = Math.abs(gestureState.dx);
    const absDy = Math.abs(gestureState.dy);

    if (!dragActive.current && absDy > VERTICAL_IGNORE_THRESHOLD && absDy > absDx * 1.2) {
      gestureIgnored.current = true;
      resetGesture();
      return;
    }

    if (!dragActive.current && absDx > HORIZONTAL_DRAG_THRESHOLD && absDx >= absDy) {
      dragActive.current = true;
      setIsDragging(true);
    }

    if (dragActive.current) {
      updateValueFromGesture(gestureState, false);
    }
  }, [resetGesture, updateValueFromGesture]);

  const handleGestureEnd = useCallback((gestureState: PanResponderGestureState) => {
    if (gestureIgnored.current) {
      resetGesture();
      return;
    }

    const absDx = Math.abs(gestureState.dx);
    const absDy = Math.abs(gestureState.dy);
    const wasTap = absDx <= TAP_MOVE_THRESHOLD && absDy <= TAP_MOVE_THRESHOLD;

    if (dragActive.current) {
      updateValueFromGesture(gestureState, true);
    } else if (wasTap) {
      updateValueFromPosition(gestureStartX.current, true);
    }

    resetGesture();
  }, [resetGesture, updateValueFromGesture, updateValueFromPosition]);

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: () => !configRef.current.disabled,
    onMoveShouldSetPanResponderCapture: () => !configRef.current.disabled,
    onPanResponderGrant: (event) => {
      lastEmittedValue.current = null;
      dragActive.current = false;
      gestureIgnored.current = false;
      gestureStartX.current = event.nativeEvent.locationX;
      lastPositionX.current = event.nativeEvent.locationX;
    },
    onPanResponderMove: (_event, gestureState) => {
      handleGestureMove(gestureState);
    },
    onPanResponderRelease: (_event, gestureState) => {
      handleGestureEnd(gestureState);
    },
    onPanResponderTerminate: () => {
      if (dragActive.current) {
        updateValueFromPosition(lastPositionX.current, true);
      }
      resetGesture();
    },
    onPanResponderTerminationRequest: () => !dragActive.current,
    onShouldBlockNativeResponder: () => true,
    onStartShouldSetPanResponder: () => !configRef.current.disabled,
    onStartShouldSetPanResponderCapture: () => !configRef.current.disabled,
  }), [handleGestureEnd, handleGestureMove, resetGesture, updateValueFromPosition]);

  return (
    <View
      {...panResponder.panHandlers}
      onLayout={(event: LayoutChangeEvent) => {
        setTrackWidth(event.nativeEvent.layout.width);
      }}
      style={[styles.trackArea, disabled && styles.trackAreaDisabled]}>
      <View pointerEvents="none" style={styles.track} />
      <View pointerEvents="none" style={[styles.fill, { width: `${visualRatio * 100}%` }]} />
      <View pointerEvents="none" style={[styles.thumb, { left: thumbLeft }, disabled && styles.thumbDisabled]} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    backgroundColor: '#60a5fa',
    borderRadius: 999,
    height: 6,
    left: 0,
    position: 'absolute',
    top: THUMB_SIZE / 2 - 3,
  },
  thumb: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
    borderRadius: THUMB_SIZE / 2,
    borderWidth: 2,
    height: THUMB_SIZE,
    position: 'absolute',
    top: 0,
    width: THUMB_SIZE,
  },
  thumbDisabled: {
    backgroundColor: '#cbd5e1',
    borderColor: '#64748b',
  },
  track: {
    backgroundColor: '#334155',
    borderRadius: 999,
    height: 6,
    width: '100%',
  },
  trackArea: {
    height: THUMB_SIZE,
    justifyContent: 'center',
    marginVertical: 8,
    width: '100%',
  },
  trackAreaDisabled: {
    opacity: 0.45,
  },
});
