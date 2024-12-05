import React from 'react';

export type AssetsState = Record<string, { raw: string }>;

export const AssetsContext = React.createContext<AssetsState>({});
