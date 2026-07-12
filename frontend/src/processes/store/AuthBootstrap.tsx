'use client';

import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from './hooks';
import { loadMeThunk, selectAuthStatus } from './slices/authSlice';

export function AuthBootstrap() {
  const dispatch = useAppDispatch();
  const status = useAppSelector(selectAuthStatus);

  useEffect(() => {
    if (status === 'idle') void dispatch(loadMeThunk());
  }, [dispatch, status]);

  return null;
}
