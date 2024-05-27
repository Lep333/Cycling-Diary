<template>
  <div>Redirecting...</div>
</template>

<script>
import axios from "axios";

export default {
  mounted() {
    const code = this.$route.query.code;
    if (code) {
      this.exchangeToken(code);
    } else {
      // Handle error
      console.error("No code found in URL");
    }
  },
  methods: {
    async exchangeToken(code) {
      try {
        const response = await axios.post(
          "https://www.strava.com/oauth/token",
          {
            client_id: "127381",
            client_secret: "122ae706ab19e937fd256c999bea632b7c7fdd4f",
            code: code,
            grant_type: "authorization_code",
          }
        );

        console.log("Access Token:", response.data.access_token);
        localStorage.setItem("accessToken", response.data.access_token);
        // Save the token or proceed with further API requests
      } catch (error) {
        console.error("Error exchanging token:", error);
      }
    },
  },
};
</script>
