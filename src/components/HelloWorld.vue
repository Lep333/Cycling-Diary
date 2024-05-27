<template>
  <div class="greetings">
    <button @click="redirectToStrava">Connect with Strava</button>
    <button @click="getStravaData">Get Strava routes</button>
    <div id="map" class="map"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import "ol/ol.css";
import { Map, View } from "ol";
import { Tile as TileLayer, Vector as VectorLayer } from "ol/layer";
import { OSM } from "ol/source";
import { Vector as VectorSource } from "ol/source";
import { Feature } from "ol";
import { LineString } from "ol/geom";
import { Style, Stroke } from "ol/style";
import { fromLonLat } from "ol/proj";

// Function to decode a polyline
function decodePolyline(encoded) {
  let points = [];
  let index = 0,
    len = encoded.length;
  let lat = 0,
    lng = 0;

  while (index < len) {
    let b,
      shift = 0,
      result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    let dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    let dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push([lng / 1e5, lat / 1e5]);
  }

  return points.map((coord) => fromLonLat([coord[0], coord[1]]));
}

// Initial setup
let map = ref(null);
let vectorLayer = ref(null);
onMounted(() => {
  // Create a map
  map = new Map({
    target: "map",
    layers: [
      new TileLayer({
        source: new OSM(),
      }),
    ],
    view: new View({
      center: fromLonLat([0, 0]),
      zoom: 2,
    }),
  });

  vectorLayer = new VectorLayer({
    source: new VectorSource(),
  });

  map.addLayer(vectorLayer);
});

const addPolyline = (decodedPoints) => {
  const feature = new Feature({
    geometry: new LineString(decodedPoints),
  });

  feature.setStyle(
    new Style({
      stroke: new Stroke({
        color: "#ff0000",
        width: 2,
      }),
    })
  );
  vectorLayer.getSource().addFeature(feature);
};
import axios from "axios";

const redirectToStrava = () => {
  const clientId = "127381";
  const redirectUri = "http://localhost:5173/callback";
  const scope = "read,read_all,activity:read,activity:read_all";
  const state = "mystate";
  const approvalPrompt = "force";

  const authUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&scope=${scope}&state=${state}&approval_prompt=${approvalPrompt}`;

  window.location.href = authUrl;
};
const getStravaData = () => {
  let token = localStorage.getItem("accessToken");
  let config = {
    headers: {
      Authorization: "Bearer " + token,
    },
  };
  axios
    .get(
      "https://www.strava.com/api/v3/athlete/activities?per_page=100",
      config
    )
    .then((resp) => {
      let activities = resp.data;
      console.log(resp);
      // const exp_route = `https://www.strava.com/api/v3/routes/${athlete[0].id}/export_gpx`;
      // axios.get(exp_route, config).then((resp) => {
      //   console.log(resp);
      //   let route = resp;
      // });
      for (let activity of activities) {
        let encoded_polyline = activity.map["summary_polyline"];
        console.log(encoded_polyline);
        addPolyline(decodePolyline(encoded_polyline));
      }
    });
};
</script>

<style scoped>
#map {
  width: 1500px;
  height: 800px;
}
</style>
