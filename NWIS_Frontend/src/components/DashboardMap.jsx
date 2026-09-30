import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Plus,
  Minus,
  Navigation,
  Compass,
  Maximize2,
  Layers,
  ChevronRight,
  ExternalLink,
  Flame,
  AlertTriangle,
  Info,
  MapPin
} from 'lucide-react';

// Fix default leaflet icon URLs in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom Leaflet DivIcon for Active Well matching screenshot
const createActiveWellIcon = (wellName = 'DUL-235') => {
  const html = `
    <div class="relative flex flex-col items-center cursor-pointer group" style="transform: translate(-50%, -100%);">
      <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0B1528]/95 border border-[#10B981] text-white shadow-xl text-[11px] font-bold whitespace-nowrap mb-1">
        <div class="w-2 h-2 rounded-full bg-[#10B981] animate-ping"></div>
        <div class="flex flex-col text-left leading-tight">
          <span class="text-white font-bold">${wellName}</span>
          <span class="text-[9px] text-[#10B981] font-medium leading-none">(Active Well)</span>
        </div>
      </div>
      <div class="w-6 h-6 rounded-full bg-[#10B981] border-2 border-white flex items-center justify-center shadow-2xl transition-transform duration-200 group-hover:scale-125">
        <div class="w-2 h-2 rounded-full bg-white"></div>
      </div>
      <div class="w-1.5 h-1.5 rotate-45 bg-[#10B981] -mt-1 shadow-md"></div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-dashboard-active-marker',
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
};

// Custom Leaflet DivIcon for Offset Wells matching screenshot
const createOffsetWellIcon = (wellName, distance, eventSeverity) => {
  let severityDot = '';
  if (eventSeverity === 'high' || eventSeverity === 'critical') {
    severityDot = `<div class="absolute -left-2 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#EF4444] border-2 border-white shadow-md"></div>`;
  } else if (eventSeverity === 'medium' || eventSeverity === 'warning') {
    severityDot = `<div class="absolute -left-2 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#F59E0B] border-2 border-white shadow-md"></div>`;
  } else if (eventSeverity === 'low') {
    severityDot = `<div class="absolute -left-2 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#94A3B8] border-2 border-white shadow-md"></div>`;
  }

  const html = `
    <div class="relative flex flex-col items-center cursor-pointer group" style="transform: translate(-50%, -100%);">
      <div class="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-[#0B1528]/95 border border-white/20 text-white shadow-lg text-[10px] font-bold whitespace-nowrap mb-1">
        <span>${wellName}</span>
        <span class="text-[9px] text-slate-300 font-normal">${distance}</span>
      </div>
      <div class="relative flex items-center justify-center">
        ${severityDot}
        <div class="w-5 h-5 rounded-full bg-[#0070F3] border-2 border-white flex items-center justify-center shadow-lg transition-transform duration-200 group-hover:scale-125">
          <div class="w-1.5 h-1.5 rounded-full bg-white"></div>
        </div>
      </div>
      <div class="w-1.5 h-1.5 rotate-45 bg-[#0070F3] -mt-1 shadow-md"></div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-dashboard-offset-marker',
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
};

// Distance Label Icon for radius rings
const createDistanceLabelIcon = (label) => {
  return L.divIcon({
    html: `<div class="px-2 py-0.5 rounded-full bg-[#08101E]/90 text-slate-200 text-[9px] font-bold border border-white/30 backdrop-blur shadow-md whitespace-nowrap">${label}</div>`,
    className: 'distance-label-marker',
    iconSize: [0, 0],
    iconAnchor: [15, 10],
  });
};

// Map Controller for interactive buttons
function MapController({ center, zoom, setMapInstance }) {
  const map = useMap();

  useEffect(() => {
    if (setMapInstance) setMapInstance(map);
  }, [map, setMapInstance]);

  useEffect(() => {
    if (center) {
      map.setView(center, zoom, { animate: true });
    }
  }, [center, zoom, map]);

  return null;
}

export default function DashboardMap({
  radius = '10 km',
  statusFilter = 'All',
  formationFilter = 'All',
  eventTypeFilter = 'All',
  layerType = 'satellite'
}) {
  const navigate = useNavigate();
  const [mapInstance, setMapInstance] = useState(null);
  const [currentLayer, setCurrentLayer] = useState(layerType);
  const [showLayerMenu, setShowLayerMenu] = useState(false);

  // Active Center: Duliajan Active Rig (DUL-235)
  const activeCenter = useMemo(() => [27.3582, 95.3194], []);

  // Radius in meters
  const radiusMeters = useMemo(() => {
    if (radius === '5 km') return 5000;
    if (radius === '25 km') return 25000;
    return 10000; // default 10 km
  }, [radius]);

  // Wells Data matching the visual source of truth
  const wells = useMemo(() => [
    {
      id: 'DUL-235',
      name: 'DUL-235',
      type: 'active',
      distance: 'Active',
      status: 'Active Drilling',
      depth: '2,420 m',
      formation: 'Barail',
      event: 'None (Active Operations)',
      severity: 'none',
      coordinates: [27.3582, 95.3194]
    },
    {
      id: 'DUL-201',
      name: 'DUL-201',
      type: 'offset',
      distance: '3.2 km',
      status: 'Active',
      depth: '3,100 m',
      formation: 'Barail',
      event: 'Mud Loss (60 bbl/hr)',
      severity: 'medium',
      coordinates: [27.3820, 95.3050]
    },
    {
      id: 'DUL-176',
      name: 'DUL-176',
      type: 'offset',
      distance: '6.1 km',
      status: 'Standby',
      depth: '2,880 m',
      formation: 'Barail',
      event: 'High Torque (3,400 kN-m)',
      severity: 'high',
      coordinates: [27.4080, 95.3510]
    },
    {
      id: 'DUL-198',
      name: 'DUL-198',
      type: 'offset',
      distance: '4.8 km',
      status: 'Completed',
      depth: '3,420 m',
      formation: 'Tipam',
      event: 'Kick / Gas Influx',
      severity: 'high',
      coordinates: [27.3710, 95.3620]
    },
    {
      id: 'DUL-205',
      name: 'DUL-205',
      type: 'offset',
      distance: '3.4 km',
      status: 'Abandoned',
      depth: '2,950 m',
      formation: 'Barail',
      event: 'Mud Loss (40 bbl/hr)',
      severity: 'medium',
      coordinates: [27.3340, 95.3380]
    },
    {
      id: 'DUL-190',
      name: 'DUL-190',
      type: 'offset',
      distance: '7.4 km',
      status: 'Completed',
      depth: '3,180 m',
      formation: 'Barail',
      event: 'Casing Wear Indication',
      severity: 'low',
      coordinates: [27.3120, 95.2650]
    }
  ], []);

  // Filter wells according to filter criteria
  const filteredWells = useMemo(() => {
    return wells.filter(w => {
      if (w.type === 'active') return true; // always show active well
      if (statusFilter !== 'All') {
        if (statusFilter === 'Active' && !w.status.toLowerCase().includes('active')) return false;
        if (statusFilter === 'Completed' && !w.status.toLowerCase().includes('completed')) return false;
      }
      if (formationFilter !== 'All' && w.formation !== formationFilter) return false;
      if (eventTypeFilter !== 'All') {
        if (!w.event.toLowerCase().includes(eventTypeFilter.toLowerCase())) return false;
      }
      return true;
    });
  }, [wells, statusFilter, formationFilter, eventTypeFilter]);

  // Tile layers configuration
  const tileLayers = {
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    },
    streets: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    },
    dark: {
      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>'
    }
  };

  const handleZoomIn = () => {
    if (mapInstance) mapInstance.zoomIn();
  };

  const handleZoomOut = () => {
    if (mapInstance) mapInstance.zoomOut();
  };

  const handleRecenter = () => {
    if (mapInstance) {
      mapInstance.setView(activeCenter, 12, { animate: true });
    }
  };

  return (
    <div className="relative h-[370px] w-full bg-slate-950 overflow-hidden select-none group rounded-b-xl border-t border-slate-200">
      {/* Real Interactive Leaflet Satellite Map */}
      <MapContainer
        center={activeCenter}
        zoom={12}
        scrollWheelZoom={true}
        zoomControl={false}
        className="w-full h-full z-0"
      >
        <MapController 
          center={activeCenter} 
          zoom={radius === '5 km' ? 13 : radius === '25 km' ? 11 : 12}
          setMapInstance={setMapInstance}
        />

        {/* Tile Layer */}
        <TileLayer
          url={tileLayers[currentLayer]?.url || tileLayers.satellite.url}
          attribution={tileLayers[currentLayer]?.attribution}
          maxZoom={18}
        />

        {/* 5 km Dashed Radius Circle */}
        <Circle
          center={activeCenter}
          radius={5000}
          pathOptions={{
            color: '#FFFFFF',
            weight: 1.5,
            dashArray: '6, 6',
            fillColor: '#FFFFFF',
            fillOpacity: 0.02
          }}
        />

        {/* 10 km Dashed Radius Circle */}
        <Circle
          center={activeCenter}
          radius={10000}
          pathOptions={{
            color: '#FFFFFF',
            weight: 1.5,
            dashArray: '6, 6',
            fillColor: '#FFFFFF',
            fillOpacity: 0.01
          }}
        />

        {/* 25 km Circle if selected */}
        {radius === '25 km' && (
          <Circle
            center={activeCenter}
            radius={25000}
            pathOptions={{
              color: '#38BDF8',
              weight: 1.5,
              dashArray: '4, 4',
              fillColor: '#38BDF8',
              fillOpacity: 0.01
            }}
          />
        )}

        {/* Distance Labels on Circles */}
        <Marker 
          position={[27.3582 + 0.045, 95.3194]} 
          icon={createDistanceLabelIcon('5 km')} 
          interactive={false}
        />
        <Marker 
          position={[27.3582 + 0.090, 95.3194]} 
          icon={createDistanceLabelIcon('10 km')} 
          interactive={false}
        />

        {/* Wells Markers */}
        {filteredWells.map(well => (
          <Marker
            key={well.id}
            position={well.coordinates}
            icon={
              well.type === 'active'
                ? createActiveWellIcon(well.name)
                : createOffsetWellIcon(well.name, well.distance, well.severity)
            }
          >
            <Popup className="custom-leaflet-popup" closeButton={true}>
              <div className="p-3 bg-[#0B1528] text-white rounded-xl min-w-[200px] space-y-2 font-sans">
                <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
                  <div className="flex items-center gap-1.5 font-bold text-sm">
                    <MapPin className="w-3.5 h-3.5 text-[#0070F3]" />
                    <span>{well.name}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                    well.type === 'active' 
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                      : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  }`}>
                    {well.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1.5 text-[10px] text-slate-300">
                  <div>
                    <span className="text-slate-400 block text-[9px]">Distance:</span>
                    <strong>{well.distance}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px]">Depth:</span>
                    <strong>{well.depth}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px]">Formation:</span>
                    <strong>{well.formation}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px]">Field:</span>
                    <strong>Duliajan</strong>
                  </div>
                </div>

                {well.event && well.event !== 'None (Active Operations)' && (
                  <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[10px] flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                    <span className="line-clamp-1">{well.event}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => navigate(`/wells/${well.id}`)}
                  className="w-full mt-1 py-1.5 bg-[#0070F3] hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 shadow-md"
                >
                  <span>View Intelligence Profile</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Floating Map Navigation & Control Buttons (Top-Right matching screenshot) */}
      <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-[400]">
        <button 
          type="button"
          onClick={handleZoomIn}
          title="Zoom In"
          className="w-7 h-7 bg-white/95 hover:bg-white text-slate-800 rounded-md shadow-md flex items-center justify-center text-xs font-bold border border-slate-200 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
        <button 
          type="button"
          onClick={handleZoomOut}
          title="Zoom Out"
          className="w-7 h-7 bg-white/95 hover:bg-white text-slate-800 rounded-md shadow-md flex items-center justify-center text-xs font-bold border border-slate-200 transition-colors"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button 
          type="button"
          onClick={handleRecenter}
          title="Recenter Active Well"
          className="w-7 h-7 bg-white/95 hover:bg-white text-slate-800 rounded-md shadow-md flex items-center justify-center text-xs font-bold border border-slate-200 transition-colors mt-0.5"
        >
          <Navigation className="w-3.5 h-3.5 text-[#0070F3]" />
        </button>
      </div>

      {/* North Arrow / Compass (Top-Left matching screenshot) */}
      <div className="absolute top-3 left-3 flex items-center justify-center z-[400] pointer-events-none">
        <div className="text-white font-bold text-xs flex flex-col items-center drop-shadow-md">
          <span className="text-[10px] leading-none mb-0.5 font-mono">N</span>
          <Compass className="w-4 h-4 text-white animate-spin-slow" />
        </div>
      </div>

      {/* Floating Map Legend Box (Bottom-Left matching screenshot) */}
      <div className="absolute bottom-3 left-3 bg-[#08101E]/90 backdrop-blur-md rounded-lg p-2.5 border border-white/10 text-white z-[400] shadow-xl text-[10px] space-y-1 select-none pointer-events-auto">
        <div className="flex items-center gap-1.5 font-medium">
          <span className="w-2 h-2 rounded-full bg-[#10B981]" />
          <span className="text-slate-200">Active Well</span>
        </div>
        <div className="flex items-center gap-1.5 font-medium">
          <span className="w-2 h-2 rounded-full bg-[#3B82F6]" />
          <span className="text-slate-200">Offset Well</span>
        </div>
        <div className="flex items-center gap-1.5 font-medium">
          <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
          <span className="text-slate-200">Event (High)</span>
        </div>
        <div className="flex items-center gap-1.5 font-medium">
          <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
          <span className="text-slate-200">Event (Medium)</span>
        </div>
        <div className="flex items-center gap-1.5 font-medium">
          <span className="w-2 h-2 rounded-full bg-[#94A3B8]" />
          <span className="text-slate-200">Event (Low)</span>
        </div>
        {/* Scale Bar */}
        <div className="pt-1.5 mt-1 border-t border-white/10 flex items-center justify-between text-[9px] text-slate-300 font-mono">
          <span>0</span>
          <span>2</span>
          <span>5 km</span>
        </div>
      </div>

      {/* View Full Map Button on Bottom Right */}
      <div className="absolute bottom-3 right-3 z-[400]">
        <button 
          type="button"
          onClick={() => navigate('/nearby-wells')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0B1528]/95 hover:bg-[#0B1528] text-white rounded-lg text-xs font-semibold backdrop-blur border border-white/20 shadow-lg transition-all hover:scale-105"
        >
          <Maximize2 className="w-3.5 h-3.5 text-[#0070F3]" />
          <span>View Full Map</span>
        </button>
      </div>
    </div>
  );
}
