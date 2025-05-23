<template>
  <div class="info-form-page">
    <h1>Enter Your Information</h1>
    <div v-if="selectedSession">
      <p><strong>Selected Session:</strong> {{ selectedSession.name }}</p>
    </div>
    <div v-else>
      <p>Loading session details or session not found...</p>
    </div>
    <form @submit.prevent="submitForm">
      <div class="form-group">
        <label for="userName">Name:</label>
        <input type="text" id="userName" v-model="userName" />
        <span v-if="formErrors.userName" class="error-message">{{ formErrors.userName }}</span>
      </div>

      <div class="form-group">
        <label for="userId">ID:</label>
        <input type="text" id="userId" v-model="userId" />
        <span v-if="formErrors.userId" class="error-message">{{ formErrors.userId }}</span>
      </div>

      <button type="submit" class="submit-button" :disabled="!selectedSession">Submit Registration</button>
    </form>
    <p v-if="registrationMessage" :class="{ 'success-message': registrationStatus, 'error-message': !registrationStatus }">
      {{ registrationMessage }}
    </p>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { addRegistration, getSessionById } from '../store/mockData.js';

const router = useRouter();
const route = useRoute();

const userName = ref('');
const userId = ref('');
const formErrors = ref({});
const selectedSession = ref(null);
const registrationMessage = ref('');
const registrationStatus = ref(false); // true for success, false for error

onMounted(() => {
  const sessionId = route.params.sessionId;
  if (sessionId) {
    selectedSession.value = getSessionById(sessionId);
  }
});

const validateForm = () => {
  formErrors.value = {};
  if (!userName.value.trim()) {
    formErrors.value.userName = 'Name is required';
  }
  if (!userId.value.trim()) {
    formErrors.value.userId = 'ID is required';
  }
  if (!selectedSession.value) {
    formErrors.value.general = 'No session selected or session details are missing.';
  }
  return Object.keys(formErrors.value).length === 0;
};

const submitForm = () => {
  registrationMessage.value = ''; // Clear previous message
  if (validateForm()) {
    const result = addRegistration({
      userId: userId.value,
      userName: userName.value,
      sessionId: selectedSession.value.id
    });

    registrationMessage.value = result.message;
    registrationStatus.value = result.success;

    if (result.success) {
      console.log('Form submitted successfully:', { name: userName.value, id: userId.value, session: selectedSession.value.name });
      // Navigate to MyResult page
      router.push({
        name: 'myResult',
        query: {
          // name: userName.value, // Not needed per spec, MyResult will fetch
          id: userId.value // Pass only userId as per spec
          // session: selectedSession.value.name // Not needed
        }
      });
    }
  }
};
</script>

<style scoped>
.info-form-page {
  font-family: Arial, sans-serif;
  max-width: 500px;
  margin: 20px auto;
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

.form-group input[type="text"] {
  width: calc(100% - 22px); /* Adjust width to account for padding and border */
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-sizing: border-box; /* Ensures padding doesn't add to the width */
}

.error-message {
  color: red;
  font-size: 0.9em;
  display: block;
  margin-top: 5px;
}

.success-message {
  color: green;
  font-size: 0.9em;
  display: block;
  margin-top: 5px;
}

.submit-button {
  background-color: #007bff; /* Blue */
  color: white;
  padding: 10px 20px;
  text-align: center;
  text-decoration: none;
  display: inline-block;
  font-size: 16px;
  border-radius: 5px;
  cursor: pointer;
  border: none;
  transition: background-color 0.3s ease;
}

.submit-button:hover:not(:disabled) {
  background-color: #0056b3;
}

.submit-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}
</style>
