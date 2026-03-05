import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface EnvironmentContextType {
    activeEnvironmentId: string | null;
    setActiveEnvironmentId: (id: string | null) => void;
}

const EnvironmentContext = createContext<EnvironmentContextType | undefined>(undefined);

export const EnvironmentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [activeEnvironmentId, setActiveEnvironmentIdState] = useState<string | null>(() => {
        return localStorage.getItem('activeEnvironmentId');
    });

    const setActiveEnvironmentId = (id: string | null) => {
        setActiveEnvironmentIdState(id);
        if (id) {
            localStorage.setItem('activeEnvironmentId', id);
        } else {
            localStorage.removeItem('activeEnvironmentId');
        }
    };

    return (
        <EnvironmentContext.Provider value={{ activeEnvironmentId, setActiveEnvironmentId }}>
            {children}
        </EnvironmentContext.Provider>
    );
};

export const useEnvironmentContext = () => {
    const context = useContext(EnvironmentContext);
    if (context === undefined) {
        throw new Error('useEnvironmentContext must be used within an EnvironmentProvider');
    }
    return context;
};
