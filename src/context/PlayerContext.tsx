import { createContext, Dispatch, ReactNode, SetStateAction, useContext, useState } from 'react';

export const TRACKS = [
  { id: '1', title: 'Alien Signal',    duration: '0:03', genre: 'Sci-Fi',      command: 'SONG1' },
  { id: '2', title: 'UFO Encounter',   duration: '0:02', genre: 'Sci-Fi',      command: 'SONG2' },
  { id: '3', title: 'Zombie Invasion', duration: '0:05', genre: 'Horror',      command: 'SONG3' },
  { id: '4', title: 'Police Sirens',   duration: '0:04', genre: 'Emergency',   command: 'SONG4' },
  { id: '5', title: 'Vibrant Pulse',   duration: '0:03', genre: 'Electronic',  command: 'SONG5' },
] as const;

export type Track = typeof TRACKS[number];

type PlayerStateType = {
  isPlaying: boolean;
  trackIndex: number;
  volume: number;
  setIsPlaying: Dispatch<SetStateAction<boolean>>;
  setTrackIndex: Dispatch<SetStateAction<number>>;
  setVolume: Dispatch<SetStateAction<number>>;
};

const PlayerStateContext = createContext<PlayerStateType>({
  isPlaying: false,
  trackIndex: 0,
  volume: 5,
  setIsPlaying: () => {},
  setTrackIndex: () => {},
  setVolume: () => {},
});

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [trackIndex, setTrackIndex] = useState(0);
  const [volume, setVolume] = useState(5);

  return (
    <PlayerStateContext.Provider value={{ isPlaying, trackIndex, volume, setIsPlaying, setTrackIndex, setVolume }}>
      {children}
    </PlayerStateContext.Provider>
  );
}

export const usePlayerState = () => useContext(PlayerStateContext);
