<template>
  <div>
    <input type="text" placeholder="Enter your name" v-model="user" />
    <button @click="setupDevice">init</button>
    <input type="text" placeholder="Enter reciever Name" v-model="friend" />
    <button @click="makeCall">Call User</button>
    <button @click="disconnectCall">Hang Up</button>
  </div>
</template>

<script>
import { Device } from "@twilio/voice-sdk";
import axios from "axios";
export default {
  data() {
    return {
      user: "",
      friend: "",
      token: null,
      device: null,
      activeConnection: null,
    };
  },
  methods: {
    async getToken() {
      await axios
        .post(
          `https://11f4-223-185-48-104.ngrok-free.app/voice_token?identity=${this.user}`
        )
        .then((res) => {
          console.log(res);
          this.token = res.data.token;
        })
        .catch((err) => {
          console.log(err);
        });
    },
    async setupDevice() {
      if (!this.token) await this.getToken();
      console.log(this.token);
      try {
        this.device = new Device(this.token, {
          debug: false,
        });
        console.log(this.device);
        // Event listeners for the Twilio Device
        this.device.on("registered", () => {
          console.log("Device is registered and ready");
        });

        this.device.on("error", (error) => {
          console.error("Device error:", error);
        });

        this.device.on("incoming", (connection) => {
          console.log("Incoming call");
          this.activeConnection = connection;
          connection.accept(); // Auto-accept the call for app-to-app scenarios
        });
      } catch (err) {
        console.error("Error setting up device:", err);
      }
    },
    async makeCall() {
      if (!this.device) await this.setupDevice();

      try {
        const params = { to: this.friend }; // The identity of the target user
        this.activeConnection = this.device.connect(params);
      } catch (err) {
        console.error(err);
      }

      //   this.activeConnection.on("accept", () => {
      //     console.log("Call accepted");
      //   });

      //   this.activeConnection.on("disconnect", () => {
      //     console.log("Call disconnected");
      //     this.activeConnection = null;
      //   });
    },
    disconnectCall() {
      if (this.activeConnection) {
        this.activeConnection.disconnect();
      }
    },
  },
};
</script>
