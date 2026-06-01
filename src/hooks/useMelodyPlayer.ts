import { AudioPlayer, AudioStatus, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import { useCallback, useEffect, useRef, useState } from 'react';

import { MELODIES, generateMelodyWAV } from '../utils/audioSynth';

export type MelodyIndex = 0 | 1 | 2 | 3 | 4;

interface PlayerState {
  isPlaying: boolean;
  isLoading: boolean;
  positionMs: number;
  durationMs: number;
  loadedIdx: MelodyIndex | null;
}

const INITIAL: PlayerState = {
  isPlaying: false,
  isLoading: false,
  positionMs: 0,
  durationMs: 0,
  loadedIdx: null,
};

export function useMelodyPlayer() {
  const playerRef = useRef<AudioPlayer | null>(null);
  const [state, setState] = useState<PlayerState>(INITIAL);

  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false });
    return () => {
      playerRef.current?.remove();
      playerRef.current = null;
    };
  }, []);

  const play = useCallback(async (melodyIdx: MelodyIndex) => {
    setState(s => ({ ...s, isLoading: true }));
    try {
      playerRef.current?.remove();
      playerRef.current = null;

      // Yield so React renders the loading indicator before the synchronous WAV generation
      await new Promise<void>(resolve => setTimeout(resolve, 0));

      const wav = generateMelodyWAV(MELODIES[melodyIdx]);
      const file = new File(Paths.cache, `melody_${melodyIdx}.wav`);
      file.write(new Uint8Array(wav));

      const onStatus = (status: AudioStatus) => {
        if (!status.isLoaded) return;
        setState(s => ({
          ...s,
          isPlaying: status.playing,
          positionMs: Math.round(status.currentTime * 1000),
          ...(status.duration > 0 ? { durationMs: Math.round(status.duration * 1000) } : {}),
        }));
      };

      const player = createAudioPlayer({ uri: file.uri }, { updateInterval: 250 });
      player.loop = true;
      player.volume = 1.0;
      player.addListener('playbackStatusUpdate', onStatus);
      player.play();

      playerRef.current = player;
      setState(s => ({ ...s, isLoading: false, isPlaying: true, loadedIdx: melodyIdx }));
    } catch (err) {
      console.warn('useMelodyPlayer play:', err);
      setState(s => ({ ...s, isLoading: false }));
    }
  }, []);

  const pause = useCallback(async () => {
    playerRef.current?.pause();
  }, []);

  const resume = useCallback(async () => {
    playerRef.current?.play();
  }, []);

  const stop = useCallback(async () => {
    playerRef.current?.pause();
    playerRef.current?.remove();
    playerRef.current = null;
    setState(INITIAL);
  }, []);

  const setVolume = useCallback(async (vol: number) => {
    if (playerRef.current) {
      playerRef.current.volume = Math.max(0, Math.min(1, vol));
    }
  }, []);

  return { ...state, play, pause, resume, stop, setVolume };
}
