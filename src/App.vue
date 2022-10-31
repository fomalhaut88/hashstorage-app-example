<template>
  <div id="app" class="p-3">
    <h2 class="is-size-3">Text app with Hashstorage</h2>

    <!-- Text area -->
    <section>
      <b-field>
        <b-input type="textarea" v-model="text" />
      </b-field>
      <b-field>
        <b-button type="is-primary" label="Save" @click="saveBlock()" />
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
      login() {
        if ((this.username != "") && (this.password != "")) {
          this.isLoginModalShown = false
          this.isRegisterModalShown = true
        }
      },

      loginAgain() {
        this.isRegisterModalShown = false
        this.isLoginModalShown = true
      },

      register() {
        // Create a new profile instance
        this.$hscm.profile = this.$hscm.hsc.Profile.new(
          this.$hscm.appId, this.username, this.password
        )

        // Save profile into localStorage
        this.$hscm.profile.save()

        // Close the modal
        this.isRegisterModalShown = false
      },

      async saveBlock() {
        // Encrypt the text with the private key
        const encryptedText = aes256.encrypt(
          this.$hscm.profile.privateKey(), this.text
        )

        // Set the data in the block
        this.block.setData(encryptedText)

        // Save the block
        await this.block.save(this.$hscm.api, this.$hscm.profile)

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
            this.text = aes256.decrypt(this.$hscm.profile.privateKey(), encryptedText)
          } catch (err) {
            // If block not found create and save an empty one
            if (err.status == 404) {
              this.block = this.$hscm.hsc.Block.new(
                this.$hscm.profile.publicKey(), "group_default", "key_default"
              )
              await this.saveBlock()
            }
          }
        }
      }, 100)
    },
  }
</script>
