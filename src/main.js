import Vue from 'vue'
import Buefy from 'buefy'
import 'buefy/dist/buefy.css'

Vue.use(Buefy)

import App from './App.vue'

Vue.config.productionTip = false

// A manager to keep hashstorage-cli entities
Vue.prototype.$hscm = {
  appId: '389158e1-a629-4352-9726-979f6a2fe44f',
  root: 'http://localhost:8088',
  hsc: null,
  api: null,
  profile: null,
}

new Vue({
  render: h => h(App),
  async beforeCreate() {
    // Define the imported library and api instance
    this.$hscm.hsc = await import('hashstorage-cli')
    this.$hscm.api = this.$hscm.hsc.Api.new(this.$hscm.root)

    // Check profile
    if (this.$hscm.hsc.Profile.exists()) {
      // Load profile from localStorage
      const profile = this.$hscm.hsc.Profile.load()

      // Check whether the profile is valid
      if (profile.check()) {
        // Set the profile entity
        this.$hscm.profile = profile
      }
      else {
        // Clear if it is not valid
        profile.clear()
      }
    }
  },
}).$mount('#app')
