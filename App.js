import React, { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import domtoimage from "dom-to-image";
import "leaflet/dist/leaflet.css";
import "./App.css";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// ---------- Map click helper ----------
function LocationPicker({ onSelect }) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng);
    },
  });
  return null;
}

// ---------- Static libraries ----------
const CAMPING_TYPES = [
  "Car Camping - inside of car, or car is part of campsite",
  "Campsite Camping - at improved primitive campsite",
  "Short car camping - can make trips to car from camp (under 200 yards, car is not part of campsite)",
  "Long car camping - can carry things in hands to set up camp (1 trip, ~ under .5 mile)",
  "Backpacking - can't make trip back to car",
  "Bikepacking - using bike for extra gear",
  "Basecamping - car camping one day into backpacking the next (2 nights min)",
];

const BASE_GEAR = [
  "Tent",
  "Sleeping Bag",
  "Sleeping Pad",
  "Backpack",
  "Headlamp",
  "Water Filter",
  "Double sleeping monarch chair",
  "Foil bag for food",
  "Dog food",
  "Hellcat 9mm",
];

const SUBPACKS = {
  "Cold Weather": [
    "Thermals",
    "Down puff jacket",
    "Klymit tent",
    "Orange bag",
    "Mid layer",
    "Down quilt",
    "Pan cookset",
    "Folding table",
    "Pump/lantern",
    "Ankle gaiters",
    "Wind breaker",
    "Sleeping bag rec bag",
    "Power bank",
    "Brio coat",
    "Water bladder",
    "Trowel",
    "Hygiene bag",
    "Drone for car",
    "Balaclava",
    "Gloves",
    "Toe warmers",
    "Rheas coat",
    "Wool socks",
  ],
  "Snow Pack": [
    "Snow traction",
    "Snow gloves",
    "Snow shovel",
    "Sunglasses",
    "Wool socks extra",
    "Rain coat",
    "Gators",
    "Waterproof shoes",
  ],
  "Hot Weather": [
    "Sunscreen",
    "Hat",
    "Sunglasses",
    "Bug spray",
    "Extra water",
    "Cooling towel for Rhea",
  ],
  "Water Rec": ["Dry bag", "Grass", "Gloves", "Genius pipe", "Life jackets", "Torch"],
  "Bike Pack": ["Sugar", "Helmet", "Caffeine", "Rhea water"],
};

const DEFAULT_DOWNLOADS = ["Offline Map", "Book", "Movie", "Music"];
const DEFAULT_CHORES = [
  "Dishes",
  "Laundry",
  "Cooking",
  "Floors",
  "Bathroom",
  "Trash",
  "Yardwork",
  "Feed pets",
];

// ---------- Utilities ----------
const uniqPush = (arr, item) =>
  arr.includes(item.trim()) ? arr : [...arr, item.trim()];

const loadJSON = (key, fallback) => {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
};

const saveJSON = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
};

// ---------- App ----------
function App() {
  // Trip fields
  const [where, setWhere] = useState("");
  const [distance, setDistance] = useState("");
  const [type, setType] = useState("");
  const [who, setWho] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [emergencyTold, setEmergencyTold] = useState(false);

  // Map
  const [mapLocation, setMapLocation] = useState(null);
  const mapRef = useRef();

  // Current trip inventories
  const [gear, setGear] = useState([]);
  const [chores, setChores] = useState([]);
  const [downloads, setDownloads] = useState([]);

  // Saved view toggles
  const [packedGear, setPackedGear] = useState([]);
  const [doneChores, setDoneChores] = useState([]);

  // Archive & view state
  const [saved, setSaved] = useState(null);
  const [archive, setArchive] = useState([]);
  const [currentView, setCurrentView] = useState("home");
  const [editIndex, setEditIndex] = useState(null);

  // ---------- Persistent (user) libraries ----------
  const [userGearLib, setUserGearLib] = useState(() =>
    loadJSON("userGearLibrary", [])
  );
  const [userChoreLib, setUserChoreLib] = useState(() =>
    loadJSON("userChoreLibrary", [])
  );
  const [userDownloadLib, setUserDownloadLib] = useState(() =>
    loadJSON("userDownloadLibrary", [])
  );

  // Sync libs to localStorage
  useEffect(() => saveJSON("userGearLibrary", userGearLib), [userGearLib]);
  useEffect(() => saveJSON("userChoreLibrary", userChoreLib), [userChoreLib]);
  useEffect(
    () => saveJSON("userDownloadLibrary", userDownloadLib),
    [userDownloadLib]
  );

  // ---------- Combined libraries for dropdowns ----------
  const ALL_GEAR = React.useMemo(() => {
    const subpackItems = Object.values(SUBPACKS).flat();
    return [...new Set([...BASE_GEAR, ...subpackItems, ...userGearLib])];
  }, [userGearLib]);

  const ALL_CHORES = React.useMemo(
    () => [...new Set([...DEFAULT_CHORES, ...userChoreLib])],
    [userChoreLib]
  );

  const ALL_DOWNLOADS = React.useMemo(
    () => [...new Set([...DEFAULT_DOWNLOADS, ...userDownloadLib])],
    [userDownloadLib]
  );

  // ---------- Add from dropdown (auto-add) ----------
  const handleGearSelect = (value) => {
    if (!value) return;
    setGear((prev) => uniqPush(prev, value));
  };

  const handleChoreSelect = (value) => {
    if (!value) return;
    setChores((prev) => uniqPush(prev, value));
  };

  const handleDownloadSelect = (value) => {
    if (!value) return;
    setDownloads((prev) => uniqPush(prev, value));
  };

  // ---------- Add custom items (with optional save-to-library) ----------
  const [customGear, setCustomGear] = useState("");
  const [saveGearToLib, setSaveGearToLib] = useState(true);

  const [customChore, setCustomChore] = useState("");
  const [saveChoreToLib, setSaveChoreToLib] = useState(false);

  const [customDownload, setCustomDownload] = useState("");
  const [saveDownloadToLib, setSaveDownloadToLib] = useState(false);

  const addCustomGear = () => {
    const v = customGear.trim();
    if (!v) return;
    setGear((prev) => uniqPush(prev, v));
    if (saveGearToLib) setUserGearLib((prev) => uniqPush(prev, v));
    setCustomGear("");
  };

  const addCustomChore = () => {
    const v = customChore.trim();
    if (!v) return;
    setChores((prev) => uniqPush(prev, v));
    if (saveChoreToLib) setUserChoreLib((prev) => uniqPush(prev, v));
    setCustomChore("");
  };

  const addCustomDownload = () => {
    const v = customDownload.trim();
    if (!v) return;
    setDownloads((prev) => uniqPush(prev, v));
    if (saveDownloadToLib) setUserDownloadLib((prev) => uniqPush(prev, v));
    setCustomDownload("");
  };

  // ---------- Subpacks ----------
  const addSubpack = (packName) => {
    const items = SUBPACKS[packName] || [];
    setGear((prev) => [
      ...prev,
      ...items.filter((i) => !prev.includes(i)),
    ]);
  };

  // ---------- Remove line items ----------
  const removeGearItem = (i) =>
    setGear((prev) => prev.filter((_, idx) => idx !== i));
  const removeChore = (i) =>
    setChores((prev) => prev.filter((_, idx) => idx !== i));
  const removeDownload = (i) =>
    setDownloads((prev) => prev.filter((_, idx) => idx !== i));

  // ---------- Save trip (with map snapshot) ----------
  const handleSave = async () => {
    let mapImage = null;
    try {
      const node = mapRef.current;
      if (node) {
        const blob = await domtoimage.toPng(node);
        mapImage = blob;
      }
    } catch (e) {
      console.error("Map snapshot failed", e);
    }

    const newTrip = {
      where,
      distance,
      type,
      who,
      dates: `${startDate} to ${endDate}`,
      mapLocation,
      gear,
      chores,
      downloads,
      emergencyContact,
      emergencyTold,
      mapImage,
    };

    if (editIndex !== null) {
      const updated = [...archive];
      updated[editIndex] = newTrip;
      setArchive(updated);
      setEditIndex(null);
    } else {
      setArchive((prev) => [...prev, newTrip]);
    }

    setSaved(newTrip);
    setPackedGear([]);
    setDoneChores([]);
    setCurrentView("saved");
  };

  // ---------- Edit existing trip ----------
  const handleEdit = (index) => {
    const t = archive[index];
    if (!t) return;

    setWhere(t.where);
    setDistance(t.distance);
    setType(t.type);
    setWho(t.who);
    const [sd = "", ed = ""] = (t.dates || "").split(" to ");
    setStartDate(sd);
    setEndDate(ed);
    setMapLocation(t.mapLocation);
    setGear(t.gear || []);
    setChores(t.chores || []);
    setDownloads(t.downloads || []);
    setEmergencyContact(t.emergencyContact || "");
    setEmergencyTold(!!t.emergencyTold);
    setEditIndex(index);
    setCurrentView("new");
  };

  // ---------- Views ----------
  if (currentView === "home") {
    return (
      <div className="app dark">
        <div className="card" style={{ maxWidth: "720px", margin: "0 auto" }}>
          <h1 className="title">Trip Planner Home</h1>
          <button
            className="btn primary"
            onClick={() => {
              setEditIndex(null);
              setSaved(null);
              setCurrentView("new");
            }}
          >
            New Trip
          </button>

          <h2 style={{ marginTop: "1rem" }}>Saved Trips</h2>
          {archive.length === 0 && <p>No trips yet.</p>}
          <ul>
            {archive.map((t, i) => (
              <li
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "0.5rem",
                  alignItems: "center",
                }}
              >
                <div>
                  <strong>{t.where || "Untitled Trip"}</strong>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>{t.dates}</div>
                </div>
                <div>
                  <button
                    className="btn"
                    onClick={() => {
                      setSaved(t);
                      setPackedGear([]);
                      setDoneChores([]);
                      setCurrentView("saved");
                    }}
                  >
                    View
                  </button>
                  <button className="btn" onClick={() => handleEdit(i)}>
                    Edit
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  if (currentView === "saved" && saved) {
    const togglePacked = (item) =>
      setPackedGear((prev) =>
        prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
      );
    const toggleChore = (item) =>
      setDoneChores((prev) =>
        prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
      );

    return (
      <div className="app dark">
        <div className="card" style={{ maxWidth: "720px", margin: "0 auto" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <button className="btn" onClick={() => setCurrentView("home")}>
              Home
            </button>
            <button
              className="btn"
              onClick={() =>
                handleEdit(archive.findIndex((a) => a === saved))
              }
            >
              Edit this Trip
            </button>
          </div>

          <h1 className="title">Saved Trip</h1>
          <p>
            <strong>Where:</strong> {saved.where}
          </p>
          <p>
            <strong>Distance:</strong> {saved.distance}
          </p>
          <p>
            <strong>Type:</strong> {saved.type}
          </p>
          <p>
            <strong>Who:</strong> {saved.who}
          </p>
          <p>
            <strong>Dates:</strong> {saved.dates}
          </p>
          {saved.mapImage && (
            <img src={saved.mapImage} alt="Map Snapshot" style={{ width: "100%" }} />
          )}

          {/* Gear grouped by Base + Subpacks */}
          <h2 style={{ marginTop: "1rem" }}>Packed Gear</h2>
          <h3>Base Gear</h3>
          <ul>
            {BASE_GEAR.filter((g) => saved.gear.includes(g)).map((g) => (
              <li key={g}>
                <label>
                  <input
                    type="checkbox"
                    checked={packedGear.includes(g)}
                    onChange={() => togglePacked(g)}
                  />{" "}
                  {g}
                </label>
              </li>
            ))}
          </ul>

          {Object.entries(SUBPACKS).map(([packName, items]) => {
            const relevant = items.filter((i) => saved.gear.includes(i));
            if (relevant.length === 0) return null;
            return (
              <div key={packName}>
                <h3>{packName}</h3>
                <ul>
                  {relevant.map((g) => (
                    <li key={g}>
                      <label>
                        <input
                          type="checkbox"
                          checked={packedGear.includes(g)}
                          onChange={() => togglePacked(g)}
                        />{" "}
                        {g}
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}

          {/* Any remaining items not in base or subpacks (e.g., custom) */}
          {saved.gear.some(
            (g) =>
              !BASE_GEAR.includes(g) &&
              !Object.values(SUBPACKS).flat().includes(g)
          ) && (
            <>
              <h3>Custom / Other</h3>
              <ul>
                {saved.gear
                  .filter(
                    (g) =>
                      !BASE_GEAR.includes(g) &&
                      !Object.values(SUBPACKS).flat().includes(g)
                  )
                  .map((g) => (
                    <li key={g}>
                      <label>
                        <input
                          type="checkbox"
                          checked={packedGear.includes(g)}
                          onChange={() => togglePacked(g)}
                        />{" "}
                        {g}
                      </label>
                    </li>
                  ))}
              </ul>
            </>
          )}

          {/* Chores & Downloads */}
          <h2>Chores</h2>
          <ul>
            {saved.chores.map((c) => (
              <li key={c}>
                <label>
                  <input
                    type="checkbox"
                    checked={doneChores.includes(c)}
                    onChange={() => toggleChore(c)}
                  />{" "}
                  {c}
                </label>
              </li>
            ))}
          </ul>

          <h2>Downloads</h2>
          <ul>{saved.downloads.map((d) => <li key={d}>{d}</li>)}</ul>

          <p
            style={{
              marginTop: "1rem",
              fontWeight: "bold",
              textTransform: "lowercase",
            }}
          >
            dogs family friends health work money
          </p>
        </div>
      </div>
    );
  }

  // ---------- New/Edit view ----------
  return (
    <div className="app dark">
      <div className="card" style={{ maxWidth: "720px", margin: "0 auto" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <button className="btn" onClick={() => setCurrentView("home")}>
            Home
          </button>
        </div>

        <h1 className="title">Trip Planner</h1>

        <input
          className="input"
          style={{ width: "100%" }}
          placeholder="Where"
          value={where}
          onChange={(e) => setWhere(e.target.value)}
        />
        <input
          className="input"
          style={{ width: "100%" }}
          placeholder="Distance"
          value={distance}
          onChange={(e) => setDistance(e.target.value)}
        />

        <select
          className="input"
          style={{ width: "100%" }}
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="">-- Select Type of Camping --</option>
          {CAMPING_TYPES.map((ct) => (
            <option key={ct} value={ct}>
              {ct}
            </option>
          ))}
        </select>

        <input
          className="input"
          style={{ width: "100%" }}
          placeholder="Who"
          value={who}
          onChange={(e) => setWho(e.target.value)}
        />

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <input
            className="input"
            style={{ flex: 1 }}
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <input
            className="input"
            style={{ flex: 1 }}
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        <input
          className="input"
          style={{ width: "100%" }}
          placeholder="Emergency Contact"
          value={emergencyContact}
          onChange={(e) => setEmergencyContact(e.target.value)}
        />

        <label style={{ display: "block", margin: "0.5rem 0" }}>
          <input
            type="checkbox"
            checked={emergencyTold}
            onChange={(e) => setEmergencyTold(e.target.checked)}
          />{" "}
          Told Emergency Contact
        </label>

        {/* Map */}
        <div ref={mapRef} style={{ height: "300px", margin: "1rem 0" }}>
          <MapContainer
            center={[40.0, -111.0]}
            zoom={8}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <LocationPicker onSelect={setMapLocation} />
            {mapLocation && <Marker position={mapLocation}></Marker>}
          </MapContainer>
        </div>

        {/* Gear */}
        <h2>Gear</h2>
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: 8 }}>
          <select
            className="input"
            style={{ flex: 1 }}
            onChange={(e) => handleGearSelect(e.target.value)}
            defaultValue=""
          >
            <option value="">-- Select Gear --</option>
            {ALL_GEAR.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            className="input"
            placeholder="Add custom gear"
            value={customGear}
            onChange={(e) => setCustomGear(e.target.value)}
          />
          <label style={{ whiteSpace: "nowrap" }}>
            <input
              type="checkbox"
              checked={saveGearToLib}
              onChange={(e) => setSaveGearToLib(e.target.checked)}
            />{" "}
            Save to library
          </label>
          <button className="btn" onClick={addCustomGear}>
            Add
          </button>
        </div>

        <div style={{ marginTop: "10px" }}>
          {Object.keys(SUBPACKS).map((p) => (
            <button key={p} className="btn" onClick={() => addSubpack(p)}>
              {p}
            </button>
          ))}
        </div>

        <ul>
          {gear.map((g, i) => (
            <li
              key={`${g}-${i}`}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
            >
              {g}
              <button className="btn" onClick={() => removeGearItem(i)}>
                Remove
              </button>
            </li>
          ))}
        </ul>

        {/* Chores */}
        <h2>Chores</h2>
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: 8 }}>
          <select
            className="input"
            style={{ flex: 1 }}
            onChange={(e) => handleChoreSelect(e.target.value)}
            defaultValue=""
          >
            <option value="">-- Select Chore --</option>
            {ALL_CHORES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            className="input"
            placeholder="Add custom chore"
            value={customChore}
            onChange={(e) => setCustomChore(e.target.value)}
          />
          <label style={{ whiteSpace: "nowrap" }}>
            <input
              type="checkbox"
              checked={saveChoreToLib}
              onChange={(e) => setSaveChoreToLib(e.target.checked)}
            />{" "}
            Save to library
          </label>
          <button className="btn" onClick={addCustomChore}>
            Add
          </button>
        </div>

        <ul>
          {chores.map((c, i) => (
            <li
              key={`${c}-${i}`}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
            >
              {c}
              <button className="btn" onClick={() => removeChore(i)}>
                Remove
              </button>
            </li>
          ))}
        </ul>

        {/* Downloads */}
        <h2>Downloads</h2>
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: 8 }}>
          <select
            className="input"
            style={{ flex: 1 }}
            onChange={(e) => handleDownloadSelect(e.target.value)}
            defaultValue=""
          >
            <option value="">-- Select Download --</option>
            {ALL_DOWNLOADS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            className="input"
            placeholder="Add custom download"
            value={customDownload}
            onChange={(e) => setCustomDownload(e.target.value)}
          />
          <label style={{ whiteSpace: "nowrap" }}>
            <input
              type="checkbox"
              checked={saveDownloadToLib}
              onChange={(e) => setSaveDownloadToLib(e.target.checked)}
            />{" "}
            Save to library
          </label>
          <button className="btn" onClick={addCustomDownload}>
            Add
          </button>
        </div>

        <ul>
          {downloads.map((d, i) => (
            <li
              key={`${d}-${i}`}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
            >
              {d}
              <button className="btn" onClick={() => removeDownload(i)}>
                Remove
              </button>
            </li>
          ))}
        </ul>

        <button className="btn primary" onClick={handleSave}>
          Save Trip
        </button>
        <button
          className="btn"
          onClick={() => setCurrentView("home")}
          style={{ marginTop: "10px" }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default App;
