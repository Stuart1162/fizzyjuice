import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';
import { Job } from '../types/job';
import { useSnackbar } from 'notistack';
import { incrementSave } from '../services/metrics';

export type SavedJobDoc = {
  jobId: string;
  title: string;
  company: string;
  location: string;
  createdAt?: any;
  savedAt?: any;
  applied?: boolean;
  appliedAt?: any;
};

type SavedJobsContextType = {
  savedIds: Set<string>;
  savedJobs: SavedJobDoc[];
  loading: boolean;
  isSaved: (jobId?: string) => boolean;
  saveJob: (job: Job) => Promise<void>;
  unsaveJob: (jobId: string) => Promise<void>;
  toggleSave: (job: Job) => Promise<void>;
  setApplied: (jobId: string, applied: boolean) => Promise<void>;
  toggleApplied: (jobId: string) => Promise<void>;
};

const SavedJobsContext = createContext<SavedJobsContextType | null>(null);

export const useSavedJobs = () => {
  const ctx = useContext(SavedJobsContext);
  if (!ctx) throw new Error('useSavedJobs must be used within SavedJobsProvider');
  return ctx;
};

export const SavedJobsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [saved, setSaved] = useState<SavedJobDoc[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    if (!currentUser) {
      setSaved([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const colRef = collection(db, 'users', currentUser.uid, 'savedJobs');
    const unsub = onSnapshot(colRef, (snap) => {
      const rows: SavedJobDoc[] = snap.docs.map((d) => d.data() as SavedJobDoc);
      setSaved(rows);
      setLoading(false);
    }, (_err) => {
      setLoading(false);
    });
    return () => unsub();
  }, [currentUser]);

  const savedIds = useMemo(() => new Set(saved.map((s) => s.jobId)), [saved]);

  const isSaved = (jobId?: string) => !!(jobId && savedIds.has(jobId));

  const saveJob = async (job: Job) => {
    if (!currentUser || !job.id) return;
    try {
      const docRef = doc(db, 'users', currentUser.uid, 'savedJobs', job.id);
      const payload: SavedJobDoc = {
        jobId: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        createdAt: (job as any).createdAt,
        savedAt: serverTimestamp(),
        applied: false,
      };
      await setDoc(docRef, payload, { merge: true });
      try { await incrementSave(job.id, 1); } catch {}
      enqueueSnackbar('Job saved', { variant: 'success' });
    } catch (e: any) {
      enqueueSnackbar('Failed to save job', { variant: 'error' });
      throw e;
    }
  };

  const unsaveJob = async (jobId: string) => {
    if (!currentUser) return;
    try {
      const docRef = doc(db, 'users', currentUser.uid, 'savedJobs', jobId);
      await deleteDoc(docRef);
      try { await incrementSave(jobId, -1 as 1 | -1); } catch {}
      enqueueSnackbar('Removed from saved', { variant: 'info' });
    } catch (e: any) {
      enqueueSnackbar('Failed to remove saved job', { variant: 'error' });
      throw e;
    }
  };

  const toggleSave = async (job: Job) => {
    if (!job.id) return;
    if (isSaved(job.id)) {
      await unsaveJob(job.id);
    } else {
      await saveJob(job);
    }
  };

  const setApplied = async (jobId: string, applied: boolean) => {
    if (!currentUser) return;
    try {
      const docRef = doc(db, 'users', currentUser.uid, 'savedJobs', jobId);
      const patch: Partial<SavedJobDoc> = {
        applied,
        appliedAt: applied ? serverTimestamp() : null,
      } as any;
      await setDoc(docRef, patch, { merge: true });
      enqueueSnackbar(applied ? 'Marked as applied' : 'Marked as not applied', { variant: 'success' });
    } catch (e: any) {
      enqueueSnackbar('Failed to update applied status', { variant: 'error' });
      throw e;
    }
  };

  const toggleApplied = async (jobId: string) => {
    const current = saved.find((s) => s.jobId === jobId)?.applied || false;
    await setApplied(jobId, !current);
  };

  const value: SavedJobsContextType = {
    savedIds,
    savedJobs: saved,
    loading,
    isSaved,
    saveJob,
    unsaveJob,
    toggleSave,
    setApplied,
    toggleApplied,
  };

  return (
    <SavedJobsContext.Provider value={value}>
      {children}
    </SavedJobsContext.Provider>
  );
};
