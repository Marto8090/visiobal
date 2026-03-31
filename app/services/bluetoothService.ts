import { BallDevice } from '../types/bluetooth';

export async function scanForVisioballs(): Promise<BallDevice[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        { id: '1', name: 'Visioball-01' },
        { id: '2', name: 'Visioball-02' },
        { id: '3', name: 'Visioball-03' },
      ]);
    }, 1500);
  });
}

export async function connectToBall(device: BallDevice): Promise<boolean> {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(`Connected to ${device.name}`);
      resolve(true);
    }, 1000);
  });
}
