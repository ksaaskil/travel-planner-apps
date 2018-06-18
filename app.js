new Vue({
  el: '#app',
  data:  {
    map: null,
    tileLayer: null,
    layers: [],
    msgs: 0,
    markers: {},
    subscribedTopics: [],
    prevPositions: {}
  },
  mounted() {
    this.initMap();
    this.subscribeMqtt();
  },
  methods: {
    initMap() {
      this.map = L.map('map').setView([60.192247, 25.039730], 14);

      this.tileLayer = L.tileLayer('http://api.digitransit.fi/map/v1/{id}/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
          '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ',
        id: 'hsl-map'}).addTo(this.map);
      /*
      const accessToken='shhh';
      this.tileLayer = L.tileLayer(`https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=${accessToken}`, {
    		maxZoom: 18,
    		attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
    			'<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
    			'Imagery © <a href="http://mapbox.com">Mapbox</a>',
    		id: 'mapbox.streets',
    		accessToken: 'pk.eyJ1Ijoic2Fhc2tpcyIsImEiOiJjajhlMmI5NmMwbzZ2MzJvM2ttNzhuZGVvIn0.-nFow1-J4TdVfD-YZ4RMOA'
    	});
      */
      this.tileLayer.addTo(this.map);
    },
    subscribeMqtt() {
      // Subscribe to mqtt.hsl.fi
      let msgs=0;
      // const topic = '/hfp/journey/bus/+/+/+/+/+/+/60;25/10/#';
      const buses = [80, 82, 83];
      const topics = buses.map(num => `/hfp/journey/bus/+/10${num}/#`);
      // const topic = '/hfp/journey/bus/+/1083/#';
      const url = 'wss://mqtt.hsl.fi'
      mqtt_client = mqtt.connect(url);
      mqtt_client.on('connect', () => {
        console.log(`Connected to ${url}`);
        topics.forEach(topic => {
          mqtt_client.subscribe(topic);
          this.subscribedTopics.push(topic);
          console.log(`Subscribed to topic ${topic}`);
        });
      });
      mqtt_client.on('message', (topic, message) => {
        this.onMessage(message);
      });
    },
    onMessage(message) {
      console.log(`Got message ${message}`);
      const data = JSON.parse(message);
      const vehicle = data.VP;
      if (!vehicle.lat || !vehicle.long) {
        console.info(`Skipping message ${message}`);
        return;
      }
      const position = [vehicle.lat, vehicle.long];
      const vehicleId = vehicle.veh;
      this.msgs++;
      const marker = L.marker(position)
        .addTo(this.map)
        .bindPopup(
          `
            <pre>Bus ${vehicle.desi}, tst ${new Date(vehicle.tst)}</pre>
          `
        );
      const prevMarkerOrNull = this.markers[vehicleId];
      if (prevMarkerOrNull) {
        L.polyline([this.prevPositions[vehicleId], position], { color: 'blue' })
          .addTo(this.map);
        this.map.removeLayer(prevMarkerOrNull);
      }
      this.markers[vehicleId] = marker;
      this.prevPositions[vehicleId] = position;
    }
  },
});
