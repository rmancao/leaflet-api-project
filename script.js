// 1. Create the map and base layer.
const map = L.map("map").setView([12.8797, 121.774], 6);
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

const markerLayer = L.layerGroup().addTo(map);
const searchForm = document.getElementById("searchForm");
const cityInput = document.getElementById("cityInput");
const statusText = document.getElementById("status");

// 2. Request location data when the form is submitted.
searchForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const city = cityInput.value.trim();
  if (city.length < 2) {
    statusText.textContent = "Enter at least two characters.";
    return;
  }

  statusText.textContent = "Searching locations...";
  markerLayer.clearLayers();

  const url =
    "https://geocoding-api.open-meteo.com/v1/search?" +
    new URLSearchParams({
      name: city,
      count: "5",
      language: "en",
      format: "json",
    });

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("API returned HTTP " + response.status);

    const data = await response.json();
    const locations = data.results ?? [];
    if (locations.length === 0) {
      statusText.textContent =
        "No matching cities found. Try a different name.";
      return;
    }

    // 3. Turn JSON results into Leaflet markers.
    const bounds = [];
    locations.forEach((place) => {
      const { latitude, longitude, name, country, admin1 } = place;
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
      const coordinates = [latitude, longitude];
      bounds.push(coordinates);

      // DOM nodes + textContent avoid injecting third-party API text as HTML.
      const popup = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = name;
      const detail = document.createElement("p");
      detail.textContent = [admin1, country].filter(Boolean).join(", ");
      popup.append(title, detail);

      L.marker(coordinates).addTo(markerLayer).bindPopup(popup);
    });

    if (bounds.length === 0)
      throw new Error("API returned invalid coordinates.");
    if (bounds.length === 1) map.setView(bounds[0], 11);
    else map.fitBounds(bounds, { padding: [35, 35], maxZoom: 11 });
    statusText.textContent = `Showing ${bounds.length} location(s) for "${city}".`;
  } catch (error) {
    console.error(error);
    statusText.textContent =
      "Unable to load location data. Check your connection and retry.";
  }
});
