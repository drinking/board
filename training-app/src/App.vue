<template>
  <div id="app">
    <nav class="navbar">
      <router-link to="/">Home</router-link> |
      <router-link to="/vote">Vote</router-link> |
      <router-link to="/info-form">Register</router-link> |
      <router-link to="/my-result">My Registration</router-link> |
      <router-link to="/admin-stats">Admin Stats</router-link>
    </nav>
    <router-view />
  </div>
</template>

<script>
export default {
  name: 'App'
}
</script>

<style scoped>
.navbar {
  background-color: #f0f0f0;
  padding: 10px;
  text-align: center;
  margin-bottom: 20px;
  border-bottom: 1px solid #ddd;
}

.navbar a {
  font-weight: bold;
  color: #2c3e50;
  margin: 0 10px;
  text-decoration: none;
}

.navbar a.router-link-exact-active {
  color: #42b983;
}
</style>
