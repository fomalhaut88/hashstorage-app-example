# Hashstorage

## What it is for

Hashstorage is a project that allows you to develop applications that care of user data safety. It is a kind of safe cloud system that keeps the user data on the server side but makes fundamentally impossible to fake the data or to share it with third party sides hiddenly from the users. Hashstorage consists of two parts: [the backend image](https://hub.docker.com/r/fomalhaut88/hashstorage) to provide a safe data storage on a server and a JS library called [hashstorage-cli](https://www.npmjs.com/package/hashstorage-cli) that gives a friendly way to interact with the backend from the client side.

In this article, I explain the details how it works, why it can be useful and also I give a short example how to develop a simple application using Hashstorage.

## How it works

The core idea of Hashstorage is keeping the user's credentials on the client side only and never sharing them with anyone, even with the backend. And the saved data that is transfered between client and server can be encrypted with a symmetric algorithm (for example: [AES-256](https://en.wikipedia.org/wiki/Advanced_Encryption_Standard)) and always has a digital signature, so the server can check the ownership.

1. The bytes of the saved data can be reached by the API without any credentials, but if it is encrypted it is impossible to decrypt because the key is known on the client side only and it can't be taken from any other place whether it is the backend side or net nodes. So even the owner of the server cannot understand the original phrase.
2. The data cannot be faked, because of a digital signature (according to [ECDSA](https://en.wikipedia.org/wiki/Elliptic_Curve_Digital_Signature_Algorithm)). This signature can be generated only by the one who has the necessary private key that is known on the client side only.
3. The owner of the server cannot replace a saved data record with an older one hiddenly from the user because each data record has a version: it is an unsigned integer that is increasing every time on the save so in case of replacing with an old one the client can check and notice it.

You can ask me: what is the difference between Hashstorage and a naive approach that keeps a password on the client side and saves the data into any database with encryption? Basically there is no difference, except for Hashstorage checks the ownership, prevents hidden data replacing on any level and has a very friendly way to interact with the storage from the client side (with the help of [hashstorage-cli](https://www.npmjs.com/package/hashstorage-cli)). Also the project is powered by Rust (Actix Web on the server and Webassembly on the client) that provides an extremely high performance, so it expands the usage scope.

![How Hashstorage works](https://github.com/fomalhaut88/hashstorage-app-example/blob/master/screenshots/how-hashstorage-works.png?raw=true)

### What algorithms are used

* Digital signature: [ECDSA](https://en.wikipedia.org/wiki/Elliptic_Curve_Digital_Signature_Algorithm) over [Secp256k1](https://en.bitcoin.it/wiki/Secp256k1).
* Data encryption: no implicite encryption, so it is up to the developer to choose any. One of the possible recommendations is [AES-256](https://www.npmjs.com/package/aes256) using the private key as the password.

## An example of a simple application using Hashstorage

Below I provide an example of an application using Hashstorage step by step starting with deploying of a Hashstorage backend. For the simplicity, I chose [Vue.js](https://vuejs.org/) as a framework for the client side. Our application will allow a user to log in and manage a single text area.

### Step 1. Deploy a Hashstorage backend

Hashstorage backend is powered by Rust + Actix Web. The original repository is represented here: https://github.com/fomalhaut88/hashstorage. It supports REST interface. As far as it is packed as a Docker image, you can download and run it easily from https://hub.docker.com/r/fomalhaut88/hashstorage. Here are the steps you must follow to run it:

1. Download the necessary version of the image: `docker pull fomalhaut88/hashstorage:2.3.0`
2. Create a folder that will contain the data. For example it can be `~/Tmp/Hashstorage`
3. Create and run container: `docker run -p 8088:8080 --volume ~/Tmp/Hashstorage:/app/db --name hashstorage-app --restart=always -d fomalhaut88/hashstorage:2.3.0`. `8088` is the port for the instance. You can use a different one if you want.
4. Check the availability in your browser by following `http://localhost:8088/version`. It must show the version: `{"version":"2.3.0"}`

After that you can interact with the instance according to the supported API documented in README: https://github.com/fomalhaut88/hashstorage#methods.

### Step 2. Create a new Vue project including hashstorage-cli

The versions of my dependencies are:

```
node: v16.17.1
npm: 8.15.0
@vue/cli: 5.0.8
hashstorage-cli: 1.3.2
aes256: 1.1.0
buefy: 0.9.22
```

First, we install Vue.js globally:

```
npm install -g @vue/cli
```

After that we create a new Vue project (we choose `Vue 2` option):

```
vue create hashstorage-app-example
cd hashstorage-app-example
```

We install the necessary dependencies:

```
npm i hashstorage-cli --save-dev
npm i aes256 --save-dev
npm i buefy --save-dev
```

Allow asynchronous import by modifying `vue.config.js`:

```javascript
const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  transpileDependencies: true,
  configureWebpack: {
    experiments: {
      asyncWebAssembly: true
    }
  }
})
```

And add importing `hashstorage-cli` in `main.js`:

```javascript
import Vue from 'vue'
import App from './App.vue'

Vue.config.productionTip = false

new Vue({
  render: h => h(App),
  async beforeCreate() {
    const hsc = await import('hashstorage-cli')
    const api = hsc.Api.new("http://localhost:8088")
    const version = await api.getVersion()
    console.log(version)
  },
}).$mount('#app')
```

If everything is done correctly, you will see `{version: '2.3.0'}` in the browser console after following `http://localhost:8080/`.

![Hashstorage application 1](https://github.com/fomalhaut88/hashstorage-app-example/blob/master/screenshots/hashstorage-application-1.png?raw=true)

### Step 3. Prepare Hashstorage entities in the project

It is a good idea to define a Vue property that contains all the necessary entities to interact with hashstorage-cli. To do this I added these lines in `main.js`:

```javascript
// A manager to keep hashstorage-cli entities
Vue.prototype.$hscm = {
  appId: '389158e1-a629-4352-9726-979f6a2fe44f',
  root: 'http://localhost:8088',
  hsc: null,
  api: null,
  profile: null,
}
```

Here we specified the path to Hashstorage backend and `appId` that is a unique [UUID](https://en.wikipedia.org/wiki/Universally_unique_identifier) string of the application. It is required to generate user keys from username and password, so they will be different for different applications even if username and password are the same.

As far as hashstorage-cli can be imported in an asynchronous way only (as Webassembly), we prepare Hashstorage inside `beforeCreate()` function:

```javascript
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
```

Here we define the reference to the imported library, create an API object and check the profile whether it already exists in `localStorage`.

### Step 4. Implement the main logic of the application

So now we will consider the use of hashstorage-cli in `App.vue`. First of all, we need to decide how the application will work in details.

At the begining, after mounting the component we need to check the existing profile in the `localStorage`. If it already exists, we show the textarea and allow user to modify it as many times as he wants. To save the current state of the textarea there is a button `Save`. If the profile does not exist, we show the login popup and suggest the user to enter his username or password. The backend is unable to check whether it is correct or not because the credentials will never be passed anywhere from the client side, but it is possible to check there is a record on the backend that corresponds to the entered username and password. So if nothing is found we can conclude that such user does not exist yet or he just entered wrong username or password. Thus if there is no record on the backend side, we ask the user to enter his credentials again or continue as a new user with empty data. Obviously, Hashstorage allows two different users to have same usernames but different passwords, it can not be forbidden.

![Hashstorage application flow](https://github.com/fomalhaut88/hashstorage-app-example/blob/master/screenshots/hashstorage-app-flow.png?raw=true)

On mounted step we check the profile and if it exists we try to load the existing data from the backend. In the comments I wrote the details what is necessary to do.

```javascript
    ...

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

    ...
```

We load and save the block with these functions. Here we interact with Hashstorage backend.

```javascript
      ...

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

      ...
```

In this project we have the only block for each user, so we define the constant group and key names for the block. If we had many blocks we would have a more complex approach to name groups and keys. Hashstorage is actually a key-value storage, and the groups are needed to group some keys together.

On the login stage we check the existing record on the backend according to the application flow. If it is not found we show the registration popup.

```javascript
      ...

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

      ...
```

And finally, on the registration stage we are to save the profile in `localStorage` and an empty block on the backend:

```javascript
      ...

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

      ...
```

On load and save stages we apply AES-256 to keep the text encrypted.

I intentionally avoided the parts related to Vue.js or Buefy syntax, because it is supposed that you are familiar with it or you can read the documentation. Anyway I uploaded the full working source code, so you can always take a look at the details of the implementation and to play with the project: https://github.com/fomalhaut88/hashstorage-app-example

![Hashstorage application 2](https://github.com/fomalhaut88/hashstorage-app-example/blob/master/screenshots/hashstorage-application-2.png?raw=true)

### How to download and run this project

0. You need to check your versions of `node` and `npm` as specified above.
1. Deploy a Hashstorage backend locally as it was described in a section above.
2. Clone the source code: `git clone https://github.com/fomalhaut88/hashstorage-app-example.git --depth=1`
3. Install the dependencies: `npm install`
4. Run the application: `npm run serve`
5. Follow in your browser: http://localhost:8080/
