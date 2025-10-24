import { doc, increment, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

const metricsDocRef = (jobId: string) => doc(db, 'jobMetrics', jobId);

export async function incrementView(jobId: string) {
  try {
    await setDoc(metricsDocRef(jobId), { views: increment(1), updatedAt: serverTimestamp() }, { merge: true });
  } catch {}
}

export async function incrementSave(jobId: string, delta: 1 | -1) {
  try {
    await setDoc(metricsDocRef(jobId), { saves: increment(delta), updatedAt: serverTimestamp() }, { merge: true });
  } catch {}
}

export async function incrementApply(jobId: string) {
  try {
    await setDoc(metricsDocRef(jobId), { applies: increment(1), updatedAt: serverTimestamp() }, { merge: true });
  } catch {}
}

export type JobMetrics = {
  views?: number;
  saves?: number;
  applies?: number;
  updatedAt?: any;
};
