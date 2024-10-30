<template>
  <div>
    <div class="app_wrapper">
      <aside>
        <section class="create_room">
          <div class="main_wrapper">
            <button>{{ isRecording }}</button>
            <p>roomState:{{ this.room && this.room.dominantSpeaker }}</p>
            <h3>Create Room</h3>
            <div class="input_wrapper">
              <label for="room_name">Room Name</label>
              <input
                type="text"
                name="room_name"
                placeholder="Room Name"
                v-model="room_name"
              />
            </div>
            <div>
              <label for="user_name">User Name</label>
              <input
                type="text"
                name="user_name"
                placeholder="User Name"
                v-model="user_name"
              />
            </div>
            <button type="submit" @click="handleClick">Create Room</button>
          </div>
        </section>

        <section class="create_room">
          <div class="main_wrapper">
            <h3>Join Room</h3>
            <div class="input_wrapper">
              <label for="room_name">Room Name</label>
              <input
                type="text"
                name="room_name"
                placeholder="Room Name"
                v-model="room_name"
              />
            </div>
            <div>
              <label for="user_name">User Name</label>
              <input
                type="text"
                name="user_name"
                placeholder="User Name"
                v-model="user_name"
              />
            </div>
            <button type="submit" @click="JoinMeet">Join Room</button>
          </div>
        </section>
      </aside>
      <main class="br main_bg">
        <div class="d_flex">
          <div id="localVideo" class="video-container"></div>
          <!-- Container for Remote Videos -->
          <div id="remoteVideos" class="video-container d_flex"></div>
        </div>
        <div class="bottom-nav">
          <button @click="toggleMute">mute/unmute</button>
          <button @click="toggleVideo">{{ muteStatus }}</button>
          <button @click="() => (showModal = true)">Participants</button>
          <button @click="leaveRoom">Leave</button>
        </div>
      </main>
      <Teleport to="body">
        <div class="modal" v-if="showModal">
          <h2>Participants</h2>
          <hr />
          <ul>
            <li>
              {{
                this.room &&
                this.room.localParticipant &&
                this.room.localParticipant.identity
              }}
            </li>
            <!-- <li>
              {{
                this.room &&
                this.room._participants
              }}
            </li> -->
            <li
              v-for="(index, item) in this.room && this.room.participants"
              :key="index"
            >
              {{ item }}
            </li>
          </ul>
          <button @click="showModal = false">Close</button>
        </div>
      </Teleport>
    </div>
  </div>
</template>

<script>
import * as Video from "twilio-video";
import axios from "axios";
import { markRaw } from "vue";
export default {
  data() {
    return {
      showModal: false,
      muteStatus: "stop video",
      dominantSpeaker: null,
      partcipants: [],
      isRecording: false,
      roomState: null,
      room_name: "",
      user_name: "",
      room: null,
    };
  },
  watch: {
    dominantSpeaker(newSpeaker) {
      if (newSpeaker) {
        console.log("The dominant speaker is now:", newSpeaker);
      }
    },
    isRecording(newRecordingState) {
      console.log("Recording state changed:", newRecordingState);
    },
    roomState(newState) {
      console.log("Room state changed:", newState);
    },
  },
  methods: {
    // Method to handle room creation
    handleClick() {
      axios
        .post("https://11f4-223-185-48-104.ngrok-free.app/create_room/", {
          room_name: this.room_name,
        })
        .then((res) => {
          sessionStorage.setItem("createdRoom", JSON.stringify(res.data));
          sessionStorage.setItem("user_name", this.user_name);
          console.log(res.data);
        })
        .catch((err) => {
          console.log(err);
        });
    },

    // Method to fetch and store token
    async getToken() {
      const roomname = JSON.parse(sessionStorage.getItem("createdRoom"));
      const userName = sessionStorage.getItem("user_name");

      try {
        const res = await axios.post(
          "https://11f4-223-185-48-104.ngrok-free.app/generate_token/",
          {
            identity: userName || this.user_name,
            room_name: roomname?.room_name || this.room_name,
          }
        );
        sessionStorage.setItem(
          "roomData",
          JSON.stringify({
            identity: userName || this.user_name,
            room_name: roomname?.room_name || this.room_name,
            token: res.data.token,
          })
        );
      } catch (err) {
        console.log(err);
      }
    },

    // Method to join the room and set up listeners
    async JoinMeet() {
      await this.getToken();
      const data = JSON.parse(sessionStorage.getItem("roomData"));

      Video.connect(data.token, { name: data.room_name }).then((room) => {
        console.log('Connected to Room"', room);
        this.room = markRaw(room);
        this.attachLocalTrack(room.localParticipant);
        this.dominantSpeaker = room.dominantSpeaker;

        // Check if the room is recording
        this.isRecording = room.isRecording; // This may need to be updated based on your use case

        // Track the room state
        this.roomState = room.state;
        room.participants.forEach(this.participantConnected);
        room.on("participantConnected", this.participantConnected);
        room.on("participantDisconnected", this.participantDisconnected);
        room.once("disconnected", (error) => {
          room.participants.forEach(this.participantDisconnected);
          console.log("Disconnected from room due to", error || "leaving");
        });
      });
    },
    leaveRoom() {
      if (this.room) {
        // Stop all local tracks and unpublish them
        this.room.localParticipant.tracks.forEach((trackPublication) => {
          trackPublication.track.stop();
          this.room.localParticipant.unpublishTrack(trackPublication.track);
          this.trackUnsubscribed(trackPublication.track);
        });

        // Disconnect the room
        this.room.disconnect();
        this.room = null;
      }
    },
    // Method to toggle audio mute/unmute for local participant
    toggleMute() {
      if (this.room && this.room.localParticipant) {
        this.room.localParticipant.audioTracks.forEach((publication) => {
          const track = publication.track;

          track.isEnabled ? track.disable() : track.enable();
          console.log(track);
        });
      } else {
        console.error("Local participant not found or not connected");
      }
    },
    // Method to toggle audio mute/unmute for local participant
    toggleVideo() {
      if (this.room && this.room.localParticipant) {
        this.room.localParticipant.videoTracks.forEach((publication) => {
          const track = publication.track;
          console.log(track);
          track.isEnabled ? track.disable() : track.enable();
          this.muteStatus = track.isEnabled ? "Stop Video" : "share Video";
        });
      } else {
        console.error("Local participant not found or not connected");
      }
    },

    // Attach local participant’s video track to the DOM
    attachLocalTrack(participant) {
      const div = document.createElement("div");
      div.id = participant.sid;
      const displayName = document.createElement("p");
      displayName.innerText = participant.identity;
      div.appendChild(displayName);
      div.classList.add("user");
      participant.tracks.forEach((publication) => {
        if (publication.track) {
          console.log("local part", publication.track);
          this.attachTrack(publication.track, div);
        }
      });
      participant.on("trackSubscribed", (track) =>
        this.attachTrack(track, div)
      );
    },

    // Helper method to attach track to a container
    attachTrack(track, container) {
      const videoElement = track.attach();
      container.classList.add("user");
      container.appendChild(videoElement);
      const localVideo = document.getElementById("localVideo");
      localVideo.appendChild(container);
    },

    // Handle new participant connection
    participantConnected(participant) {
      const div = document.createElement("div");
      div.id = participant.sid;
      const displayName = document.createElement("p");
      displayName.innerText = participant.identity;
      div.appendChild(displayName);
      div.classList.add("user");

      participant.on("trackSubscribed", (track) =>
        this.trackSubscribed(div, track)
      );
      participant.on("trackUnsubscribed", this.trackUnsubscribed);

      participant.tracks.forEach((publication) => {
        if (publication.isSubscribed) {
          console.log("remote part", publication.track);
          this.trackSubscribed(div, publication.track);
        }
      });

      const videoRender = document.getElementById("remoteVideos");
      videoRender.appendChild(div);
    },

    // Handle participant disconnection
    participantDisconnected(participant) {
      const participantDiv = document.getElementById(participant.sid);
      if (participantDiv) participantDiv.remove();
    },

    // Attach track when subscribed by remote participant
    trackSubscribed(div, track) {
      div.appendChild(track.attach());
    },

    // Detach and remove track when unsubscribed
    trackUnsubscribed(track) {
      console.log("ele",track);
      const ele = document.getElementById(track.sid);
      console.log(ele)
      ele.remove();
      console.log(track.sid);
      track.detach().forEach((element) => element.remove());
    },
  },
};
</script>
<style>
.d_flex {
  display: flex;
  flex-wrap: wrap;
}

/* General Layout */
.app_wrapper {
  display: grid;
  grid-template-columns: 1fr 5fr;
  gap: 20px;
  padding: 20px;
  margin: auto;
}

/* Side Panel Styling */
aside {
  background-color: #f9fafb;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.create_room {
  background-color: #ffffff;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.main_wrapper h3 {
  color: #333;
  font-size: 1.2rem;
  margin-bottom: 10px;
}

/* Form Inputs */
.input_wrapper label {
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 5px;
}

input {
  width: 100%;
  padding: 10px;
  margin-top: 5px;
  margin-bottom: 15px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 1rem;
}

button {
  padding: 10px 20px;
  border-radius: 8px;
  background-color: #4f46e5;
  color: #ffffff;
  border: none;
  cursor: pointer;
  transition: background-color 0.3s;
}

button:hover {
  background-color: #4338ca;
}

/* Video Section */
main.main_bg {
  position: relative;
  background-color: #1a1a1a;
  border-radius: 10px;
  padding: 20px;
  color: #fff;
  width: 70;
}

.video-container {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
}
.bottom-nav {
  display: flex;
  justify-content: center;
  gap: 10px;
  align-items: center;
  margin-top: 20px;
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px;
  border-radius: 10px;
  background-color: #e5e9ee;
}

#remoteVideos,
#localVideo {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.modal {
  background: #ffffff;
  padding: 20px;
  border-radius: 20px;
  position: fixed;
  z-index: 999;
  top: 20%;
  left: 50%;
  width: 300px;
  margin-left: -150px;
}
video {
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  max-width: 100%;
  height: auto;
}

h3 {
  /* color: #f3f4f6; */
  font-size: 1.1rem;
  margin-bottom: 10px;
}

/* User Container */
.user {
  border: 5px solid #e0e7ff;
  padding: 8px;
  border-radius: 10px;
  text-align: center;
  font-weight: bold;
  font-size: 1rem;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}
</style>
