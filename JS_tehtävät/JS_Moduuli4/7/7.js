'use strict';

const map = L.map('map').setView([60.1785553, 24.8786212], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

const routingApiAddress = 'https://api.digitransit.fi/routing/v1/routers/hsl/index/graphql';
const geocodingApiAddress = 'https://api.digitransit.fi/geocoding/v1/search';
const routingApiKey = '7a07d302fa45407680f37a3f690ae289';
const geocodingApiKey = '7a07d302fa45407680f37a3f690ae289';

document.getElementById('addressForm').addEventListener('submit', function (event) {
  event.preventDefault();

  const addressInput = document.getElementById('address');
  const address = addressInput.value;

  const schoolCoordinates = { latitude: 60.24, longitude: 24.74 };

 fetch(`${geocodingApiAddress}?text=${encodeURIComponent(address)}&size=1&key=${geocodingApiKey}`)
  .then(response => {
    if (!response.ok) {
      throw new Error(`Failed to fetch coordinates. HTTP status ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    if (!data.features || data.features.length === 0) {
      throw new Error('No coordinates found for the given address.');
    }

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
          legGeometry {
            points
          }
        }
      }
    }
  }`;

  const fetchOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'digitransit-subscription-key': routingApiKey,
    },
    body: JSON.stringify({ query: GQLQuery }),
  };

  fetch(routingApiAddress, fetchOptions)
    .then(response => response.json())
    .then(result => {
      const legs = result.data.plan.itineraries[0].legs;
      displayRouteInfo(legs);
      displayRouteOnMap(origin, target, legs);
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

function displayRouteOnMap(origin, target, legs) {
  for (const leg of legs) {
    let color = '';
    switch (leg.mode) {
      case 'WALK':
        color = 'green';
        break;
      case 'BUS':
        color = 'red';
        break;
      case 'RAIL':
        color = 'cyan';
        break;
      case 'TRAM':
        color = 'magenta';
        break;
      default:
        color = 'blue';
        break;
    }
    const route = leg.legGeometry.points;
    const pointObjects = L.Polyline.fromEncoded(route).getLatLngs();
    L.polyline(pointObjects, { color }).addTo(map);
  }

  map.fitBounds([[origin.latitude, origin.longitude], [target.latitude, target.longitude]]);
}
