import { createContext, Dispatch, ReactNode, SetStateAction, useContext, useState } from 'react';

import { MelodyIndex } from '../hooks/useMelodyPlayer';

export const TRACKS = [
  { id: '1', title: 'C Major Journey', duration: '0:03', genre: 'Ambient',    command: 'SONG1', melodyIdx: 0 as MelodyIndex },
  { id: '2', title: 'E Minor Groove',  duration: '0:02', genre: 'Electronic', command: 'SONG2', melodyIdx: 1 as MelodyIndex },
  { id: '3', title: 'Zen State',       duration: '0:05', genre: 'Meditation', command: 'SONG3', melodyIdx: 2 as MelodyIndex },
  { id: '4', title: 'Ocean Waves',     duration: '0:04', genre: 'Nature',     command: 'SONG4', melodyIdx: 3 as MelodyIndex },
  { id: '5', title: 'Ambient Pulse',   duration: '0:03', genre: 'Electronic', command: 'SONG5', melodyIdx: 4 as MelodyIndex },
] as const;

export type Track = typeof TRACKS[number];

type PlayerStateType = {
  isPlaying: boolean;
  trackIndex: number;
  setIsPlaying: Dispatch<SetStateAction<boolean>>;
  setTrackIndex: Dispatch<SetStateAction<number>>;
};

const PlayerStateContext = createContext<PlayerStateType>({
  isPlaying: false,
  trackIndex: 0,
  setIsPlaying: () => {},
  setTrackIndex: () => {},
});

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [trackIndex, setTrackIndex] = useState(0);

  return (
    <PlayerStateContext.Provider value={{ isPlaying, trackIndex, setIsPlaying, setTrackIndex }}>
      {children}
    </PlayerStateContext.Provider>
  );
}

export const usePlayerState = () => useContext(PlayerStateContext);
