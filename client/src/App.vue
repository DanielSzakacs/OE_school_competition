<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <div class="app">
    <header class="app-header">
      <div class="logo-stack">
        <img src="@/assets/oe_logo.jpeg" alt="OE logo" class="logo oe-logo" />
        <img src="@/assets/business.jfif" alt="Business logo" class="logo business-logo" />
      </div>
    </header>

    <main class="app-main">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.app-header {
  padding: 24px 24px 0;
}

.logo-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: flex-start;
}

.logo {
  display: block;
  height: auto;
  max-width: 240px;
  width: clamp(140px, 18vw, 220px);
}

.business-logo {
  width: clamp(160px, 22vw, 260px);
}

.app-main {
  flex: 1;
  padding: 0 24px 32px;
}

@media (max-width: 640px) {
  .app-header {
    padding: 16px 16px 0;
  }

  .app-main {
    padding: 0 16px 24px;
  }
}
</style>
