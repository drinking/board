<template>
  <div class="my-result-page">
    <h1>My Registration</h1>
    <div v-if="isRegistered && registrationDetails" class="registration-details">
      <p><strong>Name:</strong> {{ registrationDetails.userName }}</p>
      <p><strong>ID:</strong> {{ registrationDetails.userId }}</p>
      <p><strong>Registered Session:</strong> {{ sessionName }}</p>
    </div>
    <div v-else class="not-registered-message">
      <p>You have not registered yet, or your registration details could not be found.</p>
      <p v-if="route.query.id">Attempted to look up ID: {{ route.query.id }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { getUserRegistration, getSessionById } from '../store/mockData.js';

const route = useRoute();
const registrationDetails = ref(null);
const isRegistered = ref(false);

onMounted(() => {
  const userIdFromQuery = route.query.id;
  if (userIdFromQuery) {
    const userReg = getUserRegistration(userIdFromQuery);
    if (userReg) {
      registrationDetails.value = userReg;
      isRegistered.value = true;
    } else {
      isRegistered.value = false;
    }
  } else {
    // If no ID in query, definitely not registered via this flow
    isRegistered.value = false;
  }
});

const sessionName = computed(() => {
  if (isRegistered.value && registrationDetails.value && registrationDetails.value.sessionId) {
    const session = getSessionById(registrationDetails.value.sessionId);
    return session ? session.name : 'Unknown Session';
  }
  return '';
});

</script>

<style scoped>
.my-result-page {
  font-family: Arial, sans-serif;
  max-width: 600px;
  margin: 20px auto;
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  text-align: center;
}

.registration-details p {
  font-size: 1.1em;
  margin: 8px 0;
  text-align: left;
}

.not-registered-message p {
  font-size: 1.1em;
  color: #777;
}
</style>
