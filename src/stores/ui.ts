import { defineStore } from 'pinia';

export const useUiStore = defineStore('ui', {
  state: () => ({
    isDeviceListStale: false,
  }),
  actions: {
    setDeviceListStale(isStale: boolean) {
      this.isDeviceListStale = isStale;
    },
  },
});
