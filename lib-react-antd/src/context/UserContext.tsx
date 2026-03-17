import React, {createContext, type ReactNode, useContext, useEffect, useState} from "react";

interface UserContext {
    userId: string
    userRoles: string[]
}

const UserContext = createContext<UserContext | undefined>(undefined)

export const UserContextProvider: React.FC<{ children: ReactNode }> = ({children}) => {
    const [userId, setUserId] = useState<string>('')
    const [userRoles, setUserRoles] = useState<string[]>([])

    useEffect(() => {
        let count = 0
        const interval = setInterval(() => {
            if (count > 10) {
                clearInterval(interval)
                return
            }
            if (count > 1) { // TODO: Async Auth
                setUserId('test-user')
                setUserRoles(['MASTER'])
                clearInterval(interval)
                return
            }
            count += 1
        }, 20)
        return () => clearInterval(interval)
    }, []);

    return (<UserContext.Provider value={{userId, userRoles}}>
        {children}
    </UserContext.Provider>)
}

export const useUserContext = () => {
    const context = useContext(UserContext)
    if (!context) {
        throw new Error('useUserId must be within a UserContextProvider')
    }
    return context
}
