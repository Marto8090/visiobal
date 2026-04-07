import { useState } from 'react';
import { LayoutChangeEvent, PanResponder, StyleSheet, View } from 'react-native';

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
  const boundedValue = clamp(value, minimumValue, maximumValue);
  const valueRange = Math.max(maximumValue - minimumValue, step);
  const ratio = (boundedValue - minimumValue) / valueRange;
  const thumbLeft = trackWidth
    ? clamp(ratio * trackWidth - THUMB_SIZE / 2, 0, Math.max(trackWidth - THUMB_SIZE, 0))
    : 0;

  const updateValueFromPosition = (positionX: number, complete: boolean) => {
    if (!trackWidth || disabled) {
      return;
    }

    const boundedPosition = clamp(positionX, 0, trackWidth);
    const rawValue = minimumValue + (boundedPosition / trackWidth) * valueRange;
    const steppedValue = clamp(
      snapToStep(rawValue, minimumValue, step),
      minimumValue,
      maximumValue
    );
    const nextValue = roundSliderValue(steppedValue, step);

    onValueChange?.(nextValue);

    if (complete) {
      onSlidingComplete?.(nextValue);
    }
  };

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: () => !disabled,
    onPanResponderGrant: (event) => {
      updateValueFromPosition(event.nativeEvent.locationX, false);
    },
    onPanResponderMove: (event) => {
      updateValueFromPosition(event.nativeEvent.locationX, false);
    },
    onPanResponderRelease: (event) => {
      updateValueFromPosition(event.nativeEvent.locationX, true);
    },
    onPanResponderTerminate: (event) => {
      updateValueFromPosition(event.nativeEvent.locationX, true);
    },
    onStartShouldSetPanResponder: () => !disabled,
  });

  return (
    <View
      {...panResponder.panHandlers}
      onLayout={(event: LayoutChangeEvent) => {
        setTrackWidth(event.nativeEvent.layout.width);
      }}
      style={[styles.trackArea, disabled && styles.trackAreaDisabled]}>
      <View style={styles.track} />
      <View style={[styles.fill, { width: `${ratio * 100}%` }]} />
      <View style={[styles.thumb, { left: thumbLeft }, disabled && styles.thumbDisabled]} />
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
