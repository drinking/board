import { ref, computed } from 'vue';

// 1. Reactive Data
export const trainingSessions = ref([
  { id: 'A', name: 'Advanced Vue Techniques', announcement: 'Deep dive into Vue 3.', time: '2024-08-01 09:00', location: 'Room 101', totalQuota: 30, registeredUsers: [] },
  { id: 'B', name: 'State Management with Pinia', announcement: 'Learn Pinia from scratch.', time: '2024-08-02 10:00', location: 'Room 102', totalQuota: 25, registeredUsers: [] },
  { id: 'C', name: 'Testing Vue Components', announcement: 'Jest and Vue Test Utils.', time: '2024-08-03 11:00', location: 'Room 103', totalQuota: 0, registeredUsers: [] },
  { id: 'D', name: 'Vuex to Pinia Migration', announcement: 'Migrating large scale apps.', time: '2024-08-04 14:00', location: 'Online', totalQuota: 50, registeredUsers: ['user1', 'user2'] } // Session with some registered users
]);

export const userRegistrations = ref([]);

// 2. Store Functions

/**
 * Returns the reactive trainingSessions array.
 */
export const getTrainingSessions = () => {
  return trainingSessions;
};

/**
 * Calculates and returns the remaining quota for a given sessionId.
 * This is a reactive computed property if the underlying refs change.
 * @param {string} sessionId
 */
export const getRemainingQuota = (sessionId) => {
  const session = trainingSessions.value.find(s => s.id === sessionId);
  if (!session) return 0;
  return computed(() => session.totalQuota - session.registeredUsers.length);
};

/**
 * Returns the session object for a given sessionId.
 * @param {string} sessionId
 */
export const getSessionById = (sessionId) => {
  return trainingSessions.value.find(s => s.id === sessionId);
};

/**
 * Adds a new registration.
 * @param {object} registrationDetails - { userId, userName, sessionId }
 * @returns {object} - { success: boolean, message: string }
 */
export const addRegistration = (registrationDetails) => {
  const { userId, sessionId } = registrationDetails;

  // Check if user is already registered for any session (simple check by userId)
  const existingRegistration = userRegistrations.value.find(reg => reg.userId === userId);
  if (existingRegistration) {
    return { success: false, message: `User ${userId} is already registered for session ${existingRegistration.sessionId}.` };
  }

  const session = trainingSessions.value.find(s => s.id === sessionId);
  if (!session) {
    return { success: false, message: 'Session not found.' };
  }

  if (session.registeredUsers.length >= session.totalQuota) {
    return { success: false, message: 'Registration failed. No quota available.' };
  }

  // Add userId to the session's registeredUsers list
  session.registeredUsers.push(userId);
  // Add full registration details to userRegistrations
  userRegistrations.value.push(registrationDetails);

  return { success: true, message: 'Registration successful!' };
};

/**
 * Finds and returns the registration object for a given userId.
 * @param {string} userId
 * @returns {object | null}
 */
export const getUserRegistration = (userId) => {
  return userRegistrations.value.find(reg => reg.userId === userId) || null;
};

/**
 * Returns the reactive userRegistrations array.
 */
export const getAllRegistrations = () => {
  return userRegistrations;
};

/**
 * Returns registrations filtered by sessionId.
 * @param {string} sessionId
 * @returns {Array<object>}
 */
export const getRegistrationsBySession = (sessionId) => {
  return userRegistrations.value.filter(reg => reg.sessionId === sessionId);
};
