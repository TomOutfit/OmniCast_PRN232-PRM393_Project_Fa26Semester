'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

interface Spatial3DContextType {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const Spatial3DContext = createContext<Spatial3DContextType>({
  isOpen: false,
  open: () => {},
  close: () => {},
  toggle: () => {},
});

export function Spatial3DProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  return (
    <Spatial3DContext.Provider value={{ isOpen, open, close, toggle }}>
      {children}
    </Spatial3DContext.Provider>
  );
}

export function useSpatial3D() {
  return useContext(Spatial3DContext);
}
