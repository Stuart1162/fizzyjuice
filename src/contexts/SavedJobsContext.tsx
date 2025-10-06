import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';
import { Job } from '../types/job';

export type SavedJobDoc = {
  jobId: string;
  title: string;
  company: string;
  location: string;
  createdAt?: any;
  savedAt?: any;
};

type SavedJobsContextType = {
  savedIds: Set<string>;
  savedJobs: SavedJobDoc[];
  loading: boolean;
  isSaved: (jobId?: string) => boolean;
  saveJob: (job: Job) => Promise<void>;
  unsaveJob: (jobId: string) => Promise<void>;
  toggleSave: (job: Job) => Promise<void>;
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
    const docRef = doc(db, 'users', currentUser.uid, 'savedJobs', job.id);
    const payload: SavedJobDoc = {
      jobId: job.id,
      title: job.title,
      company: job.company,
      location: job.location,
      createdAt: (job as any).createdAt,
      savedAt: serverTimestamp(),
    };
    await setDoc(docRef, payload, { merge: true });
  };

  const unsaveJob = async (jobId: string) => {
    if (!currentUser) return;
    const docRef = doc(db, 'users', currentUser.uid, 'savedJobs', jobId);
    await deleteDoc(docRef);
  };

  const toggleSave = async (job: Job) => {
    if (!job.id) return;
    if (isSaved(job.id)) {
      await unsaveJob(job.id);
    } else {
      await saveJob(job);
    }
  };

  const value: SavedJobsContextType = {
    savedIds,
    savedJobs: saved,
    loading,
    isSaved,
    saveJob,
    unsaveJob,
    toggleSave,
  };

  return (
    <SavedJobsContext.Provider value={value}>
      {children}
    </SavedJobsContext.Provider>
  );
};
