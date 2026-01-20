import Feather from "@expo/vector-icons/build/Feather";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Slider from "@react-native-community/slider";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
/* ---------------- PASSWORD UTILS ---------------- */

const LOWER = "abcdefghijklmnopqrstuvwxyz";
const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const NUMBERS = "0123456789";
const SYMBOLS = "!@#$%^&*()_+-=[]{}|;:,.<>?";

type PasswordOptions = {
  length: number;
  lowercase: boolean;
  uppercase: boolean;
  numbers: boolean;
  symbols: boolean;
};

type SavedAccount = {
  id: string;
  accountName: string;
  username: string;
  password: string;
  createdAt: number;
};

function generatePassword(options: PasswordOptions): string {
  let charset = "";
  if (options.lowercase) charset += LOWER;
  if (options.uppercase) charset += UPPER;
  if (options.numbers) charset += NUMBERS;
  if (options.symbols) charset += SYMBOLS;

  if (!charset) return "";

  let password = "";
  for (let i = 0; i < options.length; i++) {
    const index = Math.floor(Math.random() * charset.length);
    password += charset[index];
  }
  return password;
}

function analyzePasswordStrength(password: string): { strength: string; color: string; score: number } {
  if (!password) return { strength: "None", color: "#666", score: 0 };

  let score = 0;
  
  if (password.length >= 12) score += 2;
  else if (password.length >= 8) score += 1;
  
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;

  if (score <= 3) return { strength: "WEAK", color: "#ef4444", score: 1 };
  if (score <= 5) return { strength: "MODERATE", color: "#f97316", score: 2 };
  return { strength: "STRONG", color: "#22c55e", score: 3 };
}

/* ---------------- SCREEN ---------------- */

export default function PasswordGeneratorScreen() {
  const router = useRouter();
  const [accountName, setAccountName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [savedCount, setSavedCount] = useState(0);

  const [options, setOptions] = useState<PasswordOptions>({
    length: 16,
    lowercase: true,
    uppercase: true,
    numbers: true,
    symbols: true,
  });

  /* ---------------- LOAD ACCOUNTS ---------------- */

  useEffect(() => {
    loadAccountCount();
    // Generate initial password
    const pwd = generatePassword(options);
    setPassword(pwd);
  }, []);

  const loadAccountCount = async () => {
    const stored = await AsyncStorage.getItem("accounts");
    const accounts = stored ? JSON.parse(stored) : [];
    setSavedCount(accounts.length);
  };

  /* ---------------- ACTIONS ---------------- */

  const handleGenerate = () => {
    const pwd = generatePassword(options);
    if (!pwd) {
      Alert.alert("Select at least one option");
      return;
    }
    setPassword(pwd);
  };

  const handleCopy = async (text: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert("Copied", "Password copied to clipboard");
  };

  const handleSave = async () => {
    if (!accountName || !password) {
      Alert.alert("Missing fields", "Account name and password required");
      return;
    }

    const newAccount = {
      id: Date.now().toString(),
      accountName,
      username,
      password,
      createdAt: Date.now(),
    };

    const stored = await AsyncStorage.getItem("accounts");
    const accounts = stored ? JSON.parse(stored) : [];
    accounts.unshift(newAccount);

    await AsyncStorage.setItem("accounts", JSON.stringify(accounts));

    Alert.alert("Saved", "Account stored successfully");

    setAccountName("");
    setUsername("");
    loadAccountCount();
  };

  /* ---------------- UI ---------------- */

  const passwordStrength = analyzePasswordStrength(password);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        {/* Header with Vault Button */}
        <View style={styles.headerRow}>
          <View style={styles.headerInfo}>
            <Text style={styles.title}>Password Generator</Text>
          </View>
          <TouchableOpacity 
            style={styles.vaultButton}
            onPress={() => router.push('/(tabs)/PasswordVault')}
          >
            <Feather name="shield" size={20} color="#000000" />
            <Text style={styles.vaultButtonText}>Vault</Text>
            {savedCount > 0 && (
              <View style={styles.vaultBadge}>
                <Text style={styles.vaultBadgeText}>{savedCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Password Display Card */}
        <View style={styles.passwordCard}>
          <Text style={styles.passwordLabel}>GENERATED PASSWORD</Text>
          
          <View style={styles.passwordDisplay}>
            <Text style={styles.passwordText} numberOfLines={1}>
              {password || ""}
            </Text>
            <View style={styles.passwordActions}>
              <TouchableOpacity 
                style={styles.iconButton}
                onPress={handleGenerate}
              >
               <Feather name="refresh-cw" size={24} color="#e6e6e6" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.iconButton}
                onPress={() => handleCopy(password)}
                disabled={!password}
              >
                <Feather name="clipboard" size={24} color="#e6e6e6" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Security Strength */}
        <View style={styles.strengthSection}>
          <View style={styles.strengthHeader}>
            <Text style={styles.strengthTitle}>Security Strength</Text>
            <Text style={[styles.strengthLabel, { color: passwordStrength.color }]}>
              {passwordStrength.strength}
            </Text>
          </View>
          <View style={styles.strengthBar}>
            {[1, 2, 3, 4].map((level) => (
              <View
                key={level}
                style={[
                  styles.strengthSegment,
                  level <= passwordStrength.score && { backgroundColor: passwordStrength.color }
                ]}
              />
            ))}
          </View>
        </View>

        {/* Password Length */}
        <View style={styles.lengthSection}>
          <View style={styles.lengthHeader}>
            <Text style={styles.lengthTitle}>Password Length</Text>
            <Text style={styles.lengthValue}>{options.length}</Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={4}
            maximumValue={64}
            step={1}
            value={options.length}
            onValueChange={(value) => setOptions({ ...options, length: Math.round(value) })}
            minimumTrackTintColor="#bfc3c7"
            maximumTrackTintColor="rgba(191, 195, 199, 0.2)"
            thumbTintColor="#ffffff"
          />
          <View style={styles.sliderLabels}>  
            <Text style={styles.sliderLabel}>4</Text>
            <Text style={styles.sliderLabel}>64</Text>
          </View>
        </View>

        {/* Characters to Include */}
        <View style={styles.optionsSection}>
          <Text style={styles.sectionTitle}>Characters to include</Text>

          <View style={styles.optionCard}>
            <View style={styles.optionRow}>
              <Text style={styles.optionIcon}>A↑</Text>
              <Text style={styles.optionLabel}>Uppercase (A-Z)</Text>
            </View>
            <Switch
              value={options.uppercase}
              onValueChange={(v) => setOptions({ ...options, uppercase: v })}
              trackColor={{ false: '#2a2a2a', true: '#bfc3c7' }}
              thumbColor="#ffffff"
            />
          </View>

          <View style={styles.optionCard}>
            <View style={styles.optionRow}>
              <Text style={styles.optionIcon}>a↓</Text>
              <Text style={styles.optionLabel}>Lowercase (a-z)</Text>
            </View>
            <Switch
              value={options.lowercase}
              onValueChange={(v) => setOptions({ ...options, lowercase: v })}
              trackColor={{ false: '#2a2a2a', true: '#bfc3c7' }}
              thumbColor="#ffffff"
            />
          </View>

          <View style={styles.optionCard}>
            <View style={styles.optionRow}>
              <Text style={styles.optionIcon}>123</Text>
              <Text style={styles.optionLabel}>Numbers (0-9)</Text>
            </View>
            <Switch
              value={options.numbers}
              onValueChange={(v) => setOptions({ ...options, numbers: v })}
              trackColor={{ false: '#2a2a2a', true: '#bfc3c7' }}
              thumbColor="#ffffff"
            />
          </View>

          <View style={styles.optionCard}>
            <View style={styles.optionRow}>
              <Text style={styles.optionIcon}>!@#</Text>
              <Text style={styles.optionLabel}>Symbols (!@#$%...)</Text>
            </View>
            <Switch
              value={options.symbols}
              onValueChange={(v) => setOptions({ ...options, symbols: v })}
              trackColor={{ false: '#2a2a2a', true: '#bfc3c7' }}
              thumbColor="#ffffff"
            />
          </View>
        </View>

        {/* Save Account Section */}
        <View style={styles.accountSection}>
          <Text style={styles.sectionTitle}>Save to Vault</Text>

          <View style={styles.inputCard}>
            <Text style={styles.inputLabel}>Account Name *</Text>
            <TextInput
              style={styles.input}
              value={accountName}
              onChangeText={setAccountName}
              placeholder="e.g., Gmail, Facebook"
              placeholderTextColor="#666"
            />
          </View>

          <View style={styles.inputCard}>
            <Text style={styles.inputLabel}>Username (Optional)</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="e.g., user@email.com"
              placeholderTextColor="#666"
            />
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Feather name="save" size={20} color="#000000" />
            <Text style={styles.saveBtnText}>Save to Vault</Text>
          </TouchableOpacity>

          <Text style={styles.disclaimer}>
            ⚠️ Passwords are stored locally on your device only.
          </Text>
        </View>

        <View style={styles.spacer} />
      </View>
    </ScrollView>
  );
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerInfo: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
  },
  vaultButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#bfc3c7',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
    shadowColor: '#bfc3c7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  vaultButtonText: {
    color: '#000000',
    fontWeight: '700',
    fontSize: 14,
  },
  vaultBadge: {
    backgroundColor: '#000000',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  vaultBadgeText: {
    color: '#bfc3c7',
    fontSize: 11,
    fontWeight: '700',
  },
  passwordCard: {
    backgroundColor: '#111111',
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  }, 
  passwordLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#9a9a9a',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  passwordDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  passwordText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#bfc3c7',
    fontFamily: 'monospace',
    flex: 1,
  },
  passwordActions: {
    flexDirection: 'row',
    gap: 7,
  },
  iconButton: {
    width: 30,
    height: 30,
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  strengthSection: {
    marginBottom: 24,
  },
  strengthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  strengthTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e6e6e6',
  },
  strengthLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  strengthBar: {
    flexDirection: 'row',
    gap: 8,
  },
  strengthSegment: {
    flex: 1,
    height: 8,
    backgroundColor: '#1a1a1a',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  lengthSection: {
    marginBottom: 24,
  },
  lengthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  lengthTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e6e6e6',
  },
  lengthValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#bfc3c7',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  sliderLabel: {
    fontSize: 12,
    color: '#9a9a9a',
  },
  optionsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#e6e6e6',
    marginBottom: 12,
  },
  optionCard: {
    backgroundColor: '#111111',
    borderRadius: 12,
    padding: 16,
    marginBottom: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionIcon: {
    fontSize: 16,
    color: '#bfc3c7',
    fontWeight: '600',
  },
  optionLabel: {
    fontSize: 14,
    color: '#e6e6e6',
  },
  accountSection: {
    marginBottom: 15,
  },
  inputCard: {
    backgroundColor: '#111111',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  inputLabel: {
    fontSize: 13,
    color: '#9a9a9a',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    fontSize: 15,
    color: '#e6e6e6',
    padding: 0,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#bfc3c7',
    padding: 18,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#bfc3c7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  saveBtnText: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  disclaimer: {
    fontSize: 13,
    color: '#9a9a9a',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 18,
  },
  spacer: {
    height: 30,
  },
});