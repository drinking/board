<template>
  <div class="home-page">
    <h1>Training Program Announcements</h1>
    <p>Welcome to our training program! Please find the available sessions below.</p>

    <div v-for="session in trainingSessions" :key="session.id" class="session-card">
      <h2>{{ session.name }}</h2>
      <p><strong>Announcement:</strong> {{ session.announcement }}</p>
      <p><strong>Time:</strong> {{ session.time }}</p>
      <p><strong>Location:</strong> {{ session.location }}</p>
      <p><strong>Total Quota:</strong> {{ session.totalQuota }}</p>
      <p><strong>Remaining Quota:</strong> {{ session.remainingQuota }}</p> 
    </div>

    <router-link to="/vote">
      <button>Register/Vote for a Session</button>
    </router-link>
  </div>
</template>

<script setup>
import { computed } from 'vue'; // Import computed
import { getTrainingSessions, getRemainingQuota } from '../store/mockData.js';

const sessionsFromStore = getTrainingSessions();

// Create a computed property for sessions that includes their reactive remaining quotas
const trainingSessions = computed(() => {
  return sessionsFromStore.value.map(session => {
    // getRemainingQuota now returns a computed ref, so we use .value
    const remaining = getRemainingQuota(session.id);
    return {
      ...session,
      remainingQuota: remaining.value // Access .value here for the template
    };
  });
});

</script>

<style scoped>
.home-page {
  font-family: Arial, sans-serif;
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.session-card {
  border: 1px solid #ccc;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 20px;
  background-color: #f9f9f9;
}

.session-card h2 {
  margin-top: 0;
}

button {
  background-color: #4CAF50;
  color: white;
  padding: 10px 20px;
  text-align: center;
  text-decoration: none;
  display: inline-block;
  font-size: 16px;
  border-radius: 5px;
  cursor: pointer;
  border: none;
}
</style>
