import React, { createContext, useContext, useState, ReactNode } from 'react';

interface EnvironmentContextType {
    activeEnvironmentId: string | null;
    setActiveEnvironmentId: (id: string | null) => void;
    isEnvironmentWarningActive: boolean;
    triggerEnvironmentWarning: () => void;
}

const EnvironmentContext = createContext<EnvironmentContextType | undefined>(undefined);

export const EnvironmentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [activeEnvironmentId, setActiveEnvironmentIdState] = useState<string | null>(() => {
        return localStorage.getItem('activeEnvironmentId');
    });

    const [isEnvironmentWarningActive, setIsEnvironmentWarningActive] = useState(false);

    const setActiveEnvironmentId = (id: string | null) => {
        setActiveEnvironmentIdState(id);
        if (id) {
            localStorage.setItem('activeEnvironmentId', id);
            setIsEnvironmentWarningActive(false);
        } else {
            localStorage.removeItem('activeEnvironmentId');
        }
    };

    const triggerEnvironmentWarning = () => {
        setIsEnvironmentWarningActive(true);
        setTimeout(() => setIsEnvironmentWarningActive(false), 3000);
    };

    return (
        <EnvironmentContext.Provider value={{
            activeEnvironmentId,
            setActiveEnvironmentId,
            isEnvironmentWarningActive,
            triggerEnvironmentWarning
        }}>
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
