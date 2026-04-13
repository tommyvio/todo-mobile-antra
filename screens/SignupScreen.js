// screens/SignupScreen.js
//
// This screen lets a new user create an account.
//
// React concepts used here:
//   useState  — tracks what the user is typing and whether a request is in-flight
//   navigation.navigate() — moves the user to a different screen

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';

import { signup } from '../services/api';

// navigation is automatically passed as a prop by React Navigation to every
// screen registered in the navigator (see App.js).
export default function SignupScreen({ navigation }) {
  // Each piece of state tracks one piece of UI:
  const [username, setUsername] = useState('');  // current text in the username field
  const [password, setPassword] = useState('');  // current text in the password field
  const [loading, setLoading] = useState(false); // true while the network request is running

  async function handleSignup() {
    // Basic client-side validation before hitting the network
    if (!username.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Please enter a username and password.');
      return;
    }

    setLoading(true);
    try {
      await signup(username.trim(), password.trim());
      // If signup() didn't throw, the account was created successfully.
      Alert.alert('Account created!', 'You can now log in.', [
        { text: 'OK', onPress: () => navigation.navigate('Login') },
      ]);
    } catch (err) {
      // err.message now contains the actual server error (e.g. "Username taken")
      // or a network error ("Network request failed" if the server is unreachable).
      Alert.alert('Signup failed', err.message);
    } finally {
      // finally runs whether the request succeeded or failed — always hide the spinner
      setLoading(false);
    }
  }

  return (
    // KeyboardAvoidingView pushes content up when the keyboard appears,
    // so the submit button doesn't get hidden behind it.
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join to start managing your todos</Text>

        {/* TextInput: the user types here. onChangeText fires on every keystroke
            and we store the value in state so we can read it in handleSignup(). */}
        <TextInput
          style={styles.input}
          placeholder="Username"
          placeholderTextColor="#9CA3AF"
          autoCapitalize="none"    // don't auto-capitalise usernames
          value={username}
          onChangeText={setUsername}
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#9CA3AF"
          secureTextEntry           // hides characters as the user types
          value={password}
          onChangeText={setPassword}
        />

        {/* TouchableOpacity is a pressable wrapper — it dims when tapped.
            disabled prevents double-tapping while the request is in-flight. */}
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSignup}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign Up</Text>
          )}
        </TouchableOpacity>

        {/* Link to LoginScreen */}
        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.linkText}>
            Already have an account? <Text style={styles.linkBold}>Log in</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// StyleSheet.create() is React Native's way of defining styles.
// It's similar to CSS but uses camelCase (e.g. fontSize instead of font-size)
// and all sizes are in density-independent pixels (dp), not px.
const styles = StyleSheet.create({
  container: {
    flex: 1,                      // fill the entire screen
    backgroundColor: '#F0F4FF',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 28,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,                 // Android shadow
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 28,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1E293B',
    marginBottom: 14,
    backgroundColor: '#F8FAFC',
  },
  button: {
    backgroundColor: '#4F46E5',   // indigo
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkText: {
    textAlign: 'center',
    color: '#64748B',
    fontSize: 14,
  },
  linkBold: {
    color: '#4F46E5',
    fontWeight: '600',
  },
});
