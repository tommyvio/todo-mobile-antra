// screens/DashboardScreen.js
//
// Shows all lists. Owners can edit the name or delete a list.
// Long-pressing a list you own opens an action menu.
// The edit action shows a Modal (a built-in React Native overlay component).

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Alert,
  SafeAreaView,
  RefreshControl,
  Modal,          // React Native's built-in overlay — no library needed
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import { getLists, createList, updateList, deleteList } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function DashboardScreen({ navigation }) {
  const { token, user, signOut } = useAuth();

  const [lists, setLists]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [creating, setCreating]     = useState(false);

  // ── Edit modal state ──────────────────────────────────────────────
  // When the user long-presses their own list, we store it here and
  // open the modal so they can type a new name.
  const [editTarget, setEditTarget]       = useState(null);  // the list being edited
  const [editName, setEditName]           = useState('');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [saving, setSaving]               = useState(false);

  const fetchLists = useCallback(async () => {
    try {
      const data = await getLists(token);
      setLists(data.lists ?? []);
    } catch {
      Alert.alert('Error', 'Could not load lists.');
    }
  }, [token]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      await fetchLists();
      setLoading(false);
    }
    load();
  }, [fetchLists]);

  async function onRefresh() {
    setRefreshing(true);
    await fetchLists();
    setRefreshing(false);
  }

  async function handleCreateList() {
    if (!newListName.trim()) {
      Alert.alert('Name required', 'Please enter a name for the new list.');
      return;
    }
    setCreating(true);
    try {
      await createList(token, newListName.trim());
      setNewListName('');
      await fetchLists();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setCreating(false);
    }
  }

  // Called when the user long-presses a list card they own.
  // Alert.alert can show multiple buttons — this acts as a quick action sheet.
  function handleLongPress(list) {
    if (!isOwner(list)) return; // non-owners get nothing

    Alert.alert(list.name, 'What would you like to do?', [
      {
        text: 'Edit Name',
        onPress: () => {
          setEditTarget(list);
          setEditName(list.name);  // pre-fill with current name
          setEditModalVisible(true);
        },
      },
      {
        text: 'Delete List',
        style: 'destructive',   // shows red on iOS
        onPress: () => confirmDelete(list),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  function confirmDelete(list) {
    Alert.alert(
      'Delete list?',
      `"${list.name}" and all its todos will be permanently deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteList(token, list.id);
              await fetchLists();
            } catch (err) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  }

  async function handleSaveEdit() {
    if (!editName.trim()) {
      Alert.alert('Name required', 'List name cannot be empty.');
      return;
    }
    setSaving(true);
    try {
      await updateList(token, editTarget.id, editName.trim());
      setEditModalVisible(false);
      await fetchLists();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  }

  function isOwner(list) {
    return list.creatorId === user?.userId;
  }

  function renderList({ item }) {
    const owned = isOwner(item);
    return (
      <TouchableOpacity
        style={styles.listCard}
        onPress={() => navigation.navigate('ListDetail', { list: item })}
        onLongPress={() => handleLongPress(item)}
        // delayLongPress — how many ms before long-press fires (default 500ms)
        delayLongPress={400}
        activeOpacity={0.75}
      >
        <View style={styles.listCardContent}>
          <Text style={styles.listName}>{item.name}</Text>
          <View style={[styles.badge, owned ? styles.badgeOwned : styles.badgeShared]}>
            <Text style={[styles.badgeText, owned ? styles.badgeTextOwned : styles.badgeTextShared]}>
              {owned ? 'Your List' : 'Shared'}
            </Text>
          </View>
        </View>
        <View style={styles.listCardRight}>
          {owned && (
            <Text style={styles.hintText}>hold to edit</Text>
          )}
          <Text style={styles.chevron}>›</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.username} 👋</Text>
          <Text style={styles.headerSub}>Your lists</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={signOut}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* New list input */}
      <View style={styles.newListRow}>
        <TextInput
          style={styles.newListInput}
          placeholder="New list name…"
          placeholderTextColor="#9CA3AF"
          value={newListName}
          onChangeText={setNewListName}
          returnKeyType="done"
          onSubmitEditing={handleCreateList}
        />
        <TouchableOpacity
          style={[styles.newListBtn, creating && styles.buttonDisabled]}
          onPress={handleCreateList}
          disabled={creating}
        >
          {creating
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.newListBtnText}>+</Text>
          }
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#4F46E5" />
      ) : (
        <FlatList
          data={lists}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderList}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No lists yet. Create one above!</Text>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />
          }
        />
      )}

      {/* ── Edit name modal ──────────────────────────────────────────
          Modal renders on top of everything, like a floating dialog.
          `transparent` keeps the background visible (we add a dark overlay via styles).
          `animationType="slide"` slides up from the bottom — feels native on mobile.
      ──────────────────────────────────────────────────────────────── */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)} // Android back button
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setEditModalVisible(false)} // tap outside to dismiss
          />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit List Name</Text>
            <TextInput
              style={styles.modalInput}
              value={editName}
              onChangeText={setEditName}
              autoFocus           // keyboard opens automatically
              selectTextOnFocus   // selects all text so user can type over it
              returnKeyType="done"
              onSubmitEditing={handleSaveEdit}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, saving && styles.buttonDisabled]}
                onPress={handleSaveEdit}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.modalSaveText}>Save</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FF' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  greeting: { fontSize: 20, fontWeight: '700', color: '#1E293B' },
  headerSub: { fontSize: 13, color: '#64748B', marginTop: 2 },
  logoutBtn: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  logoutText: { color: '#DC2626', fontWeight: '600', fontSize: 13 },
  newListRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 12,
    gap: 8,
  },
  newListInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: '#1E293B',
  },
  newListBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 10,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newListBtnText: { color: '#fff', fontSize: 24, lineHeight: 28 },
  buttonDisabled: { opacity: 0.6 },
  listContainer: { paddingHorizontal: 20, paddingBottom: 30 },
  listCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  listCardContent: { flex: 1, gap: 6 },
  listCardRight: { alignItems: 'flex-end', gap: 4 },
  listName: { fontSize: 16, fontWeight: '600', color: '#1E293B' },
  hintText: { fontSize: 10, color: '#CBD5E1' },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeOwned: { backgroundColor: '#EEF2FF' },
  badgeShared: { backgroundColor: '#FFFBEB' },
  badgeText: { fontSize: 11, fontWeight: '600' },
  badgeTextOwned: { color: '#4F46E5' },
  badgeTextShared: { color: '#D97706' },
  chevron: { fontSize: 22, color: '#94A3B8', marginLeft: 8 },
  emptyText: { textAlign: 'center', color: '#94A3B8', marginTop: 60, fontSize: 15 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 36,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 14,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1E293B',
    backgroundColor: '#F8FAFC',
    marginBottom: 16,
  },
  modalButtons: { flexDirection: 'row', gap: 10 },
  modalCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  modalCancelText: { color: '#64748B', fontWeight: '600' },
  modalSaveBtn: {
    flex: 1,
    backgroundColor: '#4F46E5',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  modalSaveText: { color: '#fff', fontWeight: '600' },
});
