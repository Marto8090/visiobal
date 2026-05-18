import { Audio, AVPlaybackStatus } from 'expo-av';
import { File, Paths } from 'expo-file-system';
import { useCallback, useEffect, useRef, useState } from 'react';

import { MELODIES, generateMelodyWAV } from '../utils/audioSynth';

interface PlayerState {
  isPlaying: boolean;
  isLoading: boolean;
  positionMs: number;
  durationMs: number;
  loadedIdx: 0 | 1 | null;
}

const INITIAL: PlayerState = {
  isPlaying: false,
  isLoading: false,
  positionMs: 0,
  durationMs: 0,
  loadedIdx: null,
};

export function useMelodyPlayer() {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [state, setState] = useState<PlayerState>(INITIAL);

  useEffect(() => {
    void Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: false });
    return () => {
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  const play = useCallback(async (melodyIdx: 0 | 1) => {
    setState(s => ({ ...s, isLoading: true }));
    try {
      const prev = soundRef.current;
      soundRef.current = null;
      if (prev) await prev.unloadAsync().catch(() => {});

      // Yield so React renders the loading indicator before the synchronous WAV generation
      await new Promise<void>(resolve => setTimeout(resolve, 0));

      const wav = generateMelodyWAV(MELODIES[melodyIdx]);
      const file = new File(Paths.cache, `melody_${melodyIdx}.wav`);
      file.write(new Uint8Array(wav));

      const onStatus = (status: AVPlaybackStatus) => {
        if (!status.isLoaded) return;
        setState(s => ({
          ...s,
          isPlaying: status.isPlaying,
          positionMs: status.positionMillis,
          ...(status.durationMillis != null ? { durationMs: status.durationMillis } : {}),
        }));
      };

      const { sound } = await Audio.Sound.createAsync(
        { uri: file.uri },
        { shouldPlay: true, isLooping: true, volume: 1.0 },
        onStatus,
      );

      soundRef.current = sound;
      setState(s => ({ ...s, isLoading: false, isPlaying: true, loadedIdx: melodyIdx }));
    } catch (err) {
      console.warn('useMelodyPlayer play:', err);
      setState(s => ({ ...s, isLoading: false }));
    }
  }, []);

  const pause = useCallback(async () => {
    await soundRef.current?.pauseAsync().catch(() => {});
  }, []);

  const resume = useCallback(async () => {
    await soundRef.current?.playAsync().catch(() => {});
  }, []);

  const stop = useCallback(async () => {
    const snd = soundRef.current;
    soundRef.current = null;
    await snd?.stopAsync().catch(() => {});
    await snd?.unloadAsync().catch(() => {});
    setState(INITIAL);
  }, []);

  const setVolume = useCallback(async (vol: number) => {
    await soundRef.current?.setVolumeAsync(Math.max(0, Math.min(1, vol))).catch(() => {});
  }, []);

  return { ...state, play, pause, resume, stop, setVolume };
}
