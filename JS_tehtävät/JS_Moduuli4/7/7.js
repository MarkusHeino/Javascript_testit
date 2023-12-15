'use strict';

const map = L.map('map').setView([60.1785553, 24.8786212], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

const apiAddress = 'https://api.digitransit.fi/routing/v1/routers/hsl/index/graphql';
const geocodingApiKey = '7a07d302fa45407680f37a3f690ae289';

document.getElementById('addressForm').addEventListener('submit', function (event) {
  event.preventDefault();

  const addressInput = document.getElementById('address');
  const address = addressInput.value;

  const schoolCoordinates = { latitude: 60.24, longitude: 24.74 };

  // Fetch the coordinates for the user's address
  fetch(`https://api.digitransit.fi/geocoding/v1/search?text=${encodeURIComponent(address)}&size=1&apiKey=${geocodingApiKey}`)
    .then(response => response.json())
    .then(data => {
      const userCoordinates = {
        latitude: data.features[0].geometry.coordinates[1],
        longitude: data.features[0].geometry.coordinates[0]
      };

      getRoute(userCoordinates, schoolCoordinates);
    })
    .catch(error => {
      console.error(`Error fetching coordinates: ${error.message}`);
    });
});

function getRoute(origin, target) {
  const GQLQuery = `{
    plan(
      from: { lat: ${origin.latitude}, lon: ${origin.longitude} }
      to: { lat: ${target.latitude}, lon: ${target.longitude} }
      numItineraries: 1
    ) {
      itineraries {
        legs {
          startTime
          endTime
          mode
          duration
          distance
        }
      }
    }
  }`;

  const fetchOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: GQLQuery }),
  };

  fetch(apiAddress, fetchOptions)
    .then(response => response.json())
    .then(result => {
      const legs = result.data.plan.itineraries[0].legs;
      displayRouteInfo(legs);
    })
    .catch(error => {
      console.error(`Error fetching route: ${error.message}`);
    });
}

function displayRouteInfo(legs) {
  const routeInfoDiv = document.getElementById('routeInfo');
  routeInfoDiv.innerHTML = '';

  for (const leg of legs) {
    const startTime = new Date(leg.startTime);
    const endTime = new Date(leg.endTime);

    const infoParagraph = document.createElement('p');
    infoParagraph.textContent = `Mode: ${leg.mode}, Duration: ${leg.duration} seconds,
                               Distance: ${leg.distance} meters,
                               Start Time: ${startTime.toLocaleTimeString()},
                               End Time: ${endTime.toLocaleTimeString()}`;

    routeInfoDiv.appendChild(infoParagraph);
  }
}
