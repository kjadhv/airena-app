// app/context/AuthContext.tsx
"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { 
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  User 
} from "firebase/auth";
import { auth, googleProvider } from "../firebase/config";
import AuthModal from "../components/AuthModal";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isCreator: boolean;
  isBlogAdmin: boolean;
  isSuperAdmin: boolean;
  isModalOpen: boolean;
  setIsModalOpen: (isOpen: boolean) => void;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  signupWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [isBlogAdmin, setIsBlogAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Force token refresh to get updated claims for all roles
        const idTokenResult = await firebaseUser.getIdTokenResult(true);
        setIsAdmin(!!idTokenResult.claims.admin);
        setIsCreator(!!idTokenResult.claims.creator);
        setIsBlogAdmin(!!idTokenResult.claims.blogAdmin);
        setIsSuperAdmin(!!idTokenResult.claims.superAdmin);
        setIsModalOpen(false);
      } else {
        // If no user, reset all roles to false
        setIsAdmin(false);
        setIsCreator(false);
        setIsBlogAdmin(false);
        setIsSuperAdmin(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const loginWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signupWithEmail = async (email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const value = { 
    user, 
    loading, 
    isAdmin,
    isCreator,
    isBlogAdmin,
    isSuperAdmin,
    isModalOpen,
    setIsModalOpen,
    loginWithGoogle, 
    loginWithEmail, 
    signupWithEmail, 
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      {isModalOpen && !user && <AuthModal />}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};