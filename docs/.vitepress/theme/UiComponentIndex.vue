<script setup lang="ts">
import { withBase } from 'vitepress';
import { uiCatalog } from '../uiCatalog';
</script>

<template>
  <section v-for="group in uiCatalog" :key="group.text" class="catalog-group">
    <h2 :id="group.text">{{ group.text }}</h2>
    <ul>
      <li v-for="item in group.items" :key="item.slug">
        <a :href="withBase(`/ui/${item.slug}.html`)">
          <strong>{{ item.text }}</strong>
          <span>{{ item.description }}</span>
        </a>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.catalog-group ul {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 190px), 1fr));
  gap: 12px;
  padding: 0;
  list-style: none;
}

.catalog-group li {
  display: flex;
  margin: 0;
}

.catalog-group a {
  display: grid;
  align-content: start;
  gap: 4px;
  width: 100%;
  padding: 14px 16px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  text-decoration: none;
}

.catalog-group a:hover,
.catalog-group a:focus-visible {
  border-color: var(--vp-c-brand-1);
}

.catalog-group a:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}

.catalog-group span {
  color: var(--vp-c-text-2);
  font-size: 14px;
  line-height: 1.55;
}
</style>
