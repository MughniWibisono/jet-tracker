import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, writeBatch, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

export function useFirebaseData(collectionName = 'shipments') {
    const [serverData, setServerData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const collRef = collection(db, collectionName);
        const unsubscribe = onSnapshot(collRef, (snapshot) => {
            const items = [];
            snapshot.forEach((doc) => {
                items.push({ id: doc.id, ...doc.data() });
            });
            setServerData(items);
            setLoading(false);
        }, (err) => {
            console.error(err);
            setError(err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [collectionName]);

    const saveBatch = async (localData) => {
        try {
            const batch = writeBatch(db);
            const collRef = collection(db, collectionName);

            // Track existing IDs for deletion
            const currentIds = localData.filter(item => item.id).map(item => item.id);

            // Delete docs not in the localData anymore
            serverData.forEach(serverItem => {
                if (!currentIds.includes(serverItem.id)) {
                    const docRef = doc(db, collectionName, serverItem.id);
                    batch.delete(docRef);
                }
            });

            // Update or add docs
            for (const item of localData) {
                if (item.id) {
                    // Update existing
                    const docRef = doc(db, collectionName, item.id);
                    const { id, ...dataToUpdate } = item;
                    batch.set(docRef, dataToUpdate, { merge: true });
                } else {
                    // Add new (handled via addDoc outside of batch for simplicity, 
                    // or we can generate a doc ref and batch it)
                    const newDocRef = doc(collRef);
                    batch.set(newDocRef, item);
                }
            }

            await batch.commit();
            return true;
        } catch (err) {
            console.error("Error saving batch:", err);
            throw err;
        }
    };

    return { serverData, saveBatch, loading, error };
}
