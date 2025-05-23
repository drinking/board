<template>
  <div class="admin-stats-page">
    <h1>Admin Statistics</h1>

    <!-- Session Summary Section -->
    <h2>Session Summary</h2>
    <div class="session-summary-container">
      <div v-for="session in sessionStats" :key="session.id" class="session-stat-card">
        <h3>{{ session.name }}</h3>
        <p><strong>Total Quota:</strong> {{ session.totalQuota }}</p>
        <p><strong>Registered:</strong> {{ session.registeredUsers }}</p>
        <p><strong>Remaining Quota:</strong> {{ session.remainingQuota }}</p>
      </div>
    </div>

    <!-- Filter Section -->
    <h2>Filter Registrations</h2>
    <div class="filter-section">
      <label for="sessionFilter">Filter by Session:</label>
      <select id="sessionFilter" v-model="selectedSessionFilter">
        <option value="all">All Sessions</option>
        <option v-for="session in trainingSessionsForFilter" :key="session.id" :value="session.id">
          {{ session.name }}
        </option>
      </select>
    </div>

    <!-- Registrations List Section -->
    <h2>
      Registered Personnel
      <span v-if="selectedSessionFilter !== 'all'">
        for {{ getSessionName(selectedSessionFilter) }}
      </span>
    </h2>
    <table class="registrations-table" v-if="filteredRegistrations.length > 0">
      <thead>
        <tr>
          <th>Session Name</th>
          <th>User Name</th>
          <th>User ID</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(registration, index) in filteredRegistrations" :key="index">
          <td>{{ getSessionName(registration.sessionId) }}</td>
          <td>{{ registration.userName }}</td>
          <td>{{ registration.userId }}</td>
        </tr>
      </tbody>
    </table>
    <p v-else>No registrations found for the selected filter.</p>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { getTrainingSessions, getAllRegistrations, getSessionById, getRemainingQuota } from '../store/mockData.js';

const storeTrainingSessions = getTrainingSessions();
const storeAllRegistrations = getAllRegistrations();

const selectedSessionFilter = ref('all');

// Use the store's training sessions directly for the filter dropdown
const trainingSessionsForFilter = computed(() => storeTrainingSessions.value);

const filteredRegistrations = computed(() => {
  if (selectedSessionFilter.value === 'all') {
    return storeAllRegistrations.value;
  }
  return storeAllRegistrations.value.filter(reg => reg.sessionId === selectedSessionFilter.value);
});

const sessionStats = computed(() => {
  return storeTrainingSessions.value.map(session => {
    // Use session.registeredUsers.length from the store's session object
    const registeredCount = session.registeredUsers.length;
    const remaining = getRemainingQuota(session.id); // Use store function for consistency
    return {
      ...session,
      registeredUsers: registeredCount,
      remainingQuota: remaining.value // getRemainingQuota returns a computed ref
    };
  });
});

const getSessionName = (sessionId) => {
  const session = getSessionById(sessionId); // Use store function
  return session ? session.name : 'Unknown Session';
};

</script>

<style scoped>
.admin-stats-page {
  font-family: Arial, sans-serif;
  max-width: 900px;
  margin: 20px auto;
  padding: 20px;
}

.session-summary-container {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  margin-bottom: 30px;
}

.session-stat-card {
  border: 1px solid #ccc;
  border-radius: 8px;
  padding: 15px;
  background-color: #f9f9f9;
  flex-basis: calc(33.333% - 20px); /* Adjust for 3 cards per row with gap */
  box-sizing: border-box;
}

.session-stat-card h3 {
  margin-top: 0;
  color: #333;
}

.filter-section {
  margin-bottom: 20px;
  padding: 10px;
  background-color: #f0f0f0;
  border-radius: 5px;
}

.filter-section label {
  margin-right: 10px;
  font-weight: bold;
}

.filter-section select {
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #ddd;
}

.registrations-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
}

.registrations-table th,
.registrations-table td {
  border: 1px solid #ddd;
  padding: 10px;
  text-align: left;
}

.registrations-table th {
  background-color: #f2f2f2;
  font-weight: bold;
}

.registrations-table tbody tr:nth-child(even) {
  background-color: #f9f9f9;
}
</style>
