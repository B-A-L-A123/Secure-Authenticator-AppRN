import Feather from "@expo/vector-icons/build/Feather";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Clipboard from "expo-clipboard";
import React, { useEffect, useState } from "react";
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import type { SavedAccount } from '../../utils/types';
import { analyzePasswordStrength } from '../../utils/passwordUtils';

export default function PasswordVaultScreen() {
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);
  const [visiblePasswords, setVisiblePasswords] = useState<{ [key: string]: boolean }>({});
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    const stored = await AsyncStorage.getItem("accounts");
    const accounts = stored ? JSON.parse(stored) : [];
    setSavedAccounts(accounts);
  };

  const handleCopy = async (text: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert("Copied", "Password copied to clipboard");
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete this account?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const filtered = savedAccounts.filter((acc) => acc.id !== id);
            await AsyncStorage.setItem("accounts", JSON.stringify(filtered));
            loadAccounts();
          },
        },
      ]
    );
  };

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords({ ...visiblePasswords, [id]: !visiblePasswords[id] });
  };

  const filteredAccounts = savedAccounts.filter((account) =>
    account.accountName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    account.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Password Vault</Text>
        <Text style={styles.subtitle}>
          {savedAccounts.length} {savedAccounts.length === 1 ? "password" : "passwords"} stored
        </Text>
      </View>

      {savedAccounts.length > 0 && (
        <View style={styles.searchContainer}>
          <Feather name="search" size={20} color="#9a9a9a" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search accounts..."
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Feather name="x" size={20} color="#9a9a9a" />
            </TouchableOpacity>
          )}
        </View>
      )}

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {filteredAccounts.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="lock" size={64} color="#2a2a2a" />
            <Text style={styles.emptyTitle}>
              {searchQuery ? "No accounts found" : "No passwords saved yet"}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery 
                ? "Try a different search term" 
                : "Generated passwords will appear here when saved"}
            </Text>
          </View>
        ) : (
          <View style={styles.accountsList}>
            {filteredAccounts.map((account) => {
              const isVisible = visiblePasswords[account.id];
              const strength = analyzePasswordStrength(account.password);

              return (
                <View key={account.id} style={styles.accountCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.accountInfo}>
                      <Text style={styles.accountName}>{account.accountName}</Text>
                      <View style={[styles.strengthBadge, { backgroundColor: strength.color }]}>
                        <Text style={styles.strengthText}>{strength.strength}</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.deleteIconButton}
                      onPress={() => handleDelete(account.id)}
                    >
                      <Feather name="trash-2" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  </View>

                  {account.username && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Username</Text>
                      <View style={styles.detailValueContainer}>
                        <Text style={styles.detailValue} numberOfLines={1}>
                          {account.username}
                        </Text>
                        <TouchableOpacity
                          style={styles.inlineButton}
                          onPress={() => handleCopy(account.username)}
                        >
                          <Feather name="copy" size={16} color="#bfc3c7" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Password</Text>
                    <View style={styles.passwordRow}>
                      <Text style={[styles.passwordValue, !isVisible && styles.hiddenPassword]}>
                        {isVisible ? account.password : "••••••••••••"}
                      </Text>
                      <View style={styles.passwordActions}>
                        <TouchableOpacity
                          style={styles.inlineButton}
                          onPress={() => togglePasswordVisibility(account.id)}
                        >
                          <Feather 
                            name={isVisible ? "eye-off" : "eye"} 
                            size={16} 
                            color="#bfc3c7" 
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.inlineButton}
                          onPress={() => handleCopy(account.password)}
                        >
                          <Feather name="copy" size={16} color="#bfc3c7" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  <View style={styles.cardFooter}>
                    <Text style={styles.timestamp}>
                      Created {new Date(account.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.spacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#9a9a9a',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111111',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#e6e6e6',
    padding: 0,
  },
  scrollView: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#e6e6e6',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9a9a9a',
    textAlign: 'center',
    lineHeight: 20,
  },
  accountsList: {
    paddingHorizontal: 20,
  },
  accountCard: {
    backgroundColor: '#111111',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  accountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  accountName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#e6e6e6',
  },
  strengthBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  strengthText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  deleteIconButton: {
    padding: 8,
  },
  detailRow: {
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 12,
    color: '#9a9a9a',
    marginBottom: 6,
    fontWeight: '500',
  },
  detailValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  detailValue: {
    fontSize: 14,
    color: '#e6e6e6',
    flex: 1,
    marginRight: 8,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  passwordValue: {
    fontSize: 14,
    color: '#e6e6e6',
    fontFamily: 'monospace',
    flex: 1,
    marginRight: 8,
  },
  hiddenPassword: {
    letterSpacing: 2,
  },
  passwordActions: {
    flexDirection: 'row',
    gap: 8,
  },
  inlineButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#0a0a0a',
  },
  cardFooter: {
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
  },
  timestamp: {
    fontSize: 11,
    color: '#666',
  },
  spacer: {
    height: 30,
  },
});