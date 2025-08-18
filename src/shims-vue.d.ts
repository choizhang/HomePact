/* eslint-disable */
import '@vue/runtime-core'

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module '@vue/runtime-core' {
  export interface GlobalComponents {
    // 如果有全局注册的组件，可以在这里添加
  }
  export interface GlobalDirectives {
    loading: (typeof import('element-plus/es/components/loading/src/directive'))['vLoading']
  }
}
