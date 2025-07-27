import React, { useState, useRef } from "react";
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
  shadowUrl: markerShadow
});

function LocationPicker({ onSelect }) {
  useMapEvents({ click(e) { onSelect(e.latlng); } });
  return null;
}

const CAMPING_TYPES = [
  "Car Camping - inside of car, or car is part of campsite",
  "Campsite Camping - at improved primitive campsite",
  "Short car camping - can make trips to car from camp (under 200 yards, car is not part of campsite)",
  "Long car camping - can carry things in hands to set up camp (1 trip, ~ under .5 mile)",
  "Backpacking - can't make trip back to car",
  "Bikepacking - using bike for extra gear",
  "Basecamping - car camping one day into backpacking the next (2 nights min)"
];

const BASE_GEAR = ["Tent","Sleeping Bag","Sleeping Pad","Backpack","Headlamp","Water Filter","Double sleeping monarch chair","Foil bag for food","Dog food","Hellcat 9mm"];
const SUBPACKS = {
  "Cold Weather": ["Thermals","Down puff jacket","Klymit tent","Orange bag","Mid layer","Down quilt","Pan cookset","Folding table","Pump/lantern","Ankle gaiters","Wind breaker","Sleeping bag rec bag","Power bank","Brio coat","Water bladder","Trowel","Hygiene bag","Drone for car","Balaclava","Gloves","Toe warmers","Rheas coat","Wool socks"],
  "Snow Pack": ["Snow traction","Snow gloves","Snow shovel","Sunglasses","Wool socks extra","Rain coat","Gators","Waterproof shoes"],
  "Hot Weather": ["Sunscreen","Hat","Sunglasses","Bug spray","Extra water","Cooling towel for Rhea"],
  "Water Rec": ["Dry bag","Grass","Gloves","Genius pipe","Life jackets","Torch"],
  "Bike Pack": ["Sugar","Helmet","Caffeine","Rhea water"]
};
const GEAR_LIBRARY = BASE_GEAR.concat(...Object.values(SUBPACKS));
const DOWNLOAD_LIBRARY = ["Offline Maps","Emergency PDF","Trail GPX","Campsite Brochure"];
const CHORES_LIBRARY = ["Dishes","Laundry","Cooking","Floors","Bathroom","Trash","Yardwork","Feed pets"];

function App() {
  const [where, setWhere] = useState("");
  const [distance, setDistance] = useState("");
  const [type, setType] = useState("");
  const [who, setWho] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [mapLocation, setMapLocation] = useState(null);
  const mapRef = useRef();

  const [gear, setGear] = useState([]);
  const [packedGear, setPackedGear] = useState([]);
  const [chores, setChores] = useState([]);
  const [doneChores, setDoneChores] = useState([]);
  const [downloads, setDownloads] = useState([]);
  const [emergencyContact, setEmergencyContact] = useState("");
  const [emergencyTold, setEmergencyTold] = useState(false);
  const [saved, setSaved] = useState(null);
  const [archive, setArchive] = useState([]);
  const [currentView, setCurrentView] = useState("home");

  const handleGearSelect = (value) => {
    if (value && !gear.includes(value)) {
      setGear([...gear, value]);
    }
  };
  const addSubpack = (pack) => {
    const items = SUBPACKS[pack];
    if (items) {
      setGear(prev => [...prev, ...items.filter(i => !prev.includes(i))]);
    }
  };
  const removeGearItem = (index) => { setGear(gear.filter((_, i) => i !== index)); };

  const handleChoreSelect = (value) => {
    if (value && !chores.includes(value)) {
      setChores([...chores, value]);
    }
  };
  const removeChore = (index) => { setChores(chores.filter((_, i) => i !== index)); };

  const handleDownloadSelect = (value) => {
    if (value && !downloads.includes(value)) {
      setDownloads([...downloads, value]);
    }
  };
  const removeDownload = (index) => { setDownloads(downloads.filter((_, i) => i !== index)); };

  const handleSave = async () => {
    let mapImage = null;
    try {
      const node = mapRef.current;
      if (node) {
        const blob = await domtoimage.toPng(node);
        mapImage = blob;
      }
    } catch(e) { console.error("Map snapshot failed",e); }
    const newTrip = { where, distance, type, who, dates:`${startDate} to ${endDate}`, mapLocation, gear, chores, downloads, emergencyContact, emergencyTold, mapImage };
    setArchive([...archive, newTrip]);
    setSaved(newTrip);
    setPackedGear([]);
    setDoneChores([]);
    setCurrentView("saved");
  };

  if (currentView === "home") {
    return (
      <div className="app dark">
        <div className="card" style={{maxWidth:"600px",margin:"0 auto"}}>
          <h1 className="title">Trip Planner Home</h1>
          <button className="btn primary" onClick={()=>setCurrentView("new")}>New Trip</button>
          <h2>Saved Trips</h2>
          <ul>
            {archive.map((t,i)=>(
              <li key={i} style={{display:"flex",justifyContent:"space-between"}}>
                {t.where} <button className="btn" onClick={()=>{setSaved(t);setPackedGear([]);setDoneChores([]);setCurrentView("saved");}}>View</button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  if (currentView === "saved" && saved) {
    const togglePacked = (item) => {
      setPackedGear(prev => prev.includes(item) ? prev.filter(i=>i!==item) : [...prev,item]);
    };
    const toggleChore = (item) => {
      setDoneChores(prev => prev.includes(item) ? prev.filter(i=>i!==item) : [...prev,item]);
    };
    return (
      <div className="app dark">
        <div className="card" style={{maxWidth:"600px",margin:"0 auto"}}>
          <h1 className="title">Saved Trip</h1>
          <p><strong>Where:</strong> {saved.where}</p>
          <p><strong>Distance:</strong> {saved.distance}</p>
          <p><strong>Type:</strong> {saved.type}</p>
          <p><strong>Who:</strong> {saved.who}</p>
          <p><strong>Dates:</strong> {saved.dates}</p>
          {saved.mapImage && <img src={saved.mapImage} alt="Map Snapshot" style={{width:"100%"}}/>}
          <h2>Packed Gear</h2>
          <ul>
            {saved.gear.map((g,i)=>(
              <li key={i}>
                <label>
                  <input type="checkbox" checked={packedGear.includes(g)} onChange={()=>togglePacked(g)}/> {g}
                </label>
              </li>
            ))}
          </ul>
          <h2>Chores</h2>
          <ul>
            {saved.chores.map((c,i)=>(
              <li key={i}>
                <label>
                  <input type="checkbox" checked={doneChores.includes(c)} onChange={()=>toggleChore(c)}/> {c}
                </label>
              </li>
            ))}
          </ul>
          <h2>Downloads</h2>
          <ul>{saved.downloads.map((d,i)=>(<li key={i}>{d}</li>))}</ul>
          <p style={{ marginTop: "1rem", fontWeight: "bold", textTransform: "lowercase" }}>dogs family friends health work money</p>
          <button className="btn" onClick={()=>setCurrentView("home")}>Back to Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="app dark">
      <div className="card" style={{maxWidth:"600px",margin:"0 auto"}}>
        <h1 className="title">Trip Planner</h1>
        <input className="input" style={{ width: "100%" }} placeholder="Where" value={where} onChange={e => setWhere(e.target.value)} />
        <input className="input" style={{ width: "100%" }} placeholder="Distance" value={distance} onChange={e => setDistance(e.target.value)} />
        <select className="input" style={{ width: "100%" }} value={type} onChange={e => setType(e.target.value)}>
          <option value="">-- Select Type of Camping --</option>
          {CAMPING_TYPES.map((ct,i)=>(<option key={i} value={ct}>{ct}</option>))}
        </select>
        <input className="input" style={{ width: "100%" }} placeholder="Who" value={who} onChange={e => setWho(e.target.value)} />
        <div style={{display:"flex",gap:"0.5rem"}}>
          <input className="input" style={{ flex:1 }} type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          <input className="input" style={{ flex:1 }} type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
        <input className="input" style={{ width: "100%" }} placeholder="Emergency Contact" value={emergencyContact} onChange={e => setEmergencyContact(e.target.value)} />
        <label style={{ display: "block", margin: "0.5rem 0" }}>
          <input type="checkbox" checked={emergencyTold} onChange={e => setEmergencyTold(e.target.checked)} /> Told Emergency Contact
        </label>
        <div ref={mapRef} style={{ height: "300px", margin: "1rem 0" }}>
          <MapContainer center={[40.0,-111.0]} zoom={8} style={{height:"100%",width:"100%"}}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <LocationPicker onSelect={setMapLocation} />
            {mapLocation && <Marker position={mapLocation}></Marker>}
          </MapContainer>
        </div>
        <h2>Gear</h2>
        <div style={{display:"flex",gap:"0.5rem"}}>
          <select className="input" style={{flex:1}} onChange={e=>handleGearSelect(e.target.value)}>
            <option value="">-- Select Gear --</option>
            {GEAR_LIBRARY.map((g,i)=>(<option key={i} value={g}>{g}</option>))}
          </select>
        </div>
        <div style={{marginTop:"10px"}}>
          {Object.keys(SUBPACKS).map((p,i)=>(<button key={i} className="btn" onClick={()=>addSubpack(p)}>{p}</button>))}
        </div>
        <ul>
          {gear.map((g,i)=>(
            <li key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              {g}<button className="btn" onClick={()=>removeGearItem(i)}>Remove</button>
            </li>
          ))}
        </ul>
        <h2>Chores</h2>
        <div style={{display:"flex",gap:"0.5rem"}}>
          <select className="input" style={{flex:1}} onChange={e=>handleChoreSelect(e.target.value)}>
            <option value="">-- Select Chore --</option>
            {CHORES_LIBRARY.map((c,i)=>(<option key={i} value={c}>{c}</option>))}
          </select>
        </div>
        <ul>
          {chores.map((c,i)=>(
            <li key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              {c}<button className="btn" onClick={()=>removeChore(i)}>Remove</button>
            </li>
          ))}
        </ul>
        <h2>Downloads</h2>
        <div style={{display:"flex",gap:"0.5rem"}}>
          <select className="input" style={{flex:1}} onChange={e=>handleDownloadSelect(e.target.value)}>
            <option value="">-- Select Download --</option>
            {DOWNLOAD_LIBRARY.map((d,i)=>(<option key={i} value={d}>{d}</option>))}
          </select>
        </div>
        <ul>
          {downloads.map((d,i)=>(
            <li key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              {d}<button className="btn" onClick={()=>removeDownload(i)}>Remove</button>
            </li>
          ))}
        </ul>
        <button className="btn primary" onClick={handleSave}>Save Trip</button>
        <button className="btn" onClick={()=>setCurrentView("home")} style={{marginTop:"10px"}}>Cancel</button>
      </div>
    </div>
  );
}

export default App;
