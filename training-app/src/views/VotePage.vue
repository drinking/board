<template>
  <div class="vote-page">
    <h1>Choose a Training Session</h1>
    <div v-if="trainingSessions.length === 0">
      <p>No training sessions available at the moment.</p>
    </div>
    <div v-else>
      <div v-for="session in trainingSessions" :key="session.id"
           :class="['session-option', { disabled: session.remainingQuota === 0 }]">
        <input type="radio"
               :id="'session-' + session.id"
               :value="session.id"
               v-model="selectedSessionId"
               :disabled="session.remainingQuota === 0">
        <label :for="'session-' + session.id">
          {{ session.name }} - Remaining Quota: {{ session.remainingQuota }}/{{ session.totalQuota }}
          <span v-if="session.remainingQuota === 0">(Full)</span>
        </label>
      </div>
      <button @click="proceedToRegister" :disabled="!selectedSessionId" class="proceed-button">
        Next
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'; // Import computed
import { useRouter } from 'vue-router';
import { getTrainingSessions, getRemainingQuota } from '../store/mockData.js';

const router = useRouter();
const selectedSessionId = ref(null);

const sessionsFromStore = getTrainingSessions();

// Create a computed property for sessions that includes their reactive remaining quotas
const trainingSessions = computed(() => {
  return sessionsFromStore.value.map(session => {
    const remaining = getRemainingQuota(session.id);
    return {
      ...session,
      remainingQuota: remaining.value // Access .value here for the template and logic
    };
  });
});

const proceedToRegister = () => {
  if (selectedSessionId.value) {
    router.push({ name: 'infoForm', params: { sessionId: selectedSessionId.value } });
  }
};
</script>

<style scoped>
.vote-page {
  font-family: Arial, sans-serif;
  max-width: 600px;
  margin: 20px auto;
  padding: 20px;
  border: 1px solid #eee;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.session-option {
  padding: 10px;
  margin-bottom: 8px;
  border-radius: 4px;
  background-color: #f9f9f9;
  cursor: pointer;
}

.session-option input[type="radio"] {
  margin-right: 10px;
}

.session-option.disabled {
  background-color: #e0e0e0;
  color: #a0a0a0;
  cursor: not-allowed;
}

.session-option.disabled label {
  text-decoration: line-through;
}

.proceed-button {
  background-color: #4CAF50; /* Green */
  color: white;
  padding: 12px 25px;
  text-align: center;
  text-decoration: none;
  display: inline-block;
  font-size: 16px;
  border-radius: 5px;
  cursor: pointer;
  border: none;
  margin-top: 20px;
  transition: background-color 0.3s ease;
}

.proceed-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.proceed-button:not(:disabled):hover {
  background-color: #45a049;
}
</style>
