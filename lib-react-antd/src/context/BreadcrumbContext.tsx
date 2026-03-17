import React, {type ReactNode, useContext, useState} from "react";

export interface BreadcrumbContextType {
    afterBreadcrumb: ReactNode | null
    setAfterBreadcrumb: (component: ReactNode | null) => void
    lastBreadcrumb: string | null
    setLastBreadcrumb: (lastBreadcrumb: string | null) => void
}

const BreadcrumbContext = React.createContext<BreadcrumbContextType | undefined>(undefined)

export const BreadcrumbProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [afterBreadcrumb, setAfterBreadcrumb] = useState<ReactNode | null>(null)
    const [lastBreadcrumb, setLastBreadcrumb] = useState<string | null>(null)

    return (
        <BreadcrumbContext.Provider value={{afterBreadcrumb, setAfterBreadcrumb, lastBreadcrumb, setLastBreadcrumb}}>
            {children}
        </BreadcrumbContext.Provider>
    )
}

export const useBreadcrumb = () => {
    const context = useContext(BreadcrumbContext)
    if (!context) {
        throw new Error('useBreadcrumb must be within a BreadcrumbProvider')
    }
    return context
}
