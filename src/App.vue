<template>
  <div id="app" class="p-3">
    <h2 class="is-size-3">Text app with Hashstorage</h2>

    <!-- Text area -->
    <section>
      <b-field>
        <b-input type="textarea" v-model="text" />
      </b-field>
      <b-field>
        <b-button type="is-primary" label="Save" @click="saveClick()" />
      </b-field>
    </section>

    <!-- Login form -->
    <b-modal v-model="isLoginModalShown" :can-cancel="false" has-modal-card>
      <form action="">
        <div class="modal-card" style="width: auto">
          <header class="modal-card-head">
            <p class="modal-card-title">Login or Register</p>
          </header>
          <section class="modal-card-body">
            <b-field label="Username">
              <b-input type="text" v-model="username" placeholder="Your username" required />
            </b-field>
            <b-field label="Password">
              <b-input type="password" v-model="password" placeholder="Your password" required password-reveal />
            </b-field>
          </section>
          <footer class="modal-card-foot">
            <b-button label="Login or Register" type="is-primary" @click="login()" />
          </footer>
        </div>
      </form>
    </b-modal>

    <!-- Registration form -->
    <b-modal v-model="isRegisterModalShown" :can-cancel="false" has-modal-card>
      <form action="">
        <div class="modal-card" style="width: auto">
          <header class="modal-card-head">
            <p class="modal-card-title">Registration</p>
          </header>
          <section class="modal-card-body">
            No record found with entered username and password. Do you want to create a new profile?
          </section>
          <footer class="modal-card-foot">
            <b-button label="Yes, create a new profile, please." type="is-primary" @click="register()" />
            <b-button label="No, let me enter username and password again." type="is-seconrady" @click="loginAgain()" />
          </footer>
        </div>
      </form>
    </b-modal>
  </div>
</template>

<script>
  import aes256 from 'aes256'
  
  export default {
    name: 'App',
    data() {
      return {
        isLoginModalShown: false,
        isRegisterModalShown: false,
        username: "",
        password: "",
        text: "",
        block: null,
      }
    },
    methods: {
      async login() {
        if ((this.username != "") && (this.password != "")) {
          // Create a new profile instance
          this.$hscm.profile = this.$hscm.hsc.Profile.new(
            this.$hscm.appId, this.username, this.password
          )

          // Try to load block
          const success = await this.loadBlock()

          if (success) {
            // Save profile into localStorage
            this.$hscm.profile.save()

            // Close login popup
            this.isLoginModalShown = false
          } else {
            // Close login popup
            this.isLoginModalShown = false

            // Show register popup
            this.isRegisterModalShown = true
          }
        }
      },

      loginAgain() {
        // Close register popup
        this.isRegisterModalShown = false

        // Show login popup
        this.isLoginModalShown = true
      },

      async register() {
        // Save profile into localStorage
        this.$hscm.profile.save()

        // Create an empty block
        this.block = this.$hscm.hsc.Block.new(
          this.$hscm.profile.publicKey(), "group_default", "key_default"
        )

        // Save empty block
        await this.saveBlock()

        // Close the modal
        this.isRegisterModalShown = false
      },

      async loadBlock() {
        try {
          // Try to fetch the block of the data
          const blockJson = await this.$hscm.profile.getBlockJson(
            this.$hscm.api, "group_default", "key_default"
          )

          // Create a block instance
          this.block = this.$hscm.hsc.Block.fromBlockJson(blockJson)

          // Get encrypted data from the block
          const encryptedText = this.block.data()

          // Decrypt the data with the private key
          this.text = aes256.decrypt(
            this.$hscm.profile.privateKey(), encryptedText
          ).trim()

          // Return true in the end
          return true
        } catch (err) {
          // If block not found return false
          if (err.status == 404) {
            return false
          } else {
            throw err
          }
        }
      },

      async saveBlock() {
        // Encrypt the text with the private key
        const encryptedText = aes256.encrypt(
          this.$hscm.profile.privateKey(),
          this.text + ((this.text.length) ? '' : ' ')
        )

        // Set the data in the block
        this.block.setData(encryptedText)

        // Save the block
        await this.block.save(this.$hscm.api, this.$hscm.profile)
      },

      async saveClick() {
        // Save current block
        await this.saveBlock()

        // Show success
        this.$buefy.dialog.alert({
          title: 'Success',
          type: 'is-success',
          message: "Saved successfully",
        })
      },
    },
    async mounted() {
      // Wait for preparing of Hashstorage entities
      setTimeout(async () => {
        // If no profile suggest to log in
        if (this.$hscm.profile === null) {
          this.isLoginModalShown = true
        }
        else {
          // Try to load block
          const success = await this.loadBlock()

          // If block not found create and save an empty one
          if (!success) {
            this.block = this.$hscm.hsc.Block.new(
              this.$hscm.profile.publicKey(), "group_default", "key_default"
            )
            await this.saveBlock()
          }
        }
      }, 100)
    },
  }
</script>
