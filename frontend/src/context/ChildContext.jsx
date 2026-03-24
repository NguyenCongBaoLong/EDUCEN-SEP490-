import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const ChildContext = createContext(null);

export const ChildProvider = ({ children }) => {
    const { user } = useAuth();
    const [childrenList, setChildrenList] = useState([]);
    const [selectedChild, setSelectedChild] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user?.role !== 'Parent') { setLoading(false); return; }
        api.get('/Parents/my-children')
            .then(res => {
                const list = res.data || [];
                setChildrenList(list);
                if (list.length > 0) setSelectedChild(list[0]);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [user]);

    return (
        <ChildContext.Provider value={{ childrenList, selectedChild, setSelectedChild, loading }}>
            {children}
        </ChildContext.Provider>
    );
};

export const useChild = () => useContext(ChildContext);
