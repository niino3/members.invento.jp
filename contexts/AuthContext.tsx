'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/config';
import { User, AuthContextType } from '@/types/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Firebaseユーザーから内部ユーザー型に変換
  const convertToUser = async (firebaseUser: FirebaseUser): Promise<User | null> => {
    if (!firebaseUser) return null;

    try {
      // Firestoreからユーザー情報を取得
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      const userData = userDoc.data();

      const user = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        role: userData?.role || 'user',
        customerId: userData?.customerId,
        createdAt: userData?.createdAt?.toDate() || new Date(),
        updatedAt: userData?.updatedAt?.toDate() || new Date(),
      };
      
      console.log('User data loaded:', { 
        uid: user.uid, 
        role: user.role, 
        customerId: user.customerId,
        hasUserData: !!userData 
      });
      
      return user;
    } catch (error) {
      console.warn('Firestore access failed, using basic user data:', error);
      // Firestoreにアクセスできない場合は基本情報のみ使用
      return {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        setLoading(true);
        if (firebaseUser) {
          const user = await convertToUser(firebaseUser);
          setUser(user);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Auth state change error:', error);
        setError(error as Error);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setError(null);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = await convertToUser(userCredential.user);
      setUser(user);
    } catch (error) {
      setError(error as Error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, customerId?: string) => {
    try {
      setError(null);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      try {
        // Firestoreにユーザードキュメントを作成
        const userData: any = {
          email: userCredential.user.email,
          role: 'user',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        
        // customerIdが提供された場合のみ追加
        if (customerId) {
          userData.customerId = customerId;
        }
        
        await setDoc(doc(db, 'users', userCredential.user.uid), userData);
      } catch (firestoreError) {
        console.warn('Failed to create user document in Firestore:', firestoreError);
        // Firestoreの作成に失敗してもユーザー作成は続行
      }

      const user = await convertToUser(userCredential.user);
      setUser(user);
    } catch (error) {
      setError(error as Error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      setError(null);
      await firebaseSignOut(auth);
      setUser(null);
    } catch (error) {
      setError(error as Error);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      setError(null);
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      setError(error as Error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}