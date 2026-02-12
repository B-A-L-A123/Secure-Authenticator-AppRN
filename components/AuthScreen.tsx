import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { resetPassword } from './Auth';

import { useUser } from '../app/_layout';
import {
  registerUser,
  setupAuthListener,
  signInUser,
  User,
  validateEmail
} from './Auth';


export default function AuthScreen() {
  const { setUser } = useUser();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  // 🔹 Setup auth state listener on component mount
  useEffect(() => {
    const unsubscribe = setupAuthListener((user: User | null) => {
      setUser(user);
      setInitializing(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [setUser]);

  // 🔹 Handle authentication (Sign In or Register)
  const handleAuth = async () => {
    // Basic validation
    if (!email. trim() || !password.trim()) {
      Alert.alert('Error', 'Email and password are required');
      return;
    }

    if (!validateEmail(email. trim())) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    try {
      setLoading(true);

      const result = isRegister
        ? await registerUser(email, password)
        : await signInUser(email, password);

      if (result.success && result.user) {
        // Update global context
        setUser(result.user);

        // Clear inputs on success
        setEmail('');
        setPassword('');

        Alert.alert(
          'Success',
          isRegister ? 'Account created successfully!' : 'Logged in successfully!'
        );
      } else {
        Alert. alert('Authentication Error', result.error || 'Unknown error occurred');
      }
    } catch (error:  any) {
      console.error('Unexpected error:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Show loading indicator while checking auth state
  if (initializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {isRegister ? '🔐 Create Account' : '🔓 Welcome Back'}
            </Text>
            <Text style={styles.subtitle}>
              {isRegister
                ? 'Register to secure your 2FA codes'
                : 'Sign in to access your authenticator'}
            </Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              
              placeholderTextColor="#666"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
              editable={! loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              
              placeholderTextColor="#666"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
            {isRegister && (
              <Text style={styles.hint}>Must be at least 6 characters</Text>
            )}


            <Text
  style={{ color: "#9fbae2", marginTop: 10 }}
  onPress={() => resetPassword(email)}
>
  Forgot Password?
</Text>
          </View>



          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleAuth}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {isRegister ? 'Create Account' : 'Sign In'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchButton}
            onPress={() => setIsRegister(!isRegister)}
            disabled={loading}
          >
            <Text style={styles.switchText}>
              {isRegister
                ? 'Already have an account? Sign In'
                : "Don't have an account? Register"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // ✅ REMOVED backgroundColor: '#000' - this was making it invisible! 
    width: '100%',
    marginVertical: 0,
    marginBottom: -47,
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: 20,
  },
  formContainer: {
    width: '100%',
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#e6e6e6',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#9a9a9a',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  inputContainer: {
    marginBottom: 10,
  },
  label:  {
    fontSize: 14,
    fontWeight: '600',
    color: '#e6e6e6',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 12,
    padding: 13,
    fontSize:  14,
    color: '#e6e6e6',
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginTop: 6,
  },
  button:  {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 13,
    alignItems: 'center',
    marginTop: 7,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  switchButton:  {
    marginTop: 8,
    padding: 8,
    alignItems: 'center',
  },
  switchText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText:  {
    marginTop: 16,
    fontSize: 16,
    color: '#9a9a9a',
  },
});