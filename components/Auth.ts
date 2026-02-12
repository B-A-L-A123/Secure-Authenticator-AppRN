import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createUserWithEmailAndPassword,
  User as FirebaseUser,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { auth } from '../firebase';

// 🔹 User type
export interface User {
  id: string;
  email: string;
  name: string;
}

// 🔹 Auth error type
export interface AuthError {
  code: string;
  message:  string;
}

// 🔹 Validate email format
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// 🔹 Validate password
export const validatePassword = (password:  string): { valid: boolean; message?:  string } => {
  if (password.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters' };
  }
  return { valid:  true };
};

// 🔹 Get user-friendly error message
export const getAuthErrorMessage = (error: any): string => {
  const errorCode = error.code || '';
  
  switch (errorCode) {
    case 'auth/email-already-in-use':
      return 'This email is already registered. Please login instead.';
    case 'auth/weak-password':
      return 'Password is too weak. Please use a stronger password.';
    case 'auth/invalid-email':
      return 'Invalid email address format.';
    case 'auth/user-not-found':
      return 'No account found with this email. Please register first.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection.';
    case 'auth/too-many-requests': 
      return 'Too many failed attempts. Please try again later.';
    case 'auth/invalid-credential':
      return 'Invalid credentials. Please check your email and password.';
    case 'auth/user-disabled': 
      return 'This account has been disabled.';
    default:
      return error.message || 'An error occurred. Please try again.';
  }
};

// 🔹 Convert Firebase user to app user
const convertFirebaseUser = (firebaseUser: FirebaseUser): User => {
  return {
    id: firebaseUser.uid,
    email: firebaseUser.email!,
    name: firebaseUser.displayName || firebaseUser.email!. split('@')[0],
  };
};

// 🔹 Register new user
export const registerUser = async (
  email: string,
  password: string
): Promise<{ success: boolean; user?: User; error?: string }> => {
  try {
    // Validate inputs
    if (!email.trim() || !password.trim()) {
      return { success: false, error: 'Email and password are required' };
    }

    if (!validateEmail(email.trim())) {
      return { success:  false, error: 'Please enter a valid email address' };
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation. valid) {
      return { success: false, error: passwordValidation.message };
    }

    // Create user with Firebase
    const result = await createUserWithEmailAndPassword(
      auth,
      email.trim(),
      password
    );

    const userData = convertFirebaseUser(result.user);

    // Save user locally
    await AsyncStorage.setItem('user', JSON.stringify(userData));

    console.log(`✅ User registered:  ${userData.email} (${userData.id})`);

    return { success: true, user: userData };
  } catch (error: any) {
    console.error('❌ Registration error:', error);
    return { success: false, error: getAuthErrorMessage(error) };
  }
};

// 🔹 Sign in existing user
export const signInUser = async (
  email: string,
  password: string
): Promise<{ success: boolean; user?:  User; error?: string }> => {
  try {
    // Validate inputs
    if (!email.trim() || !password.trim()) {
      return { success:  false, error: 'Email and password are required' };
    }

    if (!validateEmail(email.trim())) {
      return { success: false, error: 'Please enter a valid email address' };
    }

    // Sign in with Firebase
    const result = await signInWithEmailAndPassword(
      auth,
      email.trim(),
      password
    );

    const userData = convertFirebaseUser(result.user);

    // Save user locally
    await AsyncStorage.setItem('user', JSON. stringify(userData));

    console.log(`✅ User signed in: ${userData.email} (${userData.id})`);

    return { success: true, user:  userData };
  } catch (error: any) {
    console.error('❌ Sign in error:', error);
    return { success: false, error: getAuthErrorMessage(error) };
  }
};

// 🔹 Sign out user
export const signOutUser = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    await signOut(auth);
    await AsyncStorage.removeItem('user');
    
    console.log('🚪 User signed out');
    
    return { success: true };
  } catch (error: any) {
    console.error('❌ Sign out error:', error);
    return { success: false, error: getAuthErrorMessage(error) };
  }
};

// 🔹 Get current user from AsyncStorage
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const userData = await AsyncStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('❌ Error getting current user:', error);
    return null;
  }
};

// 🔹 Setup auth state listener
export const setupAuthListener = (
  onUserChange: (user: User | null) => void
): (() => void) => {
  const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
    try {
      if (firebaseUser) {
        // User is signed in
        const userData = convertFirebaseUser(firebaseUser);

        // Check if this is a different user than the one currently stored
        const existingUser = await AsyncStorage.getItem('user');
        if (existingUser) {
          const existingUserData:  User = JSON.parse(existingUser);
          
          // If the user ID is different, this is a user switch
          if (existingUserData.id !== userData. id) {
            console.log(`🔄 User switched from ${existingUserData.email} to ${userData.email}`);
            console.log(`   Old user ID: ${existingUserData.id}`);
            console.log(`   New user ID: ${userData.id}`);
          }
        }

        // Save new user to AsyncStorage
        await AsyncStorage. setItem('user', JSON.stringify(userData));
        
        // Notify listener
        onUserChange(userData);
        
        console.log(`✅ User authenticated: ${userData.email} (${userData.id})`);
      } else {
        // User is signed out
        console.log('🚪 User signed out');
        
        await AsyncStorage.removeItem('user');
        onUserChange(null);
      }
    } catch (error) {
      console.error('❌ Auth state change error:', error);
      onUserChange(null);
    }
  });

  return unsubscribe;
};

// 🔹 Check if user is authenticated
export const isAuthenticated = (): boolean => {
  return auth.currentUser !== null;
};

// 🔹 Forgot Password (Email Reset)
export const resetPassword = async (email: string) => {
  if (!email || !email.trim()) {
    return {
      success: false,
      error: 'Email is required',
    };
  }

  if (!validateEmail(email.trim())) {
    return {
      success: false,
      error: 'Invalid email address',
    };
  }

  try {
    await sendPasswordResetEmail(auth, email.trim());

    return {
      success: true,
    };
  } catch (error: any) {
    console.error('Password reset error:', error);

    return {
      success: false,
      error: error.message || 'Failed to send reset email',
    };
  }
};
