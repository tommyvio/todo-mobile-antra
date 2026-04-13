// screens/ListDetailScreen.js
//
// Layout: "Add todo" sits at the TOP (below the nav header). Each row shows
// the task title and a due line ("Due: …" or "No due date"). Completion uses
// a small square checkbox on the right — no large circle on the left.
//
// Dates: we send "YYYY-MM-DD" using LOCAL calendar day (not toISOString(),
// which can shift the day across time zones). Due badges parse the same way.
//
// Order: incomplete todos first, then by due date (soonest first), then by id.

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

import { getTodos, createTodo, updateTodo, deleteTodo } from '../services/api';
import { useAuth } from '../context/AuthContext';

// ------------------------------------------------------------------
// Date helpers — LOCAL day, not UTC (fixes "wrong day" / missing badge)
// ------------------------------------------------------------------

/** "YYYY-MM-DD" from a Date using the phone's local calendar */
function toLocalISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Parse "YYYY-MM-DD" as local noon so labels match what the user picked */
function parseLocalDateOnly(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3) return null;
  const [y, m, d] = parts;
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

function dueDateInfo(dateStr) {
  const due = parseLocalDateOnly(dateStr);
  if (!due) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diffDays = Math.round((dueDay - today) / 86400000);

  if (diffDays < 0) return { label: 'Overdue', color: '#DC2626', bg: '#FEE2E2' };
  if (diffDays === 0) return { label: 'Today', color: '#D97706', bg: '#FFFBEB' };
  if (diffDays === 1) return { label: 'Tomorrow', color: '#2563EB', bg: '#EFF6FF' };
  return {
    label: due.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
    color: '#475569',
    bg: '#F1F5F9',
  };
}

function sortTodos(arr) {
  return [...arr].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    const ta = a.dueDate ? parseLocalDateOnly(a.dueDate).getTime() : Number.POSITIVE_INFINITY;
    const tb = b.dueDate ? parseLocalDateOnly(b.dueDate).getTime() : Number.POSITIVE_INFINITY;
    if (ta !== tb) return ta - tb;
    return a.id - b.id;
  });
}

// ------------------------------------------------------------------

export default function ListDetailScreen({ route, navigation }) {
  const { list } = route.params;
  const { token, user } = useAuth();

  const owned = list.creatorId === user?.userId;

  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [taskText, setTaskText] = useState('');
  const [addDueDate, setAddDueDate] = useState(null);
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [pickerDate, setPickerDate] = useState(new Date());
  const [adding, setAdding] = useState(false);

  const [editTarget, setEditTarget] = useState(null);
  const [editText, setEditText] = useState('');
  const [editDueDate, setEditDueDate] = useState(null);
  const [editDateModalVisible, setEditDateModalVisible] = useState(false);
  const [editPickerDate, setEditPickerDate] = useState(new Date());
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const sortedTodos = useMemo(() => sortTodos(todos), [todos]);

  const fetchTodos = useCallback(async () => {
    try {
      const data = await getTodos(token, list.id);
      setTodos(data.todos ?? []);
    } catch {
      Alert.alert('Error', 'Could not load todos.');
    }
  }, [token, list.id]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      await fetchTodos();
      setLoading(false);
    }
    load();
    navigation.setOptions({ title: list.name });
  }, [fetchTodos, navigation, list.name]);

  async function onRefresh() {
    setRefreshing(true);
    await fetchTodos();
    setRefreshing(false);
  }

  async function handleAddTodo() {
    if (!taskText.trim()) {
      Alert.alert('Empty task', 'Please type something first.');
      return;
    }
    setAdding(true);
    try {
      await createTodo(
        token,
        list.id,
        taskText.trim(),
        addDueDate ? toLocalISODate(addDueDate) : null
      );
      setTaskText('');
      setAddDueDate(null);
      await fetchTodos();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setAdding(false);
    }
  }

  async function handleToggle(item) {
    const newValue = !item.completed;
    setTodos((prev) =>
      prev.map((t) => (t.id === item.id ? { ...t, completed: newValue } : t))
    );
    try {
      await updateTodo(token, list.id, item.id, { completed: newValue });
    } catch (err) {
      setTodos((prev) =>
        prev.map((t) => (t.id === item.id ? { ...t, completed: item.completed } : t))
      );
      Alert.alert('Error', err.message);
    }
  }

  function handleTodoMenu(item) {
    Alert.alert(item.task, 'What would you like to do?', [
      {
        text: 'Edit',
        onPress: () => {
          setEditTarget(item);
          setEditText(item.task);
          if (item.dueDate) {
            const d = parseLocalDateOnly(item.dueDate);
            setEditDueDate(d);
            setEditPickerDate(d || new Date());
          } else {
            setEditDueDate(null);
            setEditPickerDate(new Date());
          }
          setEditModalVisible(true);
        },
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          Alert.alert('Delete todo?', `"${item.task}" will be removed.`, [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: async () => {
                try {
                  await deleteTodo(token, list.id, item.id);
                  setTodos((prev) => prev.filter((t) => t.id !== item.id));
                } catch (err) {
                  Alert.alert('Error', err.message);
                }
              },
            },
          ]);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function handleSaveEdit() {
    if (!editText.trim()) {
      Alert.alert('Empty task', 'Task cannot be empty.');
      return;
    }
    setSaving(true);
    try {
      await updateTodo(token, list.id, editTarget.id, {
        task: editText.trim(),
        dueDate: editDueDate ? toLocalISODate(editDueDate) : null,
      });
      setEditModalVisible(false);
      await fetchTodos();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  }

  function openAddDateModal() {
    setPickerDate(addDueDate ?? new Date());
    setDateModalVisible(true);
  }

  function confirmAddDate() {
    setAddDueDate(pickerDate);
    setDateModalVisible(false);
  }

  function openEditDateModal() {
    setEditPickerDate(editDueDate ?? new Date());
    setEditDateModalVisible(true);
  }

  function confirmEditDate() {
    setEditDueDate(editPickerDate);
    setEditDateModalVisible(false);
  }

  function renderTodo({ item }) {
    const info = item.dueDate ? dueDateInfo(item.dueDate) : null;
    return (
      <View style={styles.todoRow}>
        {/* Main column: title + due date always visible (no circle on the left). */}
        <View style={styles.todoMain}>
          <Text style={[styles.todoText, item.completed && styles.todoTextDone]}>
            {item.task}
          </Text>
          <View style={styles.dueRow}>
            {info ? (
              <View style={[styles.dueBadge, { backgroundColor: info.bg }]}>
                <Text style={[styles.dueBadgeText, { color: info.color }]}>
                  Due: {info.label}
                </Text>
              </View>
            ) : (
              <Text style={styles.noDueText}>No due date</Text>
            )}
          </View>
        </View>

        {owned && (
          <>
            {/* Square “done” control — familiar checkbox pattern, not a big circle. */}
            <TouchableOpacity
              onPress={() => handleToggle(item)}
              style={[styles.doneBox, item.completed && styles.doneBoxFilled]}
              activeOpacity={0.7}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: item.completed }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {item.completed && <Text style={styles.doneBoxMark}>✓</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => handleTodoMenu(item)} style={styles.menuBtn}>
              <Text style={styles.menuBtnText}>⋯</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  }

  // ── iOS / Android: spinner picker is readable; inline calendar was invisible on some themes
  // iOS: wheel spinner is readable. Android: full calendar sheet is clearer than inline.
  const pickerDisplay = Platform.OS === 'ios' ? 'spinner' : 'calendar';

  return (
    <SafeAreaView style={styles.container}>
      {!owned && (
        <View style={styles.sharedBanner}>
          <Text style={styles.sharedBannerText}>
            You can view this list but only the owner can make changes.
          </Text>
        </View>
      )}

      {owned && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.addCardWrap}
        >
          <View style={styles.addCard}>
            <Text style={styles.addCardTitle}>New todo</Text>

            {addDueDate && (
              <View style={styles.selectedDateRow}>
                <View style={[styles.dueBadge, { backgroundColor: dueDateInfo(toLocalISODate(addDueDate))?.bg || '#EEF2FF' }]}>
                  <Text style={[styles.dueBadgeText, { color: dueDateInfo(toLocalISODate(addDueDate))?.color || '#4F46E5' }]}>
                    Due: {dueDateInfo(toLocalISODate(addDueDate))?.label}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setAddDueDate(null)}>
                  <Text style={styles.clearDate}>Clear</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.addInputRow}>
              <TouchableOpacity style={styles.dateBtn} onPress={openAddDateModal}>
                <Text style={styles.dateBtnText}>📅</Text>
                <Text style={styles.dateBtnLabel}>Date</Text>
              </TouchableOpacity>

              <TextInput
                style={styles.addInput}
                placeholder="What do you need to do?"
                placeholderTextColor="#9CA3AF"
                value={taskText}
                onChangeText={setTaskText}
                returnKeyType="done"
                onSubmitEditing={handleAddTodo}
              />

              <TouchableOpacity
                style={[styles.addBtn, adding && styles.buttonDisabled]}
                onPress={handleAddTodo}
                disabled={adding}
              >
                {adding ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.addBtnText}>Add</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      )}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} size="large" color="#4F46E5" />
      ) : (
        <FlatList
          data={sortedTodos}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderTodo}
          contentContainerStyle={styles.listContainer}
          ListHeaderComponent={
            owned ? (
              <Text style={styles.sectionLabel}>
                {sortedTodos.length === 0 ? '' : 'Your tasks — earliest due first'}
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {owned ? 'No tasks yet. Add one above.' : 'This list has no tasks yet.'}
            </Text>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />
          }
        />
      )}

      {/* Add-date modal — high-contrast, works on all iOS themes */}
      <Modal
        visible={dateModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDateModalVisible(false)}
      >
        <View style={styles.dateModalOverlay}>
          <View style={styles.dateModalCard}>
            <Text style={styles.dateModalTitle}>Due date</Text>
            <View style={styles.pickerShell}>
              <DateTimePicker
                value={pickerDate}
                mode="date"
                display={pickerDisplay}
                themeVariant="light"
                onChange={(_, d) => d && setPickerDate(d)}
                style={styles.datePicker}
              />
            </View>
            <View style={styles.dateModalActions}>
              <TouchableOpacity
                style={styles.dateModalBtnGhost}
                onPress={() => {
                  setDateModalVisible(false);
                }}
              >
                <Text style={styles.dateModalBtnGhostText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dateModalBtnPrimary} onPress={confirmAddDate}>
                <Text style={styles.dateModalBtnPrimaryText}>Use this date</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit todo modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setEditModalVisible(false)} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit task</Text>
            <TextInput
              style={styles.modalInput}
              value={editText}
              onChangeText={setEditText}
              autoFocus
              returnKeyType="done"
            />

            <TouchableOpacity style={styles.editDateRow} onPress={openEditDateModal}>
              <Text style={styles.editDateRowText}>
                {editDueDate
                  ? `Due: ${dueDateInfo(toLocalISODate(editDueDate))?.label}`
                  : 'Tap to set due date'}
              </Text>
              <Text style={styles.editDateChevron}>›</Text>
            </TouchableOpacity>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setEditModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, saving && styles.buttonDisabled]}
                onPress={handleSaveEdit}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalSaveText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={editDateModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditDateModalVisible(false)}
      >
        <View style={styles.dateModalOverlay}>
          <View style={styles.dateModalCard}>
            <Text style={styles.dateModalTitle}>Due date</Text>
            <View style={styles.pickerShell}>
              <DateTimePicker
                value={editPickerDate}
                mode="date"
                display={pickerDisplay}
                themeVariant="light"
                onChange={(_, d) => d && setEditPickerDate(d)}
                style={styles.datePicker}
              />
            </View>
            <View style={styles.dateModalActions}>
              <TouchableOpacity style={styles.dateModalBtnGhost} onPress={() => setEditDateModalVisible(false)}>
                <Text style={styles.dateModalBtnGhostText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dateModalBtnPrimary} onPress={confirmEditDate}>
                <Text style={styles.dateModalBtnPrimaryText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FF' },

  sharedBanner: {
    backgroundColor: '#FFFBEB',
    margin: 12,
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  sharedBannerText: { color: '#92400E', fontSize: 13 },

  addCardWrap: { paddingHorizontal: 16, paddingTop: 8 },
  addCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  addCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 52,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  dateBtnText: { fontSize: 18 },
  dateBtnLabel: { fontSize: 9, color: '#64748B', marginTop: 2 },
  addInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  addBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 64,
    alignItems: 'center',
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  buttonDisabled: { opacity: 0.6 },

  selectedDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  clearDate: { fontSize: 13, color: '#4F46E5', fontWeight: '600' },

  sectionLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 8,
    marginTop: 4,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },

  todoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#EEF2F7',
    gap: 10,
  },
  todoMain: { flex: 1, minWidth: 0 },
  todoText: { fontSize: 16, color: '#0F172A', fontWeight: '600' },
  todoTextDone: { textDecorationLine: 'line-through', color: '#94A3B8', fontWeight: '500' },
  dueRow: { marginTop: 8 },
  dueBadge: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  dueBadgeText: { fontSize: 13, fontWeight: '700' },
  noDueText: {
    fontSize: 13,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  doneBox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#4F46E5',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBoxFilled: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  doneBoxMark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    marginTop: -1,
  },
  menuBtn: { padding: 4 },
  menuBtnText: { fontSize: 20, color: '#94A3B8' },

  emptyText: { textAlign: 'center', color: '#94A3B8', marginTop: 40, fontSize: 15 },

  dateModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  dateModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dateModalTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A', marginBottom: 8 },
  pickerShell: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  datePicker: {
    width: '100%',
    height: Platform.OS === 'ios' ? 180 : undefined,
    backgroundColor: '#FFFFFF',
  },
  dateModalActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  dateModalBtnGhost: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dateModalBtnGhostText: { color: '#64748B', fontWeight: '700' },
  dateModalBtnPrimary: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#4F46E5',
  },
  dateModalBtnPrimaryText: { color: '#fff', fontWeight: '800' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 22,
    paddingBottom: 36,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 12 },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
    marginBottom: 12,
  },
  editDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    marginBottom: 16,
  },
  editDateRowText: { fontSize: 15, color: '#334155', fontWeight: '600' },
  editDateChevron: { fontSize: 22, color: '#94A3B8' },
  modalButtons: { flexDirection: 'row', gap: 10 },
  modalCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalCancelText: { color: '#64748B', fontWeight: '700' },
  modalSaveBtn: {
    flex: 1,
    backgroundColor: '#4F46E5',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalSaveText: { color: '#fff', fontWeight: '800' },
});
