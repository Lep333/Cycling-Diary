<template>
  <div class="greetings">
    <div id="controllButtons">
      <button @click="redirectToStrava">Connect with Strava</button>
      <button @click="getStravaData">Get Strava routes</button>
    </div>
    <div id="activity_list">
      <ul>
        <li
          v-for="act in activities"
          v-bind:key="act.id"
          v-on:click="editPolyline(act.id)"
          v-bind:class="
            act.id == active_activity
              ? 'active_activity'
              : 'activity_not_active'
          "
        >
          <p>
            {{ act.name }}
            {{
              new Date(act.start_date).getDate() +
              "." +
              (new Date(act.start_date).getMonth() + 1) +
              "." +
              new Date(act.start_date).getFullYear()
            }}
          </p>
          <p>{{ Math.round(act.distance / 10) / 100 + "km" }} {{ act.type }}</p>
        </li>
      </ul>
    </div>
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

const activities = ref(0);
const active_activity = ref(0);

function set_active_activity(act_id) {
  console.log(act_id);
  let result =
    act_id == active_activity ? "active_activity" : "activity_not_active";

  return result;
}
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

  // Add an event listener for click events on the map
  map.on("click", function (evt) {
    // Get the features at the clicked location
    const features = map.getFeaturesAtPixel(evt.pixel);

    // Check if any features were clicked
    if (features.length > 0) {
      // Loop through all the features
      features.forEach(function (feature) {
        // Check if the feature is the polyline
        if (feature.getGeometry() instanceof LineString) {
          editPolyline(feature.getId());
        }
      });
    }
  });
});

const addPolyline = (id, decodedPoints) => {
  const feature = new Feature({
    geometry: new LineString(decodedPoints),
  });
  feature.setId(id);
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

const editPolyline = (act_id) => {
  active_activity.value = act_id;

  vectorLayer.getSource().forEachFeature((feature) => {
    if (act_id == feature.getId()) {
      centerMapAroundFeature(map, feature);
      feature.setStyle(
        new Style({
          stroke: new Stroke({
            color: "#008000",
            width: 4,
          }),
          zIndex: 10,
        })
      );
    } else {
      feature.setStyle(
        new Style({
          stroke: new Stroke({
            color: "#ff0000",
            width: 2,
          }),
        })
      );
    }
  });
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
      activities.value = resp.data;
      console.log(resp);
      // const exp_route = `https://www.strava.com/api/v3/routes/${athlete[0].id}/export_gpx`;
      // axios.get(exp_route, config).then((resp) => {
      //   console.log(resp);
      //   let route = resp;
      // });
      for (let activity of activities.value) {
        let encoded_polyline = activity.map["summary_polyline"];
        // console.log(encoded_polyline);
        addPolyline(activity.id, decodePolyline(encoded_polyline));
      }
    });
};

// Function to center the map around a feature
function centerMapAroundFeature(map, feature) {
  const geometry = feature.getGeometry();
  const extent = geometry.getExtent();
  map.getView().fit(extent, {
    size: map.getSize(),
    padding: [100, 100, 100, 100],
    maxZoom: 15, // Optional: limit maximum zoom level
  });
}
</script>

<style scoped>
#map {
  width: 100%;
  height: 100%;
  position: fixed;
}

button {
  padding: 0.5rem;
  font-size: 1.3rem;
  border-radius: 50;
  background-color: black;
  color: white;
}

ul {
  list-style-type: none;
  padding: 0;
}

li {
  padding-left: 15px;
}

#controllButtons {
  position: fixed;
  left: 0;
  bottom: 0;
  z-index: 1;
}

#activity_list {
  position: absolute;
  right: 0;
  z-index: 1;
  background-color: black;
}

.active_activity {
  color: white;
  background-color: green;
}

.activity_not_active {
  color: white;
}
</style>
