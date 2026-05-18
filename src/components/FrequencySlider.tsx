import { useCallback, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, PanResponder, PanResponderGestureState, StyleSheet, View } from 'react-native';

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
  const gestureStartX = useRef(0);
  const lastPositionX = useRef(0);
  const lastEmittedValue = useRef<number | null>(null);
  const boundedValue = clamp(value, minimumValue, maximumValue);
  const valueRange = Math.max(maximumValue - minimumValue, step);
  const ratio = clamp((boundedValue - minimumValue) / valueRange, 0, 1);
  const visualRatio = isDragging ? dragRatio : ratio;
  const thumbLeft = trackWidth
    ? clamp(visualRatio * trackWidth - THUMB_SIZE / 2, 0, Math.max(trackWidth - THUMB_SIZE, 0))
    : 0;

  const updateValueFromPosition = useCallback((positionX: number, complete: boolean) => {
    if (!trackWidth || disabled) {
      return;
    }

    const boundedPosition = clamp(positionX, 0, trackWidth);
    lastPositionX.current = boundedPosition;
    setDragRatio(boundedPosition / trackWidth);

    const rawValue = minimumValue + (boundedPosition / trackWidth) * valueRange;
    const steppedValue = clamp(
      snapToStep(rawValue, minimumValue, step),
      minimumValue,
      maximumValue
    );
    const nextValue = roundSliderValue(steppedValue, step);

    if (nextValue !== lastEmittedValue.current) {
      lastEmittedValue.current = nextValue;
      onValueChange?.(nextValue);
    }

    if (complete) {
      onSlidingComplete?.(nextValue);
    }
  }, [disabled, maximumValue, minimumValue, onSlidingComplete, onValueChange, step, trackWidth, valueRange]);

  const updateValueFromGesture = useCallback((gestureState: PanResponderGestureState, complete: boolean) => {
    const nextPositionX = complete ? lastPositionX.current : gestureStartX.current + gestureState.dx;
    updateValueFromPosition(nextPositionX, complete);
  }, [updateValueFromPosition]);

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: () => !disabled,
    onPanResponderGrant: (event) => {
      lastEmittedValue.current = null;
      setIsDragging(true);
      gestureStartX.current = event.nativeEvent.locationX;
      updateValueFromPosition(gestureStartX.current, false);
    },
    onPanResponderMove: (_event, gestureState) => {
      updateValueFromGesture(gestureState, false);
    },
    onPanResponderRelease: (_event, gestureState) => {
      updateValueFromGesture(gestureState, true);
      setIsDragging(false);
    },
    onPanResponderTerminate: (_event, gestureState) => {
      updateValueFromGesture(gestureState, true);
      setIsDragging(false);
    },
    onStartShouldSetPanResponder: () => !disabled,
  }), [disabled, updateValueFromGesture, updateValueFromPosition]);

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
